import { Router, Request, Response } from 'express';
import { query, get, run, logAudit } from '../db/database';

const router = Router();

// GET all users
router.get('/', (req: Request, res: Response) => {
  try {
    const users = query<any>(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
             t.id as teacher_id, t.phone as teacher_phone
      FROM users u
      LEFT JOIN teachers t ON t.user_id = u.id
      ORDER BY u.created_at DESC
    `);
    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST create user
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, email, password, role, status = 'active', phone, actorName = 'Admin' } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Nama, email, password, dan role wajib diisi' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = get<any>('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'Email sudah terdaftar untuk pengguna lain' });
    }

    const userId = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    run(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      [userId, name.trim(), cleanEmail, password, role, status]
    );

    // If role is teacher or guru, also create or link teacher record
    if (role === 'teacher' || role === 'guru') {
      const teacherId = 'tch_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      run(
        `INSERT INTO teachers (id, user_id, name, phone, status)
         VALUES (?, ?, ?, ?, 'active')`,
        [teacherId, userId, name.trim(), phone || '']
      );
    }

    logAudit({
      userName: actorName,
      action: 'CREATE_USER',
      tableName: 'users',
      recordId: userId,
      newData: { name, email: cleanEmail, role, status },
    });

    return res.status(201).json({ message: 'Pengguna berhasil ditambahkan', userId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update user
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status, phone, actorName = 'Admin' } = req.body;

    const oldUser = get<any>('SELECT * FROM users WHERE id = ?', [id]);
    if (!oldUser) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    const cleanEmail = email ? email.trim().toLowerCase() : oldUser.email;
    if (cleanEmail !== oldUser.email) {
      const conflict = get<any>('SELECT id FROM users WHERE email = ? AND id != ?', [cleanEmail, id]);
      if (conflict) return res.status(400).json({ error: 'Email sudah digunakan pengguna lain' });
    }

    const updatedPass = password ? password : oldUser.password_hash;
    const updatedRole = role || oldUser.role;
    const updatedStatus = status || oldUser.status;
    const updatedName = name ? name.trim() : oldUser.name;

    run(
      `UPDATE users
       SET name = ?, email = ?, password_hash = ?, role = ?, status = ?
       WHERE id = ?`,
      [updatedName, cleanEmail, updatedPass, updatedRole, updatedStatus, id]
    );

    // Update teacher phone/name if linked
    if (updatedRole === 'teacher' || updatedRole === 'guru') {
      const existingTeacher = get<any>('SELECT id FROM teachers WHERE user_id = ?', [id]);
      if (existingTeacher) {
        run('UPDATE teachers SET name = ?, phone = ? WHERE id = ?', [updatedName, phone || '', existingTeacher.id]);
      } else {
        const teacherId = 'tch_' + Math.random().toString(36).substring(2, 9);
        run('INSERT INTO teachers (id, user_id, name, phone, status) VALUES (?, ?, ?, ?, "active")', [teacherId, id, updatedName, phone || '']);
      }
    }

    logAudit({
      userName: actorName,
      action: 'UPDATE_USER',
      tableName: 'users',
      recordId: id,
      oldData: { name: oldUser.name, email: oldUser.email, role: oldUser.role, status: oldUser.status },
      newData: { name: updatedName, email: cleanEmail, role: updatedRole, status: updatedStatus },
    });

    return res.json({ message: 'Data pengguna berhasil diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE user
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actorName = 'Admin' } = req.body || {};

    const user = get<any>('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    // Protect against deleting last admin
    if (user.role === 'admin') {
      const adminCount = query<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE role = "admin"')[0]?.count || 0;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Tidak dapat menghapus admin utama satu-satunya' });
      }
    }

    // Set teachers user_id to NULL
    run('UPDATE teachers SET user_id = NULL WHERE user_id = ?', [id]);
    run('DELETE FROM users WHERE id = ?', [id]);

    logAudit({
      userName: actorName,
      action: 'DELETE_USER',
      tableName: 'users',
      recordId: id,
      oldData: { name: user.name, email: user.email, role: user.role },
    });

    return res.json({ message: 'Pengguna berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
