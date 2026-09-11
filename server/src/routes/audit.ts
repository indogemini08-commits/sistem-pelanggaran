import { Router, Request, Response } from 'express';
import { query } from '../db/database';

const router = Router();

// GET audit logs
router.get('/', (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;
    const logs = query<any>(`
      SELECT *
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ?
    `, [parseInt(limit as string, 10)]);

    const parsed = logs.map(l => ({
      ...l,
      old_data: l.old_data ? JSON.parse(l.old_data) : null,
      new_data: l.new_data ? JSON.parse(l.new_data) : null,
    }));

    return res.json(parsed);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
