// server/src/app.ts
import express from "express";
import cors from "cors";

// server/src/db/database.ts
import fs from "fs";
import path from "path";

// server/src/db/schema.ts
var SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS halaqah (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_id TEXT,
  schedule TEXT DEFAULT 'Ba''da Subuh & Ba''da Maghrib',
  location TEXT DEFAULT 'Masjid Utama',
  academic_year TEXT DEFAULT '2025/2026',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  student_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('L', 'P')),
  halaqah_id TEXT,
  academic_year TEXT NOT NULL DEFAULT '2025/2026',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (halaqah_id) REFERENCES halaqah(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS student_halaqah_history (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  halaqah_id TEXT NOT NULL,
  teacher_id TEXT,
  academic_year TEXT NOT NULL,
  class TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (halaqah_id) REFERENCES halaqah(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS violations (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  division TEXT NOT NULL DEFAULT 'tahfizh' CHECK(division IN ('tahfizh', 'kesantrian')),
  category TEXT NOT NULL CHECK(category IN ('Tahfizh', 'Kedisiplinan', 'Kehadiran', 'Adab & Akhlak', 'Ketertiban Asrama', 'Ibadah & Shalat', 'Lainnya')),
  description TEXT,
  default_points INTEGER NOT NULL CHECK(default_points > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS violation_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  division TEXT NOT NULL DEFAULT 'tahfizh' CHECK(division IN ('tahfizh', 'kesantrian')),
  halaqah_id TEXT,
  teacher_id TEXT,
  violation_id TEXT,
  violation_name_snapshot TEXT NOT NULL,
  points_snapshot INTEGER NOT NULL CHECK(points_snapshot > 0),
  halaqah_name_snapshot TEXT NOT NULL,
  teacher_name_snapshot TEXT NOT NULL,
  student_class_snapshot TEXT NOT NULL,
  academic_year_snapshot TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  notes TEXT,
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TEXT,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (halaqah_id) REFERENCES halaqah(id) ON DELETE SET NULL,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  FOREIGN KEY (violation_id) REFERENCES violations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS point_thresholds (
  id TEXT PRIMARY KEY,
  minimum_points INTEGER NOT NULL,
  maximum_points INTEGER NOT NULL,
  status_name TEXT NOT NULL,
  badge_color TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS school_settings (
  id TEXT PRIMARY KEY,
  app_name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  kop_surat_text TEXT,
  current_academic_year TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data TEXT,
  new_data TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS tombstones (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

// server/src/db/cloudStorage.ts
import { neon } from "@neondatabase/serverless";
import { put, list } from "@vercel/blob";
function getActiveCloudProvider() {
  if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
    return {
      provider: "postgres",
      isConnected: true,
      details: "PostgreSQL / Neon Database Aktif (Shared Cloud Persistence)"
    };
  }
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return {
      provider: "vercel-kv",
      isConnected: true,
      details: "Vercel KV / Upstash Redis Aktif (Shared Cloud Persistence)"
    };
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      provider: "vercel-blob",
      isConnected: true,
      details: "Vercel Blob Storage Aktif (Shared Cloud Persistence)"
    };
  }
  return {
    provider: "local-sqlite",
    isConnected: false,
    details: process.env.VERCEL ? "Mode Serverless Ephemeral (Hubungkan Vercel Postgres/KV di tab Storage untuk cloud persistence 24/7)" : "Mode Localhost SQLite (server/data/halaqah.db)"
  };
}
async function loadCloudSnapshot() {
  const providerInfo = getActiveCloudProvider();
  if (providerInfo.provider === "postgres") {
    const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    try {
      const sql = neon(dbUrl);
      await sql`
        CREATE TABLE IF NOT EXISTS imbs_snapshots (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      const rows = await sql`SELECT data, updated_at FROM imbs_snapshots WHERE id = 'master_snapshot' LIMIT 1;`;
      if (rows && rows.length > 0 && rows[0].data) {
        console.log("[CloudStorage] Snapshot berhasil dimuat dari PostgreSQL / Neon.");
        if (rows[0].updated_at) {
          localSnapshotTimestamp = new Date(rows[0].updated_at).toISOString();
        }
        let snapshotData = rows[0].data;
        if (typeof snapshotData === "string") {
          try {
            snapshotData = JSON.parse(snapshotData);
          } catch {
          }
        }
        return snapshotData;
      }
    } catch (err) {
      console.warn("[CloudStorage] Gagal memuat snapshot dari PostgreSQL / Neon:", err?.message || err);
    }
  }
  if (providerInfo.provider === "vercel-kv") {
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    try {
      const res = await fetch(`${kvUrl}/get/imbs_master_snapshot`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result) {
          const parsed = typeof json.result === "string" ? JSON.parse(json.result) : json.result;
          console.log("[CloudStorage] Snapshot berhasil dimuat dari Vercel KV.");
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[CloudStorage] Gagal memuat snapshot dari Vercel KV:", err?.message || err);
    }
  }
  if (providerInfo.provider === "vercel-blob") {
    try {
      const blobs = await list({ prefix: "imbs-data/master-snapshot.json" });
      if (blobs.blobs && blobs.blobs.length > 0) {
        const blobUrl = blobs.blobs[0].url;
        const res = await fetch(blobUrl);
        if (res.ok) {
          const snapshot = await res.json();
          console.log("[CloudStorage] Snapshot berhasil dimuat dari Vercel Blob.");
          return snapshot;
        }
      }
    } catch (err) {
      console.warn("[CloudStorage] Gagal memuat snapshot dari Vercel Blob:", err?.message || err);
    }
  }
  return null;
}
var localSnapshotTimestamp = null;
var lastCheckTime = 0;
async function checkAndSyncCloudSnapshot(importCallback) {
  const providerInfo = getActiveCloudProvider();
  if (providerInfo.provider !== "postgres") return;
  const now = Date.now();
  if (now - lastCheckTime < 1e3) return;
  lastCheckTime = now;
  try {
    const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    const sql = neon(dbUrl);
    const rows = await sql`SELECT data, updated_at FROM imbs_snapshots WHERE id = 'master_snapshot' LIMIT 1;`;
    if (rows && rows.length > 0 && rows[0].updated_at) {
      const remoteTime = new Date(rows[0].updated_at).toISOString();
      if (localSnapshotTimestamp && remoteTime !== localSnapshotTimestamp) {
        console.log(`[CloudStorage] Remote snapshot is newer (${remoteTime} vs ${localSnapshotTimestamp}), syncing container...`);
        let snapshotData = rows[0].data;
        if (typeof snapshotData === "string") {
          try {
            snapshotData = JSON.parse(snapshotData);
          } catch {
          }
        }
        if (snapshotData && (snapshotData.version || snapshotData.timestamp || Array.isArray(snapshotData.users))) {
          importCallback(snapshotData);
          localSnapshotTimestamp = remoteTime;
        }
      } else if (!localSnapshotTimestamp) {
        localSnapshotTimestamp = remoteTime;
      }
    }
  } catch (err) {
  }
}
async function saveCloudSnapshot(snapshot) {
  const providerInfo = getActiveCloudProvider();
  if (!providerInfo.isConnected) {
    return false;
  }
  const hasContent = snapshot && (Array.isArray(snapshot.users) && snapshot.users.length > 0 || Array.isArray(snapshot.school_settings) && snapshot.school_settings.length > 0 || Array.isArray(snapshot.point_thresholds) && snapshot.point_thresholds.length > 0 || Array.isArray(snapshot.students) && snapshot.students.length > 0 || Array.isArray(snapshot.violations) && snapshot.violations.length > 0);
  if (!hasContent) {
    console.warn("[CloudStorage] Diabaikan: upaya menyimpan snapshot database kosong ke cloud diblokir.");
    return false;
  }
  try {
    if (providerInfo.provider === "postgres") {
      const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
      const sql = neon(dbUrl);
      const dataStr = JSON.stringify(snapshot);
      const res = await sql`
        INSERT INTO imbs_snapshots (id, data, updated_at)
        VALUES ('master_snapshot', ${dataStr}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
        RETURNING updated_at;
      `;
      if (res && res.length > 0 && res[0].updated_at) {
        localSnapshotTimestamp = new Date(res[0].updated_at).toISOString();
      }
      console.log("[CloudStorage] Snapshot berhasil disimpan ke PostgreSQL / Neon.");
      return true;
    }
    if (providerInfo.provider === "vercel-kv") {
      const kvUrl = process.env.KV_REST_API_URL;
      const kvToken = process.env.KV_REST_API_TOKEN;
      const dataStr = JSON.stringify(snapshot);
      const res = await fetch(`${kvUrl}/set/imbs_master_snapshot`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kvToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dataStr)
      });
      if (res.ok) {
        console.log("[CloudStorage] Snapshot berhasil disimpan ke Vercel KV.");
        return true;
      }
    }
    if (providerInfo.provider === "vercel-blob") {
      const dataStr = JSON.stringify(snapshot, null, 2);
      await put("imbs-data/master-snapshot.json", dataStr, {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json"
      });
      console.log("[CloudStorage] Snapshot berhasil disimpan ke Vercel Blob.");
      return true;
    }
  } catch (err) {
    console.error("[CloudStorage] Gagal menyimpan snapshot ke cloud provider:", err?.message || err);
  }
  return false;
}

// server/src/db/database.ts
var db = null;
var DATA_DIR = process.env.VERCEL ? path.join("/tmp", "data") : path.resolve(process.cwd(), "server", "data");
var DB_FILE = path.join(DATA_DIR, "halaqah.db");
async function loadSqlJsEngine() {
  try {
    const asmMod = await import("sql.js/dist/sql-asm.js");
    const initAsm = asmMod.default || asmMod;
    return await initAsm();
  } catch (asmErr) {
    console.warn("sql-asm.js gagal dimuat, mencoba sql.js default:", asmErr);
    const mod = await import("sql.js");
    const init = mod.default || mod;
    return await init();
  }
}
async function getDb() {
  if (db) return db;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn("Gagal membuat direktori data:", e);
  }
  const SQL = await loadSqlJsEngine();
  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      db.run("PRAGMA foreign_keys = ON;");
      runMigrations(db);
      return db;
    } catch (err) {
      console.error("Gagal memuat file database yang ada, membuat baru:", err);
    }
  }
  db = new SQL.Database();
  db.run("PRAGMA foreign_keys = ON;");
  db.run(SCHEMA_SQL);
  runMigrations(db);
  return db;
}
function runMigrations(database) {
  try {
    database.run("ALTER TABLE violations ADD COLUMN division TEXT NOT NULL DEFAULT 'tahfizh';");
  } catch (e) {
  }
  try {
    database.run("ALTER TABLE violation_records ADD COLUMN division TEXT NOT NULL DEFAULT 'tahfizh';");
  } catch (e) {
  }
  try {
    const tableDef = database.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")[0]?.values[0][0] || "";
    if (tableDef && !tableDef.includes("kepala_kesantrian")) {
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
      console.log("Migrasi skema role tabel users selesai (kepala_kesantrian & guru aktif).");
    }
  } catch (e) {
    console.error("Peringatan migrasi skema tabel users:", e?.message || e);
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
    database.run("DELETE FROM violation_records WHERE student_id NOT IN (SELECT id FROM students);");
    database.run("DELETE FROM positive_records WHERE student_id NOT IN (SELECT id FROM students);");
    database.run("DELETE FROM student_halaqah_history WHERE student_id NOT IN (SELECT id FROM students);");
    database.run(`
      CREATE TABLE IF NOT EXISTS tombstones (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    console.error("Peringatan pembuatan tabel positive_actions/positive_records:", e?.message || e);
  }
}
function addTombstone(id, entityType) {
  if (!db || !id) return;
  try {
    run(
      "INSERT OR REPLACE INTO tombstones (id, entity_type, created_at) VALUES (?, ?, datetime('now', 'localtime'))",
      [id, entityType]
    );
  } catch (e) {
    console.warn("Gagal mencatat tombstone:", e);
  }
}
function getTombstones() {
  if (!db) return /* @__PURE__ */ new Set();
  try {
    const rows = query("SELECT id FROM tombstones");
    return new Set(rows.map((r) => r.id));
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function exportDatabaseState() {
  if (!db) throw new Error("Database belum diinisialisasi");
  const tables = [
    "users",
    "teachers",
    "halaqah",
    "students",
    "student_halaqah_history",
    "violations",
    "violation_records",
    "positive_actions",
    "positive_records",
    "school_settings",
    "point_thresholds",
    "tombstones"
  ];
  const state = {
    version: 1,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  for (const t of tables) {
    try {
      state[t] = query(`SELECT * FROM ${t}`);
    } catch {
      state[t] = [];
    }
  }
  return state;
}
function importDatabaseState(snapshot) {
  if (!db) throw new Error("Database belum diinisialisasi");
  const tables = [
    "point_thresholds",
    "school_settings",
    "users",
    "teachers",
    "halaqah",
    "students",
    "student_halaqah_history",
    "violations",
    "violation_records",
    "positive_actions",
    "positive_records",
    "tombstones"
  ];
  db.run("PRAGMA foreign_keys = OFF;");
  for (const t of tables) {
    const rows = snapshot[t];
    if (Array.isArray(rows)) {
      try {
        db.run(`DELETE FROM ${t};`);
        if (rows.length > 0) {
          const cols = Object.keys(rows[0]);
          const placeholders = cols.map(() => "?").join(",");
          const sql = `INSERT INTO ${t} (${cols.join(",")}) VALUES (${placeholders});`;
          const stmt = db.prepare(sql);
          for (const row of rows) {
            stmt.run(cols.map((col) => row[col]));
          }
          stmt.free();
        }
      } catch (err) {
        console.warn(`Gagal mengimpor tabel ${t}:`, err);
      }
    }
  }
  try {
    const tombstones = getTombstones();
    if (tombstones.size > 0) {
      db.run("DELETE FROM students WHERE id IN (SELECT id FROM tombstones);");
      db.run("DELETE FROM halaqah WHERE id IN (SELECT id FROM tombstones);");
      db.run("DELETE FROM teachers WHERE id IN (SELECT id FROM tombstones);");
      db.run("DELETE FROM violation_records WHERE id IN (SELECT id FROM tombstones);");
      db.run("DELETE FROM positive_records WHERE id IN (SELECT id FROM tombstones);");
      db.run("DELETE FROM positive_actions WHERE id IN (SELECT id FROM tombstones);");
      db.run("DELETE FROM violations WHERE id IN (SELECT id FROM tombstones);");
      db.run("DELETE FROM users WHERE id IN (SELECT id FROM tombstones) AND id != 'usr_admin_imbs';");
    }
  } catch (e) {
  }
  try {
    db.run("DELETE FROM violation_records WHERE student_id NOT IN (SELECT id FROM students);");
    db.run("DELETE FROM positive_records WHERE student_id NOT IN (SELECT id FROM students);");
    db.run("DELETE FROM student_halaqah_history WHERE student_id NOT IN (SELECT id FROM students);");
  } catch (e) {
  }
  db.run("PRAGMA foreign_keys = ON;");
  persistDb(false);
}
async function persistDb(syncToCloud = true) {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error("Error saat menyimpan database ke disk:", err);
  }
  if (!syncToCloud) return;
  try {
    const state = exportDatabaseState();
    await saveCloudSnapshot(state);
  } catch (err) {
    console.warn("[CloudStorage] Save warning:", err);
  }
}
function query(sql, params = []) {
  if (!db) throw new Error("Database belum diinisialisasi");
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}
function get(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}
function run(sql, params = []) {
  if (!db) throw new Error("Database belum diinisialisasi");
  if (params && params.length > 0) {
    db.run(sql, params);
  } else {
    db.run(sql);
  }
  persistDb(false);
}
function logAudit(options) {
  const id = "aud_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
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
      options.newData ? JSON.stringify(options.newData) : null
    ]
  );
}

// server/src/db/seed.ts
function seedStudentsIfEmpty() {
  const userCount = query("SELECT COUNT(*) as count FROM users")[0]?.count || 0;
  if (userCount > 0) {
    return;
  }
  const studentCount = query("SELECT COUNT(*) as count FROM students")[0]?.count || 0;
  if (studentCount > 0) return;
  const tombstones = getTombstones();
  console.log("Tabel santri kosong, menginisialisasi 10 santri awal...");
  const halaqahs = query("SELECT id, teacher_id FROM halaqah");
  const students = [
    { id: "std_001", nis: "2025001", name: "Muhammad Abdullah", class: "8A", gender: "L", halaqahId: "hlq_doha" },
    { id: "std_002", nis: "2025002", name: "Ahmad Farhan Kamil", class: "8A", gender: "L", halaqahId: "hlq_doha" },
    { id: "std_003", nis: "2025003", name: "Ibrahim Malik Ar-Rasyid", class: "7B", gender: "L", halaqahId: "hlq_doha" },
    { id: "std_004", nis: "2025004", name: "Zaid bin Tsabit Robbani", class: "9B", gender: "L", halaqahId: "hlq_doha" },
    { id: "std_005", nis: "2025005", name: "Hasan Al-Banna Pratama", class: "8B", gender: "L", halaqahId: "hlq_makkah" },
    { id: "std_006", nis: "2025006", name: "Umar Dani Ramadhan", class: "7A", gender: "L", halaqahId: "hlq_makkah" },
    { id: "std_007", nis: "2025007", name: "Salman Al-Farisi Munir", class: "7C", gender: "L", halaqahId: "hlq_makkah" },
    { id: "std_008", nis: "2025008", name: "Ali Zainal Abidin", class: "9A", gender: "L", halaqahId: "hlq_madinah" },
    { id: "std_009", nis: "2025009", name: "Bilal Habasyi Asy-Syahid", class: "8C", gender: "L", halaqahId: "hlq_madinah" },
    { id: "std_010", nis: "2025010", name: "Usamah bin Zaid Akbar", class: "8A", gender: "L", halaqahId: "hlq_madinah" }
  ];
  for (const s of students) {
    if (tombstones.has(s.id)) continue;
    run(
      `INSERT INTO students (id, student_number, name, class, gender, halaqah_id, academic_year, status)
       VALUES (?, ?, ?, ?, ?, ?, '2025/2026', 'active')`,
      [s.id, s.nis, s.name, s.class, s.gender, s.halaqahId]
    );
    const hInfo = halaqahs.find((h) => h.id === s.halaqahId);
    run(
      `INSERT INTO student_halaqah_history (id, student_id, halaqah_id, teacher_id, academic_year, class, start_date)
       VALUES (?, ?, ?, ?, '2025/2026', ?, '2025-07-15')`,
      ["hist_" + s.id, s.id, s.halaqahId, hInfo?.teacher_id || null, s.class]
    );
  }
}
var DEFAULT_KESANTRIAN_VIOLATIONS = [
  { id: "v_ks_001", code: "KS001", name: "Terlambat / Masbuq Shalat Berjamaah", cat: "Kedisiplinan", points: 5, desc: "Masbuq shalat fardhu berjamaah di masjid pesantren tanpa udzur syar'i" },
  { id: "v_ks_002", code: "KS002", name: "Masbuq Shalat Subuh / Kesiangan", cat: "Kedisiplinan", points: 8, desc: "Bangun terlambat sehingga masbuq pada shalat Subuh berjamaah" },
  { id: "v_ks_003", code: "KS003", name: "Tidak Shalat Berjamaah di Masjid", cat: "Kehadiran", points: 15, desc: "Tidak hadir shalat fardhu di masjid tanpa izin bagian kesantrian / sakit" },
  { id: "v_ks_004", code: "KS004", name: "Kamar / Lemari Asrama Berantakan & Jorok", cat: "Kedisiplinan", points: 3, desc: "Tidak merapikan tempat tidur, pakaian menumpuk, atau lemari tidak teratur saat inspeksi" },
  { id: "v_ks_005", code: "KS005", name: "Membawa / Menyimpan HP & Gawai Ilegal", cat: "Kedisiplinan", points: 30, desc: "Membawa smartphone, tablet, atau perangkat elektronik yang tidak diizinkan di asrama" },
  { id: "v_ks_006", code: "KS006", name: "Melewati Jam Malam Asrama (>22:30)", cat: "Kedisiplinan", points: 5, desc: "Masih berkeliaran atau berisik di luar kamar setelah bel jam istirahat malam" },
  { id: "v_ks_007", code: "KS007", name: "Keluar Kompleks Tanpa Izin (Kabur/Pesiar Ilegal)", cat: "Kehadiran", points: 40, desc: "Meninggalkan area pesantren tanpa surat izin resmi dari bagian kesantrian" },
  { id: "v_ks_008", code: "KS008", name: "Merokok / Vape di Lingkungan Pesantren", cat: "Kedisiplinan", points: 50, desc: "Kedapatan merokok, vape, atau menyimpan rokok di area asrama/pesantren" },
  { id: "v_ks_009", code: "KS009", name: "Berkelahi / Mengintimidasi / Bullying", cat: "Adab & Akhlak", points: 35, desc: "Melakukan kekerasan fisik atau perundungan kepada sesama santri" },
  { id: "v_ks_010", code: "KS010", name: "Merusak Fasilitas Asrama & Pesantren", cat: "Kedisiplinan", points: 20, desc: "Mencoret-coret tembok, memecahkan kaca, atau merusak sarana asrama" },
  { id: "v_ks_011", code: "KS011", name: "Ghashab / Mengambil Barang Teman Tanpa Izin", cat: "Adab & Akhlak", points: 15, desc: "Memakai sandal, pakaian, atau perlengkapan santri lain tanpa kerelaan" },
  { id: "v_ks_012", code: "KS012", name: "Membawa Senjata Tajam / Benda Berbahaya", cat: "Kedisiplinan", points: 60, desc: "Menyimpan senjata tajam atau benda membahayakan di kamar santri" }
];
function seedKesantrianViolationsIfEmpty() {
  const ksCount = query("SELECT COUNT(*) as count FROM violations WHERE division = 'kesantrian'")[0]?.count || 0;
  if (ksCount > 0) return;
  const tombstones = getTombstones();
  console.log("Menginisialisasi master pelanggaran divisi kesantrian...");
  for (const v of DEFAULT_KESANTRIAN_VIOLATIONS) {
    if (tombstones.has(v.id)) continue;
    run(
      `INSERT INTO violations (id, code, name, division, category, description, default_points, status)
       VALUES (?, ?, ?, 'kesantrian', ?, ?, ?, 'active')`,
      [v.id, v.code, v.name, v.cat, v.desc, v.points]
    );
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const sampleKsRecords = [
    {
      id: "rec_ks_001",
      studentId: "std_002",
      // Ahmad Farhan Kamil
      studentName: "Ahmad Farhan Kamil",
      studentClass: "8A",
      violationId: "v_ks_001",
      violationName: "Terlambat / Masbuq Shalat Berjamaah",
      points: 5,
      date: today,
      time: "04:50",
      notes: "Masbuq 1 rakaat shalat Subuh di Masjid Utama",
      supervisor: "Ustadz Ridwan (Wali Asrama)"
    },
    {
      id: "rec_ks_002",
      studentId: "std_001",
      // Muhammad Abdullah
      studentName: "Muhammad Abdullah",
      studentClass: "8A",
      violationId: "v_ks_004",
      violationName: "Kamar / Lemari Asrama Berantakan & Jorok",
      points: 3,
      date: today,
      time: "07:15",
      notes: "Pakaian kotor berserakan di atas kasur Kamar Abu Bakar 02",
      supervisor: "Bagian Kesantrian"
    },
    {
      id: "rec_ks_003",
      studentId: "std_005",
      // Hasan Al-Banna Pratama
      studentName: "Hasan Al-Banna Pratama",
      studentClass: "8B",
      violationId: "v_ks_006",
      violationName: "Melewati Jam Malam Asrama (>22:30)",
      points: 5,
      date: today,
      time: "23:05",
      notes: "Masih berada di lorong asrama lantai 2 setelah jam malam",
      supervisor: "Ustadz Pengawas Malam"
    }
  ];
  for (const r of sampleKsRecords) {
    if (tombstones.has(r.id) || tombstones.has(r.studentId)) continue;
    const stdExists = query("SELECT id FROM students WHERE id = ?", [r.studentId]);
    if (stdExists.length === 0) continue;
    const exists = query("SELECT id FROM violation_records WHERE id = ?", [r.id]);
    if (exists.length === 0) {
      run(
        `INSERT INTO violation_records (
          id, student_id, division, halaqah_id, teacher_id, violation_id,
          violation_name_snapshot, points_snapshot, halaqah_name_snapshot,
          teacher_name_snapshot, student_class_snapshot, academic_year_snapshot,
          date, time, notes, status, created_by
        ) VALUES (?, ?, 'kesantrian', NULL, NULL, ?, ?, ?, 'Asrama & Kesantrian', ?, ?, '2025/2026', ?, ?, ?, 'active', 'Bagian Kesantrian')`,
        [
          r.id,
          r.studentId,
          r.violationId,
          r.violationName,
          r.points,
          r.supervisor,
          r.studentClass,
          r.date,
          r.time,
          r.notes
        ]
      );
    }
  }
}
function seedNewRolesIfEmpty() {
  const kesantrianUser = query("SELECT id FROM users WHERE role = 'kepala_kesantrian'")[0];
  if (!kesantrianUser) {
    run(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
       VALUES ('usr_kesantrian', 'Ustadz Zulkifli, S.Pd.I (Kepala Kesantrian)', 'kesantrian@pesantren.id', 'kesantrian123', 'kepala_kesantrian', 'active', datetime('now', 'localtime'))`
    );
    console.log("Seeded demo user: Kepala Kesantrian (kesantrian@pesantren.id / kesantrian123)");
  }
  const guruUser = query("SELECT id FROM users WHERE role = 'guru'")[0];
  if (!guruUser) {
    run(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
       VALUES ('usr_guru', 'Ustadz Herman, S.Pd (Guru Pengajar)', 'guru@pesantren.id', 'guru123', 'guru', 'active', datetime('now', 'localtime'))`
    );
    const existingTch = query("SELECT id FROM teachers WHERE user_id = 'usr_guru'")[0];
    if (!existingTch) {
      run(
        `INSERT INTO teachers (id, user_id, name, phone, status)
         VALUES ('tch_herman', 'usr_guru', 'Ustadz Herman, S.Pd', '0812-3456-7804', 'active')`
      );
    }
    console.log("Seeded demo user: Guru (guru@pesantren.id / guru123)");
  }
}
var DEFAULT_POSITIVE_ACTIONS = [
  // Tahfizh Division
  { id: "act_t_001", code: "KB-T01", name: "Tasmi' 1 Juz Sekali Duduk Tanpa Salah", division: "tahfizh", cat: "Tahfizh", points: 10, desc: "Menyetorkan hafalan 1 juz bil ghoib sekali duduk dengan lancar dan tajwid mutqin" },
  { id: "act_t_002", code: "KB-T02", name: "Setor Ziyadah Ekstra Melampaui Target", division: "tahfizh", cat: "Tahfizh", points: 5, desc: "Menambah capaian hafalan baru melebihi target minimal mingguan/bulanan" },
  { id: "act_t_003", code: "KB-T03", name: "Murojaah Mandiri Terdisiplin (1 Pekan Penuh)", division: "tahfizh", cat: "Tahfizh", points: 5, desc: "Konsisten hadir dan murojaah mandiri sebelum halaqah dimulai selama 1 pekan penuh" },
  { id: "act_t_004", code: "KB-T04", name: "Talaqqi / Membimbing Teman Sebaya di Halaqah", division: "tahfizh", cat: "Tahfizh", points: 3, desc: "Membantu menyimak dan mengoreksi bacaan teman se-halaqah yang tertinggal" },
  { id: "act_t_005", code: "KB-T05", name: "Juara / Peserta Terbaik Musabaqah Hifzhil Qur'an (MHQ)", division: "tahfizh", cat: "Prestasi", points: 15, desc: "Meraih juara atau apresiasi terbaik dalam perlombaan tahfizh Qur'an" },
  // Kesantrian Division
  { id: "act_k_001", code: "KB-K01", name: "Muadzin / Imam Shalat Rawatib Tepat Waktu", division: "kesantrian", cat: "Ibadah & Shalat", points: 5, desc: "Bertugas adzan atau mengimami shalat fardhu rawatib di masjid tepat waktu" },
  { id: "act_k_002", code: "KB-K02", name: "Piket Kamar / Kebersihan Asrama Teladan", division: "kesantrian", cat: "Kedisiplinan", points: 5, desc: "Kamar atau area lorong asrama terbersih dan paling rapi saat inspeksi kesantrian" },
  { id: "act_k_003", code: "KB-K03", name: "Khidmat Sosial Dapur / Membantu Operasional Pesantren", division: "kesantrian", cat: "Khidmat & Sosial", points: 10, desc: "Secara sukarela membantu penyiapan makan, kebersihan lingkungan, atau acara pesantren" },
  { id: "act_k_004", code: "KB-K04", name: "Amanah: Menemukan & Mengembalikan Barang Teman", division: "kesantrian", cat: "Khidmat & Sosial", points: 5, desc: "Menemukan barang berharga atau uang tercecer dan menyerahkannya ke bagian kesantrian" },
  { id: "act_k_005", code: "KB-K05", name: "Keteladanan Bangun Subuh Tanpa Dibangunkan (1 Pekan)", division: "kesantrian", cat: "Kedisiplinan", points: 5, desc: "Bangun mandiri dan membangunkan teman kamar shalat Subuh berjamaah selama 1 pekan" },
  { id: "act_k_006", code: "KB-K06", name: "Prestasi Lomba Akademik / Bahasa / Olahraga", division: "kesantrian", cat: "Prestasi", points: 10, desc: "Membawa nama baik pesantren dalam kompetisi akademik, bahasa Arab/Inggris, atau olahraga" }
];
function seedPositiveActionsIfEmpty() {
  const count = query("SELECT COUNT(*) as count FROM positive_actions")[0]?.count || 0;
  const tombstones = getTombstones();
  if (count === 0) {
    console.log("Menginisialisasi master kegiatan baik (kebaikan & prestasi)...");
    for (const a of DEFAULT_POSITIVE_ACTIONS) {
      if (tombstones.has(a.id)) continue;
      run(
        `INSERT INTO positive_actions (id, code, name, division, category, description, default_points_deduction, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [a.id, a.code, a.name, a.division, a.cat, a.desc, a.points]
      );
    }
  }
  const posCount = query("SELECT COUNT(*) as count FROM positive_records")[0]?.count || 0;
  const std002Exists = query("SELECT id FROM students WHERE id = 'std_002'")[0];
  if (posCount === 0 && std002Exists && !tombstones.has("pos_rec_001") && !tombstones.has("std_002")) {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    run(
      `INSERT INTO positive_records (
        id, student_id, division, action_id, action_name_snapshot, points_deducted,
        halaqah_id, halaqah_name_snapshot, teacher_id, teacher_name_snapshot,
        student_class_snapshot, academic_year_snapshot, date, time, notes, status, created_by
      ) VALUES (
        'pos_rec_001', 'std_002', 'kesantrian', 'act_k_002', 'Piket Kamar / Kebersihan Asrama Teladan', 5,
        NULL, 'Asrama & Kesantrian', NULL, 'Ustadz Ridwan (Wali Asrama)',
        '8A', '2025/2026', ?, '08:30', 'Kamar terbersih dan paling rapi pada inspeksi asrama pekan ini', 'active', 'Bagian Kesantrian'
      )`,
      [today]
    );
    console.log("Seeded sample positive record: -5 poin kesantrian for std_002");
  }
}
function seedDefaultAdminIfEmpty() {
  const existing = query("SELECT id, password_hash FROM users WHERE LOWER(email) = 'imbs@aldri'")[0];
  if (!existing) {
    run(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
       VALUES ('usr_admin_imbs', 'Admin Utama', 'imbs@aldri', 'admin112', 'admin', 'active', datetime('now', 'localtime'))`
    );
    console.log("Seeded default admin user: imbs@aldri / admin112");
  } else if (existing.password_hash !== "admin112") {
    run(
      `UPDATE users SET password_hash = 'admin112', role = 'admin', status = 'active' WHERE LOWER(email) = 'imbs@aldri'`
    );
  }
}
function seedDatabase() {
  const userCount = query("SELECT COUNT(*) as count FROM users")[0]?.count || 0;
  if (userCount > 0) {
    seedDefaultAdminIfEmpty();
    seedKesantrianViolationsIfEmpty();
    seedNewRolesIfEmpty();
    seedPositiveActionsIfEmpty();
    console.log("Database sudah memiliki data, melewati seeder awal.");
    return;
  }
  console.log("Mengisi data awal database (seeding)...");
  const tombstones = getTombstones();
  run(`
    INSERT OR IGNORE INTO school_settings (id, app_name, school_name, address, phone, email, logo_url, kop_surat_text, current_academic_year)
    VALUES (
      'settings_default',
      'Sistem Poin Santri Halaqah',
      'Pesantren Tahfizh Al-Qur''an Imam Asy-Syathibi',
      'Jl. Karang Anyar No. 45, Kompleks Islamic Center, Bogor, Jawa Barat',
      '0811-9876-5432 / (0251) 8345678',
      'tahfizh@imamsyathibi.sch.id',
      '/logo.svg',
      'BIDANG PENDIDIKAN DAN KEPENGASUHAN - DIVISI HALAQAH TAHFIZH AL-QUR''AN',
      '2025/2026'
    )
  `);
  const thresholds = [
    { id: "th_1", min: 0, max: 19, name: "AMAN", color: "emerald", desc: "Kedisiplinan dan capaian hafalan santri dalam kondisi baik.", order: 1 },
    { id: "th_2", min: 20, max: 49, name: "PERLU PEMBINAAN", color: "amber", desc: "Perlu bimbingan dan pemantauan berkala oleh Muhafizh.", order: 2 },
    { id: "th_3", min: 50, max: 74, name: "PEMBINAAN KHUSUS", color: "orange", desc: "Pemanggilan oleh Koordinator Tahfizh dan jadwal murojaah tambahan.", order: 3 },
    { id: "th_4", min: 75, max: 99, name: "PERINGATAN RESMI", color: "rose", desc: "Penerbitan Surat Peringatan (SP) dan pemanggilan orang tua/wali.", order: 4 },
    { id: "th_5", min: 100, max: 999, name: "TINDAKAN LANJUT", color: "red", desc: "Sidang Dewan Asatidz dan evaluasi kelanjutan kepesertaan halaqah.", order: 5 }
  ];
  for (const th of thresholds) {
    run(
      `INSERT OR IGNORE INTO point_thresholds (id, minimum_points, maximum_points, status_name, badge_color, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [th.id, th.min, th.max, th.name, th.color, th.desc, th.order]
    );
  }
  const users = [
    { id: "usr_admin_imbs", name: "Admin Utama", email: "imbs@aldri", pass: "admin112", role: "admin" },
    { id: "usr_admin", name: "Ustadz Farhan, M.Pd (Admin)", email: "admin@pesantren.id", pass: "admin123", role: "admin" },
    { id: "usr_koor", name: "Ustadz Ridwan, Lc (Koordinator)", email: "koordinator@pesantren.id", pass: "koor123", role: "coordinator" },
    { id: "usr_ahmad", name: "Ustadz Ahmad Al-Hafizh", email: "ahmad@pesantren.id", pass: "ahmad123", role: "teacher" },
    { id: "usr_muhammad", name: "Ustadz Muhammad Al-Hafizh", email: "muhammad@pesantren.id", pass: "muhammad123", role: "teacher" },
    { id: "usr_abdullah", name: "Ustadz Abdullah Al-Hafizh", email: "abdullah@pesantren.id", pass: "abdullah123", role: "teacher" }
  ];
  for (const u of users) {
    if (tombstones.has(u.id)) continue;
    run(
      `INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [u.id, u.name, u.email, u.pass, u.role]
    );
  }
  const teachers = [
    { id: "tch_ahmad", userId: "usr_ahmad", name: "Ustadz Ahmad Al-Hafizh", phone: "0812-3456-7801" },
    { id: "tch_muhammad", userId: "usr_muhammad", name: "Ustadz Muhammad Al-Hafizh", phone: "0812-3456-7802" },
    { id: "tch_abdullah", userId: "usr_abdullah", name: "Ustadz Abdullah Al-Hafizh", phone: "0812-3456-7803" }
  ];
  for (const t of teachers) {
    if (tombstones.has(t.id)) continue;
    run(
      `INSERT OR IGNORE INTO teachers (id, user_id, name, phone, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [t.id, t.userId, t.name, t.phone]
    );
  }
  const halaqahs = [
    { id: "hlq_doha", name: "Halaqah Doha", teacherId: "tch_ahmad", sched: "Ba'da Subuh & Ba'da Maghrib", loc: "Masjid Lantai 2 (Sayap Kanan)" },
    { id: "hlq_makkah", name: "Halaqah Makkah", teacherId: "tch_muhammad", sched: "Ba'da Subuh & Ba'da Ashar", loc: "Ruang Tahfizh A" },
    { id: "hlq_madinah", name: "Halaqah Madinah", teacherId: "tch_abdullah", sched: "Ba'da Subuh & Ba'da Isya", loc: "Gazebo Barat" }
  ];
  for (const h of halaqahs) {
    if (tombstones.has(h.id)) continue;
    run(
      `INSERT OR IGNORE INTO halaqah (id, name, teacher_id, schedule, location, academic_year, status)
       VALUES (?, ?, ?, ?, ?, '2025/2026', 'active')`,
      [h.id, h.name, h.teacherId, h.sched, h.loc]
    );
  }
  const violations = [
    { id: "v_001", code: "P001", name: "Terlambat halaqah (>10 menit)", cat: "Kedisiplinan", points: 3, desc: "Datang terlambat tanpa udzur syar'i" },
    { id: "v_002", code: "P002", name: "Tidak murojaah mandiri", cat: "Tahfizh", points: 4, desc: "Tidak menyelesaikan target lembar murojaah harian" },
    { id: "v_003", code: "P003", name: "Tidak setor hafalan baru", cat: "Tahfizh", points: 3, desc: "Tidak menyetorkan ziyadah sesuai target halaqah" },
    { id: "v_004", code: "P004", name: "Alpa / Tidak hadir tanpa izin", cat: "Kehadiran", points: 10, desc: "Meninggalkan halaqah tanpa keterangan atau surat izin resmi" },
    { id: "v_005", code: "P005", name: "Tidak mencapai target bulanan", cat: "Tahfizh", points: 15, desc: "Evaluasi bulanan di bawah standar target juz" },
    { id: "v_006", code: "P006", name: "Tidur saat kegiatan halaqah", cat: "Kedisiplinan", points: 5, desc: "Tidur saat muhafizh menyimak atau tilawah bersama" },
    { id: "v_007", code: "P007", name: "Bercanda berlebihan / mengganggu", cat: "Adab & Akhlak", points: 8, desc: "Mengganggu konsentrasi teman halaqah" },
    { id: "v_008", code: "P008", name: "Meninggalkan halaqah sebelum selesai", cat: "Kedisiplinan", points: 7, desc: "Keluar halaqah sebelum doa penutup tanpa izin" },
    { id: "v_009", code: "P009", name: "Tidak membawa mushaf standar", cat: "Kedisiplinan", points: 2, desc: "Tidak membawa Al-Qur'an pojok / rasm Utsmani" },
    { id: "v_010", code: "P010", name: "Membawa gawai / barang terlarang", cat: "Kedisiplinan", points: 20, desc: "Membawa HP atau gadget ke area halaqah tanpa izin" }
  ];
  for (const v of violations) {
    if (tombstones.has(v.id)) continue;
    run(
      `INSERT OR IGNORE INTO violations (id, code, name, category, description, default_points, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [v.id, v.code, v.name, v.cat, v.desc, v.points]
    );
  }
  const students = [
    { id: "std_001", nis: "2025001", name: "Muhammad Abdullah", class: "8A", gender: "L", halaqahId: "hlq_doha" },
    { id: "std_002", nis: "2025002", name: "Ahmad Farhan Kamil", class: "8A", gender: "L", halaqahId: "hlq_doha" },
    { id: "std_003", nis: "2025003", name: "Ibrahim Malik Ar-Rasyid", class: "7B", gender: "L", halaqahId: "hlq_doha" },
    { id: "std_004", nis: "2025004", name: "Zaid bin Tsabit Robbani", class: "9B", gender: "L", halaqahId: "hlq_doha" },
    { id: "std_005", nis: "2025005", name: "Hasan Al-Banna Pratama", class: "8B", gender: "L", halaqahId: "hlq_makkah" },
    { id: "std_006", nis: "2025006", name: "Umar Dani Ramadhan", class: "7A", gender: "L", halaqahId: "hlq_makkah" },
    { id: "std_007", nis: "2025007", name: "Salman Al-Farisi Munir", class: "7C", gender: "L", halaqahId: "hlq_makkah" },
    { id: "std_008", nis: "2025008", name: "Ali Zainal Abidin", class: "9A", gender: "L", halaqahId: "hlq_madinah" },
    { id: "std_009", nis: "2025009", name: "Bilal Habasyi Asy-Syahid", class: "8C", gender: "L", halaqahId: "hlq_madinah" },
    { id: "std_010", nis: "2025010", name: "Usamah bin Zaid Akbar", class: "8A", gender: "L", halaqahId: "hlq_madinah" }
  ];
  for (const s of students) {
    if (tombstones.has(s.id)) continue;
    run(
      `INSERT OR IGNORE INTO students (id, student_number, name, class, gender, halaqah_id, academic_year, status)
       VALUES (?, ?, ?, ?, ?, ?, '2025/2026', 'active')`,
      [s.id, s.nis, s.name, s.class, s.gender, s.halaqahId]
    );
    const hInfo = halaqahs.find((h) => h.id === s.halaqahId);
    run(
      `INSERT OR IGNORE INTO student_halaqah_history (id, student_id, halaqah_id, teacher_id, academic_year, class, start_date)
       VALUES (?, ?, ?, ?, '2025/2026', ?, '2025-07-15')`,
      ["hist_" + s.id, s.id, s.halaqahId, hInfo?.teacherId || null, s.class]
    );
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const sampleRecords = [
    {
      id: "rec_001",
      studentId: "std_001",
      studentName: "Muhammad Abdullah",
      studentClass: "8A",
      halaqahId: "hlq_doha",
      halaqahName: "Halaqah Doha",
      teacherId: "tch_ahmad",
      teacherName: "Ustadz Ahmad Al-Hafizh",
      violationId: "v_002",
      violationName: "Tidak murojaah mandiri",
      points: 4,
      date: today,
      time: "05:45",
      notes: "Lupa membawa buku mutabaah murojaah"
    },
    {
      id: "rec_002",
      studentId: "std_001",
      studentName: "Muhammad Abdullah",
      studentClass: "8A",
      halaqahId: "hlq_doha",
      halaqahName: "Halaqah Doha",
      teacherId: "tch_ahmad",
      teacherName: "Ustadz Ahmad Al-Hafizh",
      violationId: "v_004",
      violationName: "Alpa / Tidak hadir tanpa izin",
      points: 10,
      date: today,
      time: "18:15",
      notes: "Tidak hadir sesi ba'da maghrib"
    },
    {
      id: "rec_003",
      studentId: "std_001",
      studentName: "Muhammad Abdullah",
      studentClass: "8A",
      halaqahId: "hlq_doha",
      halaqahName: "Halaqah Doha",
      teacherId: "tch_ahmad",
      teacherName: "Ustadz Ahmad Al-Hafizh",
      violationId: "v_005",
      violationName: "Tidak mencapai target bulanan",
      points: 15,
      date: "2026-08-28",
      time: "06:00",
      notes: "Target Juz 29 baru terselesaikan 12 halaman"
    },
    {
      id: "rec_004",
      studentId: "std_001",
      studentName: "Muhammad Abdullah",
      studentClass: "8A",
      halaqahId: "hlq_doha",
      halaqahName: "Halaqah Doha",
      teacherId: "tch_ahmad",
      teacherName: "Ustadz Ahmad Al-Hafizh",
      violationId: "v_007",
      violationName: "Bercanda berlebihan / mengganggu",
      points: 8,
      date: "2026-08-25",
      time: "18:30",
      notes: "Bercanda saat menyimak setoran teman"
    },
    {
      id: "rec_005",
      studentId: "std_005",
      studentName: "Hasan Al-Banna Pratama",
      studentClass: "8B",
      halaqahId: "hlq_makkah",
      halaqahName: "Halaqah Makkah",
      teacherId: "tch_muhammad",
      teacherName: "Ustadz Muhammad Al-Hafizh",
      violationId: "v_001",
      violationName: "Terlambat halaqah (>10 menit)",
      points: 3,
      date: today,
      time: "05:40",
      notes: "Terlambat 15 menit"
    },
    {
      id: "rec_006",
      studentId: "std_008",
      studentName: "Ali Zainal Abidin",
      studentClass: "9A",
      halaqahId: "hlq_madinah",
      halaqahName: "Halaqah Madinah",
      teacherId: "tch_abdullah",
      teacherName: "Ustadz Abdullah Al-Hafizh",
      violationId: "v_003",
      violationName: "Tidak setor hafalan baru",
      points: 3,
      date: today,
      time: "19:40",
      notes: "Hafalan baru belum mutqin"
    }
  ];
  for (const r of sampleRecords) {
    if (tombstones.has(r.id) || tombstones.has(r.studentId)) continue;
    run(
      `INSERT OR IGNORE INTO violation_records (
        id, student_id, halaqah_id, teacher_id, violation_id,
        violation_name_snapshot, points_snapshot, halaqah_name_snapshot,
        teacher_name_snapshot, student_class_snapshot, academic_year_snapshot,
        date, time, notes, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2025/2026', ?, ?, ?, 'active', 'Seeder System')`,
      [
        r.id,
        r.studentId,
        r.halaqahId,
        r.teacherId,
        r.violationId,
        r.violationName,
        r.points,
        r.halaqahName,
        r.teacherName,
        r.studentClass,
        r.date,
        r.time,
        r.notes
      ]
    );
  }
  seedStudentsIfEmpty();
  seedKesantrianViolationsIfEmpty();
  seedNewRolesIfEmpty();
  seedPositiveActionsIfEmpty();
  logAudit({
    userName: "System Initialization",
    action: "SEED_DATABASE",
    tableName: "all",
    newData: { status: "Database berhasil diinisialisasi dengan data awal realistis" }
  });
  persistDb(false);
  console.log("Seeding SQLite lokal selesai!");
}

// server/src/routes/auth.ts
import { Router } from "express";
var router = Router();
router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email dan password wajib diisi" });
    }
    const cleanInput = email.trim().toLowerCase();
    const user = get('SELECT * FROM users WHERE (LOWER(email) = ? OR LOWER(name) = ?) AND status = "active"', [cleanInput, cleanInput]);
    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: "Email / Username atau kata sandi tidak sesuai" });
    }
    let teacherInfo = null;
    let assignedHalaqahs = [];
    if (user.role === "teacher" || user.role === "guru") {
      teacherInfo = get("SELECT * FROM teachers WHERE user_id = ?", [user.id]);
      if (!teacherInfo) {
        teacherInfo = get("SELECT * FROM teachers WHERE name LIKE ?", [`%${user.name}%`]);
      }
      if (teacherInfo) {
        assignedHalaqahs = query('SELECT * FROM halaqah WHERE teacher_id = ? AND status = "active"', [teacherInfo.id]);
      }
    }
    logAudit({
      userId: user.id,
      userName: user.name,
      action: "LOGIN",
      tableName: "users",
      recordId: user.id,
      newData: { email: user.email, role: user.role }
    });
    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teacherId: teacherInfo?.id || null,
      assignedHalaqahs,
      token: "sess_" + Buffer.from(`${user.id}:${Date.now()}`).toString("base64")
    };
    return res.json({
      message: "Login berhasil",
      user: sessionData
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Terjadi kesalahan sistem saat login" });
  }
});
router.post("/change-password", async (req, res) => {
  try {
    const { userId, oldPassword, newPassword, actorName } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ error: "Data tidak lengkap" });
    }
    const user = get("SELECT * FROM users WHERE id = ?", [userId]);
    if (!user) return res.status(404).json({ error: "Pengguna tidak ditemukan" });
    if (oldPassword && user.password_hash !== oldPassword) {
      return res.status(400).json({ error: "Password lama tidak cocok" });
    }
    run("UPDATE users SET password_hash = ? WHERE id = ?", [newPassword, userId]);
    logAudit({
      userId,
      userName: actorName || user.name,
      action: "CHANGE_PASSWORD",
      tableName: "users",
      recordId: userId
    });
    await persistDb();
    return res.json({ message: "Password berhasil diperbarui" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var auth_default = router;

// server/src/routes/users.ts
import { Router as Router2 } from "express";
var router2 = Router2();
router2.get("/", (req, res) => {
  try {
    const users = query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
             t.id as teacher_id, t.phone as teacher_phone
      FROM users u
      LEFT JOIN teachers t ON t.user_id = u.id
      ORDER BY u.created_at DESC
    `);
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router2.post("/", async (req, res) => {
  try {
    const { name, email, password, role, status = "active", phone, actorName = "Admin" } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Nama, email, password, dan role wajib diisi" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const existing = get("SELECT id FROM users WHERE LOWER(email) = ?", [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: "Email / Username sudah terdaftar untuk pengguna lain" });
    }
    const userId = "usr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    run(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      [userId, name.trim(), cleanEmail, password, role, status]
    );
    if (role === "teacher" || role === "guru") {
      const teacherId = "tch_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      run(
        `INSERT INTO teachers (id, user_id, name, phone, status)
         VALUES (?, ?, ?, ?, 'active')`,
        [teacherId, userId, name.trim(), phone || ""]
      );
    }
    await persistDb();
    logAudit({
      userName: actorName,
      action: "CREATE_USER",
      tableName: "users",
      recordId: userId,
      newData: { name: name.trim(), email: cleanEmail, role, status }
    });
    return res.status(201).json({
      message: "Pengguna berhasil ditambahkan",
      userId,
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        role,
        status,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router2.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status, phone, actorName = "Admin" } = req.body;
    const oldUser = get("SELECT * FROM users WHERE id = ?", [id]);
    if (!oldUser) return res.status(404).json({ error: "Pengguna tidak ditemukan" });
    const cleanEmail = email ? email.trim().toLowerCase() : oldUser.email;
    if (cleanEmail !== oldUser.email) {
      const conflict = get("SELECT id FROM users WHERE LOWER(email) = ? AND id != ?", [cleanEmail, id]);
      if (conflict) return res.status(400).json({ error: "Email / Username sudah digunakan pengguna lain" });
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
    if (updatedRole === "teacher" || updatedRole === "guru") {
      const existingTeacher = get("SELECT id FROM teachers WHERE user_id = ?", [id]);
      if (existingTeacher) {
        run("UPDATE teachers SET name = ?, phone = ? WHERE id = ?", [updatedName, phone || "", existingTeacher.id]);
      } else {
        const teacherId = "tch_" + Math.random().toString(36).substring(2, 9);
        run('INSERT INTO teachers (id, user_id, name, phone, status) VALUES (?, ?, ?, ?, "active")', [teacherId, id, updatedName, phone || ""]);
      }
    }
    await persistDb();
    logAudit({
      userName: actorName,
      action: "UPDATE_USER",
      tableName: "users",
      recordId: id,
      oldData: { name: oldUser.name, email: oldUser.email, role: oldUser.role, status: oldUser.status },
      newData: { name: updatedName, email: cleanEmail, role: updatedRole, status: updatedStatus }
    });
    return res.json({
      message: "Data pengguna berhasil diperbarui",
      user: {
        id,
        name: updatedName,
        email: cleanEmail,
        role: updatedRole,
        status: updatedStatus,
        created_at: oldUser.created_at
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router2.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { actorName = "Admin" } = req.body || {};
    const user = get("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) {
      addTombstone(id, "user");
      await persistDb();
      return res.json({ message: "Pengguna sudah tidak ada atau telah dihapus" });
    }
    if (user.role === "admin") {
      const adminCount = query('SELECT COUNT(*) as count FROM users WHERE role = "admin"')[0]?.count || 0;
      if (adminCount <= 1) {
        return res.status(400).json({ error: "Tidak dapat menghapus admin utama satu-satunya" });
      }
    }
    run("UPDATE teachers SET user_id = NULL WHERE user_id = ?", [id]);
    run("DELETE FROM users WHERE id = ?", [id]);
    addTombstone(id, "user");
    await persistDb();
    logAudit({
      userName: actorName,
      action: "DELETE_USER",
      tableName: "users",
      recordId: id,
      oldData: { name: user.name, email: user.email, role: user.role }
    });
    return res.json({ message: "Pengguna berhasil dihapus" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var users_default = router2;

// server/src/routes/teachers.ts
import { Router as Router3 } from "express";
var router3 = Router3();
router3.get("/", (req, res) => {
  try {
    const teachers = query(`
      SELECT t.id, t.user_id, t.name, t.phone, t.status, t.created_at,
             u.email, u.role
      FROM teachers t
      LEFT JOIN users u ON u.id = t.user_id
      ORDER BY t.name ASC
    `);
    const halaqahs = query('SELECT * FROM halaqah WHERE status = "active"');
    const result = teachers.map((t) => {
      const assigned = halaqahs.filter((h) => h.teacher_id === t.id);
      return {
        ...t,
        halaqahList: assigned,
        halaqahCount: assigned.length
      };
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router3.post("/", async (req, res) => {
  try {
    const { name, phone, userId, status = "active", actorName = "Admin" } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Nama muhafizh wajib diisi" });
    }
    const teacherId = "tch_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    run(
      `INSERT INTO teachers (id, user_id, name, phone, status, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      [teacherId, userId || null, name.trim(), phone || "", status]
    );
    logAudit({
      userName: actorName,
      action: "CREATE_TEACHER",
      tableName: "teachers",
      recordId: teacherId,
      newData: { name, phone, userId, status }
    });
    await persistDb();
    return res.status(201).json({ message: "Data Muhafizh berhasil ditambahkan", teacherId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router3.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, userId, status, actorName = "Admin" } = req.body;
    const oldTeacher = get("SELECT * FROM teachers WHERE id = ?", [id]);
    if (!oldTeacher) return res.status(404).json({ error: "Muhafizh tidak ditemukan" });
    const updatedName = name ? name.trim() : oldTeacher.name;
    const updatedPhone = phone !== void 0 ? phone : oldTeacher.phone;
    const updatedUserId = userId !== void 0 ? userId : oldTeacher.user_id;
    const updatedStatus = status || oldTeacher.status;
    run(
      `UPDATE teachers
       SET name = ?, phone = ?, user_id = ?, status = ?
       WHERE id = ?`,
      [updatedName, updatedPhone, updatedUserId, updatedStatus, id]
    );
    if (updatedUserId) {
      run("UPDATE users SET name = ? WHERE id = ?", [updatedName, updatedUserId]);
    }
    logAudit({
      userName: actorName,
      action: "UPDATE_TEACHER",
      tableName: "teachers",
      recordId: id,
      oldData: oldTeacher,
      newData: { name: updatedName, phone: updatedPhone, status: updatedStatus }
    });
    await persistDb();
    return res.json({ message: "Data Muhafizh berhasil diperbarui" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router3.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { actorName = "Admin" } = req.body || {};
    const teacher = get("SELECT * FROM teachers WHERE id = ?", [id]);
    if (!teacher) {
      return res.json({ message: "Muhafizh sudah tidak ada atau telah dihapus" });
    }
    run("UPDATE halaqah SET teacher_id = NULL WHERE teacher_id = ?", [id]);
    run("UPDATE student_halaqah_history SET teacher_id = NULL WHERE teacher_id = ?", [id]);
    run("UPDATE violation_records SET teacher_id = NULL WHERE teacher_id = ?", [id]);
    run("UPDATE positive_records SET teacher_id = NULL WHERE teacher_id = ?", [id]);
    run("DELETE FROM teachers WHERE id = ?", [id]);
    addTombstone(id, "teacher");
    logAudit({
      userName: actorName,
      action: "DELETE_TEACHER",
      tableName: "teachers",
      recordId: id,
      oldData: teacher
    });
    await persistDb();
    return res.json({ message: "Muhafizh berhasil dihapus" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var teachers_default = router3;

// server/src/routes/halaqah.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.get("/", (req, res) => {
  try {
    const halaqahs = query(`
      SELECT h.id, h.name, h.teacher_id, h.schedule, h.location, h.academic_year, h.status, h.created_at,
             t.name as teacher_name, t.phone as teacher_phone,
             (SELECT COUNT(*) FROM students s WHERE s.halaqah_id = h.id AND s.status = 'active') as student_count
      FROM halaqah h
      LEFT JOIN teachers t ON t.id = h.teacher_id
      ORDER BY h.name ASC
    `);
    return res.json(halaqahs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router4.post("/", async (req, res) => {
  try {
    const { name, teacherId, schedule, location, academicYear = "2025/2026", status = "active", actorName = "Admin" } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Nama halaqah wajib diisi" });
    }
    const halaqahId = "hlq_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    run(
      `INSERT INTO halaqah (id, name, teacher_id, schedule, location, academic_year, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      [halaqahId, name.trim(), teacherId || null, schedule || "Ba'da Subuh", location || "Masjid", academicYear, status]
    );
    logAudit({
      userName: actorName,
      action: "CREATE_HALAQAH",
      tableName: "halaqah",
      recordId: halaqahId,
      newData: { name, teacherId, schedule, location }
    });
    await persistDb();
    return res.status(201).json({ message: "Halaqah berhasil dibuat", halaqahId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router4.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, teacherId, schedule, location, academicYear, status, actorName = "Admin" } = req.body;
    const oldHalaqah = get("SELECT * FROM halaqah WHERE id = ?", [id]);
    if (!oldHalaqah) return res.status(404).json({ error: "Halaqah tidak ditemukan" });
    const updatedName = name ? name.trim() : oldHalaqah.name;
    const updatedTeacherId = teacherId !== void 0 ? teacherId : oldHalaqah.teacher_id;
    const updatedSchedule = schedule !== void 0 ? schedule : oldHalaqah.schedule;
    const updatedLocation = location !== void 0 ? location : oldHalaqah.location;
    const updatedAcademicYear = academicYear || oldHalaqah.academic_year;
    const updatedStatus = status || oldHalaqah.status;
    run(
      `UPDATE halaqah
       SET name = ?, teacher_id = ?, schedule = ?, location = ?, academic_year = ?, status = ?
       WHERE id = ?`,
      [updatedName, updatedTeacherId || null, updatedSchedule, updatedLocation, updatedAcademicYear, updatedStatus, id]
    );
    logAudit({
      userName: actorName,
      action: "UPDATE_HALAQAH",
      tableName: "halaqah",
      recordId: id,
      oldData: oldHalaqah,
      newData: { name: updatedName, teacher_id: updatedTeacherId, schedule: updatedSchedule, location: updatedLocation }
    });
    await persistDb();
    return res.json({ message: "Data halaqah berhasil diperbarui" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router4.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { actorName = "Admin" } = req.body || {};
    const halaqah = get("SELECT * FROM halaqah WHERE id = ?", [id]);
    if (!halaqah) {
      return res.json({ message: "Halaqah sudah tidak ada atau telah dihapus" });
    }
    run("UPDATE students SET halaqah_id = NULL WHERE halaqah_id = ?", [id]);
    run("UPDATE violation_records SET halaqah_id = NULL WHERE halaqah_id = ?", [id]);
    run("UPDATE positive_records SET halaqah_id = NULL WHERE halaqah_id = ?", [id]);
    run("DELETE FROM student_halaqah_history WHERE halaqah_id = ?", [id]);
    run("DELETE FROM halaqah WHERE id = ?", [id]);
    addTombstone(id, "halaqah");
    logAudit({
      userName: actorName,
      action: "DELETE_HALAQAH",
      tableName: "halaqah",
      recordId: id,
      oldData: halaqah
    });
    await persistDb();
    return res.json({ message: "Halaqah berhasil dihapus" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router4.post("/transfer", async (req, res) => {
  try {
    const { studentId, toHalaqahId, toTeacherId, reason, actorName = "Admin" } = req.body;
    if (!studentId || !toHalaqahId) {
      return res.status(400).json({ error: "ID Santri dan ID Halaqah tujuan wajib diisi" });
    }
    const student = get("SELECT * FROM students WHERE id = ?", [studentId]);
    if (!student) return res.status(404).json({ error: "Santri tidak ditemukan" });
    run("UPDATE students SET halaqah_id = ? WHERE id = ?", [toHalaqahId, studentId]);
    const histId = "hist_" + Math.random().toString(36).substring(2, 8);
    run(
      `INSERT INTO student_halaqah_history (id, student_id, halaqah_id, teacher_id, academic_year, class, start_date)
       VALUES (?, ?, ?, ?, ?, ?, date('now', 'localtime'))`,
      [histId, studentId, toHalaqahId, toTeacherId || null, student.academic_year || "2025/2026", student.class]
    );
    logAudit({
      userName: actorName,
      action: "TRANSFER_STUDENT_HALAQAH",
      tableName: "students",
      recordId: studentId,
      newData: { toHalaqahId, toTeacherId, reason }
    });
    await persistDb();
    return res.json({ message: "Santri berhasil dipindahkan halaqah" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router4.get("/history", (req, res) => {
  try {
    const { studentId } = req.query;
    let sql = `
      SELECT shh.*, s.name as student_name, s.student_number, h.name as halaqah_name, t.name as teacher_name
      FROM student_halaqah_history shh
      JOIN students s ON s.id = shh.student_id
      LEFT JOIN halaqah h ON h.id = shh.halaqah_id
      LEFT JOIN teachers t ON t.id = shh.teacher_id
      WHERE 1=1
    `;
    const params = [];
    if (studentId) {
      sql += " AND shh.student_id = ?";
      params.push(studentId);
    }
    sql += " ORDER BY shh.start_date DESC";
    const rows = query(sql, params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router4.get("/:id/students", (req, res) => {
  try {
    const { id } = req.params;
    const students = query(`
      SELECT s.*,
             COALESCE(SUM(CASE WHEN vr.status = 'active' THEN vr.points_snapshot ELSE 0 END), 0) as total_points
      FROM students s
      LEFT JOIN violation_records vr ON vr.student_id = s.id
      WHERE s.halaqah_id = ? AND s.status = 'active'
      GROUP BY s.id
      ORDER BY s.name ASC
    `, [id]);
    return res.json(students);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var halaqah_default = router4;

// server/src/routes/students.ts
import { Router as Router5 } from "express";
var router5 = Router5();
function getStatusForPoints(points, thresholds) {
  for (const th of thresholds) {
    if (points >= th.minimum_points && points <= th.maximum_points) {
      return {
        statusName: th.status_name,
        badgeColor: th.badge_color,
        description: th.description
      };
    }
  }
  if (thresholds.length > 0) {
    const highest = thresholds[thresholds.length - 1];
    if (points >= highest.minimum_points) {
      return {
        statusName: highest.status_name,
        badgeColor: highest.badge_color,
        description: highest.description
      };
    }
  }
  return { statusName: "AMAN", badgeColor: "emerald", description: "Kondisi baik" };
}
router5.get("/", (req, res) => {
  try {
    const thresholds = query("SELECT * FROM point_thresholds ORDER BY sort_order ASC");
    const students = query(`
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
    const deductionsList = query(`
      SELECT student_id,
             COALESCE(SUM(points_deducted), 0) as total_deducted,
             COALESCE(SUM(CASE WHEN division = 'tahfizh' THEN points_deducted ELSE 0 END), 0) as tahfizh_deducted,
             COALESCE(SUM(CASE WHEN division = 'kesantrian' THEN points_deducted ELSE 0 END), 0) as kesantrian_deducted,
             COUNT(*) as positive_count
      FROM positive_records
      WHERE status = 'active'
      GROUP BY student_id
    `);
    const deductionsMap = /* @__PURE__ */ new Map();
    for (const d of deductionsList) {
      deductionsMap.set(d.student_id, d);
    }
    const enriched = students.map((s) => {
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
        status_info: st
      };
    });
    return res.json(enriched);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router5.get("/portal/:nis", (req, res) => {
  try {
    const rawNis = req.params.nis ? req.params.nis.trim() : "";
    if (!rawNis) {
      return res.status(400).json({ error: "Nomor Induk Santri (NIS) wajib diisi" });
    }
    const student = get(`
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
        error: `Data santri dengan NIS "${rawNis}" tidak ditemukan atau berstatus non-aktif. Pastikan NIS yang dimasukkan sudah benar.`
      });
    }
    const thresholds = query("SELECT * FROM point_thresholds ORDER BY sort_order ASC");
    const records = query(`
      SELECT vr.*
      FROM violation_records vr
      WHERE vr.student_id = ?
      ORDER BY vr.date DESC, vr.time DESC
    `, [student.id]);
    const positiveRecords = query(`
      SELECT pr.*, pa.category as action_category, pa.code as action_code
      FROM positive_records pr
      LEFT JOIN positive_actions pa ON pa.id = pr.action_id
      WHERE pr.student_id = ?
      ORDER BY pr.date DESC, pr.time DESC
    `, [student.id]);
    const activeRecords = records.filter((r) => r.status === "active");
    const grossTahfizh = activeRecords.filter((r) => r.division === "tahfizh").reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);
    const grossKesantrian = activeRecords.filter((r) => r.division === "kesantrian").reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);
    const activePosRecords = positiveRecords.filter((r) => r.status === "active");
    const deductedTahfizh = activePosRecords.filter((r) => r.division === "tahfizh").reduce((sum, r) => sum + Number(r.points_deducted || 0), 0);
    const deductedKesantrian = activePosRecords.filter((r) => r.division === "kesantrian").reduce((sum, r) => sum + Number(r.points_deducted || 0), 0);
    const netTahfizh = Math.max(0, grossTahfizh - deductedTahfizh);
    const netKesantrian = Math.max(0, grossKesantrian - deductedKesantrian);
    const totalNetPoints = netTahfizh + netKesantrian;
    const statusInfo = getStatusForPoints(totalNetPoints, thresholds);
    const settings = get("SELECT * FROM school_settings LIMIT 1") || null;
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
        status_info: statusInfo
      },
      records,
      positive_records: positiveRecords,
      thresholds,
      settings
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Gagal memuat data portal wali santri" });
  }
});
router5.get("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const student = get(`
      SELECT s.*,
             h.name as halaqah_name, h.schedule as halaqah_schedule, h.location as halaqah_location,
             t.name as teacher_name, t.phone as teacher_phone
      FROM students s
      LEFT JOIN halaqah h ON h.id = s.halaqah_id
      LEFT JOIN teachers t ON t.id = h.teacher_id
      WHERE s.id = ? OR s.student_number = ?
    `, [id, id]);
    if (!student) return res.status(404).json({ error: "Santri tidak ditemukan" });
    const thresholds = query("SELECT * FROM point_thresholds ORDER BY sort_order ASC");
    const records = query(`
      SELECT vr.*
      FROM violation_records vr
      WHERE vr.student_id = ?
      ORDER BY vr.date DESC, vr.time DESC
    `, [student.id]);
    const positiveRecords = query(`
      SELECT pr.*, pa.category as action_category, pa.code as action_code
      FROM positive_records pr
      LEFT JOIN positive_actions pa ON pa.id = pr.action_id
      WHERE pr.student_id = ?
      ORDER BY pr.date DESC, pr.time DESC
    `, [student.id]);
    const activeRecords = records.filter((r) => r.status === "active");
    const grossTahfizh = activeRecords.filter((r) => r.division === "tahfizh").reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);
    const grossKesantrian = activeRecords.filter((r) => r.division === "kesantrian").reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);
    const activePosRecords = positiveRecords.filter((r) => r.status === "active");
    const deductedTahfizh = activePosRecords.filter((r) => r.division === "tahfizh").reduce((sum, r) => sum + Number(r.points_deducted || 0), 0);
    const deductedKesantrian = activePosRecords.filter((r) => r.division === "kesantrian").reduce((sum, r) => sum + Number(r.points_deducted || 0), 0);
    const netTahfizh = Math.max(0, grossTahfizh - deductedTahfizh);
    const netKesantrian = Math.max(0, grossKesantrian - deductedKesantrian);
    const totalNetPoints = netTahfizh + netKesantrian;
    const statusInfo = getStatusForPoints(totalNetPoints, thresholds);
    const history = query(`
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
        status_info: statusInfo
      },
      records,
      positive_records: positiveRecords,
      history
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router5.post("/", async (req, res) => {
  try {
    const {
      studentNumber,
      name,
      studentClass,
      gender,
      halaqahId,
      academicYear = "2025/2026",
      status = "active",
      actorName = "Admin"
    } = req.body;
    if (!studentNumber || !name || !studentClass || !gender) {
      return res.status(400).json({ error: "NIS, nama, kelas, dan jenis kelamin wajib diisi" });
    }
    const cleanNIS = studentNumber.toString().trim();
    const existing = get("SELECT id FROM students WHERE student_number = ?", [cleanNIS]);
    if (existing) {
      return res.status(400).json({ error: `Santri dengan NIS ${cleanNIS} sudah terdaftar` });
    }
    const studentId = "std_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    run(
      `INSERT INTO students (id, student_number, name, class, gender, halaqah_id, academic_year, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      [studentId, cleanNIS, name.trim(), studentClass.trim(), gender, halaqahId || null, academicYear, status]
    );
    if (halaqahId) {
      const hInfo = get("SELECT teacher_id FROM halaqah WHERE id = ?", [halaqahId]);
      run(
        `INSERT INTO student_halaqah_history (id, student_id, halaqah_id, teacher_id, academic_year, class, start_date)
         VALUES (?, ?, ?, ?, ?, ?, date('now', 'localtime'))`,
        ["hist_" + studentId, studentId, halaqahId, hInfo?.teacher_id || null, academicYear, studentClass.trim()]
      );
    }
    logAudit({
      userName: actorName,
      action: "CREATE_STUDENT",
      tableName: "students",
      recordId: studentId,
      newData: { studentNumber: cleanNIS, name, class: studentClass, gender, halaqahId }
    });
    await persistDb();
    return res.status(201).json({ message: "Santri berhasil ditambahkan", studentId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router5.put("/:id", async (req, res) => {
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
      actorName = "Admin"
    } = req.body;
    const old = get("SELECT * FROM students WHERE id = ?", [id]);
    if (!old) return res.status(404).json({ error: "Santri tidak ditemukan" });
    const cleanNIS = studentNumber ? studentNumber.toString().trim() : old.student_number;
    if (cleanNIS !== old.student_number) {
      const conflict = get("SELECT id FROM students WHERE student_number = ? AND id != ?", [cleanNIS, id]);
      if (conflict) return res.status(400).json({ error: `NIS ${cleanNIS} sudah digunakan oleh santri lain` });
    }
    const updatedName = name ? name.trim() : old.name;
    const updatedClass = studentClass ? studentClass.trim() : old.class;
    const updatedGender = gender || old.gender;
    const updatedHalaqahId = halaqahId !== void 0 ? halaqahId : old.halaqah_id;
    const updatedYear = academicYear || old.academic_year;
    const updatedStatus = status || old.status;
    run(
      `UPDATE students
       SET student_number = ?, name = ?, class = ?, gender = ?, halaqah_id = ?, academic_year = ?, status = ?
       WHERE id = ?`,
      [cleanNIS, updatedName, updatedClass, updatedGender, updatedHalaqahId || null, updatedYear, updatedStatus, id]
    );
    if (updatedHalaqahId && updatedHalaqahId !== old.halaqah_id) {
      const hInfo = get("SELECT teacher_id FROM halaqah WHERE id = ?", [updatedHalaqahId]);
      const histId = "hist_" + Math.random().toString(36).substring(2, 8);
      run(
        `INSERT INTO student_halaqah_history (id, student_id, halaqah_id, teacher_id, academic_year, class, start_date)
         VALUES (?, ?, ?, ?, ?, ?, date('now', 'localtime'))`,
        [histId, id, updatedHalaqahId, hInfo?.teacher_id || null, updatedYear, updatedClass]
      );
    }
    logAudit({
      userName: actorName,
      action: "UPDATE_STUDENT",
      tableName: "students",
      recordId: id,
      oldData: old,
      newData: { studentNumber: cleanNIS, name: updatedName, class: updatedClass, halaqahId: updatedHalaqahId }
    });
    await persistDb();
    return res.json({ message: "Data santri berhasil diperbarui" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router5.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { actorName = "Admin" } = req.body || {};
    const student = get("SELECT * FROM students WHERE id = ? OR student_number = ?", [id, id]);
    if (!student) {
      return res.json({ success: true, message: "Santri sudah tidak ada atau telah dihapus" });
    }
    const targetId = student.id;
    run("DELETE FROM student_halaqah_history WHERE student_id = ?", [targetId]);
    run("DELETE FROM violation_records WHERE student_id = ?", [targetId]);
    run("DELETE FROM positive_records WHERE student_id = ?", [targetId]);
    run("DELETE FROM students WHERE id = ?", [targetId]);
    addTombstone(targetId, "student");
    await persistDb();
    logAudit({
      userName: actorName,
      action: "DELETE_STUDENT",
      tableName: "students",
      recordId: targetId,
      oldData: student
    });
    console.log(`[DELETE_STUDENT] Santri ${student.name} (${targetId}) dan seluruh histori berhasil dihapus permanen oleh ${actorName}.`);
    return res.json({ success: true, message: "Santri beserta histori berhasil dihapus secara permanen" });
  } catch (err) {
    console.error("Error saat menghapus santri:", err);
    return res.status(500).json({ error: err.message || "Gagal menghapus santri dari database" });
  }
});
router5.post("/bulk-delete", async (req, res) => {
  try {
    const { ids, actorName = "Admin" } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Daftar ID santri wajib diisi" });
    }
    const deleted = [];
    const skipped = [];
    for (const id of ids) {
      const student = get("SELECT id, name, student_number FROM students WHERE id = ?", [id]);
      if (!student) {
        skipped.push(id);
        continue;
      }
      run("DELETE FROM student_halaqah_history WHERE student_id = ?", [student.id]);
      run("DELETE FROM violation_records WHERE student_id = ?", [student.id]);
      run("DELETE FROM positive_records WHERE student_id = ?", [student.id]);
      run("DELETE FROM students WHERE id = ?", [student.id]);
      addTombstone(student.id, "student");
      logAudit({
        userName: actorName,
        action: "BULK_DELETE_STUDENT",
        tableName: "students",
        recordId: student.id,
        oldData: { name: student.name, student_number: student.student_number }
      });
      deleted.push(student.id);
    }
    await persistDb();
    console.log(`[BULK_DELETE] ${deleted.length} santri dihapus permanen oleh ${actorName}`);
    return res.json({
      success: true,
      deletedCount: deleted.length,
      skippedCount: skipped.length,
      deletedIds: deleted,
      message: `${deleted.length} santri beserta seluruh riwayatnya berhasil dihapus permanen`
    });
  } catch (err) {
    console.error("Error bulk delete santri:", err);
    return res.status(500).json({ error: err.message || "Gagal menghapus santri secara massal" });
  }
});
router5.post("/import", async (req, res) => {
  try {
    const { rows, actorName = "Admin" } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "Data impor tidak boleh kosong" });
    }
    const halaqahs = query("SELECT id, name, teacher_id FROM halaqah");
    const halaqahMap = /* @__PURE__ */ new Map();
    halaqahs.forEach((h) => halaqahMap.set(h.name.toLowerCase().trim(), h));
    const existingNISs = new Set(
      query("SELECT student_number FROM students").map((s) => s.student_number.toString().trim())
    );
    let insertedCount = 0;
    const insertedList = [];
    const errors = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 2;
      const nis = (row.student_number || row.nis || row.NIS || "").toString().trim();
      const name = (row.name || row.nama || row.Nama || "").toString().trim();
      const studentClass = (row.class || row.kelas || row.Kelas || "").toString().trim();
      const rawGender = (row.gender || row.jenis_kelamin || row.Gender || row.JK || "L").toString().toUpperCase().trim();
      const gender = rawGender.startsWith("P") || rawGender === "PEREMPUAN" ? "P" : "L";
      const halaqahName = (row.halaqah || row.nama_halaqah || row.Halaqah || "").toString().trim();
      const academicYear = (row.academic_year || row.tahun_ajaran || "2025/2026").toString().trim();
      if (!nis) {
        errors.push({ row: rowNum, error: "NIS wajib diisi" });
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
      let halaqahId = null;
      let teacherId = null;
      if (halaqahName) {
        const matched = halaqahMap.get(halaqahName.toLowerCase());
        if (matched) {
          halaqahId = matched.id;
          teacherId = matched.teacher_id;
        } else {
          const newHalaqahId = "hlq_" + Math.random().toString(36).substring(2, 8);
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
      const studentId = "std_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      run(
        `INSERT INTO students (id, student_number, name, class, gender, halaqah_id, academic_year, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now', 'localtime'))`,
        [studentId, nis, name, studentClass, gender, halaqahId, academicYear]
      );
      if (halaqahId) {
        run(
          `INSERT INTO student_halaqah_history (id, student_id, halaqah_id, teacher_id, academic_year, class, start_date)
           VALUES (?, ?, ?, ?, ?, ?, date('now', 'localtime'))`,
          ["hist_" + studentId, studentId, halaqahId, teacherId, academicYear, studentClass]
        );
      }
      existingNISs.add(nis);
      insertedCount++;
      insertedList.push({ id: studentId, nis, name, studentClass, halaqahName });
    }
    logAudit({
      userName: actorName,
      action: "IMPORT_EXCEL_STUDENTS",
      tableName: "students",
      newData: { insertedCount, errorsCount: errors.length }
    });
    await persistDb();
    return res.json({
      message: `Berhasil mengimpor ${insertedCount} santri ke database.`,
      insertedCount,
      errorsCount: errors.length,
      errors,
      insertedList
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var students_default = router5;

// server/src/routes/violations.ts
import { Router as Router6 } from "express";
var router6 = Router6();
router6.get("/", (req, res) => {
  try {
    const { division } = req.query;
    let sql = `
      SELECT v.*,
             (SELECT COUNT(*) FROM violation_records vr WHERE vr.violation_id = v.id AND vr.status = 'active') as usage_count
      FROM violations v
      WHERE 1=1
    `;
    const params = [];
    if (division && division !== "all") {
      sql += ` AND v.division = ?`;
      params.push(division);
    }
    sql += ` ORDER BY v.code ASC`;
    const violations = query(sql, params);
    return res.json(violations);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router6.post("/", async (req, res) => {
  try {
    const { code, name, category, defaultPoints, description, division = "tahfizh", status = "active", actorName = "Admin" } = req.body;
    if (!name || !category || defaultPoints === void 0 || defaultPoints <= 0) {
      return res.status(400).json({ error: "Nama, kategori, dan poin (>0) wajib diisi" });
    }
    const cleanDivision = division === "kesantrian" ? "kesantrian" : "tahfizh";
    let cleanCode = code ? code.trim().toUpperCase() : "";
    if (!cleanCode) {
      const prefix = cleanDivision === "kesantrian" ? "KS" : "P";
      const last = get(`SELECT code FROM violations WHERE code LIKE "${prefix}%" ORDER BY code DESC LIMIT 1`);
      if (last && last.code.startsWith(prefix)) {
        const numPart = parseInt(last.code.replace(prefix, ""), 10);
        if (!isNaN(numPart)) {
          cleanCode = prefix + (numPart + 1).toString().padStart(3, "0");
        } else {
          cleanCode = prefix + "001";
        }
      } else {
        cleanCode = prefix + "001";
      }
    }
    const existingCode = get("SELECT id FROM violations WHERE code = ?", [cleanCode]);
    if (existingCode) {
      return res.status(400).json({ error: `Kode pelanggaran ${cleanCode} sudah ada` });
    }
    const violationId = "v_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    run(
      `INSERT INTO violations (id, code, name, division, category, description, default_points, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      [violationId, cleanCode, name.trim(), cleanDivision, category, description || "", parseInt(defaultPoints, 10), status]
    );
    await persistDb();
    logAudit({
      userName: actorName,
      action: "CREATE_MASTER_VIOLATION",
      tableName: "violations",
      recordId: violationId,
      newData: { code: cleanCode, name, division: cleanDivision, category, defaultPoints, description }
    });
    return res.status(201).json({ message: "Master pelanggaran berhasil ditambahkan", violationId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router6.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, category, defaultPoints, description, division, status, actorName = "Admin" } = req.body;
    const old = get("SELECT * FROM violations WHERE id = ?", [id]);
    if (!old) return res.status(404).json({ error: "Data pelanggaran tidak ditemukan" });
    const cleanCode = code ? code.trim().toUpperCase() : old.code;
    if (cleanCode !== old.code) {
      const conflict = get("SELECT id FROM violations WHERE code = ? AND id != ?", [cleanCode, id]);
      if (conflict) return res.status(400).json({ error: "Kode sudah digunakan master lain" });
    }
    const updatedPoints = defaultPoints !== void 0 ? parseInt(defaultPoints, 10) : old.default_points;
    if (updatedPoints <= 0) {
      return res.status(400).json({ error: "Poin pelanggaran harus lebih besar dari 0" });
    }
    const updatedName = name ? name.trim() : old.name;
    const updatedCategory = category || old.category;
    const updatedDesc = description !== void 0 ? description : old.description;
    const updatedStatus = status || old.status;
    const updatedDivision = division || old.division || "tahfizh";
    run(
      `UPDATE violations
       SET code = ?, name = ?, division = ?, category = ?, default_points = ?, description = ?, status = ?
       WHERE id = ?`,
      [cleanCode, updatedName, updatedDivision, updatedCategory, updatedPoints, updatedDesc, updatedStatus, id]
    );
    await persistDb();
    logAudit({
      userName: actorName,
      action: "UPDATE_MASTER_VIOLATION",
      tableName: "violations",
      recordId: id,
      oldData: old,
      newData: { code: cleanCode, name: updatedName, division: updatedDivision, category: updatedCategory, default_points: updatedPoints, status: updatedStatus }
    });
    return res.json({
      message: "Master pelanggaran berhasil diperbarui. Catatan historis sebelumnya tetap aman dan tidak terpengaruh."
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router6.post("/bulk-delete", async (req, res) => {
  try {
    const { ids, actorName = "Admin" } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Daftar ID master pelanggaran wajib diisi" });
    }
    const deleted = [];
    for (const id of ids) {
      addTombstone(id, "violation");
      const violation = get("SELECT * FROM violations WHERE id = ?", [id]);
      if (!violation) continue;
      run("UPDATE violation_records SET violation_id = NULL WHERE violation_id = ?", [id]);
      run("DELETE FROM violations WHERE id = ?", [id]);
      logAudit({
        userName: actorName,
        action: "BULK_DELETE_MASTER_VIOLATION",
        tableName: "violations",
        recordId: id,
        oldData: violation
      });
      deleted.push(id);
    }
    await persistDb();
    return res.json({
      success: true,
      deletedCount: deleted.length,
      deletedIds: deleted,
      message: `${deleted.length} master pelanggaran berhasil dihapus`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Gagal menghapus pelanggaran secara massal" });
  }
});
router6.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { actorName = "Admin" } = req.body || {};
    addTombstone(id, "violation");
    const violation = get("SELECT * FROM violations WHERE id = ?", [id]);
    if (!violation) {
      await persistDb();
      return res.json({ message: "Pelanggaran sudah tidak ada atau telah dihapus" });
    }
    run("UPDATE violation_records SET violation_id = NULL WHERE violation_id = ?", [id]);
    run("DELETE FROM violations WHERE id = ?", [id]);
    await persistDb();
    logAudit({
      userName: actorName,
      action: "DELETE_MASTER_VIOLATION",
      tableName: "violations",
      recordId: id,
      oldData: violation
    });
    return res.json({ message: "Master pelanggaran berhasil dihapus" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var violations_default = router6;

// server/src/routes/records.ts
import { Router as Router7 } from "express";
var router7 = Router7();
router7.get("/", (req, res) => {
  try {
    const {
      division,
      studentId,
      halaqahId,
      teacherId,
      violationId,
      category,
      studentClass,
      academicYear,
      startDate,
      endDate,
      month,
      status = "all",
      search,
      sortBy = "date",
      sortDir = "desc"
    } = req.query;
    let sql = `
      SELECT vr.*,
             COALESCE(s.name, vr.halaqah_name_snapshot) as student_name,
             COALESCE(s.student_number, '-') as student_nis,
             COALESCE(s.gender, 'L') as student_gender,
             h.name as current_halaqah_name,
             t.name as current_teacher_name,
             v.category as violation_category
      FROM violation_records vr
      JOIN students s ON s.id = vr.student_id AND s.status = 'active'
      LEFT JOIN halaqah h ON h.id = vr.halaqah_id
      LEFT JOIN teachers t ON t.id = vr.teacher_id
      LEFT JOIN violations v ON v.id = vr.violation_id
      WHERE 1=1
    `;
    const params = [];
    if (division && division !== "all") {
      sql += ` AND vr.division = ?`;
      params.push(division);
    }
    if (status && status !== "all") {
      sql += ` AND vr.status = ?`;
      params.push(status);
    }
    if (studentId) {
      sql += ` AND vr.student_id = ?`;
      params.push(studentId);
    }
    if (halaqahId) {
      sql += ` AND vr.halaqah_id = ?`;
      params.push(halaqahId);
    }
    if (teacherId) {
      sql += ` AND vr.teacher_id = ?`;
      params.push(teacherId);
    }
    if (violationId) {
      sql += ` AND vr.violation_id = ?`;
      params.push(violationId);
    }
    if (category) {
      sql += ` AND (v.category = ? OR vr.violation_name_snapshot LIKE ?)`;
      params.push(category, `%${category}%`);
    }
    if (studentClass) {
      sql += ` AND vr.student_class_snapshot = ?`;
      params.push(studentClass);
    }
    if (academicYear) {
      sql += ` AND vr.academic_year_snapshot = ?`;
      params.push(academicYear);
    }
    if (startDate) {
      sql += ` AND vr.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND vr.date <= ?`;
      params.push(endDate);
    }
    if (month) {
      sql += ` AND vr.date LIKE ?`;
      params.push(`${month}%`);
    }
    if (search) {
      const q = `%${search}%`;
      sql += ` AND (s.name LIKE ? OR s.student_number LIKE ? OR vr.violation_name_snapshot LIKE ? OR vr.notes LIKE ? OR vr.halaqah_name_snapshot LIKE ?)`;
      params.push(q, q, q, q, q);
    }
    const validSortCols = {
      date: "vr.date",
      points: "vr.points_snapshot",
      student: "s.name",
      halaqah: "vr.halaqah_name_snapshot",
      violation: "vr.violation_name_snapshot",
      createdAt: "vr.created_at"
    };
    const orderCol = validSortCols[sortBy] || "vr.date";
    const direction = sortDir?.toLowerCase() === "asc" ? "ASC" : "DESC";
    sql += ` ORDER BY ${orderCol} ${direction}, vr.time DESC, vr.created_at DESC`;
    const records = query(sql, params);
    return res.json(records);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router7.post("/", async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      studentNis,
      studentClass,
      halaqahId,
      violationId,
      violationName,
      points,
      division,
      locationName,
      supervisorName,
      date,
      time,
      notes,
      evidenceUrl,
      createdBy = "Muhafizh"
    } = req.body;
    if (!studentId || !violationId) {
      return res.status(400).json({ error: "Santri dan jenis pelanggaran wajib dipilih" });
    }
    let student = get("SELECT * FROM students WHERE id = ?", [studentId]);
    if (!student && studentName) {
      run(
        `INSERT OR IGNORE INTO students (id, student_number, name, class, gender, academic_year, status)
         VALUES (?, ?, ?, ?, 'L', '2025/2026', 'active')`,
        [studentId, studentNis || studentId, studentName, studentClass || "-"]
      );
      student = get("SELECT * FROM students WHERE id = ?", [studentId]);
    }
    if (!student) {
      return res.status(404).json({ error: "Santri tidak ditemukan" });
    }
    let violation = get("SELECT * FROM violations WHERE id = ?", [violationId]);
    if (!violation && violationName) {
      run(
        `INSERT OR IGNORE INTO violations (id, code, name, division, category, description, default_points, status)
         VALUES (?, ?, ?, ?, 'Kedisiplinan', '', ?, 'active')`,
        [violationId, "CUST_" + String(violationId).substring(0, 5), violationName, division || "tahfizh", Number(points || 5)]
      );
      violation = get("SELECT * FROM violations WHERE id = ?", [violationId]);
    }
    if (!violation) {
      return res.status(404).json({ error: "Jenis pelanggaran tidak ditemukan" });
    }
    const finalDivision = division === "kesantrian" ? "kesantrian" : violation.division === "kesantrian" ? "kesantrian" : "tahfizh";
    const actualHalaqahId = halaqahId || student.halaqah_id;
    let halaqahName = "Tanpa Halaqah";
    let teacherId = null;
    let teacherName = "Ustadz Pengampu";
    if (actualHalaqahId) {
      const hInfo = get(`
        SELECT h.*, t.name as t_name
        FROM halaqah h
        LEFT JOIN teachers t ON t.id = h.teacher_id
        WHERE h.id = ?
      `, [actualHalaqahId]);
      if (hInfo) {
        halaqahName = hInfo.name;
        teacherId = hInfo.teacher_id;
        teacherName = hInfo.t_name || "Ustadz Pengampu";
      }
    }
    if (finalDivision === "kesantrian") {
      if (locationName && locationName.trim()) {
        halaqahName = locationName.trim();
      } else {
        halaqahName = "Asrama & Kesantrian";
      }
      if (supervisorName && supervisorName.trim()) {
        teacherName = supervisorName.trim();
      } else {
        teacherName = createdBy || "Bagian Kesantrian";
      }
    }
    const today = /* @__PURE__ */ new Date();
    const finalDate = date || today.toISOString().split("T")[0];
    const finalTime = time || today.toTimeString().substring(0, 5);
    const recordId = "rec_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    run(
      `INSERT INTO violation_records (
        id, student_id, division, halaqah_id, teacher_id, violation_id,
        violation_name_snapshot, points_snapshot, halaqah_name_snapshot,
        teacher_name_snapshot, student_class_snapshot, academic_year_snapshot,
        date, time, notes, evidence_url, status, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now', 'localtime'))`,
      [
        recordId,
        student.id,
        finalDivision,
        finalDivision === "kesantrian" ? null : actualHalaqahId || null,
        finalDivision === "kesantrian" ? null : teacherId || null,
        violation.id,
        violation.name,
        // Snapshot name
        violation.default_points,
        // Snapshot points (Read-only from master)
        halaqahName,
        // Snapshot halaqah / lokasi
        teacherName,
        // Snapshot teacher / pembina
        student.class,
        // Snapshot student class at this moment
        student.academic_year || "2025/2026",
        finalDate,
        finalTime,
        notes ? notes.trim() : "",
        evidenceUrl || "",
        createdBy
      ]
    );
    const totalPointsRow = get(`
      SELECT COALESCE(SUM(points_snapshot), 0) as total,
             COALESCE(SUM(CASE WHEN division = 'tahfizh' THEN points_snapshot ELSE 0 END), 0) as tahfizh_points,
             COALESCE(SUM(CASE WHEN division = 'kesantrian' THEN points_snapshot ELSE 0 END), 0) as kesantrian_points
      FROM violation_records
      WHERE student_id = ? AND status = 'active'
    `, [student.id]);
    const newTotalPoints = Number(totalPointsRow?.total || 0);
    const tahfizhPoints = Number(totalPointsRow?.tahfizh_points || 0);
    const kesantrianPoints = Number(totalPointsRow?.kesantrian_points || 0);
    logAudit({
      userName: createdBy,
      action: "RECORD_VIOLATION",
      tableName: "violation_records",
      recordId,
      newData: {
        student: student.name,
        violation: violation.name,
        division: finalDivision,
        points: violation.default_points,
        newTotalPoints,
        tahfizhPoints,
        kesantrianPoints
      }
    });
    await persistDb();
    return res.status(201).json({
      message: "Pelanggaran berhasil dicatat.",
      recordId,
      studentName: student.name,
      violationName: violation.name,
      division: finalDivision,
      points: violation.default_points,
      newTotalPoints,
      tahfizhPoints,
      kesantrianPoints
    });
  } catch (err) {
    console.error("Record violation error:", err);
    return res.status(500).json({ error: "Data belum berhasil disimpan. Silakan coba kembali." });
  }
});
router7.put("/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason, actorName = "Admin" } = req.body;
    const record = get("SELECT * FROM violation_records WHERE id = ?", [id]);
    if (!record) return res.status(404).json({ error: "Catatan pelanggaran tidak ditemukan" });
    if (record.status === "cancelled") {
      return res.status(400).json({ error: "Catatan pelanggaran ini sudah dibatalkan sebelumnya" });
    }
    run(
      `UPDATE violation_records
       SET status = 'cancelled', cancelled_at = datetime('now', 'localtime'), cancelled_by = ?, cancellation_reason = ?
       WHERE id = ?`,
      [actorName, cancellationReason || "Dibatalkan oleh pengawas", id]
    );
    await persistDb();
    logAudit({
      userName: actorName,
      action: "CANCEL_VIOLATION_RECORD",
      tableName: "violation_records",
      recordId: id,
      oldData: { status: "active", points: record.points_snapshot },
      newData: { status: "cancelled", reason: cancellationReason }
    });
    return res.json({ success: true, message: "Catatan pelanggaran berhasil dibatalkan. Total poin santri telah diperbarui otomatis." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router7.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { actorName = "Admin" } = req.body || {};
    const record = get("SELECT * FROM violation_records WHERE id = ?", [id]);
    if (!record) {
      return res.json({ success: true, message: "Catatan pelanggaran sudah tidak ada atau telah dihapus" });
    }
    run("DELETE FROM violation_records WHERE id = ?", [id]);
    addTombstone(id, "record");
    await persistDb();
    logAudit({
      userName: actorName,
      action: "HARD_DELETE_VIOLATION_RECORD",
      tableName: "violation_records",
      recordId: id,
      oldData: record
    });
    return res.json({ success: true, message: "Catatan pelanggaran berhasil dihapus permanen" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router7.post("/bulk-delete", async (req, res) => {
  try {
    const { ids, actorName = "Admin" } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Daftar ID catatan wajib diisi" });
    }
    const deleted = [];
    const skipped = [];
    for (const id of ids) {
      const record = get("SELECT id FROM violation_records WHERE id = ?", [id]);
      if (!record) {
        skipped.push(id);
        continue;
      }
      run("DELETE FROM violation_records WHERE id = ?", [id]);
      addTombstone(id, "record");
      logAudit({
        userName: actorName,
        action: "BULK_DELETE_VIOLATION_RECORD",
        tableName: "violation_records",
        recordId: id
      });
      deleted.push(id);
    }
    await persistDb();
    return res.json({
      success: true,
      deletedCount: deleted.length,
      skippedCount: skipped.length,
      deletedIds: deleted,
      message: `${deleted.length} catatan pelanggaran berhasil dihapus permanen`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Gagal menghapus catatan secara massal" });
  }
});
router7.get("/stats", (req, res) => {
  try {
    const { division } = req.query;
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const currentMonth = today.substring(0, 7);
    const hasDivisionFilter = division && division !== "all";
    const divisionFilterSql = hasDivisionFilter ? `AND vr.division = '${division}'` : "";
    const totalStudents = get('SELECT COUNT(*) as count FROM students WHERE status = "active"')?.count || 0;
    const totalTeachers = get('SELECT COUNT(*) as count FROM teachers WHERE status = "active"')?.count || 0;
    const totalHalaqah = get('SELECT COUNT(*) as count FROM halaqah WHERE status = "active"')?.count || 0;
    const totalRecords = get(`SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = 'active' WHERE vr.status = "active" ${divisionFilterSql}`)?.count || 0;
    const totalPoints = get(`SELECT COALESCE(SUM(vr.points_snapshot), 0) as total FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = 'active' WHERE vr.status = "active" ${divisionFilterSql}`)?.total || 0;
    const tahfizhRecordsCount = get('SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.status = "active" AND vr.division = "tahfizh"')?.count || 0;
    const tahfizhTotalPoints = get('SELECT COALESCE(SUM(vr.points_snapshot), 0) as total FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.status = "active" AND vr.division = "tahfizh"')?.total || 0;
    const kesantrianRecordsCount = get('SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.status = "active" AND vr.division = "kesantrian"')?.count || 0;
    const kesantrianTotalPoints = get('SELECT COALESCE(SUM(vr.points_snapshot), 0) as total FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.status = "active" AND vr.division = "kesantrian"')?.total || 0;
    const todayCount = get(`SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.date = ? AND vr.status = "active" ${divisionFilterSql}`, [today])?.count || 0;
    const monthCount = get(`SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.date LIKE ? AND vr.status = "active" ${divisionFilterSql}`, [`${currentMonth}%`])?.count || 0;
    const totalPositiveRecords = get(`SELECT COUNT(*) as count FROM positive_records pr JOIN students s ON s.id = pr.student_id AND s.status = "active" WHERE pr.status = "active" ${hasDivisionFilter ? `AND pr.division = '${division}'` : ""}`)?.count || 0;
    const totalPointsDeducted = get(`SELECT COALESCE(SUM(pr.points_deducted), 0) as total FROM positive_records pr JOIN students s ON s.id = pr.student_id AND s.status = "active" WHERE pr.status = "active" ${hasDivisionFilter ? `AND pr.division = '${division}'` : ""}`)?.total || 0;
    const tahfizhDeductedPoints = get('SELECT COALESCE(SUM(pr.points_deducted), 0) as total FROM positive_records pr JOIN students s ON s.id = pr.student_id AND s.status = "active" WHERE pr.status = "active" AND pr.division = "tahfizh"')?.total || 0;
    const kesantrianDeductedPoints = get('SELECT COALESCE(SUM(pr.points_deducted), 0) as total FROM positive_records pr JOIN students s ON s.id = pr.student_id AND s.status = "active" WHERE pr.status = "active" AND pr.division = "kesantrian"')?.total || 0;
    const thresholds = query("SELECT * FROM point_thresholds ORDER BY sort_order ASC");
    const deductionsList = query(`
      SELECT student_id,
             COALESCE(SUM(points_deducted), 0) as total_deducted,
             COALESCE(SUM(CASE WHEN division = 'tahfizh' THEN points_deducted ELSE 0 END), 0) as tahfizh_deducted,
             COALESCE(SUM(CASE WHEN division = 'kesantrian' THEN points_deducted ELSE 0 END), 0) as kesantrian_deducted
      FROM positive_records
      WHERE status = 'active'
      GROUP BY student_id
    `);
    const deductionsMap = /* @__PURE__ */ new Map();
    for (const d of deductionsList) {
      deductionsMap.set(d.student_id, d);
    }
    const rawStudentPoints = query(`
      SELECT s.id, s.name, s.student_number, s.class, h.name as halaqah_name,
             COALESCE(SUM(vr.points_snapshot), 0) as gross_total_points,
             COALESCE(SUM(CASE WHEN vr.division = 'tahfizh' THEN vr.points_snapshot ELSE 0 END), 0) as gross_tahfizh_points,
             COALESCE(SUM(CASE WHEN vr.division = 'kesantrian' THEN vr.points_snapshot ELSE 0 END), 0) as gross_kesantrian_points,
             COUNT(vr.id) as violation_count
      FROM students s
      LEFT JOIN halaqah h ON h.id = s.halaqah_id
      JOIN violation_records vr ON vr.student_id = s.id AND vr.status = 'active'
      WHERE s.status = 'active'
      ${hasDivisionFilter ? `AND vr.division = '${division}'` : ""}
      GROUP BY s.id
    `);
    const enrichedStudents = rawStudentPoints.map((s) => {
      const d = deductionsMap.get(s.id) || {};
      const deductedTahfizh = Number(d.tahfizh_deducted || 0);
      const deductedKesantrian = Number(d.kesantrian_deducted || 0);
      const grossTahfizh = Number(s.gross_tahfizh_points || 0);
      const grossKesantrian = Number(s.gross_kesantrian_points || 0);
      const netTahfizh = Math.max(0, grossTahfizh - deductedTahfizh);
      const netKesantrian = Math.max(0, grossKesantrian - deductedKesantrian);
      const netTotal = hasDivisionFilter ? division === "tahfizh" ? netTahfizh : netKesantrian : netTahfizh + netKesantrian;
      return {
        id: s.id,
        name: s.name,
        student_number: s.student_number,
        class: s.class,
        halaqah_name: s.halaqah_name,
        total_points: netTotal,
        gross_points: Number(s.gross_total_points || 0),
        tahfizh_points: netTahfizh,
        kesantrian_points: netKesantrian,
        tahfizh_deductions: deductedTahfizh,
        kesantrian_deductions: deductedKesantrian,
        total_deductions: deductedTahfizh + deductedKesantrian,
        violation_count: s.violation_count
      };
    });
    const topStudents = [...enrichedStudents].sort((a, b) => b.total_points - a.total_points).slice(0, 10);
    const byCategory = query(`
      SELECT COALESCE(v.category, 'Kedisiplinan') as category,
             COALESCE(vr.division, 'tahfizh') as division,
             COUNT(vr.id) as count,
             COALESCE(SUM(vr.points_snapshot), 0) as points
      FROM violation_records vr
      JOIN students s ON s.id = vr.student_id AND s.status = 'active'
      LEFT JOIN violations v ON v.id = vr.violation_id
      WHERE vr.status = 'active' ${divisionFilterSql}
      GROUP BY COALESCE(v.category, 'Kedisiplinan'), COALESCE(vr.division, 'tahfizh')
      ORDER BY count DESC
    `);
    const pointsByHalaqah = query(`
      SELECT vr.halaqah_name_snapshot as halaqah_name,
             COUNT(vr.id) as violation_count,
             COALESCE(SUM(vr.points_snapshot), 0) as total_points
      FROM violation_records vr
      JOIN students s ON s.id = vr.student_id AND s.status = 'active'
      WHERE vr.status = 'active' ${divisionFilterSql}
      GROUP BY vr.halaqah_name_snapshot
      ORDER BY total_points DESC
    `);
    const monthlyTrend = query(`
      SELECT substr(vr.date, 1, 7) as month,
             COUNT(vr.id) as count,
             COALESCE(SUM(vr.points_snapshot), 0) as points
      FROM violation_records vr
      JOIN students s ON s.id = vr.student_id AND s.status = 'active'
      WHERE vr.status = 'active' ${divisionFilterSql}
      GROUP BY month
      ORDER BY month ASC
      LIMIT 6
    `);
    const attentionThreshold = thresholds.find((t) => t.minimum_points > 0)?.minimum_points || 20;
    const studentsNeedingAttention = enrichedStudents.filter((s) => s.total_points >= attentionThreshold).sort((a, b) => b.total_points - a.total_points);
    return res.json({
      summary: {
        totalStudents,
        totalTeachers,
        totalHalaqah,
        totalRecords,
        totalPoints,
        todayCount,
        monthCount,
        tahfizhRecordsCount,
        tahfizhTotalPoints,
        kesantrianRecordsCount,
        kesantrianTotalPoints,
        totalPositiveRecords,
        totalPointsDeducted,
        tahfizhDeductedPoints,
        kesantrianDeductedPoints,
        netTotalPoints: Math.max(0, totalPoints - totalPointsDeducted)
      },
      topStudents,
      byCategory,
      pointsByHalaqah,
      monthlyTrend,
      studentsNeedingAttention
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var records_default = router7;

// server/src/routes/settings.ts
import { Router as Router8 } from "express";
var router8 = Router8();
router8.get("/", (req, res) => {
  try {
    let settings = get('SELECT * FROM school_settings WHERE id = "settings_default"');
    if (!settings) {
      settings = {
        id: "settings_default",
        app_name: "Sistem Poin Santri Halaqah",
        school_name: "Pesantren Tahfizh Al-Qur'an Imam Asy-Syathibi",
        address: "Jl. Karang Anyar No. 45, Kompleks Islamic Center, Bogor, Jawa Barat",
        phone: "0811-9876-5432",
        email: "tahfizh@imamsyathibi.sch.id",
        logo_url: "/logo.svg",
        kop_surat_text: "BIDANG PENDIDIKAN DAN KEPENGASUHAN - DIVISI HALAQAH TAHFIZH",
        current_academic_year: "2025/2026"
      };
      run(
        `INSERT OR IGNORE INTO school_settings (id, app_name, school_name, address, phone, email, logo_url, kop_surat_text, current_academic_year)
         VALUES ('settings_default', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [settings.app_name, settings.school_name, settings.address, settings.phone, settings.email, settings.logo_url, settings.kop_surat_text, settings.current_academic_year]
      );
    }
    let thresholds = query("SELECT * FROM point_thresholds ORDER BY sort_order ASC");
    if (!thresholds || thresholds.length === 0) {
      const defaultThresholds = [
        { id: "th_1", min: 0, max: 19, name: "AMAN", color: "emerald", desc: "Kedisiplinan dan capaian hafalan santri dalam kondisi baik.", order: 1 },
        { id: "th_2", min: 20, max: 49, name: "PERLU PEMBINAAN", color: "amber", desc: "Perlu bimbingan dan pemantauan berkala oleh Muhafizh.", order: 2 },
        { id: "th_3", min: 50, max: 74, name: "PEMBINAAN KHUSUS", color: "orange", desc: "Pemanggilan oleh Koordinator Tahfizh dan jadwal murojaah tambahan.", order: 3 },
        { id: "th_4", min: 75, max: 99, name: "PERINGATAN RESMI", color: "rose", desc: "Penerbitan Surat Peringatan (SP) dan pemanggilan orang tua/wali.", order: 4 },
        { id: "th_5", min: 100, max: 999, name: "TINDAKAN LANJUT", color: "red", desc: "Sidang Dewan Asatidz dan evaluasi kelanjutan kepesertaan halaqah.", order: 5 }
      ];
      for (const th of defaultThresholds) {
        run(
          `INSERT OR IGNORE INTO point_thresholds (id, minimum_points, maximum_points, status_name, badge_color, description, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [th.id, th.min, th.max, th.name, th.color, th.desc, th.order]
        );
      }
      thresholds = query("SELECT * FROM point_thresholds ORDER BY sort_order ASC");
    }
    return res.json({
      settings,
      thresholds
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router8.put("/school", async (req, res) => {
  try {
    const {
      appName,
      schoolName,
      address,
      phone,
      email,
      logoUrl,
      kopSuratText,
      currentAcademicYear,
      actorName = "Admin"
    } = req.body;
    const old = get('SELECT * FROM school_settings WHERE id = "settings_default"');
    const updatedAppName = appName ? appName.trim() : old?.app_name || "Sistem Poin Santri Halaqah";
    const updatedSchoolName = schoolName ? schoolName.trim() : old?.school_name || "Pesantren Tahfizh Al-Qur'an Imam Asy-Syathibi";
    const updatedAddress = address ? address.trim() : old?.address || "Jl. Karang Anyar No. 45, Kompleks Islamic Center, Bogor, Jawa Barat";
    const updatedPhone = phone !== void 0 ? phone.trim() : old?.phone || "0811-9876-5432";
    const updatedEmail = email !== void 0 ? email.trim() : old?.email || "tahfizh@imamsyathibi.sch.id";
    const updatedLogo = logoUrl !== void 0 ? logoUrl.trim() : old?.logo_url || "/logo.svg";
    const updatedKop = kopSuratText !== void 0 ? kopSuratText.trim() : old?.kop_surat_text || "BIDANG PENDIDIKAN DAN KEPENGASUHAN - DIVISI HALAQAH TAHFIZH";
    const updatedYear = currentAcademicYear ? currentAcademicYear.trim() : old?.current_academic_year || "2025/2026";
    run(
      `INSERT OR REPLACE INTO school_settings (id, app_name, school_name, address, phone, email, logo_url, kop_surat_text, current_academic_year)
       VALUES ('settings_default', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [updatedAppName, updatedSchoolName, updatedAddress, updatedPhone, updatedEmail, updatedLogo, updatedKop, updatedYear]
    );
    logAudit({
      userName: actorName,
      action: "UPDATE_SCHOOL_SETTINGS",
      tableName: "school_settings",
      recordId: "settings_default",
      oldData: old,
      newData: { appName: updatedAppName, schoolName: updatedSchoolName, address: updatedAddress, logoUrl: updatedLogo }
    });
    await persistDb();
    return res.json({ message: "Pengaturan identitas sekolah & aplikasi berhasil disimpan" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router8.put("/thresholds", async (req, res) => {
  try {
    const { thresholds, actorName = "Admin" } = req.body;
    if (!Array.isArray(thresholds)) {
      return res.status(400).json({ error: "Data batas poin tidak valid" });
    }
    const oldThresholds = query("SELECT * FROM point_thresholds");
    run("DELETE FROM point_thresholds");
    for (let i = 0; i < thresholds.length; i++) {
      const th = thresholds[i];
      const id = th.id || "th_" + (i + 1);
      run(
        `INSERT INTO point_thresholds (id, minimum_points, maximum_points, status_name, badge_color, description, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          parseInt(th.minimum_points || th.min, 10),
          parseInt(th.maximum_points || th.max, 10),
          th.status_name || th.name,
          th.badge_color || th.color || "blue",
          th.description || th.desc || "",
          i + 1
        ]
      );
    }
    logAudit({
      userName: actorName,
      action: "UPDATE_POINT_THRESHOLDS",
      tableName: "point_thresholds",
      oldData: oldThresholds,
      newData: thresholds
    });
    await persistDb();
    return res.json({ message: "Batas status poin berhasil diperbarui" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var settings_default = router8;

// server/src/routes/audit.ts
import { Router as Router9 } from "express";
var router9 = Router9();
router9.get("/", (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logs = query(`
      SELECT *
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ?
    `, [parseInt(limit, 10)]);
    const parsed = logs.map((l) => ({
      ...l,
      old_data: l.old_data ? JSON.parse(l.old_data) : null,
      new_data: l.new_data ? JSON.parse(l.new_data) : null
    }));
    return res.json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var audit_default = router9;

// server/src/routes/positiveActions.ts
import { Router as Router10 } from "express";
var router10 = Router10();
router10.get("/", (req, res) => {
  try {
    const { division, category, status } = req.query;
    let sql = "SELECT * FROM positive_actions WHERE 1=1";
    const params = [];
    if (division && (division === "tahfizh" || division === "kesantrian")) {
      sql += " AND division = ?";
      params.push(division);
    }
    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }
    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }
    sql += " ORDER BY code ASC";
    const actions = query(sql, params);
    return res.json(actions);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router10.get("/:id", (req, res) => {
  try {
    const action = get("SELECT * FROM positive_actions WHERE id = ?", [req.params.id]);
    if (!action) return res.status(404).json({ error: "Aturan kegiatan baik tidak ditemukan" });
    return res.json(action);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router10.post("/", async (req, res) => {
  try {
    const { code, name, division = "tahfizh", category, description, defaultPointsDeduction, actorName = "Admin" } = req.body;
    if (!code || !name || !category || !defaultPointsDeduction) {
      return res.status(400).json({ error: "Kode, nama, kategori, dan poin pengurangan wajib diisi" });
    }
    const cleanCode = code.trim().toUpperCase();
    const existing = get("SELECT id FROM positive_actions WHERE code = ?", [cleanCode]);
    if (existing) {
      return res.status(400).json({ error: `Kode aturan ${cleanCode} sudah digunakan` });
    }
    const points = parseInt(defaultPointsDeduction, 10);
    if (isNaN(points) || points <= 0) {
      return res.status(400).json({ error: "Poin pengurangan harus berupa angka positif (> 0)" });
    }
    const actionId = "act_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    run(
      `INSERT INTO positive_actions (id, code, name, division, category, description, default_points_deduction, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [actionId, cleanCode, name.trim(), division, category, description || "", points]
    );
    logAudit({
      userName: actorName,
      action: "CREATE_POSITIVE_ACTION",
      tableName: "positive_actions",
      recordId: actionId,
      newData: { code: cleanCode, name, division, category, points }
    });
    await persistDb();
    return res.status(201).json({ message: "Aturan kegiatan baik berhasil ditambahkan", actionId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router10.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, division, category, description, defaultPointsDeduction, status, actorName = "Admin" } = req.body;
    const oldAction = get("SELECT * FROM positive_actions WHERE id = ?", [id]);
    if (!oldAction) return res.status(404).json({ error: "Aturan kegiatan baik tidak ditemukan" });
    const cleanCode = code ? code.trim().toUpperCase() : oldAction.code;
    if (cleanCode !== oldAction.code) {
      const conflict = get("SELECT id FROM positive_actions WHERE code = ? AND id != ?", [cleanCode, id]);
      if (conflict) return res.status(400).json({ error: `Kode aturan ${cleanCode} sudah digunakan` });
    }
    const points = defaultPointsDeduction !== void 0 ? parseInt(defaultPointsDeduction, 10) : oldAction.default_points_deduction;
    if (isNaN(points) || points <= 0) {
      return res.status(400).json({ error: "Poin pengurangan harus berupa angka positif (> 0)" });
    }
    const updatedDivision = division || oldAction.division;
    const updatedCategory = category || oldAction.category;
    const updatedName = name ? name.trim() : oldAction.name;
    const updatedDesc = description !== void 0 ? description : oldAction.description;
    const updatedStatus = status || oldAction.status;
    run(
      `UPDATE positive_actions
       SET code = ?, name = ?, division = ?, category = ?, description = ?, default_points_deduction = ?, status = ?
       WHERE id = ?`,
      [cleanCode, updatedName, updatedDivision, updatedCategory, updatedDesc, points, updatedStatus, id]
    );
    logAudit({
      userName: actorName,
      action: "UPDATE_POSITIVE_ACTION",
      tableName: "positive_actions",
      recordId: id,
      oldData: oldAction,
      newData: { code: cleanCode, name: updatedName, division: updatedDivision, category: updatedCategory, points, status: updatedStatus }
    });
    await persistDb();
    return res.json({ message: "Aturan kegiatan baik berhasil diperbarui" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router10.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { actorName = "Admin" } = req.body || {};
    const oldAction = get("SELECT * FROM positive_actions WHERE id = ?", [id]);
    if (!oldAction) {
      addTombstone(id, "positive_action");
      await persistDb();
      return res.json({ message: "Aturan kegiatan baik sudah tidak ada atau telah dihapus" });
    }
    const usageCount = query("SELECT COUNT(*) as count FROM positive_records WHERE action_id = ?", [id])[0]?.count || 0;
    if (usageCount > 0) {
      run('UPDATE positive_actions SET status = "inactive" WHERE id = ?', [id]);
      await persistDb();
      return res.json({ message: "Aturan dinonaktifkan karena telah digunakan dalam riwayat santri" });
    }
    run("DELETE FROM positive_actions WHERE id = ?", [id]);
    addTombstone(id, "positive_action");
    await persistDb();
    logAudit({
      userName: actorName,
      action: "DELETE_POSITIVE_ACTION",
      tableName: "positive_actions",
      recordId: id,
      oldData: oldAction
    });
    return res.json({ message: "Aturan kegiatan baik berhasil dihapus permanen" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var positiveActions_default = router10;

// server/src/routes/positiveRecords.ts
import { Router as Router11 } from "express";
var router11 = Router11();
router11.get("/", (req, res) => {
  try {
    const { student_id, division, halaqah_id, status, startDate, endDate } = req.query;
    let sql = `
      SELECT pr.*,
             s.name as student_name, s.student_number as student_nis, s.gender as student_gender,
             h.name as current_halaqah_name,
             t.name as current_teacher_name,
             pa.category as action_category,
             pa.code as action_code
      FROM positive_records pr
      JOIN students s ON s.id = pr.student_id
      LEFT JOIN halaqah h ON h.id = s.halaqah_id
      LEFT JOIN teachers t ON t.id = h.teacher_id
      LEFT JOIN positive_actions pa ON pa.id = pr.action_id
      WHERE 1=1
    `;
    const params = [];
    if (student_id) {
      sql += " AND pr.student_id = ?";
      params.push(student_id);
    }
    if (division && (division === "tahfizh" || division === "kesantrian")) {
      sql += " AND pr.division = ?";
      params.push(division);
    }
    if (halaqah_id) {
      sql += " AND (pr.halaqah_id = ? OR s.halaqah_id = ?)";
      params.push(halaqah_id, halaqah_id);
    }
    if (status) {
      sql += " AND pr.status = ?";
      params.push(status);
    }
    if (startDate) {
      sql += " AND pr.date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      sql += " AND pr.date <= ?";
      params.push(endDate);
    }
    sql += " ORDER BY pr.date DESC, pr.time DESC, pr.created_at DESC";
    const records = query(sql, params);
    return res.json(records);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router11.post("/", async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      studentNis,
      studentClass,
      division = "tahfizh",
      actionId,
      customActionName,
      customPoints,
      date,
      time,
      notes,
      supervisorName,
      locationName,
      actorName = "Admin"
    } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: "Santri wajib dipilih" });
    }
    let student = get(`
      SELECT s.*, h.name as halaqah_name, h.id as halaqah_id, t.name as teacher_name, t.id as teacher_id
      FROM students s
      LEFT JOIN halaqah h ON h.id = s.halaqah_id
      LEFT JOIN teachers t ON t.id = h.teacher_id
      WHERE s.id = ?
    `, [studentId]);
    if (!student && studentName) {
      run(
        `INSERT OR IGNORE INTO students (id, student_number, name, class, gender, academic_year, status)
         VALUES (?, ?, ?, ?, 'L', '2025/2026', 'active')`,
        [studentId, studentNis || studentId, studentName, studentClass || "-"]
      );
      student = get(`
        SELECT s.*, h.name as halaqah_name, h.id as halaqah_id, t.name as teacher_name, t.id as teacher_id
        FROM students s
        LEFT JOIN halaqah h ON h.id = s.halaqah_id
        LEFT JOIN teachers t ON t.id = h.teacher_id
        WHERE s.id = ?
      `, [studentId]);
    }
    if (!student) return res.status(404).json({ error: "Data santri tidak ditemukan" });
    let actionName = customActionName || "Kegiatan Baik / Prestasi";
    let pointsDeducted = Number(customPoints) || 5;
    if (actionId) {
      const action = get("SELECT * FROM positive_actions WHERE id = ?", [actionId]);
      if (action) {
        actionName = action.name;
        pointsDeducted = customPoints !== void 0 && Number(customPoints) > 0 ? Number(customPoints) : action.default_points_deduction;
      }
    }
    if (pointsDeducted <= 0) {
      return res.status(400).json({ error: "Poin pengurangan harus lebih dari 0" });
    }
    const settings = get('SELECT * FROM school_settings WHERE id = "settings_default"');
    const academicYear = settings?.current_academic_year || student.academic_year || "2025/2026";
    const now = /* @__PURE__ */ new Date();
    const recordDate = date || now.toISOString().split("T")[0];
    const recordTime = time || now.toTimeString().substring(0, 5);
    const halaqahName = division === "kesantrian" ? locationName || "Asrama & Kesantrian" : student.halaqah_name || "Halaqah Mandiri";
    const teacherName = supervisorName || student.teacher_name || actorName || "Pembimbing";
    const recordId = "pos_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    run(
      `INSERT INTO positive_records (
        id, student_id, division, action_id,
        action_name_snapshot, points_deducted, halaqah_id, halaqah_name_snapshot,
        teacher_id, teacher_name_snapshot, student_class_snapshot, academic_year_snapshot,
        date, time, notes, status, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now', 'localtime'))`,
      [
        recordId,
        studentId,
        division,
        actionId || null,
        actionName,
        pointsDeducted,
        division === "tahfizh" ? student.halaqah_id : null,
        halaqahName,
        division === "tahfizh" ? student.teacher_id : null,
        teacherName,
        student.class || "8A",
        academicYear,
        recordDate,
        recordTime,
        notes || "",
        actorName
      ]
    );
    logAudit({
      userName: actorName,
      action: "RECORD_POSITIVE_ACTION",
      tableName: "positive_records",
      recordId,
      newData: {
        studentId,
        studentName: student.name,
        actionName,
        pointsDeducted,
        division,
        date: recordDate
      }
    });
    await persistDb();
    return res.status(201).json({
      message: "Kegiatan baik / pengurangan poin berhasil dicatat",
      recordId,
      pointsDeducted
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router11.put("/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, actorName = "Admin" } = req.body;
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: "Alasan pembatalan catatan kebaikan wajib diisi" });
    }
    const record = get("SELECT * FROM positive_records WHERE id = ?", [id]);
    if (!record) return res.status(404).json({ error: "Catatan kebaikan tidak ditemukan" });
    if (record.status === "cancelled") {
      return res.status(400).json({ error: "Catatan ini sudah dalam status dibatalkan" });
    }
    run(
      `UPDATE positive_records
       SET status = 'cancelled',
           cancelled_at = datetime('now', 'localtime'),
           cancelled_by = ?,
           cancellation_reason = ?
       WHERE id = ?`,
      [actorName, reason.trim(), id]
    );
    await persistDb();
    logAudit({
      userName: actorName,
      action: "CANCEL_POSITIVE_RECORD",
      tableName: "positive_records",
      recordId: id,
      oldData: { status: "active", points: record.points_deducted },
      newData: { status: "cancelled", reason: reason.trim() }
    });
    return res.json({ success: true, message: "Catatan kebaikan berhasil dibatalkan" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router11.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { actorName = "Admin" } = req.body || {};
    const record = get("SELECT * FROM positive_records WHERE id = ?", [id]);
    if (!record) {
      return res.json({ success: true, message: "Catatan kebaikan sudah tidak ada atau telah dihapus" });
    }
    run("DELETE FROM positive_records WHERE id = ?", [id]);
    addTombstone(id, "positive_record");
    await persistDb();
    logAudit({
      userName: actorName,
      action: "DELETE_POSITIVE_RECORD",
      tableName: "positive_records",
      recordId: id,
      oldData: record
    });
    return res.json({ success: true, message: "Catatan kebaikan berhasil dihapus permanen" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router11.post("/bulk-delete", async (req, res) => {
  try {
    const { ids, actorName = "Admin" } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Daftar ID catatan kebaikan wajib diisi" });
    }
    const deleted = [];
    const skipped = [];
    for (const id of ids) {
      const record = get("SELECT id FROM positive_records WHERE id = ?", [id]);
      if (!record) {
        skipped.push(id);
        continue;
      }
      run("DELETE FROM positive_records WHERE id = ?", [id]);
      addTombstone(id, "positive_record");
      logAudit({
        userName: actorName,
        action: "BULK_DELETE_POSITIVE_RECORD",
        tableName: "positive_records",
        recordId: id
      });
      deleted.push(id);
    }
    await persistDb();
    return res.json({
      success: true,
      deletedCount: deleted.length,
      skippedCount: skipped.length,
      deletedIds: deleted,
      message: `${deleted.length} catatan kebaikan berhasil dihapus permanen`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Gagal menghapus catatan kebaikan secara massal" });
  }
});
var positiveRecords_default = router11;

// server/src/routes/sync.ts
import { Router as Router12 } from "express";
var router12 = Router12();
router12.get("/status", (req, res) => {
  res.json({
    status: "ok",
    cloud: getActiveCloudProvider(),
    serverTime: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router12.get("/state", (req, res) => {
  try {
    const state = exportDatabaseState();
    res.json({
      status: "ok",
      cloud: getActiveCloudProvider(),
      serverTime: (/* @__PURE__ */ new Date()).toISOString(),
      state
    });
  } catch (err) {
    console.error("Error in GET /api/sync/state:", err);
    res.status(500).json({ error: err?.message || "Gagal mengekspor state database" });
  }
});
router12.post("/state", async (req, res) => {
  try {
    const { clientState, delta } = req.body || {};
    if (clientState && clientState.students) {
      importDatabaseState(clientState);
      await persistDb();
      return res.json({
        success: true,
        message: "State database berhasil diperbarui secara penuh",
        cloud: getActiveCloudProvider(),
        state: exportDatabaseState()
      });
    }
    if (delta) {
      if (Array.isArray(delta.deletedStudentIds)) {
        for (const id of delta.deletedStudentIds) {
          run("DELETE FROM student_halaqah_history WHERE student_id = ?", [id]);
          run("DELETE FROM violation_records WHERE student_id = ?", [id]);
          run("DELETE FROM positive_records WHERE student_id = ?", [id]);
          run("DELETE FROM students WHERE id = ?", [id]);
          addTombstone(id, "student");
        }
      }
      if (Array.isArray(delta.deletedRecordIds)) {
        for (const id of delta.deletedRecordIds) {
          run("DELETE FROM violation_records WHERE id = ?", [id]);
          addTombstone(id, "record");
        }
      }
      if (Array.isArray(delta.deletedPosRecordIds)) {
        for (const id of delta.deletedPosRecordIds) {
          run("DELETE FROM positive_records WHERE id = ?", [id]);
          addTombstone(id, "positive_record");
        }
      }
      if (Array.isArray(delta.deletedHalaqahIds)) {
        for (const id of delta.deletedHalaqahIds) {
          run("UPDATE students SET halaqah_id = NULL WHERE halaqah_id = ?", [id]);
          run("DELETE FROM halaqah WHERE id = ?", [id]);
          addTombstone(id, "halaqah");
        }
      }
      if (Array.isArray(delta.deletedTeacherIds)) {
        for (const id of delta.deletedTeacherIds) {
          run("UPDATE halaqah SET teacher_id = NULL WHERE teacher_id = ?", [id]);
          run("DELETE FROM teachers WHERE id = ?", [id]);
          addTombstone(id, "teacher");
        }
      }
      if (Array.isArray(delta.deletedUserIds)) {
        for (const id of delta.deletedUserIds) {
          if (id !== "usr_admin_imbs") {
            run("DELETE FROM users WHERE id = ?", [id]);
            addTombstone(id, "user");
          }
        }
      }
      if (Array.isArray(delta.deletedViolationIds)) {
        for (const id of delta.deletedViolationIds) {
          run("UPDATE violation_records SET violation_id = NULL WHERE violation_id = ?", [id]);
          run("DELETE FROM violations WHERE id = ?", [id]);
          addTombstone(id, "violation");
        }
      }
      if (Array.isArray(delta.deletedActionIds)) {
        for (const id of delta.deletedActionIds) {
          run("UPDATE positive_records SET action_id = NULL WHERE action_id = ?", [id]);
          run("DELETE FROM positive_actions WHERE id = ?", [id]);
          addTombstone(id, "positive_action");
        }
      }
      if (Array.isArray(delta.createdStudents)) {
        for (const s of delta.createdStudents) {
          const exists = get("SELECT id FROM students WHERE id = ? OR student_number = ?", [s.id, s.student_number]);
          if (!exists) {
            run(
              `INSERT INTO students (id, student_number, name, class, gender, halaqah_id, academic_year, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                s.id,
                s.student_number,
                s.name,
                s.class || "-",
                s.gender || "L",
                s.halaqah_id || null,
                s.academic_year || "2025/2026",
                s.status || "active",
                s.created_at || (/* @__PURE__ */ new Date()).toISOString()
              ]
            );
          }
        }
      }
      if (Array.isArray(delta.createdHalaqahs)) {
        for (const h of delta.createdHalaqahs) {
          const exists = get("SELECT id FROM halaqah WHERE id = ?", [h.id]);
          if (!exists) {
            run(
              `INSERT INTO halaqah (id, name, teacher_id, schedule, location, academic_year, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                h.id,
                h.name,
                h.teacher_id || null,
                h.schedule || "Ba'da Subuh & Ba'da Maghrib",
                h.location || "Masjid Utama",
                h.academic_year || "2025/2026",
                h.status || "active",
                h.created_at || (/* @__PURE__ */ new Date()).toISOString()
              ]
            );
          }
        }
      }
      if (Array.isArray(delta.createdTeachers)) {
        for (const t of delta.createdTeachers) {
          const exists = get("SELECT id FROM teachers WHERE id = ?", [t.id]);
          if (!exists) {
            run(
              `INSERT INTO teachers (id, user_id, name, phone, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [t.id, t.user_id || null, t.name, t.phone || "", t.status || "active", t.created_at || (/* @__PURE__ */ new Date()).toISOString()]
            );
          }
        }
      }
      if (Array.isArray(delta.createdRecords)) {
        for (const r of delta.createdRecords) {
          const exists = get("SELECT id FROM violation_records WHERE id = ?", [r.id]);
          if (!exists) {
            run(
              `INSERT INTO violation_records (
                id, student_id, division, halaqah_id, teacher_id, violation_id,
                violation_name_snapshot, points_snapshot, halaqah_name_snapshot,
                teacher_name_snapshot, student_class_snapshot, academic_year_snapshot,
                date, time, notes, status, created_by, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                r.id,
                r.student_id,
                r.division || "tahfizh",
                r.halaqah_id || null,
                r.teacher_id || null,
                r.violation_id || null,
                r.violation_name_snapshot || "Pelanggaran",
                r.points_snapshot || 0,
                r.halaqah_name_snapshot || "-",
                r.teacher_name_snapshot || "Pembina",
                r.student_class_snapshot || "-",
                r.academic_year_snapshot || "2025/2026",
                r.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
                r.time || "00:00",
                r.notes || "",
                r.status || "active",
                r.created_by || "Petugas",
                r.created_at || (/* @__PURE__ */ new Date()).toISOString()
              ]
            );
          }
        }
      }
      if (Array.isArray(delta.createdPosRecords)) {
        for (const pr of delta.createdPosRecords) {
          const exists = get("SELECT id FROM positive_records WHERE id = ?", [pr.id]);
          if (!exists) {
            run(
              `INSERT INTO positive_records (
                id, student_id, division, action_id, action_name_snapshot, points_deducted,
                halaqah_id, halaqah_name_snapshot, teacher_id, teacher_name_snapshot,
                student_class_snapshot, academic_year_snapshot, date, time, notes, status, created_by, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                pr.id,
                pr.student_id,
                pr.division || "tahfizh",
                pr.action_id || null,
                pr.action_name_snapshot || "Kegiatan Baik",
                pr.points_deducted || 0,
                pr.halaqah_id || null,
                pr.halaqah_name_snapshot || "-",
                pr.teacher_id || null,
                pr.teacher_name_snapshot || "Pembina",
                pr.student_class_snapshot || "-",
                pr.academic_year_snapshot || "2025/2026",
                pr.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
                pr.time || "00:00",
                pr.notes || "",
                pr.status || "active",
                pr.created_by || "Petugas",
                pr.created_at || (/* @__PURE__ */ new Date()).toISOString()
              ]
            );
          }
        }
      }
      if (Array.isArray(delta.createdUsers)) {
        for (const u of delta.createdUsers) {
          const exists = get("SELECT id FROM users WHERE id = ? OR LOWER(email) = ?", [u.id, (u.email || "").toLowerCase()]);
          if (!exists) {
            run(
              `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [u.id, u.name, (u.email || "").toLowerCase(), u.password || "admin123", u.role || "teacher", u.status || "active", u.created_at || (/* @__PURE__ */ new Date()).toISOString()]
            );
          }
        }
      }
      if (delta.cancelledRecords && typeof delta.cancelledRecords === "object") {
        for (const [id, reason] of Object.entries(delta.cancelledRecords)) {
          run("UPDATE violation_records SET status = 'cancelled', cancellation_reason = ? WHERE id = ?", [reason, id]);
        }
      }
      if (delta.cancelledPosRecords && typeof delta.cancelledPosRecords === "object") {
        for (const [id, reason] of Object.entries(delta.cancelledPosRecords)) {
          run("UPDATE positive_records SET status = 'cancelled', cancellation_reason = ? WHERE id = ?", [reason, id]);
        }
      }
      if (delta.updatedStudents && typeof delta.updatedStudents === "object") {
        for (const [id, up] of Object.entries(delta.updatedStudents)) {
          run(
            `UPDATE students SET
              name = COALESCE(?, name),
              student_number = COALESCE(?, student_number),
              class = COALESCE(?, class),
              halaqah_id = COALESCE(?, halaqah_id)
             WHERE id = ?`,
            [up.name || null, up.student_number || null, up.class || null, up.halaqah_id || null, id]
          );
        }
      }
      if (delta.updatedHalaqahs && typeof delta.updatedHalaqahs === "object") {
        for (const [id, up] of Object.entries(delta.updatedHalaqahs)) {
          run(
            `UPDATE halaqah SET
              name = COALESCE(?, name),
              teacher_id = COALESCE(?, teacher_id),
              schedule = COALESCE(?, schedule),
              location = COALESCE(?, location)
             WHERE id = ?`,
            [up.name || null, up.teacher_id || null, up.schedule || null, up.location || null, id]
          );
        }
      }
      if (delta.updatedTeachers && typeof delta.updatedTeachers === "object") {
        for (const [id, up] of Object.entries(delta.updatedTeachers)) {
          run(
            `UPDATE teachers SET
              name = COALESCE(?, name),
              phone = COALESCE(?, phone),
              status = COALESCE(?, status)
             WHERE id = ?`,
            [up.name || null, up.phone || null, up.status || null, id]
          );
        }
      }
      if (delta.updatedUsers && typeof delta.updatedUsers === "object") {
        for (const [id, up] of Object.entries(delta.updatedUsers)) {
          run(
            `UPDATE users SET
              name = COALESCE(?, name),
              email = COALESCE(?, email),
              role = COALESCE(?, role),
              status = COALESCE(?, status)
             WHERE id = ?`,
            [up.name || null, up.email || null, up.role || null, up.status || null, id]
          );
        }
      }
      await persistDb();
    }
    const state = exportDatabaseState();
    return res.json({
      success: true,
      message: "Sinkronisasi berhasil diterapkan",
      cloud: getActiveCloudProvider(),
      state
    });
  } catch (err) {
    console.error("Error in POST /api/sync/state:", err);
    return res.status(500).json({ error: err?.message || "Gagal memproses sinkronisasi" });
  }
});
router12.post("/reset", async (req, res) => {
  try {
    const { actorName = "Admin" } = req.body || {};
    run("DELETE FROM tombstones;");
    seedDatabase();
    await persistDb();
    console.log(`[SYNC_RESET] Database berhasil di-reset oleh ${actorName}`);
    return res.json({
      success: true,
      message: "Database berhasil di-reset ke data awal dan disinkronkan ke cloud persistence",
      state: exportDatabaseState()
    });
  } catch (err) {
    console.error("Error in POST /api/sync/reset:", err);
    return res.status(500).json({ error: err?.message || "Gagal mereset database" });
  }
});
var sync_default = router12;

// server/src/app.ts
var app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
var initPromise = null;
async function ensureDbInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      console.log("Menginisialisasi engine database SQLite & cloud persistence...");
      await getDb();
      try {
        const cloudSnapshot = await loadCloudSnapshot();
        const hasData = cloudSnapshot && (Array.isArray(cloudSnapshot.users) && cloudSnapshot.users.length > 0 || Array.isArray(cloudSnapshot.school_settings) && cloudSnapshot.school_settings.length > 0 || Array.isArray(cloudSnapshot.point_thresholds) && cloudSnapshot.point_thresholds.length > 0 || Array.isArray(cloudSnapshot.students) && cloudSnapshot.students.length > 0 || Array.isArray(cloudSnapshot.violations) && cloudSnapshot.violations.length > 0);
        if (hasData) {
          console.log("Memuat data dari Cloud Snapshot...");
          importDatabaseState(cloudSnapshot);
        } else {
          console.log("Cloud snapshot belum ada atau kosong, melakukan seeding awal...");
          seedDatabase();
          await persistDb();
        }
      } catch (e) {
        console.warn("Gagal memeriksa cloud snapshot, menggunakan seeder lokal:", e?.message || e);
        seedDatabase();
        await persistDb();
      }
      console.log("Engine database SQLite & cloud synchronization siap digunakan.");
    })().catch((err) => {
      initPromise = null;
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
  } catch (err) {
    console.error("Database initialization error:", err);
    res.status(500).json({ error: "Gagal menginisialisasi database: " + (err?.message || err) });
  }
});
app.use((req, res, next) => {
  const matchedPath = req.headers["x-matched-path"] || req.headers["x-vercel-matched-path"] || req.headers["x-forwarded-uri"];
  if (matchedPath && (req.url === "/api/index.js" || req.url === "/api/index" || req.url === "/api" || req.url === "/")) {
    req.url = matchedPath;
  }
  next();
});
var apiRouter = express.Router();
apiRouter.use("/auth", auth_default);
apiRouter.use("/users", users_default);
apiRouter.use("/teachers", teachers_default);
apiRouter.use("/halaqah", halaqah_default);
apiRouter.use("/students", students_default);
apiRouter.use("/violations", violations_default);
apiRouter.use("/records", records_default);
apiRouter.use("/positive-actions", positiveActions_default);
apiRouter.use("/positive-records", positiveRecords_default);
apiRouter.use("/settings", settings_default);
apiRouter.use("/audit-logs", audit_default);
apiRouter.use("/sync", sync_default);
apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok", serverless: !!process.env.VERCEL, time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.use("/api", apiRouter);
app.use("/", apiRouter);
app.use((err, req, res, next) => {
  console.error("Server error handler caught:", err);
  res.status(500).json({ error: err?.message || "Terjadi kesalahan internal pada server" });
});
var app_default = app;
export {
  app_default as default,
  ensureDbInitialized
};
