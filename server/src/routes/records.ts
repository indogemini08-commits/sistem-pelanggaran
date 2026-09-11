import { Router, Request, Response } from 'express';
import { query, get, run, logAudit, persistDb } from '../db/database';

const router = Router();

// GET list of violation records with advanced filter & sort
router.get('/', (req: Request, res: Response) => {
  try {
    const {
      division,
      studentId,
      halaqahId,
      teacherId,
      violationId,
      category,
      studentClass,
      academicYear,
      startDate,
      endDate,
      month,
      status = 'all',
      search,
      sortBy = 'date',
      sortDir = 'desc',
    } = req.query;

    let sql = `
      SELECT vr.*,
             COALESCE(s.name, vr.halaqah_name_snapshot) as student_name,
             COALESCE(s.student_number, '-') as student_nis,
             COALESCE(s.gender, 'L') as student_gender,
             h.name as current_halaqah_name,
             t.name as current_teacher_name,
             v.category as violation_category
      FROM violation_records vr
      JOIN students s ON s.id = vr.student_id AND s.status = 'active'
      LEFT JOIN halaqah h ON h.id = vr.halaqah_id
      LEFT JOIN teachers t ON t.id = vr.teacher_id
      LEFT JOIN violations v ON v.id = vr.violation_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (division && division !== 'all') {
      sql += ` AND vr.division = ?`;
      params.push(division);
    }

    if (status && status !== 'all') {
      sql += ` AND vr.status = ?`;
      params.push(status);
    }

    if (studentId) {
      sql += ` AND vr.student_id = ?`;
      params.push(studentId);
    }

    if (halaqahId) {
      sql += ` AND vr.halaqah_id = ?`;
      params.push(halaqahId);
    }

    if (teacherId) {
      sql += ` AND vr.teacher_id = ?`;
      params.push(teacherId);
    }

    if (violationId) {
      sql += ` AND vr.violation_id = ?`;
      params.push(violationId);
    }

    if (category) {
      sql += ` AND (v.category = ? OR vr.violation_name_snapshot LIKE ?)`;
      params.push(category, `%${category}%`);
    }

    if (studentClass) {
      sql += ` AND vr.student_class_snapshot = ?`;
      params.push(studentClass);
    }

    if (academicYear) {
      sql += ` AND vr.academic_year_snapshot = ?`;
      params.push(academicYear);
    }

    if (startDate) {
      sql += ` AND vr.date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND vr.date <= ?`;
      params.push(endDate);
    }

    if (month) {
      // format YYYY-MM
      sql += ` AND vr.date LIKE ?`;
      params.push(`${month}%`);
    }

    if (search) {
      const q = `%${search}%`;
      sql += ` AND (s.name LIKE ? OR s.student_number LIKE ? OR vr.violation_name_snapshot LIKE ? OR vr.notes LIKE ? OR vr.halaqah_name_snapshot LIKE ?)`;
      params.push(q, q, q, q, q);
    }

    // Dynamic sorting
    const validSortCols: Record<string, string> = {
      date: 'vr.date',
      points: 'vr.points_snapshot',
      student: 's.name',
      halaqah: 'vr.halaqah_name_snapshot',
      violation: 'vr.violation_name_snapshot',
      createdAt: 'vr.created_at',
    };

    const orderCol = validSortCols[sortBy as string] || 'vr.date';
    const direction = (sortDir as string)?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${orderCol} ${direction}, vr.time DESC, vr.created_at DESC`;

    const records = query<any>(sql, params);
    return res.json(records);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST record new violation (AUTO SNAPSHOT OF DATA)
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      studentId,
      halaqahId,
      violationId,
      division,
      supervisorName,
      locationName,
      date,
      time,
      notes,
      evidenceUrl,
      createdBy = 'Muhafizh',
    } = req.body;

    if (!studentId || !violationId) {
      return res.status(400).json({ error: 'Santri dan jenis pelanggaran wajib dipilih' });
    }

    // 1. Fetch Student
    const student = get<any>('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) {
      return res.status(404).json({ error: 'Santri tidak ditemukan' });
    }

    // 2. Fetch Violation Master (and its default points)
    const violation = get<any>('SELECT * FROM violations WHERE id = ?', [violationId]);
    if (!violation) {
      return res.status(404).json({ error: 'Jenis pelanggaran tidak ditemukan' });
    }

    // Determine division
    const finalDivision = division === 'kesantrian' ? 'kesantrian' : (violation.division === 'kesantrian' ? 'kesantrian' : 'tahfizh');

    // 3. Halaqah & Teacher resolution
    const actualHalaqahId = halaqahId || student.halaqah_id;
    let halaqahName = 'Tanpa Halaqah';
    let teacherId = null;
    let teacherName = 'Ustadz Pengampu';

    if (actualHalaqahId) {
      const hInfo = get<any>(`
        SELECT h.*, t.name as t_name
        FROM halaqah h
        LEFT JOIN teachers t ON t.id = h.teacher_id
        WHERE h.id = ?
      `, [actualHalaqahId]);

      if (hInfo) {
        halaqahName = hInfo.name;
        teacherId = hInfo.teacher_id;
        teacherName = hInfo.t_name || 'Ustadz Pengampu';
      }
    }

    // If Kesantrian division, allow location and supervisor overrides
    if (finalDivision === 'kesantrian') {
      if (locationName && locationName.trim()) {
        halaqahName = locationName.trim();
      } else {
        halaqahName = 'Asrama & Kesantrian';
      }

      if (supervisorName && supervisorName.trim()) {
        teacherName = supervisorName.trim();
      } else {
        teacherName = createdBy || 'Bagian Kesantrian';
      }
    }

    // Date and time defaults
    const today = new Date();
    const finalDate = date || today.toISOString().split('T')[0];
    const finalTime = time || today.toTimeString().substring(0, 5);

    const recordId = 'rec_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    // INSERT with SNAPSHOTS
    run(
      `INSERT INTO violation_records (
        id, student_id, division, halaqah_id, teacher_id, violation_id,
        violation_name_snapshot, points_snapshot, halaqah_name_snapshot,
        teacher_name_snapshot, student_class_snapshot, academic_year_snapshot,
        date, time, notes, evidence_url, status, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now', 'localtime'))`,
      [
        recordId,
        student.id,
        finalDivision,
        finalDivision === 'kesantrian' ? null : (actualHalaqahId || null),
        finalDivision === 'kesantrian' ? null : (teacherId || null),
        violation.id,
        violation.name,           // Snapshot name
        violation.default_points, // Snapshot points (Read-only from master)
        halaqahName,              // Snapshot halaqah / lokasi
        teacherName,              // Snapshot teacher / pembina
        student.class,            // Snapshot student class at this moment
        student.academic_year || '2025/2026',
        finalDate,
        finalTime,
        notes ? notes.trim() : '',
        evidenceUrl || '',
        createdBy,
      ]
    );

    // Calculate new total points for this student
    const totalPointsRow = get<any>(`
      SELECT COALESCE(SUM(points_snapshot), 0) as total,
             COALESCE(SUM(CASE WHEN division = 'tahfizh' THEN points_snapshot ELSE 0 END), 0) as tahfizh_points,
             COALESCE(SUM(CASE WHEN division = 'kesantrian' THEN points_snapshot ELSE 0 END), 0) as kesantrian_points
      FROM violation_records
      WHERE student_id = ? AND status = 'active'
    `, [student.id]);

    const newTotalPoints = Number(totalPointsRow?.total || 0);
    const tahfizhPoints = Number(totalPointsRow?.tahfizh_points || 0);
    const kesantrianPoints = Number(totalPointsRow?.kesantrian_points || 0);

    logAudit({
      userName: createdBy,
      action: 'RECORD_VIOLATION',
      tableName: 'violation_records',
      recordId: recordId,
      newData: {
        student: student.name,
        violation: violation.name,
        division: finalDivision,
        points: violation.default_points,
        newTotalPoints,
        tahfizhPoints,
        kesantrianPoints,
      },
    });

    return res.status(201).json({
      message: 'Pelanggaran berhasil dicatat.',
      recordId,
      studentName: student.name,
      violationName: violation.name,
      division: finalDivision,
      points: violation.default_points,
      newTotalPoints,
      tahfizhPoints,
      kesantrianPoints,
    });
  } catch (err: any) {
    console.error('Record violation error:', err);
    return res.status(500).json({ error: 'Data belum berhasil disimpan. Silakan coba kembali.' });
  }
});

// PUT cancel / soft delete record
router.put('/:id/cancel', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cancellationReason, actorName = 'Admin' } = req.body;

    const record = get<any>('SELECT * FROM violation_records WHERE id = ?', [id]);
    if (!record) return res.status(404).json({ error: 'Catatan pelanggaran tidak ditemukan' });

    if (record.status === 'cancelled') {
      return res.status(400).json({ error: 'Catatan pelanggaran ini sudah dibatalkan sebelumnya' });
    }

    run(
      `UPDATE violation_records
       SET status = 'cancelled', cancelled_at = datetime('now', 'localtime'), cancelled_by = ?, cancellation_reason = ?
       WHERE id = ?`,
      [actorName, cancellationReason || 'Dibatalkan oleh pengawas', id]
    );
    persistDb();

    logAudit({
      userName: actorName,
      action: 'CANCEL_VIOLATION_RECORD',
      tableName: 'violation_records',
      recordId: id,
      oldData: { status: 'active', points: record.points_snapshot },
      newData: { status: 'cancelled', reason: cancellationReason },
    });

    return res.json({ success: true, message: 'Catatan pelanggaran berhasil dibatalkan. Total poin santri telah diperbarui otomatis.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE hard delete record (Admin only)
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actorName = 'Admin' } = req.body || {};

    const record = get<any>('SELECT * FROM violation_records WHERE id = ?', [id]);
    if (!record) {
      return res.json({ success: true, message: 'Catatan pelanggaran sudah tidak ada atau telah dihapus' });
    }

    run('DELETE FROM violation_records WHERE id = ?', [id]);
    persistDb();

    logAudit({
      userName: actorName,
      action: 'HARD_DELETE_VIOLATION_RECORD',
      tableName: 'violation_records',
      recordId: id,
      oldData: record,
    });

    return res.json({ success: true, message: 'Catatan pelanggaran berhasil dihapus permanen' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET dashboard statistics & analytics
router.get('/stats', (req: Request, res: Response) => {
  try {
    const { division } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    const hasDivisionFilter = division && division !== 'all';
    const divisionFilterSql = hasDivisionFilter ? `AND vr.division = '${division}'` : '';

    const totalStudents = get<any>('SELECT COUNT(*) as count FROM students WHERE status = "active"')?.count || 0;
    const totalTeachers = get<any>('SELECT COUNT(*) as count FROM teachers WHERE status = "active"')?.count || 0;
    const totalHalaqah = get<any>('SELECT COUNT(*) as count FROM halaqah WHERE status = "active"')?.count || 0;
    
    const totalRecords = get<any>(`SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = 'active' WHERE vr.status = "active" ${divisionFilterSql}`)?.count || 0;
    const totalPoints = get<any>(`SELECT COALESCE(SUM(vr.points_snapshot), 0) as total FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = 'active' WHERE vr.status = "active" ${divisionFilterSql}`)?.total || 0;

    const tahfizhRecordsCount = get<any>('SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.status = "active" AND vr.division = "tahfizh"')?.count || 0;
    const tahfizhTotalPoints = get<any>('SELECT COALESCE(SUM(vr.points_snapshot), 0) as total FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.status = "active" AND vr.division = "tahfizh"')?.total || 0;

    const kesantrianRecordsCount = get<any>('SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.status = "active" AND vr.division = "kesantrian"')?.count || 0;
    const kesantrianTotalPoints = get<any>('SELECT COALESCE(SUM(vr.points_snapshot), 0) as total FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.status = "active" AND vr.division = "kesantrian"')?.total || 0;

    const todayCount = get<any>(`SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.date = ? AND vr.status = "active" ${divisionFilterSql}`, [today])?.count || 0;
    const monthCount = get<any>(`SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.date LIKE ? AND vr.status = "active" ${divisionFilterSql}`, [`${currentMonth}%`])?.count || 0;

    const totalPositiveRecords = get<any>(`SELECT COUNT(*) as count FROM positive_records pr JOIN students s ON s.id = pr.student_id AND s.status = "active" WHERE pr.status = "active" ${hasDivisionFilter ? `AND pr.division = '${division}'` : ''}`)?.count || 0;
    const totalPointsDeducted = get<any>(`SELECT COALESCE(SUM(pr.points_deducted), 0) as total FROM positive_records pr JOIN students s ON s.id = pr.student_id AND s.status = "active" WHERE pr.status = "active" ${hasDivisionFilter ? `AND pr.division = '${division}'` : ''}`)?.total || 0;

    const tahfizhDeductedPoints = get<any>('SELECT COALESCE(SUM(pr.points_deducted), 0) as total FROM positive_records pr JOIN students s ON s.id = pr.student_id AND s.status = "active" WHERE pr.status = "active" AND pr.division = "tahfizh"')?.total || 0;
    const kesantrianDeductedPoints = get<any>('SELECT COALESCE(SUM(pr.points_deducted), 0) as total FROM positive_records pr JOIN students s ON s.id = pr.student_id AND s.status = "active" WHERE pr.status = "active" AND pr.division = "kesantrian"')?.total || 0;

    // Thresholds
    const thresholds = query<any>('SELECT * FROM point_thresholds ORDER BY sort_order ASC');

    // Top 10 students with highest points (strictly active students)
    const topStudents = query<any>(`
      SELECT s.id, s.name, s.student_number, s.class, h.name as halaqah_name,
             COALESCE(SUM(vr.points_snapshot), 0) as total_points,
             COALESCE(SUM(CASE WHEN vr.division = 'tahfizh' THEN vr.points_snapshot ELSE 0 END), 0) as tahfizh_points,
             COALESCE(SUM(CASE WHEN vr.division = 'kesantrian' THEN vr.points_snapshot ELSE 0 END), 0) as kesantrian_points,
             COUNT(vr.id) as violation_count
      FROM students s
      LEFT JOIN halaqah h ON h.id = s.halaqah_id
      JOIN violation_records vr ON vr.student_id = s.id AND vr.status = 'active'
      WHERE s.status = 'active'
      ${hasDivisionFilter ? `AND vr.division = '${division}'` : ''}
      GROUP BY s.id
      ORDER BY total_points DESC
      LIMIT 10
    `);

    // Violations by category
    const byCategory = query<any>(`
      SELECT v.category, v.division, COUNT(vr.id) as count, COALESCE(SUM(vr.points_snapshot), 0) as points
      FROM violation_records vr
      JOIN students s ON s.id = vr.student_id AND s.status = 'active'
      JOIN violations v ON v.id = vr.violation_id
      WHERE vr.status = 'active' ${divisionFilterSql}
      GROUP BY v.category, v.division
      ORDER BY count DESC
    `);

    // Points per halaqah
    const pointsByHalaqah = query<any>(`
      SELECT vr.halaqah_name_snapshot as halaqah_name,
             COUNT(vr.id) as violation_count,
             COALESCE(SUM(vr.points_snapshot), 0) as total_points
      FROM violation_records vr
      JOIN students s ON s.id = vr.student_id AND s.status = 'active'
      WHERE vr.status = 'active' ${divisionFilterSql}
      GROUP BY vr.halaqah_name_snapshot
      ORDER BY total_points DESC
    `);

    // Violations per month (last 6 months)
    const monthlyTrend = query<any>(`
      SELECT substr(vr.date, 1, 7) as month,
             COUNT(vr.id) as count,
             COALESCE(SUM(vr.points_snapshot), 0) as points
      FROM violation_records vr
      JOIN students s ON s.id = vr.student_id AND s.status = 'active'
      WHERE vr.status = 'active' ${divisionFilterSql}
      GROUP BY month
      ORDER BY month ASC
      LIMIT 6
    `);

    // Santri needing attention (e.g. points >= 20)
    const attentionThreshold = thresholds.find(t => t.minimum_points > 0)?.minimum_points || 20;
    const studentsNeedingAttention = query<any>(`
      SELECT s.id, s.name, s.student_number, s.class, h.name as halaqah_name,
             COALESCE(SUM(vr.points_snapshot), 0) as total_points,
             COALESCE(SUM(CASE WHEN vr.division = 'tahfizh' THEN vr.points_snapshot ELSE 0 END), 0) as tahfizh_points,
             COALESCE(SUM(CASE WHEN vr.division = 'kesantrian' THEN vr.points_snapshot ELSE 0 END), 0) as kesantrian_points
      FROM students s
      LEFT JOIN halaqah h ON h.id = s.halaqah_id
      JOIN violation_records vr ON vr.student_id = s.id AND vr.status = 'active'
      WHERE s.status = 'active'
      ${hasDivisionFilter ? `AND vr.division = '${division}'` : ''}
      GROUP BY s.id
      HAVING total_points >= ?
      ORDER BY total_points DESC
    `, [attentionThreshold]);

    return res.json({
      summary: {
        totalStudents,
        totalTeachers,
        totalHalaqah,
        totalRecords,
        totalPoints,
        todayCount,
        monthCount,
        tahfizhRecordsCount,
        tahfizhTotalPoints,
        kesantrianRecordsCount,
        kesantrianTotalPoints,
        totalPositiveRecords,
        totalPointsDeducted,
        tahfizhDeductedPoints,
        kesantrianDeductedPoints,
        netTotalPoints: Math.max(0, totalPoints - totalPointsDeducted),
      },
      topStudents,
      byCategory,
      pointsByHalaqah,
      monthlyTrend,
      studentsNeedingAttention,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
