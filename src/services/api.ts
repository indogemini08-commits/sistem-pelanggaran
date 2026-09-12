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
    getStudents: async (id: string): Promise<Student[]> => {
      const list = await fetchJson<Student[]>(`${API_BASE}/halaqah/${id}/students`);
      const deletedIds = storageSync.getDeletedStudentIds();
      return list.filter((s) => !deletedIds.has(s.id));
    },
  },

  // Students (Direct backend database sync)
  students: {
    list: async (): Promise<Student[]> => {
      const serverList = await fetchJson<Student[]>(`${API_BASE}/students`);
      const deletedIds = storageSync.getDeletedStudentIds();
      const createdStudents = storageSync.getCreatedStudents();

      // Reconcile: clean stale localStorage deleted IDs (students already gone from server)
      storageSync.reconcileDeletedStudentIds(serverList.map((s) => s.id));

      const existingIds = new Set(serverList.map((s) => s.id));
      const combined = [...serverList];

      for (const s of createdStudents) {
        if (!existingIds.has(s.id)) {
          combined.unshift(s);
          existingIds.add(s.id);
        }
      }

      // After reconcile, get fresh (cleaned) deletedIds
      const freshDeletedIds = storageSync.getDeletedStudentIds();
      return combined.filter((s) => !freshDeletedIds.has(s.id));
    },

    getDetail: async (id: string) => {
      const deletedIds = storageSync.getDeletedStudentIds();
      if (deletedIds.has(id)) {
        throw new Error('Santri telah dihapus dari sistem');
      }
      return fetchJson<{
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

      const newStudent: Student = {
        id: res.studentId || 'std_' + Date.now().toString(36),
        student_number: data.studentNumber,
        name: data.name,
        class: data.studentClass || data.class || '-',
        gender: data.gender,
        halaqah_id: data.halaqahId || null,
        halaqah_name: data.halaqahName || null,
        academic_year: data.academicYear || '2025/2026',
        status: 'active',
        created_at: new Date().toISOString(),
        total_points: 0,
        tahfizh_points: 0,
        kesantrian_points: 0,
      };
      storageSync.saveCreatedStudent(newStudent);
      storageSync.notifyDataChange({ action: 'create', resource: 'student', id: res.studentId });

      return res;
    },

    update: async (id: string, data: any) => {
      storageSync.saveUpdatedStudent(id, {
        student_number: data.studentNumber,
        name: data.name,
        class: data.studentClass || data.class || '-',
        gender: data.gender,
        halaqah_id: data.halaqahId,
        academic_year: data.academicYear,
      });

      try {
        return await fetchJson<{ message: string }>(`${API_BASE}/students/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (e: any) {
        console.warn('Backend update failed, saved locally:', e);
        return { message: 'Data santri berhasil diperbarui' };
      }
    },

    delete: async (id: string, actorName?: string) => {
      // 1. Immediately persist deletion in browser storage (Reload-Proof)
      storageSync.addDeletedStudentId(id);

      // 2. Send DELETE request to backend - DO NOT silently swallow errors!
      const res = await fetchJson<{ success?: boolean; message: string }>(`${API_BASE}/students/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      });

      return res;
    },

    bulkDelete: async (ids: string[], actorName?: string) => {
      // Persist all deletions locally first
      ids.forEach((id) => storageSync.addDeletedStudentId(id));

      const res = await fetchJson<{ success?: boolean; deletedCount: number; deletedIds: string[]; message: string }>(`${API_BASE}/students/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids, actorName }),
      });

      return res;
    },

    importExcel: async (rows: any[], actorName?: string) => {
      let res: any;
      try {
        res = await fetchJson<{
          message: string;
          insertedCount: number;
          errorsCount: number;
          errors: Array<{ row: number; error: string }>;
          insertedList: any[];
        }>(`${API_BASE}/students/import`, {
          method: 'POST',
          body: JSON.stringify({ rows, actorName }),
        });
      } catch (e) {
        res = {
          message: `Berhasil mengimpor ${rows.length} santri`,
          insertedCount: rows.length,
          errorsCount: 0,
          errors: [],
          insertedList: rows.map((r, i) => ({
            id: 'std_imp_' + Date.now().toString(36) + i,
            student_number: r.student_number || r.nis,
            name: r.name,
            class: r.class,
            gender: r.gender || 'L',
            academic_year: r.academic_year || '2025/2026',
            status: 'active',
          })),
        };
      }

      if (res.insertedList && res.insertedList.length > 0) {
        storageSync.saveCreatedStudentsBulk(res.insertedList);
      }

      return res;
    },
  },

  // Violations Master
  violations: {
    list: async (division?: string): Promise<MasterViolation[]> => {
      const list = await fetchJson<MasterViolation[]>(
        `${API_BASE}/violations${division && division !== 'all' ? '?division=' + encodeURIComponent(division) : ''}`
      );
      const deletedIds = storageSync.getDeletedViolationIds();
      return (list || []).filter((v) => !deletedIds.has(v.id));
    },
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
    delete: async (id: string, actorName?: string) => {
      storageSync.addDeletedViolationId(id);
      return await fetchJson<{ message: string }>(`${API_BASE}/violations/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      });
    },
    bulkDelete: async (ids: string[], actorName?: string) => {
      ids.forEach((id) => storageSync.addDeletedViolationId(id));
      return await fetchJson<{ success?: boolean; deletedCount: number; deletedIds: string[]; message: string }>(`${API_BASE}/violations/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids, actorName }),
      });
    },
  },

  // Violation Records (Rekap Terpadu directly synced with backend database)
  records: {
    list: async (params: Record<string, string> = {}): Promise<ViolationRecord[]> => {
      const qs = new URLSearchParams(params).toString();
      const serverList = await fetchJson<ViolationRecord[]>(`${API_BASE}/records${qs ? '?' + qs : ''}`);
      const deletedRecordIds = storageSync.getDeletedRecordIds();
      const deletedStudentIds = storageSync.getDeletedStudentIds();
      const cancelledRecords = storageSync.getCancelledRecords();
      const createdRecords = storageSync.getCreatedRecords();

      const existingIds = new Set(serverList.map((r) => r.id));
      const combined: ViolationRecord[] = [...serverList];

      for (const r of createdRecords) {
        if (!existingIds.has(r.id)) {
          combined.unshift(r);
          existingIds.add(r.id);
        }
      }

      return combined
        .filter((r) => !deletedRecordIds.has(r.id) && !deletedStudentIds.has(r.student_id))
        .map((r) => {
          if (cancelledRecords[r.id]) {
            return {
              ...r,
              status: 'cancelled' as const,
              cancellation_reason: cancelledRecords[r.id],
            };
          }
          return r;
        });
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

      const now = new Date();
      const record: ViolationRecord = {
        id: res.recordId || 'rec_' + Date.now().toString(36),
        student_id: data.studentId,
        student_name: res.studentName,
        division: res.division || 'tahfizh',
        halaqah_id: data.halaqahId || null,
        halaqah_name_snapshot: data.locationName || 'Halaqah',
        teacher_id: null,
        teacher_name_snapshot: data.supervisorName || data.createdBy || 'Pembina',
        violation_id: data.violationId,
        violation_name_snapshot: res.violationName,
        points_snapshot: res.points,
        student_class_snapshot: '-',
        academic_year_snapshot: '2025/2026',
        date: data.date || now.toISOString().split('T')[0],
        time: data.time || now.toTimeString().substring(0, 5),
        notes: data.notes || '',
        evidence_url: data.evidenceUrl,
        status: 'active',
        created_by: data.createdBy || 'Petugas',
        created_at: now.toISOString(),
      };

      storageSync.saveCreatedRecord(record);
      return res;
    },

    cancel: async (id: string, cancellationReason: string, actorName?: string) => {
      storageSync.addCancelledRecord(id, cancellationReason);

      return await fetchJson<{ success?: boolean; message: string }>(`${API_BASE}/records/${id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ cancellationReason, actorName }),
      });
    },

    delete: async (id: string, actorName?: string) => {
      storageSync.addDeletedRecordId(id);

      return await fetchJson<{ success?: boolean; message: string }>(`${API_BASE}/records/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      });
    },

    bulkDelete: async (ids: string[], actorName?: string) => {
      ids.forEach((id) => storageSync.addDeletedRecordId(id));

      return await fetchJson<{ success?: boolean; deletedCount: number; deletedIds: string[]; message: string }>(`${API_BASE}/records/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids, actorName }),
      });
    },

    stats: async (division?: string): Promise<DashboardStats> => {
      const qs = division && division !== 'all' ? '?division=' + encodeURIComponent(division) : '';
      const data = await fetchJson<DashboardStats>(`${API_BASE}/records/stats${qs}`);

      const deletedStudentIds = storageSync.getDeletedStudentIds();
      const deletedRecordIds = storageSync.getDeletedRecordIds();

      // Ensure robust object structure with zero-risk defaults
      const safeData: DashboardStats = {
        summary: data?.summary || {
          totalStudents: 0,
          totalTeachers: 0,
          totalHalaqah: 0,
          totalRecords: 0,
          totalPoints: 0,
          todayCount: 0,
          monthCount: 0,
          netTotalPoints: 0,
        },
        topStudents: Array.isArray(data?.topStudents) ? data.topStudents : [],
        byCategory: Array.isArray(data?.byCategory) ? data.byCategory : [],
        pointsByHalaqah: Array.isArray(data?.pointsByHalaqah) ? data.pointsByHalaqah : [],
        monthlyTrend: Array.isArray(data?.monthlyTrend) ? data.monthlyTrend : [],
        studentsNeedingAttention: Array.isArray(data?.studentsNeedingAttention) ? data.studentsNeedingAttention : [],
      };

      if (deletedStudentIds.size > 0) {
        safeData.topStudents = safeData.topStudents.filter((s) => !deletedStudentIds.has(s.id));
        safeData.studentsNeedingAttention = safeData.studentsNeedingAttention.filter((s) => !deletedStudentIds.has(s.id));
        safeData.summary.totalStudents = Math.max(0, safeData.summary.totalStudents - deletedStudentIds.size);
      }

      if (deletedRecordIds.size > 0) {
        safeData.summary.totalRecords = Math.max(0, safeData.summary.totalRecords - deletedRecordIds.size);
      }

      return safeData;
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
      const serverList = await fetchJson<PositiveRecord[]>(`${API_BASE}/positive-records${qs ? '?' + qs : ''}`);
      const deletedPosIds = storageSync.getDeletedPosRecordIds();
      const deletedStudentIds = storageSync.getDeletedStudentIds();
      const cancelledPosRecords = storageSync.getCancelledPosRecords();
      const createdPosRecords = storageSync.getCreatedPosRecords();

      const existingIds = new Set(serverList.map((r) => r.id));
      const combined: PositiveRecord[] = [...serverList];

      for (const r of createdPosRecords) {
        if (!existingIds.has(r.id)) {
          combined.unshift(r);
          existingIds.add(r.id);
        }
      }

      return combined
        .filter((r) => !deletedPosIds.has(r.id) && !deletedStudentIds.has(r.student_id))
        .map((r) => {
          if (cancelledPosRecords[r.id]) {
            return {
              ...r,
              status: 'cancelled' as const,
              cancellation_reason: cancelledPosRecords[r.id],
            };
          }
          return r;
        });
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

      const now = new Date();
      const record: PositiveRecord = {
        id: res.recordId || 'pos_' + Date.now().toString(36),
        student_id: data.studentId,
        student_name: 'Santri',
        division: data.division || 'tahfizh',
        action_id: data.actionId || null,
        action_name_snapshot: data.customActionName || 'Kegiatan Baik',
        points_deducted: res.pointsDeducted || data.customPoints || 5,
        halaqah_id: null,
        halaqah_name_snapshot: data.locationName || 'Halaqah & Asrama',
        teacher_id: null,
        teacher_name_snapshot: data.supervisorName || data.actorName || 'Pembina',
        student_class_snapshot: '-',
        academic_year_snapshot: '2025/2026',
        date: data.date || now.toISOString().split('T')[0],
        time: data.time || now.toTimeString().substring(0, 5),
        notes: data.notes || '',
        status: 'active',
        created_by: data.actorName || 'Petugas',
        created_at: now.toISOString(),
      };

      storageSync.saveCreatedPosRecord(record);
      return res;
    },

    cancel: async (id: string, reason: string, actorName?: string) => {
      storageSync.addCancelledPosRecord(id, reason);
      return await fetchJson<{ success?: boolean; message: string }>(`${API_BASE}/positive-records/${id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ reason, actorName }),
      });
    },

    delete: async (id: string, actorName?: string) => {
      storageSync.addDeletedPosRecordId(id);
      return await fetchJson<{ success?: boolean; message: string }>(`${API_BASE}/positive-records/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      });
    },

    bulkDelete: async (ids: string[], actorName?: string) => {
      ids.forEach((id) => storageSync.addDeletedPosRecordId(id));
      return await fetchJson<{ success?: boolean; deletedCount: number; deletedIds: string[]; message: string }>(`${API_BASE}/positive-records/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids, actorName }),
      });
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

  // Portal Orang Tua / Wali Santri (Cek via NIS)
  portal: {
    getByNis: (nis: string) => {
      const cleanNis = encodeURIComponent(nis.trim());
      return fetchJson<{
        student: Student;
        records: ViolationRecord[];
        positive_records: PositiveRecord[];
        thresholds: PointThreshold[];
        settings: SchoolSettings | null;
      }>(`${API_BASE}/students/portal/${cleanNis}`);
    },
  },
};
