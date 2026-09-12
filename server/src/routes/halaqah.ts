import { Router, Request, Response } from 'express';
import { query, get, run, logAudit, persistDb, addTombstone } from '../db/database';

const router = Router();

// GET all halaqahs with student count & teacher name
router.get('/', (req: Request, res: Response) => {
  try {
    const halaqahs = query<any>(`
      SELECT h.id, h.name, h.teacher_id, h.schedule, h.location, h.academic_year, h.status, h.created_at,
             t.name as teacher_name, t.phone as teacher_phone,
             (SELECT COUNT(*) FROM students s WHERE s.halaqah_id = h.id AND s.status = 'active') as student_count
      FROM halaqah h
      LEFT JOIN teachers t ON t.id = h.teacher_id
      ORDER BY h.name ASC
    `);
    return res.json(halaqahs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST create halaqah
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, teacherId, schedule, location, academicYear = '2025/2026', status = 'active', actorName = 'Admin' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nama halaqah wajib diisi' });
    }

    const halaqahId = 'hlq_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    run(
      `INSERT INTO halaqah (id, name, teacher_id, schedule, location, academic_year, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      [halaqahId, name.trim(), teacherId || null, schedule || "Ba'da Subuh", location || 'Masjid', academicYear, status]
    );

    logAudit({
      userName: actorName,
      action: 'CREATE_HALAQAH',
      tableName: 'halaqah',
      recordId: halaqahId,
      newData: { name, teacherId, schedule, location },
    });

    persistDb();
    return res.status(201).json({ message: 'Halaqah berhasil dibuat', halaqahId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update halaqah (FLEXIBLE NAME EDITING)
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, teacherId, schedule, location, academicYear, status, actorName = 'Admin' } = req.body;

    const oldHalaqah = get<any>('SELECT * FROM halaqah WHERE id = ?', [id]);
    if (!oldHalaqah) return res.status(404).json({ error: 'Halaqah tidak ditemukan' });

    const updatedName = name ? name.trim() : oldHalaqah.name;
    const updatedTeacherId = teacherId !== undefined ? teacherId : oldHalaqah.teacher_id;
    const updatedSchedule = schedule !== undefined ? schedule : oldHalaqah.schedule;
    const updatedLocation = location !== undefined ? location : oldHalaqah.location;
    const updatedAcademicYear = academicYear || oldHalaqah.academic_year;
    const updatedStatus = status || oldHalaqah.status;

    run(
      `UPDATE halaqah
       SET name = ?, teacher_id = ?, schedule = ?, location = ?, academic_year = ?, status = ?
       WHERE id = ?`,
      [updatedName, updatedTeacherId || null, updatedSchedule, updatedLocation, updatedAcademicYear, updatedStatus, id]
    );

    logAudit({
      userName: actorName,
      action: 'UPDATE_HALAQAH',
      tableName: 'halaqah',
      recordId: id,
      oldData: oldHalaqah,
      newData: { name: updatedName, teacher_id: updatedTeacherId, schedule: updatedSchedule, location: updatedLocation },
    });

    persistDb();
    return res.json({ message: 'Data halaqah berhasil diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE halaqah
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actorName = 'Admin' } = req.body || {};

    const halaqah = get<any>('SELECT * FROM halaqah WHERE id = ?', [id]);
    if (!halaqah) {
      return res.json({ message: 'Halaqah sudah tidak ada atau telah dihapus' });
    }

    // Detach references safely
    run('UPDATE students SET halaqah_id = NULL WHERE halaqah_id = ?', [id]);
    run('UPDATE violation_records SET halaqah_id = NULL WHERE halaqah_id = ?', [id]);
    run('UPDATE positive_records SET halaqah_id = NULL WHERE halaqah_id = ?', [id]);
    run('DELETE FROM student_halaqah_history WHERE halaqah_id = ?', [id]);
    run('DELETE FROM halaqah WHERE id = ?', [id]);
    addTombstone(id, 'halaqah');

    logAudit({
      userName: actorName,
      action: 'DELETE_HALAQAH',
      tableName: 'halaqah',
      recordId: id,
      oldData: halaqah,
    });

    persistDb();
    return res.json({ message: 'Halaqah berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET students inside halaqah
router.get('/:id/students', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const students = query<any>(`
      SELECT s.*,
             COALESCE(SUM(CASE WHEN vr.status = 'active' THEN vr.points_snapshot ELSE 0 END), 0) as total_points
      FROM students s
      LEFT JOIN violation_records vr ON vr.student_id = s.id
      WHERE s.halaqah_id = ? AND s.status = 'active'
      GROUP BY s.id
      ORDER BY s.name ASC
    `, [id]);
    return res.json(students);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
