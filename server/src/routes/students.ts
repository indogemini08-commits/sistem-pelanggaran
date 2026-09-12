import { Router, Request, Response } from 'express';
import { query, get, run, logAudit, persistDb, addTombstone } from '../db/database';

const router = Router();

// Helper to determine threshold status based on points
function getStatusForPoints(points: number, thresholds: any[]) {
  for (const th of thresholds) {
    if (points >= th.minimum_points && points <= th.maximum_points) {
      return {
        statusName: th.status_name,
        badgeColor: th.badge_color,
        description: th.description,
      };
    }
  }
  // Default fallback if above highest
  if (thresholds.length > 0) {
    const highest = thresholds[thresholds.length - 1];
    if (points >= highest.minimum_points) {
      return {
        statusName: highest.status_name,
        badgeColor: highest.badge_color,
        description: highest.description,
      };
    }
  }
  return { statusName: 'AMAN', badgeColor: 'emerald', description: 'Kondisi baik' };
}

// GET all students
router.get('/', (req: Request, res: Response) => {
  try {
    const thresholds = query<any>('SELECT * FROM point_thresholds ORDER BY sort_order ASC');
    const students = query<any>(`
      SELECT s.id, s.student_number, s.name, s.class, s.gender, s.halaqah_id, s.academic_year, s.status, s.created_at,
             h.name as halaqah_name,
             t.name as teacher_name,
             COALESCE(SUM(CASE WHEN vr.status = 'active' THEN vr.points_snapshot ELSE 0 END), 0) as gross_total_points,
             COALESCE(SUM(CASE WHEN vr.status = 'active' AND vr.division = 'tahfizh' THEN vr.points_snapshot ELSE 0 END), 0) as gross_tahfizh_points,
             COALESCE(SUM(CASE WHEN vr.status = 'active' AND vr.division = 'kesantrian' THEN vr.points_snapshot ELSE 0 END), 0) as gross_kesantrian_points,
             COUNT(CASE WHEN vr.status = 'active' THEN 1 ELSE NULL END) as violation_count,
             COUNT(CASE WHEN vr.status = 'active' AND vr.division = 'tahfizh' THEN 1 ELSE NULL END) as tahfizh_violation_count,
             COUNT(CASE WHEN vr.status = 'active' AND vr.division = 'kesantrian' THEN 1 ELSE NULL END) as kesantrian_violation_count
      FROM students s
      LEFT JOIN halaqah h ON h.id = s.halaqah_id
      LEFT JOIN teachers t ON t.id = h.teacher_id
      LEFT JOIN violation_records vr ON vr.student_id = s.id
      GROUP BY s.id
      ORDER BY s.name ASC
    `);

    // Fetch positive deductions per student
    const deductionsList = query<any>(`
      SELECT student_id,
             COALESCE(SUM(points_deducted), 0) as total_deducted,
             COALESCE(SUM(CASE WHEN division = 'tahfizh' THEN points_deducted ELSE 0 END), 0) as tahfizh_deducted,
             COALESCE(SUM(CASE WHEN division = 'kesantrian' THEN points_deducted ELSE 0 END), 0) as kesantrian_deducted,
             COUNT(*) as positive_count
      FROM positive_records
      WHERE status = 'active'
      GROUP BY student_id
    `);

    const deductionsMap = new Map<string, any>();
    for (const d of deductionsList) {
      deductionsMap.set(d.student_id, d);
    }

    const enriched = students.map(s => {
      const grossTahfizh = Number(s.gross_tahfizh_points || 0);
      const grossKesantrian = Number(s.gross_kesantrian_points || 0);

      const dInfo = deductionsMap.get(s.id) || {};
      const deductedTahfizh = Number(dInfo.tahfizh_deducted || 0);
      const deductedKesantrian = Number(dInfo.kesantrian_deducted || 0);
      const totalDeductions = Number(dInfo.total_deducted || 0);
      const positiveCount = Number(dInfo.positive_count || 0);

      const netTahfizh = Math.max(0, grossTahfizh - deductedTahfizh);
      const netKesantrian = Math.max(0, grossKesantrian - deductedKesantrian);
      const totalNetPts = netTahfizh + netKesantrian;

      const st = getStatusForPoints(totalNetPts, thresholds);
      return {
        ...s,
        total_points: totalNetPts,
        tahfizh_points: netTahfizh,
        kesantrian_points: netKesantrian,
        gross_total_points: grossTahfizh + grossKesantrian,
        gross_tahfizh_points: grossTahfizh,
        gross_kesantrian_points: grossKesantrian,
        tahfizh_deductions: deductedTahfizh,
        kesantrian_deductions: deductedKesantrian,
        total_deductions: totalDeductions,
        positive_count: positiveCount,
        status_info: st,
      };
    });

    return res.json(enriched);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET portal detail by NIS for Parent/Guardian Portal
router.get('/portal/:nis', (req: Request, res: Response) => {
  try {
    const rawNis = req.params.nis ? req.params.nis.trim() : '';
    if (!rawNis) {
      return res.status(400).json({ error: 'Nomor Induk Santri (NIS) wajib diisi' });
    }

    const student = get<any>(`
      SELECT s.*,
             h.name as halaqah_name, h.schedule as halaqah_schedule, h.location as halaqah_location,
             t.name as teacher_name, t.phone as teacher_phone
      FROM students s
      LEFT JOIN halaqah h ON h.id = s.halaqah_id
      LEFT JOIN teachers t ON t.id = h.teacher_id
      WHERE (s.student_number = ? OR s.id = ?) AND s.status = 'active'
    `, [rawNis, rawNis]);

    if (!student) {
      return res.status(404).json({
        error: `Data santri dengan NIS "${rawNis}" tidak ditemukan atau berstatus non-aktif. Pastikan NIS yang dimasukkan sudah benar.`,
      });
    }

    // Point thresholds
    const thresholds = query<any>('SELECT * FROM point_thresholds ORDER BY sort_order ASC');

    // Violations list (all records for this student)
    const records = query<any>(`
      SELECT vr.*
      FROM violation_records vr
      WHERE vr.student_id = ?
      ORDER BY vr.date DESC, vr.time DESC
    `, [student.id]);

    // Positive deeds list (Kebaikan & Apresiasi)
    const positiveRecords = query<any>(`
      SELECT pr.*, pa.category as action_category, pa.code as action_code
      FROM positive_records pr
      LEFT JOIN positive_actions pa ON pa.id = pr.action_id
      WHERE pr.student_id = ?
      ORDER BY pr.date DESC, pr.time DESC
    `, [student.id]);

    // Calculate gross violation points
    const activeRecords = records.filter((r: any) => r.status === 'active');
    const grossTahfizh = activeRecords.filter((r: any) => r.division === 'tahfizh').reduce((sum: number, r: any) => sum + Number(r.points_snapshot || 0), 0);
    const grossKesantrian = activeRecords.filter((r: any) => r.division === 'kesantrian').reduce((sum: number, r: any) => sum + Number(r.points_snapshot || 0), 0);

    // Calculate active positive deductions
    const activePosRecords = positiveRecords.filter((r: any) => r.status === 'active');
    const deductedTahfizh = activePosRecords.filter((r: any) => r.division === 'tahfizh').reduce((sum: number, r: any) => sum + Number(r.points_deducted || 0), 0);
    const deductedKesantrian = activePosRecords.filter((r: any) => r.division === 'kesantrian').reduce((sum: number, r: any) => sum + Number(r.points_deducted || 0), 0);

    // Net points
    const netTahfizh = Math.max(0, grossTahfizh - deductedTahfizh);
    const netKesantrian = Math.max(0, grossKesantrian - deductedKesantrian);
    const totalNetPoints = netTahfizh + netKesantrian;

    const statusInfo = getStatusForPoints(totalNetPoints, thresholds);

    // School Settings for Kop & contact
    const settings = get<any>('SELECT * FROM school_settings LIMIT 1') || null;

    return res.json({
      student: {
        ...student,
        total_points: totalNetPoints,
        tahfizh_points: netTahfizh,
        kesantrian_points: netKesantrian,
        gross_total_points: grossTahfizh + grossKesantrian,
        gross_tahfizh_points: grossTahfizh,
        gross_kesantrian_points: grossKesantrian,
        tahfizh_deductions: deductedTahfizh,
        kesantrian_deductions: deductedKesantrian,
        total_deductions: deductedTahfizh + deductedKesantrian,
        status_info: statusInfo,
      },
      records,
      positive_records: positiveRecords,
      thresholds,
      settings,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal memuat data portal wali santri' });
  }
});

// GET single student detail
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = get<any>(`
      SELECT s.*,
             h.name as halaqah_name, h.schedule as halaqah_schedule, h.location as halaqah_location,
             t.name as teacher_name, t.phone as teacher_phone
      FROM students s
      LEFT JOIN halaqah h ON h.id = s.halaqah_id
      LEFT JOIN teachers t ON t.id = h.teacher_id
      WHERE s.id = ? OR s.student_number = ?
    `, [id, id]);

    if (!student) return res.status(404).json({ error: 'Santri tidak ditemukan' });

    // Thresholds
    const thresholds = query<any>('SELECT * FROM point_thresholds ORDER BY sort_order ASC');

    // Violations list
    const records = query<any>(`
      SELECT vr.*
      FROM violation_records vr
      WHERE vr.student_id = ?
      ORDER BY vr.date DESC, vr.time DESC
    `, [student.id]);

    // Positive deeds list (Kebaikan & Pengurangan Poin)
    const positiveRecords = query<any>(`
      SELECT pr.*, pa.category as action_category, pa.code as action_code
      FROM positive_records pr
      LEFT JOIN positive_actions pa ON pa.id = pr.action_id
      WHERE pr.student_id = ?
      ORDER BY pr.date DESC, pr.time DESC
    `, [student.id]);

    // Calculate gross violation points
    const activeRecords = records.filter((r: any) => r.status === 'active');
    const grossTahfizh = activeRecords.filter((r: any) => r.division === 'tahfizh').reduce((sum: number, r: any) => sum + Number(r.points_snapshot || 0), 0);
    const grossKesantrian = activeRecords.filter((r: any) => r.division === 'kesantrian').reduce((sum: number, r: any) => sum + Number(r.points_snapshot || 0), 0);

    // Calculate active positive deductions
    const activePosRecords = positiveRecords.filter((r: any) => r.status === 'active');
    const deductedTahfizh = activePosRecords.filter((r: any) => r.division === 'tahfizh').reduce((sum: number, r: any) => sum + Number(r.points_deducted || 0), 0);
    const deductedKesantrian = activePosRecords.filter((r: any) => r.division === 'kesantrian').reduce((sum: number, r: any) => sum + Number(r.points_deducted || 0), 0);

    // Net points
    const netTahfizh = Math.max(0, grossTahfizh - deductedTahfizh);
    const netKesantrian = Math.max(0, grossKesantrian - deductedKesantrian);
    const totalNetPoints = netTahfizh + netKesantrian;

    const statusInfo = getStatusForPoints(totalNetPoints, thresholds);

    // Halaqah history
    const history = query<any>(`
      SELECT sh.*, h.name as halaqah_name, t.name as teacher_name
      FROM student_halaqah_history sh
      LEFT JOIN halaqah h ON h.id = sh.halaqah_id
      LEFT JOIN teachers t ON t.id = sh.teacher_id
      WHERE sh.student_id = ?
      ORDER BY sh.start_date DESC
    `, [student.id]);

    return res.json({
      student: {
        ...student,
        total_points: totalNetPoints,
        tahfizh_points: netTahfizh,
        kesantrian_points: netKesantrian,
        gross_total_points: grossTahfizh + grossKesantrian,
        gross_tahfizh_points: grossTahfizh,
        gross_kesantrian_points: grossKesantrian,
        tahfizh_deductions: deductedTahfizh,
        kesantrian_deductions: deductedKesantrian,
        total_deductions: deductedTahfizh + deductedKesantrian,
        status_info: statusInfo,
      },
      records,
      positive_records: positiveRecords,
      history,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST create student
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      studentNumber,
      name,
      studentClass,
      gender,
      halaqahId,
      academicYear = '2025/2026',
      status = 'active',
      actorName = 'Admin',
    } = req.body;

    if (!studentNumber || !name || !studentClass || !gender) {
      return res.status(400).json({ error: 'NIS, nama, kelas, dan jenis kelamin wajib diisi' });
    }

    const cleanNIS = studentNumber.toString().trim();
    const existing = get<any>('SELECT id FROM students WHERE student_number = ?', [cleanNIS]);
    if (existing) {
      return res.status(400).json({ error: `Santri dengan NIS ${cleanNIS} sudah terdaftar` });
    }

    const studentId = 'std_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    run(
      `INSERT INTO students (id, student_number, name, class, gender, halaqah_id, academic_year, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      [studentId, cleanNIS, name.trim(), studentClass.trim(), gender, halaqahId || null, academicYear, status]
    );

    // Record halaqah history
    if (halaqahId) {
      const hInfo = get<any>('SELECT teacher_id FROM halaqah WHERE id = ?', [halaqahId]);
      run(
        `INSERT INTO student_halaqah_history (id, student_id, halaqah_id, teacher_id, academic_year, class, start_date)
         VALUES (?, ?, ?, ?, ?, ?, date('now', 'localtime'))`,
        ['hist_' + studentId, studentId, halaqahId, hInfo?.teacher_id || null, academicYear, studentClass.trim()]
      );
    }

    logAudit({
      userName: actorName,
      action: 'CREATE_STUDENT',
      tableName: 'students',
      recordId: studentId,
      newData: { studentNumber: cleanNIS, name, class: studentClass, gender, halaqahId },
    });

    return res.status(201).json({ message: 'Santri berhasil ditambahkan', studentId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update student
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      studentNumber,
      name,
      studentClass,
      gender,
      halaqahId,
      academicYear,
      status,
      actorName = 'Admin',
    } = req.body;

    const old = get<any>('SELECT * FROM students WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ error: 'Santri tidak ditemukan' });

    const cleanNIS = studentNumber ? studentNumber.toString().trim() : old.student_number;
    if (cleanNIS !== old.student_number) {
      const conflict = get<any>('SELECT id FROM students WHERE student_number = ? AND id != ?', [cleanNIS, id]);
      if (conflict) return res.status(400).json({ error: `NIS ${cleanNIS} sudah digunakan oleh santri lain` });
    }

    const updatedName = name ? name.trim() : old.name;
    const updatedClass = studentClass ? studentClass.trim() : old.class;
    const updatedGender = gender || old.gender;
    const updatedHalaqahId = halaqahId !== undefined ? halaqahId : old.halaqah_id;
    const updatedYear = academicYear || old.academic_year;
    const updatedStatus = status || old.status;

    run(
      `UPDATE students
       SET student_number = ?, name = ?, class = ?, gender = ?, halaqah_id = ?, academic_year = ?, status = ?
       WHERE id = ?`,
      [cleanNIS, updatedName, updatedClass, updatedGender, updatedHalaqahId || null, updatedYear, updatedStatus, id]
    );

    // If halaqah or class changed, update history
    if (updatedHalaqahId && updatedHalaqahId !== old.halaqah_id) {
      const hInfo = get<any>('SELECT teacher_id FROM halaqah WHERE id = ?', [updatedHalaqahId]);
      const histId = 'hist_' + Math.random().toString(36).substring(2, 8);
      run(
        `INSERT INTO student_halaqah_history (id, student_id, halaqah_id, teacher_id, academic_year, class, start_date)
         VALUES (?, ?, ?, ?, ?, ?, date('now', 'localtime'))`,
        [histId, id, updatedHalaqahId, hInfo?.teacher_id || null, updatedYear, updatedClass]
      );
    }

    logAudit({
      userName: actorName,
      action: 'UPDATE_STUDENT',
      tableName: 'students',
      recordId: id,
      oldData: old,
      newData: { studentNumber: cleanNIS, name: updatedName, class: updatedClass, halaqahId: updatedHalaqahId },
    });

    return res.json({ message: 'Data santri berhasil diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE student
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actorName = 'Admin' } = req.body || {};

    const student = get<any>('SELECT * FROM students WHERE id = ? OR student_number = ?', [id, id]);
    if (!student) {
      // Idempotent: If student is already deleted or not found, return success so frontend stays clean
      return res.json({ success: true, message: 'Santri sudah tidak ada atau telah dihapus' });
    }

    const targetId = student.id;

    // Cascade delete history & records safely
    run('DELETE FROM student_halaqah_history WHERE student_id = ?', [targetId]);
    run('DELETE FROM violation_records WHERE student_id = ?', [targetId]);
    run('DELETE FROM positive_records WHERE student_id = ?', [targetId]);
    run('DELETE FROM students WHERE id = ?', [targetId]);
    addTombstone(targetId, 'student');

    // Ensure database changes are flushed immediately to disk
    persistDb();

    logAudit({
      userName: actorName,
      action: 'DELETE_STUDENT',
      tableName: 'students',
      recordId: targetId,
      oldData: student,
    });

    console.log(`[DELETE_STUDENT] Santri ${student.name} (${targetId}) dan seluruh histori berhasil dihapus permanen oleh ${actorName}.`);
    return res.json({ success: true, message: 'Santri beserta histori berhasil dihapus secara permanen' });
  } catch (err: any) {
    console.error('Error saat menghapus santri:', err);
    return res.status(500).json({ error: err.message || 'Gagal menghapus santri dari database' });
  }
});

// POST bulk delete students (Admin only)
router.post('/bulk-delete', (req: Request, res: Response) => {
  try {
    const { ids, actorName = 'Admin' } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Daftar ID santri wajib diisi' });
    }

    const deleted: string[] = [];
    const skipped: string[] = [];

    for (const id of ids) {
      const student = get<any>('SELECT id, name, student_number FROM students WHERE id = ?', [id]);
      if (!student) {
        skipped.push(id);
        continue;
      }
      run('DELETE FROM student_halaqah_history WHERE student_id = ?', [student.id]);
      run('DELETE FROM violation_records WHERE student_id = ?', [student.id]);
      run('DELETE FROM positive_records WHERE student_id = ?', [student.id]);
      run('DELETE FROM students WHERE id = ?', [student.id]);
      addTombstone(student.id, 'student');
      logAudit({
        userName: actorName,
        action: 'BULK_DELETE_STUDENT',
        tableName: 'students',
        recordId: student.id,
        oldData: { name: student.name, student_number: student.student_number },
      });
      deleted.push(student.id);
    }

    persistDb();
    console.log(`[BULK_DELETE] ${deleted.length} santri dihapus permanen oleh ${actorName}`);
    return res.json({
      success: true,
      deletedCount: deleted.length,
      skippedCount: skipped.length,
      deletedIds: deleted,
      message: `${deleted.length} santri beserta seluruh riwayatnya berhasil dihapus permanen`,
    });
  } catch (err: any) {
    console.error('Error bulk delete santri:', err);
    return res.status(500).json({ error: err.message || 'Gagal menghapus santri secara massal' });
  }
});

// POST import students from Excel / JSON rows (REALLY SAVES TO DATABASE!)
router.post('/import', (req: Request, res: Response) => {
  try {
    const { rows, actorName = 'Admin' } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Data impor tidak boleh kosong' });
    }

    const halaqahs = query<any>('SELECT id, name, teacher_id FROM halaqah');
    const halaqahMap = new Map<string, any>();
    halaqahs.forEach(h => halaqahMap.set(h.name.toLowerCase().trim(), h));

    const existingNISs = new Set<string>(
      query<any>('SELECT student_number FROM students').map(s => s.student_number.toString().trim())
    );

    let insertedCount = 0;
    const insertedList: any[] = [];
    const errors: any[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 2; // Excel line count (header is row 1)

      const nis = (row.student_number || row.nis || row.NIS || '').toString().trim();
      const name = (row.name || row.nama || row.Nama || '').toString().trim();
      const studentClass = (row.class || row.kelas || row.Kelas || '').toString().trim();
      const rawGender = (row.gender || row.jenis_kelamin || row.Gender || row.JK || 'L').toString().toUpperCase().trim();
      const gender = (rawGender.startsWith('P') || rawGender === 'PEREMPUAN') ? 'P' : 'L';
      const halaqahName = (row.halaqah || row.nama_halaqah || row.Halaqah || '').toString().trim();
      const academicYear = (row.academic_year || row.tahun_ajaran || '2025/2026').toString().trim();

      if (!nis) {
        errors.push({ row: rowNum, error: 'NIS wajib diisi' });
        continue;
      }
      if (!name) {
        errors.push({ row: rowNum, error: `Nama santri (NIS: ${nis}) wajib diisi` });
        continue;
      }
      if (!studentClass) {
        errors.push({ row: rowNum, error: `Kelas untuk santri ${name} wajib diisi` });
        continue;
      }
      if (existingNISs.has(nis)) {
        errors.push({ row: rowNum, error: `NIS ${nis} (${name}) sudah ada di database` });
        continue;
      }

      // Match halaqah
      let halaqahId: string | null = null;
      let teacherId: string | null = null;
      if (halaqahName) {
        const matched = halaqahMap.get(halaqahName.toLowerCase());
        if (matched) {
          halaqahId = matched.id;
          teacherId = matched.teacher_id;
        } else {
          // Create halaqah on the fly if not exists
          const newHalaqahId = 'hlq_' + Math.random().toString(36).substring(2, 8);
          run(
            `INSERT INTO halaqah (id, name, teacher_id, schedule, location, academic_year, status)
             VALUES (?, ?, NULL, "Ba'da Subuh", 'Masjid', ?, 'active')`,
            [newHalaqahId, halaqahName, academicYear]
          );
          const newHalaqahObj = { id: newHalaqahId, name: halaqahName, teacher_id: null };
          halaqahMap.set(halaqahName.toLowerCase(), newHalaqahObj);
          halaqahId = newHalaqahId;
        }
      }

      const studentId = 'std_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      run(
        `INSERT INTO students (id, student_number, name, class, gender, halaqah_id, academic_year, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now', 'localtime'))`,
        [studentId, nis, name, studentClass, gender, halaqahId, academicYear]
      );

      if (halaqahId) {
        run(
          `INSERT INTO student_halaqah_history (id, student_id, halaqah_id, teacher_id, academic_year, class, start_date)
           VALUES (?, ?, ?, ?, ?, ?, date('now', 'localtime'))`,
          ['hist_' + studentId, studentId, halaqahId, teacherId, academicYear, studentClass]
        );
      }

      existingNISs.add(nis);
      insertedCount++;
      insertedList.push({ id: studentId, nis, name, studentClass, halaqahName });
    }

    logAudit({
      userName: actorName,
      action: 'IMPORT_EXCEL_STUDENTS',
      tableName: 'students',
      newData: { insertedCount, errorsCount: errors.length },
    });

    return res.json({
      message: `Berhasil mengimpor ${insertedCount} santri ke database.`,
      insertedCount,
      errorsCount: errors.length,
      errors,
      insertedList,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
