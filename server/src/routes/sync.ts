import { Router, Request, Response } from 'express';
import { query, get, run, persistDb, exportDatabaseState, importDatabaseState } from '../db/database';
import { getActiveCloudProvider, loadCloudSnapshot, saveCloudSnapshot } from '../db/cloudStorage';

const router = Router();

// GET /api/sync/status - Returns cloud persistence status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    cloud: getActiveCloudProvider(),
    serverTime: new Date().toISOString(),
  });
});

// GET /api/sync/state - Returns current full database state
router.get('/state', (req: Request, res: Response) => {
  try {
    const state = exportDatabaseState();
    res.json({
      status: 'ok',
      cloud: getActiveCloudProvider(),
      serverTime: new Date().toISOString(),
      state,
    });
  } catch (err: any) {
    console.error('Error in GET /api/sync/state:', err);
    res.status(500).json({ error: err?.message || 'Gagal mengekspor state database' });
  }
});

// POST /api/sync/state - Merges client delta or full state into database
router.post('/state', async (req: Request, res: Response) => {
  try {
    const { clientState, delta } = req.body || {};

    // 1. If a full snapshot is provided
    if (clientState && clientState.students) {
      importDatabaseState(clientState);
      return res.json({
        success: true,
        message: 'State database berhasil diperbarui secara penuh',
        cloud: getActiveCloudProvider(),
        state: exportDatabaseState(),
      });
    }

    // 2. If a delta is provided
    if (delta) {
      // Deletions first
      if (Array.isArray(delta.deletedStudentIds)) {
        for (const id of delta.deletedStudentIds) {
          run('DELETE FROM student_halaqah_history WHERE student_id = ?', [id]);
          run('DELETE FROM violation_records WHERE student_id = ?', [id]);
          run('DELETE FROM positive_records WHERE student_id = ?', [id]);
          run('DELETE FROM students WHERE id = ?', [id]);
        }
      }

      if (Array.isArray(delta.deletedRecordIds)) {
        for (const id of delta.deletedRecordIds) {
          run('DELETE FROM violation_records WHERE id = ?', [id]);
        }
      }

      if (Array.isArray(delta.deletedPosRecordIds)) {
        for (const id of delta.deletedPosRecordIds) {
          run('DELETE FROM positive_records WHERE id = ?', [id]);
        }
      }

      if (Array.isArray(delta.deletedHalaqahIds)) {
        for (const id of delta.deletedHalaqahIds) {
          run('UPDATE students SET halaqah_id = NULL WHERE halaqah_id = ?', [id]);
          run('DELETE FROM halaqah WHERE id = ?', [id]);
        }
      }

      if (Array.isArray(delta.deletedTeacherIds)) {
        for (const id of delta.deletedTeacherIds) {
          run('UPDATE halaqah SET teacher_id = NULL WHERE teacher_id = ?', [id]);
          run('DELETE FROM teachers WHERE id = ?', [id]);
        }
      }

      if (Array.isArray(delta.deletedUserIds)) {
        for (const id of delta.deletedUserIds) {
          // Do not delete default admin imbs@aldri
          if (id !== 'usr_admin_imbs') {
            run('DELETE FROM users WHERE id = ?', [id]);
          }
        }
      }

      // Additions & creations
      if (Array.isArray(delta.createdStudents)) {
        for (const s of delta.createdStudents) {
          const exists = get('SELECT id FROM students WHERE id = ? OR student_number = ?', [s.id, s.student_number]);
          if (!exists) {
            run(
              `INSERT INTO students (id, student_number, name, class, gender, halaqah_id, academic_year, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                s.id,
                s.student_number,
                s.name,
                s.class || '-',
                s.gender || 'L',
                s.halaqah_id || null,
                s.academic_year || '2025/2026',
                s.status || 'active',
                s.created_at || new Date().toISOString(),
              ]
            );
          }
        }
      }

      if (Array.isArray(delta.createdHalaqahs)) {
        for (const h of delta.createdHalaqahs) {
          const exists = get('SELECT id FROM halaqah WHERE id = ?', [h.id]);
          if (!exists) {
            run(
              `INSERT INTO halaqah (id, name, teacher_id, schedule, location, academic_year, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                h.id,
                h.name,
                h.teacher_id || null,
                h.schedule || "Ba'da Subuh & Ba'da Maghrib",
                h.location || 'Masjid Utama',
                h.academic_year || '2025/2026',
                h.status || 'active',
                h.created_at || new Date().toISOString(),
              ]
            );
          }
        }
      }

      if (Array.isArray(delta.createdTeachers)) {
        for (const t of delta.createdTeachers) {
          const exists = get('SELECT id FROM teachers WHERE id = ?', [t.id]);
          if (!exists) {
            run(
              `INSERT INTO teachers (id, user_id, name, phone, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [t.id, t.user_id || null, t.name, t.phone || '', t.status || 'active', t.created_at || new Date().toISOString()]
            );
          }
        }
      }

      if (Array.isArray(delta.createdRecords)) {
        for (const r of delta.createdRecords) {
          const exists = get('SELECT id FROM violation_records WHERE id = ?', [r.id]);
          if (!exists) {
            run(
              `INSERT INTO violation_records (
                id, student_id, division, halaqah_id, teacher_id, violation_id,
                violation_name_snapshot, points_snapshot, halaqah_name_snapshot,
                teacher_name_snapshot, student_class_snapshot, academic_year_snapshot,
                date, time, notes, status, created_by, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                r.id,
                r.student_id,
                r.division || 'tahfizh',
                r.halaqah_id || null,
                r.teacher_id || null,
                r.violation_id || null,
                r.violation_name_snapshot || 'Pelanggaran',
                r.points_snapshot || 0,
                r.halaqah_name_snapshot || '-',
                r.teacher_name_snapshot || 'Pembina',
                r.student_class_snapshot || '-',
                r.academic_year_snapshot || '2025/2026',
                r.date || new Date().toISOString().split('T')[0],
                r.time || '00:00',
                r.notes || '',
                r.status || 'active',
                r.created_by || 'Petugas',
                r.created_at || new Date().toISOString(),
              ]
            );
          }
        }
      }

      if (Array.isArray(delta.createdPosRecords)) {
        for (const pr of delta.createdPosRecords) {
          const exists = get('SELECT id FROM positive_records WHERE id = ?', [pr.id]);
          if (!exists) {
            run(
              `INSERT INTO positive_records (
                id, student_id, division, action_id, action_name_snapshot, points_deducted,
                halaqah_id, halaqah_name_snapshot, teacher_id, teacher_name_snapshot,
                student_class_snapshot, academic_year_snapshot, date, time, notes, status, created_by, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                pr.id,
                pr.student_id,
                pr.division || 'tahfizh',
                pr.action_id || null,
                pr.action_name_snapshot || 'Kegiatan Baik',
                pr.points_deducted || 0,
                pr.halaqah_id || null,
                pr.halaqah_name_snapshot || '-',
                pr.teacher_id || null,
                pr.teacher_name_snapshot || 'Pembina',
                pr.student_class_snapshot || '-',
                pr.academic_year_snapshot || '2025/2026',
                pr.date || new Date().toISOString().split('T')[0],
                pr.time || '00:00',
                pr.notes || '',
                pr.status || 'active',
                pr.created_by || 'Petugas',
                pr.created_at || new Date().toISOString(),
              ]
            );
          }
        }
      }

      // Cancellations
      if (delta.cancelledRecords && typeof delta.cancelledRecords === 'object') {
        for (const [id, reason] of Object.entries(delta.cancelledRecords)) {
          run("UPDATE violation_records SET status = 'cancelled', cancellation_reason = ? WHERE id = ?", [reason, id]);
        }
      }

      if (delta.cancelledPosRecords && typeof delta.cancelledPosRecords === 'object') {
        for (const [id, reason] of Object.entries(delta.cancelledPosRecords)) {
          run("UPDATE positive_records SET status = 'cancelled', cancellation_reason = ? WHERE id = ?", [reason, id]);
        }
      }

      // Flush to disk and cloud
      persistDb();
    }

    const state = exportDatabaseState();
    return res.json({
      success: true,
      message: 'Sinkronisasi berhasil diterapkan',
      cloud: getActiveCloudProvider(),
      state,
    });
  } catch (err: any) {
    console.error('Error in POST /api/sync/state:', err);
    res.status(500).json({ error: err?.message || 'Gagal memproses sinkronisasi' });
  }
});

export default router;
