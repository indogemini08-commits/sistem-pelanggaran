import { Router, Request, Response } from 'express';
import { query, get, run, logAudit } from '../db/database';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi' });
    }

    const cleanInput = email.trim().toLowerCase();
    const user = get<any>('SELECT * FROM users WHERE (LOWER(email) = ? OR LOWER(name) = ?) AND status = "active"', [cleanInput, cleanInput]);
    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: 'Email / Username atau kata sandi tidak sesuai' });
    }

    // If teacher, fetch teacher info & assigned halaqahs
    let teacherInfo = null;
    let assignedHalaqahs: any[] = [];
    if (user.role === 'teacher' || user.role === 'guru') {
      teacherInfo = get<any>('SELECT * FROM teachers WHERE user_id = ?', [user.id]);
      if (!teacherInfo) {
        // Find teacher by name or email match
        teacherInfo = get<any>('SELECT * FROM teachers WHERE name LIKE ?', [`%${user.name}%`]);
      }
      if (teacherInfo) {
        assignedHalaqahs = query<any>('SELECT * FROM halaqah WHERE teacher_id = ? AND status = "active"', [teacherInfo.id]);
      }
    }

    logAudit({
      userId: user.id,
      userName: user.name,
      action: 'LOGIN',
      tableName: 'users',
      recordId: user.id,
      newData: { email: user.email, role: user.role }
    });

    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teacherId: teacherInfo?.id || null,
      assignedHalaqahs: assignedHalaqahs,
      token: 'sess_' + Buffer.from(`${user.id}:${Date.now()}`).toString('base64'),
    };

    return res.json({
      message: 'Login berhasil',
      user: sessionData,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan sistem saat login' });
  }
});

router.post('/change-password', (req: Request, res: Response) => {
  try {
    const { userId, oldPassword, newPassword, actorName } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const user = get<any>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    if (oldPassword && user.password_hash !== oldPassword) {
      return res.status(400).json({ error: 'Password lama tidak cocok' });
    }

    run('UPDATE users SET password_hash = ? WHERE id = ?', [newPassword, userId]);

    logAudit({
      userId: userId,
      userName: actorName || user.name,
      action: 'CHANGE_PASSWORD',
      tableName: 'users',
      recordId: userId,
    });

    return res.json({ message: 'Password berhasil diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
