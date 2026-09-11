import { Router, Request, Response } from 'express';
import { query, get, run, logAudit, persistDb } from '../db/database';

const router = Router();

// GET all positive records
router.get('/', (req: Request, res: Response) => {
  try {
    const { student_id, division, halaqah_id, status, startDate, endDate } = req.query;
    let sql = `
      SELECT pr.*,
             s.name as student_name, s.student_number as student_nis, s.gender as student_gender,
             h.name as current_halaqah_name,
             t.name as current_teacher_name,
             pa.category as action_category,
             pa.code as action_code
      FROM positive_records pr
      JOIN students s ON s.id = pr.student_id
      LEFT JOIN halaqah h ON h.id = s.halaqah_id
      LEFT JOIN teachers t ON t.id = h.teacher_id
      LEFT JOIN positive_actions pa ON pa.id = pr.action_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (student_id) {
      sql += ' AND pr.student_id = ?';
      params.push(student_id);
    }
    if (division && (division === 'tahfizh' || division === 'kesantrian')) {
      sql += ' AND pr.division = ?';
      params.push(division);
    }
    if (halaqah_id) {
      sql += ' AND (pr.halaqah_id = ? OR s.halaqah_id = ?)';
      params.push(halaqah_id, halaqah_id);
    }
    if (status) {
      sql += ' AND pr.status = ?';
      params.push(status);
    }
    if (startDate) {
      sql += ' AND pr.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND pr.date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY pr.date DESC, pr.time DESC, pr.created_at DESC';
    const records = query<any>(sql, params);
    return res.json(records);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST create new positive record
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      studentId,
      division = 'tahfizh',
      actionId,
      customActionName,
      customPoints,
      date,
      time,
      notes,
      supervisorName,
      locationName,
      actorName = 'Admin',
    } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'Santri wajib dipilih' });
    }

    // 1. Fetch student current info
    const student = get<any>(`
      SELECT s.*, h.name as halaqah_name, h.id as halaqah_id, t.name as teacher_name, t.id as teacher_id
      FROM students s
      LEFT JOIN halaqah h ON h.id = s.halaqah_id
      LEFT JOIN teachers t ON t.id = h.teacher_id
      WHERE s.id = ?
    `, [studentId]);

    if (!student) return res.status(404).json({ error: 'Data santri tidak ditemukan' });

    // 2. Fetch master positive action if provided
    let actionName = customActionName || 'Kegiatan Baik / Prestasi';
    let pointsDeducted = Number(customPoints) || 5;

    if (actionId) {
      const action = get<any>('SELECT * FROM positive_actions WHERE id = ?', [actionId]);
      if (action) {
        actionName = action.name;
        pointsDeducted = customPoints !== undefined && Number(customPoints) > 0 ? Number(customPoints) : action.default_points_deduction;
      }
    }

    if (pointsDeducted <= 0) {
      return res.status(400).json({ error: 'Poin pengurangan harus lebih dari 0' });
    }

    const settings = get<any>('SELECT * FROM school_settings WHERE id = "settings_default"');
    const academicYear = settings?.current_academic_year || student.academic_year || '2025/2026';

    const now = new Date();
    const recordDate = date || now.toISOString().split('T')[0];
    const recordTime = time || now.toTimeString().substring(0, 5);

    const halaqahName = division === 'kesantrian'
      ? (locationName || 'Asrama & Kesantrian')
      : (student.halaqah_name || 'Halaqah Mandiri');

    const teacherName = supervisorName || student.teacher_name || actorName || 'Pembimbing';

    const recordId = 'pos_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    run(
      `INSERT INTO positive_records (
        id, student_id, division, action_id,
        action_name_snapshot, points_deducted, halaqah_id, halaqah_name_snapshot,
        teacher_id, teacher_name_snapshot, student_class_snapshot, academic_year_snapshot,
        date, time, notes, status, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now', 'localtime'))`,
      [
        recordId,
        studentId,
        division,
        actionId || null,
        actionName,
        pointsDeducted,
        division === 'tahfizh' ? student.halaqah_id : null,
        halaqahName,
        division === 'tahfizh' ? student.teacher_id : null,
        teacherName,
        student.class || '8A',
        academicYear,
        recordDate,
        recordTime,
        notes || '',
        actorName,
      ]
    );

    logAudit({
      userName: actorName,
      action: 'RECORD_POSITIVE_ACTION',
      tableName: 'positive_records',
      recordId,
      newData: {
        studentId,
        studentName: student.name,
        actionName,
        pointsDeducted,
        division,
        date: recordDate,
      },
    });

    return res.status(201).json({
      message: 'Kegiatan baik / pengurangan poin berhasil dicatat',
      recordId,
      pointsDeducted,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT cancel (soft delete) positive record
router.put('/:id/cancel', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, actorName = 'Admin' } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Alasan pembatalan catatan kebaikan wajib diisi' });
    }

    const record = get<any>('SELECT * FROM positive_records WHERE id = ?', [id]);
    if (!record) return res.status(404).json({ error: 'Catatan kebaikan tidak ditemukan' });
    if (record.status === 'cancelled') {
      return res.status(400).json({ error: 'Catatan ini sudah dalam status dibatalkan' });
    }

    run(
      `UPDATE positive_records
       SET status = 'cancelled',
           cancelled_at = datetime('now', 'localtime'),
           cancelled_by = ?,
           cancellation_reason = ?
       WHERE id = ?`,
      [actorName, reason.trim(), id]
    );
    persistDb();

    logAudit({
      userName: actorName,
      action: 'CANCEL_POSITIVE_RECORD',
      tableName: 'positive_records',
      recordId: id,
      oldData: { status: 'active', points: record.points_deducted },
      newData: { status: 'cancelled', reason: reason.trim() },
    });

    return res.json({ success: true, message: 'Catatan kebaikan berhasil dibatalkan' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE hard delete positive record (Admin only)
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actorName = 'Admin' } = req.body || {};

    const record = get<any>('SELECT * FROM positive_records WHERE id = ?', [id]);
    if (!record) {
      return res.json({ success: true, message: 'Catatan kebaikan sudah tidak ada atau telah dihapus' });
    }

    run('DELETE FROM positive_records WHERE id = ?', [id]);
    persistDb();

    logAudit({
      userName: actorName,
      action: 'DELETE_POSITIVE_RECORD',
      tableName: 'positive_records',
      recordId: id,
      oldData: record,
    });

    return res.json({ success: true, message: 'Catatan kebaikan berhasil dihapus permanen' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
