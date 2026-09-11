import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getDb } from './db/database';
import { seedDatabase } from './db/seed';

import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import teachersRoutes from './routes/teachers';
import halaqahRoutes from './routes/halaqah';
import studentsRoutes from './routes/students';
import violationsRoutes from './routes/violations';
import recordsRoutes from './routes/records';
import settingsRoutes from './routes/settings';
import auditRoutes from './routes/audit';
import positiveActionsRoutes from './routes/positiveActions';
import positiveRecordsRoutes from './routes/positiveRecords';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/halaqah', halaqahRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/violations', violationsRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/positive-actions', positiveActionsRoutes);
app.use('/api/positive-records', positiveRecordsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit-logs', auditRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend in production if dist exists
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

async function startServer() {
  try {
    console.log('Menginisialisasi database relasional SQLite...');
    await getDb();
    seedDatabase();

    app.listen(PORT, () => {
      console.log(`Backend Server aktif di http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Gagal menjalankan server:', err);
    process.exit(1);
  }
}

startServer();
