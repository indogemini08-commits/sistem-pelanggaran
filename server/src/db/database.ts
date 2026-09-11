import type { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { SCHEMA_SQL } from './schema';

let db: Database | null = null;
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.resolve(process.cwd(), 'server', 'data');
const DB_FILE = path.join(DATA_DIR, 'halaqah.db');

async function loadSqlJsEngine() {
  try {
    // @ts-ignore
    const asmMod = await import('sql.js/dist/sql-asm.js');
    const initAsm = asmMod.default || asmMod;
    return await initAsm();
  } catch (asmErr) {
    console.warn('sql-asm.js gagal dimuat, mencoba sql.js default:', asmErr);
    const mod = await import('sql.js');
    const init = mod.default || mod;
    return await init();
  }
}

export async function getDb(): Promise<Database> {
  if (db) return db;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('Gagal membuat direktori data:', e);
  }

  const SQL = await loadSqlJsEngine();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      db.run('PRAGMA foreign_keys = ON;');
      runMigrations(db);
      persistDb();
      return db;
    } catch (err) {
      console.error('Gagal memuat file database yang ada, membuat baru:', err);
    }
  }

  // New database
  db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.run(SCHEMA_SQL);

  runMigrations(db);
  persistDb();
  return db;
}

function runMigrations(database: Database) {
  try {
    database.run("ALTER TABLE violations ADD COLUMN division TEXT NOT NULL DEFAULT 'tahfizh';");
  } catch (e) {
    // Column already exists
  }
  try {
    database.run("ALTER TABLE violation_records ADD COLUMN division TEXT NOT NULL DEFAULT 'tahfizh';");
  } catch (e) {
    // Column already exists
  }
  try {
    const tableDef = database.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")[0]?.values[0][0] as string || '';
    if (tableDef && !tableDef.includes('kepala_kesantrian')) {
      database.run("PRAGMA foreign_keys=OFF;");
      database.run(`
        CREATE TABLE users_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru')),
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      database.run("INSERT INTO users_new SELECT * FROM users;");
      database.run("DROP TABLE users;");
      database.run("ALTER TABLE users_new RENAME TO users;");
      database.run("PRAGMA foreign_keys=ON;");
      console.log('Migrasi skema role tabel users selesai (kepala_kesantrian & guru aktif).');
    }
  } catch (e: any) {
    console.error('Peringatan migrasi skema tabel users:', e?.message || e);
  }

  try {
    database.run(`
      CREATE TABLE IF NOT EXISTS positive_actions (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        division TEXT NOT NULL DEFAULT 'tahfizh' CHECK(division IN ('tahfizh', 'kesantrian')),
        category TEXT NOT NULL CHECK(category IN ('Tahfizh', 'Kedisiplinan', 'Ibadah & Shalat', 'Khidmat & Sosial', 'Prestasi', 'Lainnya')),
        description TEXT,
        default_points_deduction INTEGER NOT NULL CHECK(default_points_deduction > 0),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    database.run(`
      CREATE TABLE IF NOT EXISTS positive_records (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        division TEXT NOT NULL DEFAULT 'tahfizh' CHECK(division IN ('tahfizh', 'kesantrian')),
        action_id TEXT,
        action_name_snapshot TEXT NOT NULL,
        points_deducted INTEGER NOT NULL CHECK(points_deducted > 0),
        halaqah_id TEXT,
        halaqah_name_snapshot TEXT,
        teacher_id TEXT,
        teacher_name_snapshot TEXT NOT NULL,
        student_class_snapshot TEXT NOT NULL,
        academic_year_snapshot TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled')),
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        cancelled_at TEXT,
        cancelled_by TEXT,
        cancellation_reason TEXT,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (action_id) REFERENCES positive_actions(id) ON DELETE SET NULL,
        FOREIGN KEY (halaqah_id) REFERENCES halaqah(id) ON DELETE SET NULL,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
      );
    `);
  } catch (e: any) {
    console.error('Peringatan pembuatan tabel positive_actions/positive_records:', e?.message || e);
  }
}

export function persistDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saat menyimpan database ke disk:', err);
  }
}

export function query<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database belum diinisialisasi');
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function get<T = any>(sql: string, params: any[] = []): T | null {
  const rows = query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql: string, params: any[] = []): void {
  if (!db) throw new Error('Database belum diinisialisasi');
  if (params && params.length > 0) {
    db.run(sql, params);
  } else {
    db.run(sql);
  }
  persistDb();
}

export function logAudit(options: {
  userId?: string;
  userName: string;
  action: string;
  tableName: string;
  recordId?: string;
  oldData?: any;
  newData?: any;
}) {
  const id = 'aud_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  run(
    `INSERT INTO audit_logs (id, user_id, user_name, action, table_name, record_id, old_data, new_data, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
    [
      id,
      options.userId || null,
      options.userName,
      options.action,
      options.tableName,
      options.recordId || null,
      options.oldData ? JSON.stringify(options.oldData) : null,
      options.newData ? JSON.stringify(options.newData) : null,
    ]
  );
}
