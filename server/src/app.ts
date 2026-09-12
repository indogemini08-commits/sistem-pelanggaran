import express from 'express';
import cors from 'cors';
import { getDb, importDatabaseState, persistDb } from './db/database';
import { seedDatabase } from './db/seed';
import { loadCloudSnapshot, checkAndSyncCloudSnapshot } from './db/cloudStorage';

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
import syncRoutes from './routes/sync';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure database is initialized and seeded before processing any API request
let initPromise: Promise<void> | null = null;
export async function ensureDbInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      console.log('Menginisialisasi engine database SQLite & cloud persistence...');
      await getDb();

      // Check if a cloud snapshot exists in Postgres, Vercel KV, or Blob
      try {
        const cloudSnapshot = await loadCloudSnapshot();
        if (cloudSnapshot && (cloudSnapshot.version || cloudSnapshot.timestamp || Array.isArray(cloudSnapshot.users))) {
          console.log('Memuat data dari Cloud Snapshot...');
          importDatabaseState(cloudSnapshot);
        } else {
          console.log('Cloud snapshot belum ada, melakukan seeding awal...');
          seedDatabase();
          await persistDb();
        }
      } catch (e: any) {
        console.warn('Gagal memeriksa cloud snapshot, menggunakan seeder lokal:', e?.message || e);
        seedDatabase();
        await persistDb();
      }

      console.log('Engine database SQLite & cloud synchronization siap digunakan.');
    })().catch((err) => {
      initPromise = null; // Reset on failure so subsequent requests can retry
      throw err;
    });
  }
  return initPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDbInitialized();
    await checkAndSyncCloudSnapshot(importDatabaseState);
    next();
  } catch (err: any) {
    console.error('Database initialization error:', err);
    res.status(500).json({ error: 'Gagal menginisialisasi database: ' + (err?.message || err) });
  }
});

// URL Path Normalization for Vercel Serverless Rewrites
app.use((req, res, next) => {
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-forwarded-uri']) as string;
  if (matchedPath && (req.url === '/api/index.js' || req.url === '/api/index' || req.url === '/api' || req.url === '/')) {
    req.url = matchedPath;
  }
  next();
});

// Core API Router
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/teachers', teachersRoutes);
apiRouter.use('/halaqah', halaqahRoutes);
apiRouter.use('/students', studentsRoutes);
apiRouter.use('/violations', violationsRoutes);
apiRouter.use('/records', recordsRoutes);
apiRouter.use('/positive-actions', positiveActionsRoutes);
apiRouter.use('/positive-records', positiveRecordsRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/audit-logs', auditRoutes);
apiRouter.use('/sync', syncRoutes);

apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', serverless: !!process.env.VERCEL, time: new Date().toISOString() });
});

// Mount at both '/api' and '/' to ensure robustness against various reverse proxy rewrites
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error handler caught:', err);
  res.status(500).json({ error: err?.message || 'Terjadi kesalahan internal pada server' });
});

export default app;
