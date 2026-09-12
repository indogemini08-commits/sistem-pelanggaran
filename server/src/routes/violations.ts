import { Router, Request, Response } from 'express';
import { query, get, run, logAudit, persistDb } from '../db/database';

const router = Router();

// GET all master violations
router.get('/', (req: Request, res: Response) => {
  try {
    const { division } = req.query;
    let sql = `
      SELECT v.*,
             (SELECT COUNT(*) FROM violation_records vr WHERE vr.violation_id = v.id AND vr.status = 'active') as usage_count
      FROM violations v
      WHERE 1=1
    `;
    const params: any[] = [];

    if (division && division !== 'all') {
      sql += ` AND v.division = ?`;
      params.push(division);
    }

    sql += ` ORDER BY v.code ASC`;

    const violations = query<any>(sql, params);
    return res.json(violations);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST create master violation
router.post('/', (req: Request, res: Response) => {
  try {
    const { code, name, category, defaultPoints, description, division = 'tahfizh', status = 'active', actorName = 'Admin' } = req.body;
    if (!name || !category || defaultPoints === undefined || defaultPoints <= 0) {
      return res.status(400).json({ error: 'Nama, kategori, dan poin (>0) wajib diisi' });
    }

    const cleanDivision = division === 'kesantrian' ? 'kesantrian' : 'tahfizh';

    // Auto-generate code if empty
    let cleanCode = code ? code.trim().toUpperCase() : '';
    if (!cleanCode) {
      const prefix = cleanDivision === 'kesantrian' ? 'KS' : 'P';
      const last = get<any>(`SELECT code FROM violations WHERE code LIKE "${prefix}%" ORDER BY code DESC LIMIT 1`);
      if (last && last.code.startsWith(prefix)) {
        const numPart = parseInt(last.code.replace(prefix, ''), 10);
        if (!isNaN(numPart)) {
          cleanCode = prefix + (numPart + 1).toString().padStart(3, '0');
        } else {
          cleanCode = prefix + '001';
        }
      } else {
        cleanCode = prefix + '001';
      }
    }

    const existingCode = get<any>('SELECT id FROM violations WHERE code = ?', [cleanCode]);
    if (existingCode) {
      return res.status(400).json({ error: `Kode pelanggaran ${cleanCode} sudah ada` });
    }

    const violationId = 'v_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    run(
      `INSERT INTO violations (id, code, name, division, category, description, default_points, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      [violationId, cleanCode, name.trim(), cleanDivision, category, description || '', parseInt(defaultPoints, 10), status]
    );

    persistDb();

    logAudit({
      userName: actorName,
      action: 'CREATE_MASTER_VIOLATION',
      tableName: 'violations',
      recordId: violationId,
      newData: { code: cleanCode, name, division: cleanDivision, category, defaultPoints, description },
    });

    return res.status(201).json({ message: 'Master pelanggaran berhasil ditambahkan', violationId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update master violation (EDIT POINTS, NAME, CATEGORY, STATUS, DIVISION)
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, category, defaultPoints, description, division, status, actorName = 'Admin' } = req.body;

    const old = get<any>('SELECT * FROM violations WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ error: 'Data pelanggaran tidak ditemukan' });

    const cleanCode = code ? code.trim().toUpperCase() : old.code;
    if (cleanCode !== old.code) {
      const conflict = get<any>('SELECT id FROM violations WHERE code = ? AND id != ?', [cleanCode, id]);
      if (conflict) return res.status(400).json({ error: 'Kode sudah digunakan master lain' });
    }

    const updatedPoints = defaultPoints !== undefined ? parseInt(defaultPoints, 10) : old.default_points;
    if (updatedPoints <= 0) {
      return res.status(400).json({ error: 'Poin pelanggaran harus lebih besar dari 0' });
    }

    const updatedName = name ? name.trim() : old.name;
    const updatedCategory = category || old.category;
    const updatedDesc = description !== undefined ? description : old.description;
    const updatedStatus = status || old.status;
    const updatedDivision = division || old.division || 'tahfizh';

    run(
      `UPDATE violations
       SET code = ?, name = ?, division = ?, category = ?, default_points = ?, description = ?, status = ?
       WHERE id = ?`,
      [cleanCode, updatedName, updatedDivision, updatedCategory, updatedPoints, updatedDesc, updatedStatus, id]
    );
    persistDb();

    logAudit({
      userName: actorName,
      action: 'UPDATE_MASTER_VIOLATION',
      tableName: 'violations',
      recordId: id,
      oldData: old,
      newData: { code: cleanCode, name: updatedName, division: updatedDivision, category: updatedCategory, default_points: updatedPoints, status: updatedStatus },
    });

    return res.json({
      message: 'Master pelanggaran berhasil diperbarui. Catatan historis sebelumnya tetap aman dan tidak terpengaruh.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST bulk delete master violations (Admin only)
router.post('/bulk-delete', (req: Request, res: Response) => {
  try {
    const { ids, actorName = 'Admin' } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Daftar ID master pelanggaran wajib diisi' });
    }

    const deleted: string[] = [];
    for (const id of ids) {
      const violation = get<any>('SELECT * FROM violations WHERE id = ?', [id]);
      if (!violation) continue;

      run('UPDATE violation_records SET violation_id = NULL WHERE violation_id = ?', [id]);
      run('DELETE FROM violations WHERE id = ?', [id]);
      logAudit({
        userName: actorName,
        action: 'BULK_DELETE_MASTER_VIOLATION',
        tableName: 'violations',
        recordId: id,
        oldData: violation,
      });
      deleted.push(id);
    }
    persistDb();

    return res.json({
      success: true,
      deletedCount: deleted.length,
      deletedIds: deleted,
      message: `${deleted.length} master pelanggaran berhasil dihapus`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal menghapus pelanggaran secara massal' });
  }
});

// DELETE master violation
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actorName = 'Admin' } = req.body || {};

    const violation = get<any>('SELECT * FROM violations WHERE id = ?', [id]);
    if (!violation) {
      return res.json({ message: 'Pelanggaran sudah tidak ada atau telah dihapus' });
    }

    // We do not hard delete if there are historical records, or we nullify FK because records have snapshots!
    run('UPDATE violation_records SET violation_id = NULL WHERE violation_id = ?', [id]);
    run('DELETE FROM violations WHERE id = ?', [id]);
    persistDb();

    logAudit({
      userName: actorName,
      action: 'DELETE_MASTER_VIOLATION',
      tableName: 'violations',
      recordId: id,
      oldData: violation,
    });

    return res.json({ message: 'Master pelanggaran berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
