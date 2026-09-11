import { Router, Request, Response } from 'express';
import { query, get, run, logAudit } from '../db/database';

const router = Router();

// GET all positive actions (optional division filter: tahfizh | kesantrian)
router.get('/', (req: Request, res: Response) => {
  try {
    const { division, category, status } = req.query;
    let sql = 'SELECT * FROM positive_actions WHERE 1=1';
    const params: any[] = [];

    if (division && (division === 'tahfizh' || division === 'kesantrian')) {
      sql += ' AND division = ?';
      params.push(division);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY code ASC';
    const actions = query<any>(sql, params);
    return res.json(actions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET single positive action
router.get('/:id', (req: Request, res: Response) => {
  try {
    const action = get<any>('SELECT * FROM positive_actions WHERE id = ?', [req.params.id]);
    if (!action) return res.status(404).json({ error: 'Aturan kegiatan baik tidak ditemukan' });
    return res.json(action);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST create new positive action
router.post('/', (req: Request, res: Response) => {
  try {
    const { code, name, division = 'tahfizh', category, description, defaultPointsDeduction, actorName = 'Admin' } = req.body;

    if (!code || !name || !category || !defaultPointsDeduction) {
      return res.status(400).json({ error: 'Kode, nama, kategori, dan poin pengurangan wajib diisi' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = get<any>('SELECT id FROM positive_actions WHERE code = ?', [cleanCode]);
    if (existing) {
      return res.status(400).json({ error: `Kode aturan ${cleanCode} sudah digunakan` });
    }

    const points = parseInt(defaultPointsDeduction, 10);
    if (isNaN(points) || points <= 0) {
      return res.status(400).json({ error: 'Poin pengurangan harus berupa angka positif (> 0)' });
    }

    const actionId = 'act_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    run(
      `INSERT INTO positive_actions (id, code, name, division, category, description, default_points_deduction, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [actionId, cleanCode, name.trim(), division, category, description || '', points]
    );

    logAudit({
      userName: actorName,
      action: 'CREATE_POSITIVE_ACTION',
      tableName: 'positive_actions',
      recordId: actionId,
      newData: { code: cleanCode, name, division, category, points },
    });

    return res.status(201).json({ message: 'Aturan kegiatan baik berhasil ditambahkan', actionId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update positive action
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, division, category, description, defaultPointsDeduction, status, actorName = 'Admin' } = req.body;

    const oldAction = get<any>('SELECT * FROM positive_actions WHERE id = ?', [id]);
    if (!oldAction) return res.status(404).json({ error: 'Aturan kegiatan baik tidak ditemukan' });

    const cleanCode = code ? code.trim().toUpperCase() : oldAction.code;
    if (cleanCode !== oldAction.code) {
      const conflict = get<any>('SELECT id FROM positive_actions WHERE code = ? AND id != ?', [cleanCode, id]);
      if (conflict) return res.status(400).json({ error: `Kode aturan ${cleanCode} sudah digunakan` });
    }

    const points = defaultPointsDeduction !== undefined ? parseInt(defaultPointsDeduction, 10) : oldAction.default_points_deduction;
    if (isNaN(points) || points <= 0) {
      return res.status(400).json({ error: 'Poin pengurangan harus berupa angka positif (> 0)' });
    }

    const updatedDivision = division || oldAction.division;
    const updatedCategory = category || oldAction.category;
    const updatedName = name ? name.trim() : oldAction.name;
    const updatedDesc = description !== undefined ? description : oldAction.description;
    const updatedStatus = status || oldAction.status;

    run(
      `UPDATE positive_actions
       SET code = ?, name = ?, division = ?, category = ?, description = ?, default_points_deduction = ?, status = ?
       WHERE id = ?`,
      [cleanCode, updatedName, updatedDivision, updatedCategory, updatedDesc, points, updatedStatus, id]
    );

    logAudit({
      userName: actorName,
      action: 'UPDATE_POSITIVE_ACTION',
      tableName: 'positive_actions',
      recordId: id,
      oldData: oldAction,
      newData: { code: cleanCode, name: updatedName, division: updatedDivision, category: updatedCategory, points, status: updatedStatus },
    });

    return res.json({ message: 'Aturan kegiatan baik berhasil diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE positive action (soft delete by status inactive)
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actorName = 'Admin' } = req.body || {};

    const oldAction = get<any>('SELECT * FROM positive_actions WHERE id = ?', [id]);
    if (!oldAction) return res.json({ message: 'Aturan kegiatan baik sudah tidak ada atau telah dihapus' });

    // Check if used in positive_records
    const usageCount = query<{ count: number }>('SELECT COUNT(*) as count FROM positive_records WHERE action_id = ?', [id])[0]?.count || 0;
    if (usageCount > 0) {
      run('UPDATE positive_actions SET status = "inactive" WHERE id = ?', [id]);
      return res.json({ message: 'Aturan dinonaktifkan karena telah digunakan dalam riwayat santri' });
    }

    run('DELETE FROM positive_actions WHERE id = ?', [id]);

    logAudit({
      userName: actorName,
      action: 'DELETE_POSITIVE_ACTION',
      tableName: 'positive_actions',
      recordId: id,
      oldData: oldAction,
    });

    return res.json({ message: 'Aturan kegiatan baik berhasil dihapus permanen' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
