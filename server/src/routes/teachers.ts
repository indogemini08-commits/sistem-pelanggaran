import { Router, Request, Response } from 'express';
import { query, get, run, logAudit, persistDb, addTombstone } from '../db/database';

const router = Router();

// GET all teachers with their halaqahs
router.get('/', (req: Request, res: Response) => {
  try {
    const teachers = query<any>(`
      SELECT t.id, t.user_id, t.name, t.phone, t.status, t.created_at,
             u.email, u.role
      FROM teachers t
      LEFT JOIN users u ON u.id = t.user_id
      ORDER BY t.name ASC
    `);

    // Attach halaqahs for each teacher
    const halaqahs = query<any>('SELECT * FROM halaqah WHERE status = "active"');
    const result = teachers.map(t => {
      const assigned = halaqahs.filter(h => h.teacher_id === t.id);
      return {
        ...t,
        halaqahList: assigned,
        halaqahCount: assigned.length,
      };
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST add teacher
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phone, userId, status = 'active', actorName = 'Admin' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nama muhafizh wajib diisi' });
    }

    const teacherId = 'tch_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    run(
      `INSERT INTO teachers (id, user_id, name, phone, status, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      [teacherId, userId || null, name.trim(), phone || '', status]
    );

    logAudit({
      userName: actorName,
      action: 'CREATE_TEACHER',
      tableName: 'teachers',
      recordId: teacherId,
      newData: { name, phone, userId, status },
    });

    await persistDb();
    return res.status(201).json({ message: 'Data Muhafizh berhasil ditambahkan', teacherId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT edit teacher
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, userId, status, actorName = 'Admin' } = req.body;

    const oldTeacher = get<any>('SELECT * FROM teachers WHERE id = ?', [id]);
    if (!oldTeacher) return res.status(404).json({ error: 'Muhafizh tidak ditemukan' });

    const updatedName = name ? name.trim() : oldTeacher.name;
    const updatedPhone = phone !== undefined ? phone : oldTeacher.phone;
    const updatedUserId = userId !== undefined ? userId : oldTeacher.user_id;
    const updatedStatus = status || oldTeacher.status;

    run(
      `UPDATE teachers
       SET name = ?, phone = ?, user_id = ?, status = ?
       WHERE id = ?`,
      [updatedName, updatedPhone, updatedUserId, updatedStatus, id]
    );

    // If user is linked, update user's name
    if (updatedUserId) {
      run('UPDATE users SET name = ? WHERE id = ?', [updatedName, updatedUserId]);
    }

    logAudit({
      userName: actorName,
      action: 'UPDATE_TEACHER',
      tableName: 'teachers',
      recordId: id,
      oldData: oldTeacher,
      newData: { name: updatedName, phone: updatedPhone, status: updatedStatus },
    });

    await persistDb();
    return res.json({ message: 'Data Muhafizh berhasil diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE teacher
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actorName = 'Admin' } = req.body || {};

    const teacher = get<any>('SELECT * FROM teachers WHERE id = ?', [id]);
    if (!teacher) {
      return res.json({ message: 'Muhafizh sudah tidak ada atau telah dihapus' });
    }

    // Detach references safely
    run('UPDATE halaqah SET teacher_id = NULL WHERE teacher_id = ?', [id]);
    run('UPDATE student_halaqah_history SET teacher_id = NULL WHERE teacher_id = ?', [id]);
    run('UPDATE violation_records SET teacher_id = NULL WHERE teacher_id = ?', [id]);
    run('UPDATE positive_records SET teacher_id = NULL WHERE teacher_id = ?', [id]);
    run('DELETE FROM teachers WHERE id = ?', [id]);
    addTombstone(id, 'teacher');

    logAudit({
      userName: actorName,
      action: 'DELETE_TEACHER',
      tableName: 'teachers',
      recordId: id,
      oldData: teacher,
    });

    await persistDb();
    return res.json({ message: 'Muhafizh berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
