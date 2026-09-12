export type UserRole = 'admin' | 'coordinator' | 'kepala_kesantrian' | 'teacher' | 'guru';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  created_at?: string;
  teacherId?: string | null;
  assignedHalaqahs?: Halaqah[];
  token?: string;
}

export interface Teacher {
  id: string;
  user_id?: string | null;
  name: string;
  phone: string;
  status: 'active' | 'inactive';
  email?: string;
  role?: string;
  halaqahList?: Halaqah[];
  halaqahCount?: number;
  created_at?: string;
}

export interface Halaqah {
  id: string;
  name: string;
  teacher_id?: string | null;
  teacher_name?: string | null;
  teacher_phone?: string | null;
  schedule: string;
  location: string;
  academic_year: string;
  status: 'active' | 'inactive';
  student_count?: number;
  created_at?: string;
}

export type ViolationDivision = 'tahfizh' | 'kesantrian';

export interface StudentThresholdStatus {
  statusName: string;
  badgeColor: string;
  description: string;
}

export interface Student {
  id: string;
  student_number: string; // NIS
  name: string;
  class: string;
  gender: 'L' | 'P';
  halaqah_id?: string | null;
  halaqah_name?: string | null;
  teacher_name?: string | null;
  teacher_phone?: string | null;
  academic_year: string;
  status: 'active' | 'inactive';
  total_points: number;
  tahfizh_points?: number;
  kesantrian_points?: number;
  gross_total_points?: number;
  gross_tahfizh_points?: number;
  gross_kesantrian_points?: number;
  tahfizh_deductions?: number;
  kesantrian_deductions?: number;
  total_deductions?: number;
  positive_count?: number;
  violation_count?: number;
  tahfizh_violation_count?: number;
  kesantrian_violation_count?: number;
  status_info?: StudentThresholdStatus;
  created_at?: string;
}

export interface StudentHalaqahHistory {
  id: string;
  student_id: string;
  halaqah_id: string;
  halaqah_name?: string;
  teacher_id?: string;
  teacher_name?: string;
  academic_year: string;
  class: string;
  start_date: string;
  end_date?: string | null;
}

export interface MasterViolation {
  id: string;
  code: string;
  name: string;
  division?: ViolationDivision;
  category: 'Tahfizh' | 'Kedisiplinan' | 'Kehadiran' | 'Adab & Akhlak' | 'Ketertiban Asrama' | 'Ibadah & Shalat' | 'Lainnya' | string;
  description?: string;
  default_points: number;
  status: 'active' | 'inactive';
  usage_count?: number;
  created_at?: string;
}

export interface ViolationRecord {
  id: string;
  student_id: string;
  student_name?: string;
  student_nis?: string;
  student_gender?: 'L' | 'P';
  division?: ViolationDivision;
  halaqah_id?: string | null;
  teacher_id?: string | null;
  violation_id?: string | null;
  violation_category?: string;
  violation_name_snapshot: string;
  points_snapshot: number;
  halaqah_name_snapshot: string;
  teacher_name_snapshot: string;
  student_class_snapshot: string;
  academic_year_snapshot: string;
  date: string;
  time: string;
  notes?: string;
  evidence_url?: string;
  status: 'active' | 'cancelled';
  created_by: string;
  created_at: string;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  current_halaqah_name?: string;
  current_teacher_name?: string;
}

export interface MasterPositiveAction {
  id: string;
  code: string;
  name: string;
  division: ViolationDivision;
  category: 'Tahfizh' | 'Kedisiplinan' | 'Ibadah & Shalat' | 'Khidmat & Sosial' | 'Prestasi' | 'Lainnya' | string;
  description?: string;
  default_points_deduction: number;
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface PositiveRecord {
  id: string;
  student_id: string;
  student_name?: string;
  student_nis?: string;
  student_gender?: 'L' | 'P';
  division: ViolationDivision;
  action_id?: string | null;
  action_name_snapshot: string;
  action_category?: string;
  action_code?: string;
  points_deducted: number;
  halaqah_id?: string | null;
  halaqah_name_snapshot?: string;
  teacher_id?: string | null;
  teacher_name_snapshot: string;
  student_class_snapshot: string;
  academic_year_snapshot: string;
  date: string;
  time: string;
  notes?: string;
  status: 'active' | 'cancelled';
  created_by: string;
  created_at: string;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  current_halaqah_name?: string;
  current_teacher_name?: string;
}

export interface PointThreshold {
  id: string;
  minimum_points: number;
  maximum_points: number;
  status_name: string;
  badge_color: string;
  description?: string;
  sort_order: number;
}

export interface SchoolSettings {
  id: string;
  app_name: string;
  school_name: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
  kop_surat_text: string;
  current_academic_year: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_name: string;
  action: string;
  table_name: string;
  record_id?: string | null;
  old_data?: any;
  new_data?: any;
  created_at: string;
}

export interface DashboardStats {
  summary: {
    totalStudents: number;
    totalTeachers: number;
    totalHalaqah: number;
    totalRecords: number;
    totalPoints: number;
    todayCount: number;
    monthCount: number;
    tahfizhRecordsCount?: number;
    tahfizhTotalPoints?: number;
    kesantrianRecordsCount?: number;
    kesantrianTotalPoints?: number;
    totalPositiveRecords?: number;
    totalPointsDeducted?: number;
    tahfizhDeductedPoints?: number;
    kesantrianDeductedPoints?: number;
    netTotalPoints?: number;
  };
  topStudents: Array<{
    id: string;
    name: string;
    student_number: string;
    class: string;
    halaqah_name: string;
    total_points: number;
    tahfizh_points?: number;
    kesantrian_points?: number;
    violation_count: number;
  }>;
  byCategory: Array<{
    category: string;
    division?: string;
    count: number;
    points: number;
  }>;
  pointsByHalaqah: Array<{
    halaqah_name: string;
    violation_count: number;
    total_points: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    count: number;
    points: number;
  }>;
  studentsNeedingAttention: Array<{
    id: string;
    name: string;
    student_number: string;
    class: string;
    halaqah_name: string;
    total_points: number;
    tahfizh_points?: number;
    kesantrian_points?: number;
  }>;
}

export interface MasterPositiveAction {
  id: string;
  code: string;
  name: string;
  division: ViolationDivision;
  category: string;
  default_points: number;
  description?: string;
  status: 'active' | 'inactive';
  usage_count?: number;
  created_at?: string;
}

