import {
  User,
  Teacher,
  Halaqah,
  Student,
  MasterViolation,
  ViolationRecord,
  MasterPositiveAction,
  PositiveRecord,
  SchoolSettings,
  PointThreshold,
  DashboardStats,
  AuditLog,
} from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Terjadi kesalahan pada sistem.');
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      fetchJson<{ message: string; user: User }>(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    changePassword: (data: { userId: string; oldPassword?: string; newPassword: string; actorName?: string }) =>
      fetchJson<{ message: string }>(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Users
  users: {
    list: () => fetchJson<User[]>(`${API_BASE}/users`),
    create: (data: any) =>
      fetchJson<{ message: string; userId: string }>(`${API_BASE}/users`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchJson<{ message: string }>(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string, actorName?: string) =>
      fetchJson<{ message: string }>(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      }),
  },

  // Teachers
  teachers: {
    list: () => fetchJson<Teacher[]>(`${API_BASE}/teachers`),
    create: (data: any) =>
      fetchJson<{ message: string; teacherId: string }>(`${API_BASE}/teachers`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchJson<{ message: string }>(`${API_BASE}/teachers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string, actorName?: string) =>
      fetchJson<{ message: string }>(`${API_BASE}/teachers/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      }),
  },

  // Halaqah
  halaqah: {
    list: () => fetchJson<Halaqah[]>(`${API_BASE}/halaqah`),
    create: (data: any) =>
      fetchJson<{ message: string; halaqahId: string }>(`${API_BASE}/halaqah`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchJson<{ message: string }>(`${API_BASE}/halaqah/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string, actorName?: string) =>
      fetchJson<{ message: string }>(`${API_BASE}/halaqah/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      }),
    getStudents: (id: string) => fetchJson<Student[]>(`${API_BASE}/halaqah/${id}/students`),
  },

  // Students
  students: {
    list: () => fetchJson<Student[]>(`${API_BASE}/students`),
    getDetail: (id: string) =>
      fetchJson<{ student: Student; records: ViolationRecord[]; positive_records?: PositiveRecord[]; history: any[] }>(`${API_BASE}/students/${id}`),
    create: (data: any) =>
      fetchJson<{ message: string; studentId: string }>(`${API_BASE}/students`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchJson<{ message: string }>(`${API_BASE}/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string, actorName?: string) =>
      fetchJson<{ message: string }>(`${API_BASE}/students/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      }),
    importExcel: (rows: any[], actorName?: string) =>
      fetchJson<{
        message: string;
        insertedCount: number;
        errorsCount: number;
        errors: Array<{ row: number; error: string }>;
        insertedList: any[];
      }>(`${API_BASE}/students/import`, {
        method: 'POST',
        body: JSON.stringify({ rows, actorName }),
      }),
  },

  // Violations Master
  violations: {
    list: (division?: string) =>
      fetchJson<MasterViolation[]>(`${API_BASE}/violations${division && division !== 'all' ? '?division=' + encodeURIComponent(division) : ''}`),
    create: (data: any) =>
      fetchJson<{ message: string; violationId: string }>(`${API_BASE}/violations`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchJson<{ message: string }>(`${API_BASE}/violations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string, actorName?: string) =>
      fetchJson<{ message: string }>(`${API_BASE}/violations/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      }),
  },

  // Violation Records
  records: {
    list: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetchJson<ViolationRecord[]>(`${API_BASE}/records${qs ? '?' + qs : ''}`);
    },
    create: (data: {
      studentId: string;
      halaqahId?: string | null;
      violationId: string;
      division?: 'tahfizh' | 'kesantrian';
      supervisorName?: string;
      locationName?: string;
      date?: string;
      time?: string;
      notes?: string;
      evidenceUrl?: string;
      createdBy?: string;
    }) =>
      fetchJson<{
        message: string;
        recordId: string;
        studentName: string;
        violationName: string;
        division: 'tahfizh' | 'kesantrian';
        points: number;
        newTotalPoints: number;
        tahfizhPoints?: number;
        kesantrianPoints?: number;
      }>(`${API_BASE}/records`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (id: string, cancellationReason: string, actorName?: string) =>
      fetchJson<{ message: string }>(`${API_BASE}/records/${id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ cancellationReason, actorName }),
      }),
    delete: (id: string, actorName?: string) =>
      fetchJson<{ message: string }>(`${API_BASE}/records/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      }),
    stats: (division?: string) =>
      fetchJson<DashboardStats>(`${API_BASE}/records/stats${division && division !== 'all' ? '?division=' + encodeURIComponent(division) : ''}`),
  },

  // Positive Actions (Master Kebaikan / Prestasi)
  positiveActions: {
    list: (division?: string) =>
      fetchJson<MasterPositiveAction[]>(`${API_BASE}/positive-actions${division && division !== 'all' ? '?division=' + encodeURIComponent(division) : ''}`),
    create: (data: any) =>
      fetchJson<{ message: string; actionId: string }>(`${API_BASE}/positive-actions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchJson<{ message: string }>(`${API_BASE}/positive-actions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string, actorName?: string) =>
      fetchJson<{ message: string }>(`${API_BASE}/positive-actions/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      }),
  },

  // Positive Records (Catatan Kebaikan & Pengurangan Poin)
  positiveRecords: {
    list: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetchJson<PositiveRecord[]>(`${API_BASE}/positive-records${qs ? '?' + qs : ''}`);
    },
    create: (data: {
      studentId: string;
      division: 'tahfizh' | 'kesantrian';
      actionId?: string;
      customActionName?: string;
      customPoints?: number;
      supervisorName?: string;
      locationName?: string;
      date?: string;
      time?: string;
      notes?: string;
      actorName?: string;
    }) =>
      fetchJson<{
        message: string;
        recordId: string;
        pointsDeducted: number;
      }>(`${API_BASE}/positive-records`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (id: string, reason: string, actorName?: string) =>
      fetchJson<{ message: string }>(`${API_BASE}/positive-records/${id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ reason, actorName }),
      }),
    delete: (id: string, actorName?: string) =>
      fetchJson<{ message: string }>(`${API_BASE}/positive-records/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      }),
  },

  // Settings & Thresholds
  settings: {
    get: () => fetchJson<{ settings: SchoolSettings; thresholds: PointThreshold[] }>(`${API_BASE}/settings`),
    updateSchool: (data: {
      appName?: string;
      schoolName?: string;
      address?: string;
      phone?: string;
      email?: string;
      logoUrl?: string;
      kopSuratText?: string;
      currentAcademicYear?: string;
      actorName?: string;
    }) =>
      fetchJson<{ message: string }>(`${API_BASE}/settings/school`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    updateThresholds: (thresholds: PointThreshold[], actorName?: string) =>
      fetchJson<{ message: string }>(`${API_BASE}/settings/thresholds`, {
        method: 'PUT',
        body: JSON.stringify({ thresholds, actorName }),
      }),
  },

  // Audit Logs
  audit: {
    list: (limit = 100) => fetchJson<AuditLog[]>(`${API_BASE}/audit-logs?limit=${limit}`),
  },
};
