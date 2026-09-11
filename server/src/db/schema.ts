// Inlined SQL schema DDL for SQLite / sql.js
export const SCHEMA_SQL = `
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
`;
