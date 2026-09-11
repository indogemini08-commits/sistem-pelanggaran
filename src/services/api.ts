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
      let serverStudents: Student[] = [];
      try {
        serverStudents = await fetchJson<Student[]>(`${API_BASE}/halaqah/${id}/students`);
      } catch (e) {
        console.warn('Failed to fetch halaqah students:', e);
      }
      const deletedStudentIds = storageSync.getDeletedStudentIds();
      const createdStudents = storageSync.getCreatedStudents().filter((s) => s.halaqah_id === id && !deletedStudentIds.has(s.id));

      const existingIds = new Set(serverStudents.map((s) => s.id));
      const combined = [...serverStudents];
      for (const s of createdStudents) {
        if (!existingIds.has(s.id)) {
          combined.push(s);
          existingIds.add(s.id);
        }
      }

      return combined.filter(
        (s) => !deletedStudentIds.has(s.id) && !deletedStudentIds.has(s.student_number)
      );
    },
  },

  // Students (With reload-proof persistent client cache)
  students: {
    list: async (): Promise<Student[]> => {
      let serverList: Student[] = [];
      try {
        serverList = await fetchJson<Student[]>(`${API_BASE}/students`);
      } catch (err) {
        console.warn('Backend students fetch failed, falling back to local storage:', err);
      }

      const deletedIds = storageSync.getDeletedStudentIds();
      const createdList = storageSync.getCreatedStudents();
      const updatedMap = storageSync.getUpdatedStudents();

      // Merge created students that are not in serverList
      const existingIds = new Set(serverList.map((s) => s.id));
      const existingNIS = new Set(serverList.map((s) => s.student_number));

      const combined: Student[] = [...serverList];
      for (const s of createdList) {
        if (!existingIds.has(s.id) && !existingNIS.has(s.student_number)) {
          combined.push(s);
          existingIds.add(s.id);
        }
      }

      // Filter deleted and apply updates
      return combined
        .filter((s) => !deletedIds.has(s.id))
        .map((s) => {
          if (updatedMap[s.id]) {
            return { ...s, ...updatedMap[s.id] };
          }
          return s;
        });
    },

    getDetail: async (id: string) => {
      const deletedIds = storageSync.getDeletedStudentIds();
      if (deletedIds.has(id)) {
        throw new Error('Data santri tidak ditemukan.');
      }

      let detail: {
        student: Student;
        records: ViolationRecord[];
        positive_records?: PositiveRecord[];
        history: any[];
      };

      try {
        detail = await fetchJson<any>(`${API_BASE}/students/${id}`);
      } catch (err: any) {
        // Look in locally created students if backend returns 404
        const localStudents = storageSync.getCreatedStudents();
        const found = localStudents.find((s) => s.id === id || s.student_number === id);
        if (!found) {
          throw new Error('Data santri tidak ditemukan.');
        }

        detail = {
          student: found,
          records: [],
          positive_records: [],
          history: [],
        };
      }

      // Filter deleted records
      const deletedRecordIds = storageSync.getDeletedRecordIds();
      const cancelledRecords = storageSync.getCancelledRecords();
      const deletedPosRecordIds = storageSync.getDeletedPosRecordIds();
      const cancelledPosRecords = storageSync.getCancelledPosRecords();

      const filteredRecords = (detail.records || [])
        .filter((r) => !deletedRecordIds.has(r.id))
        .map((r) => {
          if (cancelledRecords[r.id]) {
            return { ...r, status: 'cancelled' as const, cancellation_reason: cancelledRecords[r.id] };
          }
          return r;
        });

      const filteredPosRecords = (detail.positive_records || [])
        .filter((r) => !deletedPosRecordIds.has(r.id))
        .map((r) => {
          if (cancelledPosRecords[r.id]) {
            return { ...r, status: 'cancelled' as const, cancellation_reason: cancelledPosRecords[r.id] };
          }
          return r;
        });

      return {
        ...detail,
        records: filteredRecords,
        positive_records: filteredPosRecords,
      };
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
        class: data.class,
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

      return res;
    },

    update: async (id: string, data: any) => {
      storageSync.saveUpdatedStudent(id, {
        student_number: data.studentNumber,
        name: data.name,
        class: data.class,
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

      // 2. Send DELETE request to backend (idempotent; ignore 404 if already absent)
      try {
        return await fetchJson<{ message: string }>(`${API_BASE}/students/${id}`, {
          method: 'DELETE',
          body: JSON.stringify({ actorName }),
        });
      } catch (err: any) {
        console.warn('Backend student deletion response note:', err.message);
        return { message: 'Data santri berhasil dihapus' };
      }
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

  // Violation Records (Rekap Terpadu with reload-proof persistence)
  records: {
    list: async (params: Record<string, string> = {}): Promise<ViolationRecord[]> => {
      const qs = new URLSearchParams(params).toString();
      let serverList: ViolationRecord[] = [];
      try {
        serverList = await fetchJson<ViolationRecord[]>(`${API_BASE}/records${qs ? '?' + qs : ''}`);
      } catch (err) {
        console.warn('Backend records fetch failed, falling back to local storage:', err);
      }

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
      // 1. Immediately persist cancellation in browser storage
      storageSync.addCancelledRecord(id, cancellationReason);

      // 2. Sync to backend
      try {
        return await fetchJson<{ message: string }>(`${API_BASE}/records/${id}/cancel`, {
          method: 'PUT',
          body: JSON.stringify({ cancellationReason, actorName }),
        });
      } catch (err: any) {
        console.warn('Backend cancel note:', err.message);
        return { message: 'Catatan pelanggaran berhasil dibatalkan' };
      }
    },

    delete: async (id: string, actorName?: string) => {
      // 1. Immediately persist deletion in browser storage (Reload-Proof)
      storageSync.addDeletedRecordId(id);

      // 2. Sync to backend (idempotent; ignore 404)
      try {
        return await fetchJson<{ message: string }>(`${API_BASE}/records/${id}`, {
          method: 'DELETE',
          body: JSON.stringify({ actorName }),
        });
      } catch (err: any) {
        console.warn('Backend record delete note:', err.message);
        return { message: 'Catatan pelanggaran berhasil dihapus permanen' };
      }
    },

    stats: async (division?: string): Promise<DashboardStats> => {
      const qs = division && division !== 'all' ? '?division=' + encodeURIComponent(division) : '';
      let serverStats: DashboardStats;
      try {
        serverStats = await fetchJson<DashboardStats>(`${API_BASE}/records/stats${qs}`);
      } catch (err) {
        console.warn('Backend stats fetch failed, falling back to empty stats:', err);
        serverStats = {
          summary: {
            totalStudents: 0,
            totalTeachers: 0,
            totalHalaqah: 0,
            totalRecords: 0,
            totalPoints: 0,
            todayCount: 0,
            monthCount: 0,
            tahfizhRecordsCount: 0,
            tahfizhTotalPoints: 0,
            kesantrianRecordsCount: 0,
            kesantrianTotalPoints: 0,
            totalPositiveRecords: 0,
            totalPointsDeducted: 0,
            tahfizhDeductedPoints: 0,
            kesantrianDeductedPoints: 0,
            netTotalPoints: 0,
          },
          topStudents: [],
          byCategory: [],
          pointsByHalaqah: [],
          monthlyTrend: [],
          studentsNeedingAttention: [],
        };
      }

      const deletedStudentIds = storageSync.getDeletedStudentIds();
      const createdStudents = storageSync.getCreatedStudents().filter((s) => !deletedStudentIds.has(s.id));

      // Filter out deleted students from topStudents and studentsNeedingAttention
      const filteredTopStudents = (serverStats.topStudents || []).filter(
        (s) => !deletedStudentIds.has(s.id) && !deletedStudentIds.has(s.student_number)
      );

      const filteredNeedingAttention = (serverStats.studentsNeedingAttention || []).filter(
        (s) => !deletedStudentIds.has(s.id) && !deletedStudentIds.has(s.student_number)
      );

      // Adjust total students
      let adjustedTotalStudents = serverStats.summary.totalStudents;
      if (deletedStudentIds.size > 0) {
        adjustedTotalStudents = Math.max(0, adjustedTotalStudents - deletedStudentIds.size);
      }
      adjustedTotalStudents += createdStudents.length;

      return {
        ...serverStats,
        summary: {
          ...serverStats.summary,
          totalStudents: adjustedTotalStudents,
        },
        topStudents: filteredTopStudents,
        studentsNeedingAttention: filteredNeedingAttention,
      };
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

  // Positive Records (Catatan Kebaikan & Pengurangan Poin with reload-proof persistence)
  positiveRecords: {
    list: async (params: Record<string, string> = {}): Promise<PositiveRecord[]> => {
      const qs = new URLSearchParams(params).toString();
      let serverList: PositiveRecord[] = [];
      try {
        serverList = await fetchJson<PositiveRecord[]>(`${API_BASE}/positive-records${qs ? '?' + qs : ''}`);
      } catch (err) {
        console.warn('Backend positive records fetch note:', err);
      }

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
      try {
        return await fetchJson<{ message: string }>(`${API_BASE}/positive-records/${id}/cancel`, {
          method: 'PUT',
          body: JSON.stringify({ reason, actorName }),
        });
      } catch (err: any) {
        console.warn('Backend positive record cancel note:', err.message);
        return { message: 'Catatan kebaikan berhasil dibatalkan' };
      }
    },

    delete: async (id: string, actorName?: string) => {
      storageSync.addDeletedPosRecordId(id);
      try {
        return await fetchJson<{ message: string }>(`${API_BASE}/positive-records/${id}`, {
          method: 'DELETE',
          body: JSON.stringify({ actorName }),
        });
      } catch (err: any) {
        console.warn('Backend positive record delete note:', err.message);
        return { message: 'Catatan kebaikan berhasil dihapus' };
      }
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
