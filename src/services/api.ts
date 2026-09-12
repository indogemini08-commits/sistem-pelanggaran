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
  StudentThresholdStatus,
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

export function getStatusForPoints(points: number, thresholds: PointThreshold[] = []): StudentThresholdStatus {
  if (thresholds && thresholds.length > 0) {
    for (const th of thresholds) {
      if (points >= th.minimum_points && points <= th.maximum_points) {
        return {
          statusName: th.status_name,
          badgeColor: th.badge_color,
          description: th.description || '',
        };
      }
    }
    const highest = thresholds[thresholds.length - 1];
    if (points >= highest.minimum_points) {
      return {
        statusName: highest.status_name,
        badgeColor: highest.badge_color,
        description: highest.description || '',
      };
    }
  }

  if (points < 20) {
    return { statusName: 'AMAN', badgeColor: 'emerald', description: 'Kedisiplinan dan capaian hafalan santri dalam kondisi baik.' };
  } else if (points < 50) {
    return { statusName: 'PERLU PEMBINAAN', badgeColor: 'amber', description: 'Perlu bimbingan dan pemantauan berkala oleh Muhafizh.' };
  } else if (points < 75) {
    return { statusName: 'PEMBINAAN KHUSUS', badgeColor: 'orange', description: 'Pemanggilan oleh Koordinator dan jadwal pembinaan khusus.' };
  } else if (points < 100) {
    return { statusName: 'PERINGATAN RESMI', badgeColor: 'rose', description: 'Penerbitan Surat Peringatan (SP) dan pemanggilan orang tua/wali.' };
  } else {
    return { statusName: 'TINDAKAN LANJUT', badgeColor: 'red', description: 'Sidang Dewan Asatidz dan evaluasi kelanjutan santri.' };
  }
}

export const api = {
  // Persistence & Multi-Device Sync Helpers
  sync: {
    resetToDemo: async () => {
      try {
        await fetchJson(`${API_BASE}/sync/reset`, { method: 'POST' });
      } catch (e) {
        console.warn('Server reset notice:', e);
      }
      storageSync.resetToDemo();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    },
    syncWithServer: () => storageSync.syncWithServer(),
    getStatus: () => fetchJson<{ status: string; cloud: any; serverTime: string }>(`${API_BASE}/sync/status`),
    getState: () => fetchJson<{ status: string; cloud: any; serverTime: string; state: any }>(`${API_BASE}/sync/state`),
  },

  // Auth
  auth: {
    login: async (credentials: { email: string; password: string }) => {
      const cleanEmail = credentials.email.trim().toLowerCase();
      try {
        const res = await fetchJson<{ message: string; user: User }>(`${API_BASE}/auth/login`, {
          method: 'POST',
          body: JSON.stringify(credentials),
        });
        return res;
      } catch (err: any) {
        // Fallback for default admin
        if (cleanEmail === 'imbs@aldri' && credentials.password === 'admin112') {
          const adminUser: User = {
            id: 'usr_admin_imbs',
            name: 'Admin Utama',
            email: 'imbs@aldri',
            role: 'admin',
            status: 'active',
          };
          return { message: 'Login berhasil (Admin)', user: adminUser };
        }

        const allUsers = await api.users.list();
        const matched = allUsers.find(
          (u) =>
            (u.email.toLowerCase() === cleanEmail || u.name.toLowerCase() === cleanEmail) &&
            u.status === 'active'
        );
        if (matched) {
          return { message: 'Login berhasil', user: matched };
        }
        throw err;
      }
    },
    changePassword: (data: { userId: string; oldPassword?: string; newPassword: string; actorName?: string }) =>
      fetchJson<{ message: string }>(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Users (Authoritative Server Truth)
  users: {
    list: async (): Promise<User[]> => {
      let serverList: User[] = [];
      try {
        serverList = await fetchJson<User[]>(`${API_BASE}/users`);
      } catch (e) {
        console.warn('Failed to fetch users from server:', e);
      }

      const defaultAdmin: User = {
        id: 'usr_admin_imbs',
        name: 'Admin Utama',
        email: 'imbs@aldri',
        role: 'admin',
        status: 'active',
        created_at: '2026-09-12',
      };

      const existingEmails = new Set(serverList.map((u) => u.email.toLowerCase()));
      if (!existingEmails.has('imbs@aldri')) {
        serverList.unshift(defaultAdmin);
      }

      return serverList;
    },

    create: async (data: any) => {
      const res = await fetchJson<{ message: string; userId: string; user?: User }>(`${API_BASE}/users`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'create', resource: 'users', id: res.userId });
      return res;
    },

    update: async (id: string, data: any) => {
      const res = await fetchJson<{ message: string; user?: User }>(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'update', resource: 'users', id });
      return res;
    },

    delete: async (id: string, actorName?: string) => {
      const res = await fetchJson<{ message: string }>(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      });
      storageSync.notifyDataChange({ action: 'delete', resource: 'users', id });
      return res;
    },
  },

  // Teachers (Authoritative Server Truth)
  teachers: {
    list: async (): Promise<Teacher[]> => {
      return await fetchJson<Teacher[]>(`${API_BASE}/teachers`);
    },

    create: async (data: any) => {
      const res = await fetchJson<{ message: string; teacherId: string }>(`${API_BASE}/teachers`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'create', resource: 'teachers', id: res.teacherId });
      return res;
    },

    update: async (id: string, data: any) => {
      const res = await fetchJson<{ message: string }>(`${API_BASE}/teachers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'update', resource: 'teachers', id });
      return res;
    },

    delete: async (id: string, actorName?: string) => {
      const res = await fetchJson<{ message: string }>(`${API_BASE}/teachers/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      });
      storageSync.notifyDataChange({ action: 'delete', resource: 'teachers', id });
      return res;
    },
  },

  // Halaqah (Authoritative Server Truth)
  halaqah: {
    list: async (): Promise<Halaqah[]> => {
      return await fetchJson<Halaqah[]>(`${API_BASE}/halaqah`);
    },

    create: async (data: any) => {
      const res = await fetchJson<{ message: string; halaqahId: string }>(`${API_BASE}/halaqah`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'create', resource: 'halaqah', id: res.halaqahId });
      return res;
    },

    update: async (id: string, data: any) => {
      const res = await fetchJson<{ message: string }>(`${API_BASE}/halaqah/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'update', resource: 'halaqah', id });
      return res;
    },

    delete: async (id: string, actorName?: string) => {
      const res = await fetchJson<{ message: string }>(`${API_BASE}/halaqah/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      });
      storageSync.notifyDataChange({ action: 'delete', resource: 'halaqah', id });
      return res;
    },

    getStudents: async (id: string): Promise<Student[]> => {
      return await fetchJson<Student[]>(`${API_BASE}/halaqah/${id}/students`);
    },

    transferStudent: async (data: {
      studentId: string;
      toHalaqahId: string;
      toTeacherId: string;
      reason: string;
      actorName?: string;
    }) => {
      const res = await fetchJson<{ message: string }>(`${API_BASE}/halaqah/transfer`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'transfer', resource: 'student', id: data.studentId });
      return res;
    },

    history: async (studentId?: string) => {
      const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
      return await fetchJson<any[]>(`${API_BASE}/halaqah/history${qs}`);
    },
  },

  // Students (Authoritative Server Truth with SQL Net Points & Status)
  students: {
    list: async (): Promise<Student[]> => {
      return await fetchJson<Student[]>(`${API_BASE}/students`);
    },

    getDetail: async (id: string) => {
      return await fetchJson<{
        student: Student;
        records: ViolationRecord[];
        positive_records?: PositiveRecord[];
        history: any[];
      }>(`${API_BASE}/students/${id}`);
    },

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

    bulkDelete: async (ids: string[], actorName?: string) => {
      const res = await fetchJson<{ success?: boolean; deletedCount: number; deletedIds: string[]; message: string }>(`${API_BASE}/students/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids, actorName }),
      });
      storageSync.notifyDataChange({ action: 'bulk_delete', resource: 'student' });
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
      storageSync.notifyDataChange({ action: 'import', resource: 'student' });
      return res;
    },
  },

  // Violations Master Rules (Authoritative Server Truth)
  violations: {
    list: async (division?: string): Promise<MasterViolation[]> => {
      const qs = division && division !== 'all' ? `?division=${encodeURIComponent(division)}` : '';
      return await fetchJson<MasterViolation[]>(`${API_BASE}/violations${qs}`);
    },

    create: async (data: any) => {
      const res = await fetchJson<{ message: string; violationId: string }>(`${API_BASE}/violations`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'create', resource: 'violation', id: res.violationId });
      return res;
    },

    update: async (id: string, data: any) => {
      const res = await fetchJson<{ message: string }>(`${API_BASE}/violations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'update', resource: 'violation', id });
      return res;
    },

    delete: async (id: string, actorName?: string) => {
      const res = await fetchJson<{ message: string }>(`${API_BASE}/violations/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      });
      storageSync.notifyDataChange({ action: 'delete', resource: 'violation', id });
      return res;
    },

    bulkDelete: async (ids: string[], actorName?: string) => {
      const res = await fetchJson<{ success?: boolean; deletedCount: number; deletedIds: string[]; message: string }>(`${API_BASE}/violations/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids, actorName }),
      });
      storageSync.notifyDataChange({ action: 'bulk_delete', resource: 'violation' });
      return res;
    },
  },

  // Violation Records (Authoritative Server Truth)
  records: {
    list: async (params: Record<string, string> = {}): Promise<ViolationRecord[]> => {
      const qs = new URLSearchParams(params).toString();
      return await fetchJson<ViolationRecord[]>(`${API_BASE}/records${qs ? '?' + qs : ''}`);
    },

    create: async (data: {
      studentId: string;
      studentName?: string;
      studentNis?: string;
      studentClass?: string;
      halaqahId?: string | null;
      violationId: string;
      violationName?: string;
      points?: number;
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

    bulkDelete: async (ids: string[], actorName?: string) => {
      const res = await fetchJson<{ success?: boolean; deletedCount: number; deletedIds: string[]; message: string }>(`${API_BASE}/records/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids, actorName }),
      });
      storageSync.notifyDataChange({ action: 'bulk_delete', resource: 'record' });
      return res;
    },

    // Authoritative Server Stats (Direct endpoint call with offline safety fallback)
    stats: async (division?: string): Promise<DashboardStats> => {
      const qs = division && division !== 'all' ? `?division=${encodeURIComponent(division)}` : '';
      try {
        return await fetchJson<DashboardStats>(`${API_BASE}/records/stats${qs}`);
      } catch (err) {
        console.warn('Failed to fetch stats from server, calculating fallback:', err);
        const [students, records, positiveRecords, halaqahs, teachers] = await Promise.all([
          api.students.list().catch(() => []),
          api.records.list().catch(() => []),
          api.positiveRecords.list().catch(() => []),
          api.halaqah.list().catch(() => []),
          api.teachers.list().catch(() => []),
        ]);

        const activeRecords = records.filter((r) => r.status === 'active');
        const scopedRecords = division && division !== 'all' ? activeRecords.filter((r) => r.division === division) : activeRecords;
        const activePosRecords = positiveRecords.filter((pr) => pr.status === 'active');
        const scopedPosRecords = division && division !== 'all' ? activePosRecords.filter((pr) => pr.division === division) : activePosRecords;

        const totalRecords = scopedRecords.length;
        const totalPoints = scopedRecords.reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);
        const totalPositiveRecords = scopedPosRecords.length;
        const totalPointsDeducted = scopedPosRecords.reduce((sum, pr) => sum + Number(pr.points_deducted || 0), 0);

        const tahfizhRecords = activeRecords.filter((r) => r.division === 'tahfizh');
        const kesantrianRecords = activeRecords.filter((r) => r.division === 'kesantrian');
        const tahfizhPos = activePosRecords.filter((pr) => pr.division === 'tahfizh');
        const kesantrianPos = activePosRecords.filter((pr) => pr.division === 'kesantrian');

        const today = new Date().toISOString().split('T')[0];
        const currentMonth = today.substring(0, 7);

        return {
          summary: {
            totalStudents: students.length,
            totalTeachers: teachers.length,
            totalHalaqah: halaqahs.length,
            totalRecords,
            totalPoints,
            todayCount: scopedRecords.filter((r) => r.date === today).length,
            monthCount: scopedRecords.filter((r) => r.date && r.date.startsWith(currentMonth)).length,
            tahfizhRecordsCount: tahfizhRecords.length,
            tahfizhTotalPoints: tahfizhRecords.reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0),
            kesantrianRecordsCount: kesantrianRecords.length,
            kesantrianTotalPoints: kesantrianRecords.reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0),
            totalPositiveRecords,
            totalPointsDeducted,
            tahfizhDeductedPoints: tahfizhPos.reduce((sum, pr) => sum + Number(pr.points_deducted || 0), 0),
            kesantrianDeductedPoints: kesantrianPos.reduce((sum, pr) => sum + Number(pr.points_deducted || 0), 0),
            netTotalPoints: Math.max(0, totalPoints - totalPointsDeducted),
          },
          topStudents: [],
          byCategory: [],
          pointsByHalaqah: [],
          monthlyTrend: [],
          studentsNeedingAttention: [],
        };
      }
    },
  },

  // Positive Actions Master (Authoritative Server Truth)
  positiveActions: {
    list: (division?: string) =>
      fetchJson<MasterPositiveAction[]>(
        `${API_BASE}/positive-actions${division && division !== 'all' ? '?division=' + encodeURIComponent(division) : ''}`
      ),
    create: async (data: any) => {
      const res = await fetchJson<{ message: string; actionId: string }>(`${API_BASE}/positive-actions`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'create', resource: 'positive-action', id: res.actionId });
      return res;
    },
    update: async (id: string, data: any) => {
      const res = await fetchJson<{ message: string }>(`${API_BASE}/positive-actions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'update', resource: 'positive-action', id });
      return res;
    },
    delete: async (id: string, actorName?: string) => {
      const res = await fetchJson<{ message: string }>(`${API_BASE}/positive-actions/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      });
      storageSync.notifyDataChange({ action: 'delete', resource: 'positive-action', id });
      return res;
    },
  },

  // Positive Records (Authoritative Server Truth)
  positiveRecords: {
    list: async (params: Record<string, string> = {}): Promise<PositiveRecord[]> => {
      const qs = new URLSearchParams(params).toString();
      return await fetchJson<PositiveRecord[]>(`${API_BASE}/positive-records${qs ? '?' + qs : ''}`);
    },

    create: async (data: {
      studentId: string;
      studentName?: string;
      studentNis?: string;
      studentClass?: string;
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
    }) => {
      const res = await fetchJson<{
        message: string;
        recordId: string;
        pointsDeducted: number;
      }>(`${API_BASE}/positive-records`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'create', resource: 'positive-record', id: res.recordId });
      return res;
    },

    cancel: async (id: string, reason: string, actorName?: string) => {
      const res = await fetchJson<{ success?: boolean; message: string }>(`${API_BASE}/positive-records/${id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ reason, actorName }),
      });
      storageSync.notifyDataChange({ action: 'cancel', resource: 'positive-record', id });
      return res;
    },

    delete: async (id: string, actorName?: string) => {
      const res = await fetchJson<{ success?: boolean; message: string }>(`${API_BASE}/positive-records/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      });
      storageSync.notifyDataChange({ action: 'delete', resource: 'positive-record', id });
      return res;
    },

    bulkDelete: async (ids: string[], actorName?: string) => {
      const res = await fetchJson<{ success?: boolean; deletedCount: number; deletedIds: string[]; message: string }>(`${API_BASE}/positive-records/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids, actorName }),
      });
      storageSync.notifyDataChange({ action: 'bulk_delete', resource: 'positive-record' });
      return res;
    },
  },

  // Settings & Thresholds
  settings: {
    get: () => fetchJson<{ settings: SchoolSettings; thresholds: PointThreshold[] }>(`${API_BASE}/settings`),
    updateSchool: async (data: {
      appName?: string;
      schoolName?: string;
      address?: string;
      phone?: string;
      email?: string;
      logoUrl?: string;
      kopSuratText?: string;
      currentAcademicYear?: string;
      actorName?: string;
    }) => {
      const res = await fetchJson<{ message: string }>(`${API_BASE}/settings/school`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      storageSync.notifyDataChange({ action: 'update', resource: 'settings' });
      return res;
    },
    updateThresholds: async (thresholds: PointThreshold[], actorName?: string) => {
      const res = await fetchJson<{ message: string }>(`${API_BASE}/settings/thresholds`, {
        method: 'PUT',
        body: JSON.stringify({ thresholds, actorName }),
      });
      storageSync.notifyDataChange({ action: 'update', resource: 'thresholds' });
      return res;
    },
  },

  // Audit Logs
  audit: {
    list: (limit = 100) => fetchJson<AuditLog[]>(`${API_BASE}/audit-logs?limit=${limit}`),
  },

  // Portal Orang Tua / Wali Santri (Cek via NIS)
  portal: {
    getByNis: async (nis: string) => {
      const cleanNis = encodeURIComponent(nis.trim());
      const res = await fetchJson<{
        student: Student;
        records: ViolationRecord[];
        positive_records: PositiveRecord[];
        thresholds: PointThreshold[];
        settings: SchoolSettings | null;
      }>(`${API_BASE}/students/portal/${cleanNis}`);

      if (res && res.student) {
        const net = Number(res.student.total_points || 0);
        if (!res.student.status_info || !res.student.status_info.badgeColor) {
          res.student.status_info = getStatusForPoints(net, res.thresholds);
        }
      }
      return res;
    },
  },
};
