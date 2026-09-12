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
import { storageSync } from './storageSync';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) {
        throw new Error(`Server error (${res.status}): Terjadi kendala saat menghubungi API backend.`);
      }
      throw new Error('Respon dari server tidak dalam format JSON yang valid.');
    }
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Terjadi kesalahan pada sistem (${res.status}).`);
  }

  return (data ?? {}) as T;
}

export const api = {
  // Persistence & Sync Helpers
  sync: {
    resetToDemo: () => {
      storageSync.resetToDemo();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    },
  },

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
    getStudents: (id: string): Promise<Student[]> =>
      fetchJson<Student[]>(`${API_BASE}/halaqah/${id}/students`),
  },

  // Students (Direct backend database sync)
  students: {
    list: (): Promise<Student[]> => fetchJson<Student[]>(`${API_BASE}/students`),

    getDetail: (id: string) =>
      fetchJson<{
        student: Student;
        records: ViolationRecord[];
        positive_records?: PositiveRecord[];
        history: any[];
      }>(`${API_BASE}/students/${id}`),

    create: async (data: any) => {
      const res = await fetchJson<{ message: string; studentId: string }>(`${API_BASE}/students`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'create', resource: 'student', id: res.studentId });
      return res;
    },

    update: async (id: string, data: any) => {
      const res = await fetchJson<{ message: string }>(`${API_BASE}/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'update', resource: 'student', id });
      return res;
    },

    delete: async (id: string, actorName?: string) => {
      const res = await fetchJson<{ success?: boolean; message: string }>(`${API_BASE}/students/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      });
      storageSync.notifyDataChange({ action: 'delete', resource: 'student', id });
      return res;
    },

    importExcel: async (rows: any[], actorName?: string) => {
      const res = await fetchJson<{
        message: string;
        insertedCount: number;
        errorsCount: number;
        errors: Array<{ row: number; error: string }>;
        insertedList: any[];
      }>(`${API_BASE}/students/import`, {
        method: 'POST',
        body: JSON.stringify({ rows, actorName }),
      });
      storageSync.notifyDataChange({ action: 'bulk_create', resource: 'student' });
      return res;
    },
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

  // Violation Records (Rekap Terpadu directly synced with backend database)
  records: {
    list: async (params: Record<string, string> = {}): Promise<ViolationRecord[]> => {
      const qs = new URLSearchParams(params).toString();
      return await fetchJson<ViolationRecord[]>(`${API_BASE}/records${qs ? '?' + qs : ''}`);
    },

    create: async (data: {
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
    }) => {
      const res = await fetchJson<{
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
      });

      storageSync.notifyDataChange({ action: 'create', resource: 'record', id: res.recordId });
      return res;
    },

    cancel: async (id: string, cancellationReason: string, actorName?: string) => {
      const res = await fetchJson<{ success?: boolean; message: string }>(`${API_BASE}/records/${id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ cancellationReason, actorName }),
      });
      storageSync.notifyDataChange({ action: 'cancel', resource: 'record', id });
      return res;
    },

    delete: async (id: string, actorName?: string) => {
      const res = await fetchJson<{ success?: boolean; message: string }>(`${API_BASE}/records/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      });
      storageSync.notifyDataChange({ action: 'delete', resource: 'record', id });
      return res;
    },

    stats: (division?: string): Promise<DashboardStats> => {
      const qs = division && division !== 'all' ? '?division=' + encodeURIComponent(division) : '';
      return fetchJson<DashboardStats>(`${API_BASE}/records/stats${qs}`);
    },
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

  // Positive Records (Catatan Kebaikan & Pengurangan Poin directly synced with backend)
  positiveRecords: {
    list: async (params: Record<string, string> = {}): Promise<PositiveRecord[]> => {
      const qs = new URLSearchParams(params).toString();
      return await fetchJson<PositiveRecord[]>(`${API_BASE}/positive-records${qs ? '?' + qs : ''}`);
    },

    create: async (data: {
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
      createdBy?: string;
      actorName?: string;
    }) => {
      const res = await fetchJson<{
        message: string;
        recordId: string;
        studentName: string;
        actionName: string;
        pointsDeducted: number;
        newTotalPoints: number;
      }>(`${API_BASE}/positive-records`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      storageSync.notifyDataChange({ action: 'create', resource: 'positive_record', id: res.recordId });
      return res;
    },

    cancel: async (id: string, cancellationReason: string, actorName?: string) => {
      const res = await fetchJson<{ success?: boolean; message: string }>(`${API_BASE}/positive-records/${id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ cancellationReason, actorName }),
      });
      storageSync.notifyDataChange({ action: 'cancel', resource: 'positive_record', id });
      return res;
    },

    delete: async (id: string, actorName?: string) => {
      const res = await fetchJson<{ success?: boolean; message: string }>(`${API_BASE}/positive-records/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      });
      storageSync.notifyDataChange({ action: 'delete', resource: 'positive_record', id });
      return res;
    },
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
