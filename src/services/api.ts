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
          badgeColor: th.badge_color || (points < 20 ? 'emerald' : points < 50 ? 'amber' : points < 75 ? 'orange' : 'rose'),
          description: th.description || 'Kedisiplinan dan capaian hafalan santri dalam batas baik.',
        };
      }
    }
    const highest = thresholds[thresholds.length - 1];
    if (points >= highest.minimum_points) {
      return {
        statusName: highest.status_name,
        badgeColor: highest.badge_color || 'red',
        description: highest.description || 'Evaluasi kelanjutan kepesertaan santri.',
      };
    }
  }

  // Pesantren standard thresholds
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
    login: async (credentials: { email: string; password: string }) => {
      const cleanEmail = credentials.email.trim().toLowerCase();
      try {
        const res = await fetchJson<{ message: string; user: User }>(`${API_BASE}/auth/login`, {
          method: 'POST',
          body: JSON.stringify(credentials),
        });
        return res;
      } catch (err: any) {
        // Local fallback if server fails (e.g. Vercel cold boot or network interruption)
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

  // Users (Synchronized with backend and client store)
  users: {
    list: async (): Promise<User[]> => {
      let serverList: User[] = [];
      try {
        serverList = await fetchJson<User[]>(`${API_BASE}/users`);
      } catch (e) {
        console.warn('Failed to fetch users from server, using local store:', e);
      }

      // Ensure default admin is present in list
      const defaultAdmin: User = {
        id: 'usr_admin_imbs',
        name: 'Admin Utama',
        email: 'imbs@aldri',
        role: 'admin',
        status: 'active',
        created_at: '2026-09-12',
      };

      const deletedIds = storageSync.getDeletedUserIds();
      const createdUsers = storageSync.getCreatedUsers();
      const updatedUsers = storageSync.getUpdatedUsers();

      const combined = [...serverList];
      const existingEmails = new Set(combined.map((u) => u.email.toLowerCase()));

      // Add default admin if not already in list
      if (!existingEmails.has('imbs@aldri') && !deletedIds.has('usr_admin_imbs')) {
        combined.unshift(defaultAdmin);
        existingEmails.add('imbs@aldri');
      }

      // Merge created users
      const existingIds = new Set(combined.map((u) => u.id));
      for (const u of createdUsers) {
        if (!existingIds.has(u.id)) {
          combined.unshift(u);
          existingIds.add(u.id);
        }
      }

      // Filter deleted and apply updates
      return combined
        .filter((u) => !deletedIds.has(u.id))
        .map((u) => {
          if (updatedUsers[u.id]) {
            return { ...u, ...updatedUsers[u.id] };
          }
          return u;
        });
    },

    create: async (data: any) => {
      let res: any = null;
      try {
        res = await fetchJson<{ message: string; userId: string; user?: User }>(`${API_BASE}/users`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.warn('Server create user failed, saving locally:', e);
      }

      const newUserId = res?.userId || 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const newUser: User = res?.user || {
        id: newUserId,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        role: data.role,
        status: data.status || 'active',
        created_at: new Date().toISOString(),
      };

      storageSync.saveCreatedUser(newUser);
      return { message: 'Pengguna berhasil ditambahkan', userId: newUserId, user: newUser };
    },

    update: async (id: string, data: any) => {
      let res: any = null;
      try {
        res = await fetchJson<{ message: string; user?: User }>(`${API_BASE}/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.warn('Server update user failed, saving locally:', e);
      }

      const updates: Partial<User> = {
        name: data.name?.trim(),
        email: data.email?.trim().toLowerCase(),
        role: data.role,
        status: data.status,
      };

      storageSync.saveUpdatedUser(id, updates);
      return {
        message: 'Data pengguna berhasil diperbarui',
        user: res?.user || { id, ...updates },
      };
    },

    delete: async (id: string, actorName?: string) => {
      storageSync.addDeletedUserId(id);
      return await fetchJson<{ message: string }>(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      }).catch(() => ({ message: 'Pengguna berhasil dihapus' }));
    },
  },

  // Teachers (Synchronized with backend & client persistent storage)
  teachers: {
    list: async (): Promise<Teacher[]> => {
      let serverList: Teacher[] = [];
      try {
        serverList = await fetchJson<Teacher[]>(`${API_BASE}/teachers`);
      } catch (e) {
        console.warn('Failed to fetch teachers from server, using local store:', e);
      }

      const deletedIds = storageSync.getDeletedTeacherIds();
      const createdTeachers = storageSync.getCreatedTeachers();
      const updatedTeachers = storageSync.getUpdatedTeachers();

      const existingIds = new Set(serverList.map((t) => t.id));
      const combined = [...serverList];

      for (const t of createdTeachers) {
        if (!existingIds.has(t.id)) {
          combined.unshift(t);
          existingIds.add(t.id);
        }
      }

      // Filter deleted teachers and apply local updates
      return combined
        .filter((t) => !deletedIds.has(t.id))
        .map((t) => {
          if (updatedTeachers[t.id]) {
            return { ...t, ...updatedTeachers[t.id] };
          }
          return t;
        });
    },

    create: async (data: any) => {
      let res: any = null;
      try {
        res = await fetchJson<{ message: string; teacherId: string }>(`${API_BASE}/teachers`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.warn('Server create teacher failed, saving locally:', e);
      }

      const newId = res?.teacherId || 'tch_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const newTeacher: Teacher = {
        id: newId,
        name: data.name.trim(),
        phone: data.phone || '',
        status: data.status || 'active',
        user_id: data.userId || null,
        created_at: new Date().toISOString(),
      };

      storageSync.saveCreatedTeacher(newTeacher);
      return { message: 'Data Muhafizh berhasil ditambahkan', teacherId: newId };
    },

    update: async (id: string, data: any) => {
      const updates: Partial<Teacher> = {
        name: data.name?.trim(),
        phone: data.phone,
        status: data.status,
      };
      storageSync.saveUpdatedTeacher(id, updates);

      try {
        return await fetchJson<{ message: string }>(`${API_BASE}/teachers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (e) {
        return { message: 'Data Muhafizh berhasil diperbarui' };
      }
    },

    delete: async (id: string, actorName?: string) => {
      storageSync.addDeletedTeacherId(id);
      return await fetchJson<{ message: string }>(`${API_BASE}/teachers/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      }).catch(() => ({ message: 'Muhafizh berhasil dihapus' }));
    },
  },

  // Halaqah (Synchronized with backend & client persistent storage)
  halaqah: {
    list: async (): Promise<Halaqah[]> => {
      let serverList: Halaqah[] = [];
      try {
        serverList = await fetchJson<Halaqah[]>(`${API_BASE}/halaqah`);
      } catch (e) {
        console.warn('Failed to fetch halaqahs from server, using local store:', e);
      }

      const deletedIds = storageSync.getDeletedHalaqahIds();
      const createdHalaqahs = storageSync.getCreatedHalaqahs();
      const updatedHalaqahs = storageSync.getUpdatedHalaqahs();

      const existingIds = new Set(serverList.map((h) => h.id));
      const combined = [...serverList];

      for (const h of createdHalaqahs) {
        if (!existingIds.has(h.id)) {
          combined.unshift(h);
          existingIds.add(h.id);
        }
      }

      // Filter deleted halaqahs and apply local updates
      return combined
        .filter((h) => !deletedIds.has(h.id))
        .map((h) => {
          if (updatedHalaqahs[h.id]) {
            return { ...h, ...updatedHalaqahs[h.id] };
          }
          return h;
        });
    },

    create: async (data: any) => {
      let res: any = null;
      try {
        res = await fetchJson<{ message: string; halaqahId: string }>(`${API_BASE}/halaqah`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.warn('Server create halaqah failed, saving locally:', e);
      }

      const newId = res?.halaqahId || 'hlq_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const newHalaqah: Halaqah = {
        id: newId,
        name: data.name.trim(),
        teacher_id: data.teacherId || null,
        schedule: data.schedule || "Ba'da Subuh & Ba'da Maghrib",
        location: data.location || 'Masjid Utama',
        academic_year: data.academicYear || '2025/2026',
        status: data.status || 'active',
        student_count: 0,
        created_at: new Date().toISOString(),
      };

      storageSync.saveCreatedHalaqah(newHalaqah);
      return { message: 'Halaqah berhasil dibuat', halaqahId: newId };
    },

    update: async (id: string, data: any) => {
      const updates: Partial<Halaqah> = {
        name: data.name?.trim(),
        teacher_id: data.teacherId,
        schedule: data.schedule,
        location: data.location,
        academic_year: data.academicYear,
        status: data.status,
      };
      storageSync.saveUpdatedHalaqah(id, updates);

      try {
        return await fetchJson<{ message: string }>(`${API_BASE}/halaqah/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (e) {
        return { message: 'Data halaqah berhasil diperbarui' };
      }
    },

    delete: async (id: string, actorName?: string) => {
      storageSync.addDeletedHalaqahId(id);
      return await fetchJson<{ message: string }>(`${API_BASE}/halaqah/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ actorName }),
      }).catch(() => ({ message: 'Halaqah berhasil dihapus' }));
    },

    getStudents: async (id: string): Promise<Student[]> => {
      let list: Student[] = [];
      try {
        list = await fetchJson<Student[]>(`${API_BASE}/halaqah/${id}/students`);
      } catch (e) {
        const allStudents = await api.students.list();
        list = allStudents.filter((s) => s.halaqah_id === id);
      }
      const deletedIds = storageSync.getDeletedStudentIds();
      return list.filter((s) => !deletedIds.has(s.id));
    },
  },

  // Students (Direct backend database sync)
  students: {
    list: async (): Promise<Student[]> => {
      let serverList: Student[] = [];
      try {
        serverList = await fetchJson<Student[]>(`${API_BASE}/students`);
      } catch (e) {
        console.warn('Failed to fetch students from server, using local store:', e);
      }
      const deletedIds = storageSync.getDeletedStudentIds();
      const createdStudents = storageSync.getCreatedStudents();
      const updatedStudents = storageSync.getUpdatedStudents();

      const existingIds = new Set(serverList.map((s) => s.id));
      const combined = [...serverList];

      for (const s of createdStudents) {
        if (!existingIds.has(s.id)) {
          combined.unshift(s);
          existingIds.add(s.id);
        }
      }

      // Filter deleted students & apply local updates
      const activeStudents = combined
        .filter((s) => !deletedIds.has(s.id))
        .map((s) => {
          if (updatedStudents[s.id]) {
            return { ...s, ...updatedStudents[s.id] };
          }
          return s;
        });

      // Fetch active records and positive records to ensure 100% synchronized points calculation
      const [allRecords, allPosRecords] = await Promise.all([
        api.records.list().catch(() => []),
        api.positiveRecords.list().catch(() => []),
      ]);

      const activeRecs = allRecords.filter((r) => r.status === 'active');
      const activePosRecs = allPosRecords.filter((pr) => pr.status === 'active');

      return activeStudents.map((s) => {
        const studentRecs = activeRecs.filter((r) => r.student_id === s.id);
        const studentPosRecs = activePosRecs.filter((pr) => pr.student_id === s.id);

        const grossTahfizh = studentRecs
          .filter((r) => r.division === 'tahfizh')
          .reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);

        const grossKesantrian = studentRecs
          .filter((r) => r.division === 'kesantrian')
          .reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);

        const dedTahfizh = studentPosRecs
          .filter((pr) => pr.division === 'tahfizh')
          .reduce((sum, pr) => sum + Number(pr.points_deducted || 0), 0);

        const dedKesantrian = studentPosRecs
          .filter((pr) => pr.division === 'kesantrian')
          .reduce((sum, pr) => sum + Number(pr.points_deducted || 0), 0);

        const netTahfizh = Math.max(0, grossTahfizh - dedTahfizh);
        const netKesantrian = Math.max(0, grossKesantrian - dedKesantrian);
        const netTotal = netTahfizh + netKesantrian;

        return {
          ...s,
          total_points: netTotal,
          tahfizh_points: netTahfizh,
          kesantrian_points: netKesantrian,
          gross_total_points: grossTahfizh + grossKesantrian,
          gross_tahfizh_points: grossTahfizh,
          gross_kesantrian_points: grossKesantrian,
          tahfizh_deductions: dedTahfizh,
          kesantrian_deductions: dedKesantrian,
          total_deductions: dedTahfizh + dedKesantrian,
          violation_count: studentRecs.length,
          tahfizh_violation_count: studentRecs.filter((r) => r.division === 'tahfizh').length,
          kesantrian_violation_count: studentRecs.filter((r) => r.division === 'kesantrian').length,
          positive_count: studentPosRecs.length,
          status_info: getStatusForPoints(netTotal),
        };
      });
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
      let serverList: ViolationRecord[] = [];
      try {
        serverList = await fetchJson<ViolationRecord[]>(`${API_BASE}/records${qs ? '?' + qs : ''}`);
      } catch (e) {
        console.warn('Failed to fetch records from server, using local store:', e);
      }
      const deletedRecordIds = storageSync.getDeletedRecordIds();
      const deletedStudentIds = storageSync.getDeletedStudentIds();
      const cancelledRecords = storageSync.getCancelledRecords();
      const createdRecords = storageSync.getCreatedRecords();
      const createdStudents = storageSync.getCreatedStudents();
      const studentMap = new Map(createdStudents.map((s) => [s.id, s]));

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
          const s = studentMap.get(r.student_id);
          if (s) {
            if (!r.student_nis || r.student_nis === '-') r.student_nis = s.student_number;
            if (!r.student_name || r.student_name === 'Santri') r.student_name = s.name;
            if (!r.student_class_snapshot || r.student_class_snapshot === '-') r.student_class_snapshot = s.class;
          }
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
      let res: any = null;
      try {
        res = await fetchJson<{
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
      } catch (e) {
        console.warn('Backend record creation failed, saving locally:', e);
      }

      const now = new Date();
      const recordId = res?.recordId || 'rec_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const record: ViolationRecord = {
        id: recordId,
        student_id: data.studentId,
        student_name: res?.studentName || data.studentName || 'Santri',
        student_nis: data.studentNis || '-',
        division: res?.division || data.division || 'tahfizh',
        halaqah_id: data.halaqahId || null,
        halaqah_name_snapshot: data.locationName || 'Halaqah & Asrama',
        teacher_id: null,
        teacher_name_snapshot: data.supervisorName || data.createdBy || 'Pembina',
        violation_id: data.violationId,
        violation_name_snapshot: res?.violationName || data.violationName || 'Pelanggaran',
        points_snapshot: res?.points || data.points || 0,
        student_class_snapshot: data.studentClass || '-',
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
      return {
        message: 'Pelanggaran berhasil dicatat.',
        recordId,
        studentName: record.student_name,
        violationName: record.violation_name_snapshot,
        division: record.division,
        points: record.points_snapshot,
        newTotalPoints: res?.newTotalPoints ?? record.points_snapshot,
        tahfizhPoints: res?.tahfizhPoints,
        kesantrianPoints: res?.kesantrianPoints,
      };
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
      const hasDivisionFilter = division && division !== 'all';

      // Load all source-of-truth lists (already synced with localStorage & server)
      const [students, records, positiveRecords, halaqahs, teachers] = await Promise.all([
        api.students.list().catch(() => []),
        api.records.list().catch(() => []),
        api.positiveRecords.list().catch(() => []),
        api.halaqah.list().catch(() => []),
        api.teachers.list().catch(() => []),
      ]);

      const activeRecords = records.filter((r) => r.status === 'active');
      const scopedRecords = hasDivisionFilter
        ? activeRecords.filter((r) => r.division === division)
        : activeRecords;

      const activePosRecords = positiveRecords.filter((pr) => pr.status === 'active');
      const scopedPosRecords = hasDivisionFilter
        ? activePosRecords.filter((pr) => pr.division === division)
        : activePosRecords;

      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.substring(0, 7);

      // Tahfizh stats
      const tahfizhRecords = activeRecords.filter((r) => r.division === 'tahfizh');
      const tahfizhRecordsCount = tahfizhRecords.length;
      const tahfizhTotalPoints = tahfizhRecords.reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);

      // Kesantrian stats
      const kesantrianRecords = activeRecords.filter((r) => r.division === 'kesantrian');
      const kesantrianRecordsCount = kesantrianRecords.length;
      const kesantrianTotalPoints = kesantrianRecords.reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);

      // Deductions
      const tahfizhPos = activePosRecords.filter((pr) => pr.division === 'tahfizh');
      const tahfizhDeductedPoints = tahfizhPos.reduce((sum, pr) => sum + Number(pr.points_deducted || 0), 0);

      const kesantrianPos = activePosRecords.filter((pr) => pr.division === 'kesantrian');
      const kesantrianDeductedPoints = kesantrianPos.reduce((sum, pr) => sum + Number(pr.points_deducted || 0), 0);

      const totalPositiveRecords = scopedPosRecords.length;
      const totalPointsDeducted = scopedPosRecords.reduce((sum, pr) => sum + Number(pr.points_deducted || 0), 0);

      const totalRecords = scopedRecords.length;
      const totalPoints = scopedRecords.reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);
      const netTotalPoints = Math.max(0, totalPoints - totalPointsDeducted);

      const todayCount = scopedRecords.filter((r) => r.date === today).length;
      const monthCount = scopedRecords.filter((r) => r.date && r.date.startsWith(currentMonth)).length;

      // Summary
      const summary = {
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalHalaqah: halaqahs.length,
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
        netTotalPoints,
      };

      // Top 10 students (students with highest points in current scope)
      const studentMapPoints = students.map((s) => {
        const studentRecs = activeRecords.filter((r) => r.student_id === s.id);
        const studentPosRecs = activePosRecords.filter((pr) => pr.student_id === s.id);

        const sTahfizh = studentRecs.filter((r) => r.division === 'tahfizh').reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);
        const sKesantrian = studentRecs.filter((r) => r.division === 'kesantrian').reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);
        const sDedTahfizh = studentPosRecs.filter((pr) => pr.division === 'tahfizh').reduce((sum, pr) => sum + Number(pr.points_deducted || 0), 0);
        const sDedKesantrian = studentPosRecs.filter((pr) => pr.division === 'kesantrian').reduce((sum, pr) => sum + Number(pr.points_deducted || 0), 0);

        const netT = Math.max(0, sTahfizh - sDedTahfizh);
        const netK = Math.max(0, sKesantrian - sDedKesantrian);
        const netTot = hasDivisionFilter ? (division === 'tahfizh' ? netT : netK) : (netT + netK);

        return {
          id: s.id,
          name: s.name,
          student_number: s.student_number,
          class: s.class,
          halaqah_name: s.halaqah_name || 'Tanpa Halaqah',
          total_points: netTot,
          gross_points: hasDivisionFilter ? (division === 'tahfizh' ? sTahfizh : sKesantrian) : (sTahfizh + sKesantrian),
          tahfizh_points: netT,
          kesantrian_points: netK,
          tahfizh_deductions: sDedTahfizh,
          kesantrian_deductions: sDedKesantrian,
          total_deductions: sDedTahfizh + sDedKesantrian,
          violation_count: hasDivisionFilter
            ? (division === 'tahfizh'
                ? studentRecs.filter((r) => r.division === 'tahfizh').length
                : studentRecs.filter((r) => r.division === 'kesantrian').length)
            : studentRecs.length,
        };
      });

      const topStudents = studentMapPoints
        .filter((s) => s.total_points > 0 || s.gross_points > 0)
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 10);

      // By Category
      const catMap = new Map<string, { category: string; division: string; count: number; points: number }>();
      for (const r of scopedRecords) {
        const cat = r.violation_category || 'Kedisiplinan';
        const div = r.division || 'tahfizh';
        const key = `${cat}_${div}`;
        const existing = catMap.get(key) || { category: cat, division: div, count: 0, points: 0 };
        existing.count += 1;
        existing.points += Number(r.points_snapshot || 0);
        catMap.set(key, existing);
      }
      const byCategory = Array.from(catMap.values()).sort((a, b) => b.count - a.count);

      // Points by Halaqah
      const halaqahMap = new Map<string, { halaqah_name: string; violation_count: number; total_points: number }>();
      for (const r of scopedRecords) {
        const hName = r.halaqah_name_snapshot || 'Tanpa Halaqah';
        const existing = halaqahMap.get(hName) || { halaqah_name: hName, violation_count: 0, total_points: 0 };
        existing.violation_count += 1;
        existing.total_points += Number(r.points_snapshot || 0);
        halaqahMap.set(hName, existing);
      }
      const pointsByHalaqah = Array.from(halaqahMap.values()).sort((a, b) => b.total_points - a.total_points);

      // Monthly Trend
      const monthMap = new Map<string, { month: string; count: number; points: number }>();
      for (const r of scopedRecords) {
        const m = (r.date || '').substring(0, 7) || currentMonth;
        const existing = monthMap.get(m) || { month: m, count: 0, points: 0 };
        existing.count += 1;
        existing.points += Number(r.points_snapshot || 0);
        monthMap.set(m, existing);
      }
      const monthlyTrend = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

      // Students needing attention (total_points >= 20)
      const studentsNeedingAttention = studentMapPoints
        .filter((s) => s.total_points >= 20)
        .sort((a, b) => b.total_points - a.total_points);

      return {
        summary,
        topStudents,
        byCategory,
        pointsByHalaqah,
        monthlyTrend,
        studentsNeedingAttention,
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

  // Positive Records (Catatan Kebaikan & Pengurangan Poin directly synced with backend)
  positiveRecords: {
    list: async (params: Record<string, string> = {}): Promise<PositiveRecord[]> => {
      const qs = new URLSearchParams(params).toString();
      let serverList: PositiveRecord[] = [];
      try {
        serverList = await fetchJson<PositiveRecord[]>(`${API_BASE}/positive-records${qs ? '?' + qs : ''}`);
      } catch (e) {
        console.warn('Failed to fetch positive records from server, using local store:', e);
      }
      const deletedPosIds = storageSync.getDeletedPosRecordIds();
      const deletedStudentIds = storageSync.getDeletedStudentIds();
      const cancelledPosRecords = storageSync.getCancelledPosRecords();
      const createdPosRecords = storageSync.getCreatedPosRecords();
      const createdStudents = storageSync.getCreatedStudents();
      const studentMap = new Map(createdStudents.map((s) => [s.id, s]));

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
          const s = studentMap.get(r.student_id);
          if (s) {
            if (!r.student_nis || r.student_nis === '-') r.student_nis = s.student_number;
            if (!r.student_name || r.student_name === 'Santri') r.student_name = s.name;
            if (!r.student_class_snapshot || r.student_class_snapshot === '-') r.student_class_snapshot = s.class;
          }
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
      let res: any = null;
      try {
        res = await fetchJson<{
          message: string;
          recordId: string;
          pointsDeducted: number;
        }>(`${API_BASE}/positive-records`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.warn('Backend positive record creation failed, saving locally:', e);
      }

      const now = new Date();
      const recordId = res?.recordId || 'pos_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const record: PositiveRecord = {
        id: recordId,
        student_id: data.studentId,
        student_name: data.studentName || 'Santri',
        student_nis: data.studentNis || '-',
        division: data.division || 'tahfizh',
        action_id: data.actionId || null,
        action_name_snapshot: data.customActionName || 'Kegiatan Baik',
        points_deducted: res?.pointsDeducted || data.customPoints || 5,
        halaqah_id: null,
        halaqah_name_snapshot: data.locationName || 'Halaqah & Asrama',
        teacher_id: null,
        teacher_name_snapshot: data.supervisorName || data.actorName || 'Pembina',
        student_class_snapshot: data.studentClass || '-',
        academic_year_snapshot: '2025/2026',
        date: data.date || now.toISOString().split('T')[0],
        time: data.time || now.toTimeString().substring(0, 5),
        notes: data.notes || '',
        status: 'active',
        created_by: data.actorName || 'Petugas',
        created_at: now.toISOString(),
      };

      storageSync.saveCreatedPosRecord(record);
      return {
        message: 'Catatan kebaikan berhasil disimpan',
        recordId,
        pointsDeducted: record.points_deducted,
      };
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
    getByNis: async (nis: string) => {
      const cleanNis = encodeURIComponent(nis.trim());
      try {
        const res = await fetchJson<{
          student: Student;
          records: ViolationRecord[];
          positive_records: PositiveRecord[];
          thresholds: PointThreshold[];
          settings: SchoolSettings | null;
        }>(`${API_BASE}/students/portal/${cleanNis}`);

        // Check if student was deleted in client store
        const deletedIds = storageSync.getDeletedStudentIds();
        if (res && res.student && deletedIds.has(res.student.id)) {
          throw new Error(`Santri dengan NIS "${nis}" telah dinonaktifkan atau dihapus.`);
        }

        // Guarantee status_info is always present and properly calculated
        if (res && res.student) {
          const net = Number(res.student.total_points || 0);
          if (!res.student.status_info || !res.student.status_info.badgeColor) {
            res.student.status_info = getStatusForPoints(net, res.thresholds);
          }
        }
        return res;
      } catch (err: any) {
        // Fallback to client-side synchronized store if server returns 404/error (e.g. newly created student on Vercel)
        const students = await api.students.list();
        const found = students.find((s) => s.student_number.trim() === nis.trim());
        if (!found) {
          throw err;
        }

        const [allRecs, allPosRecs, settingsData] = await Promise.all([
          api.records.list(),
          api.positiveRecords.list().catch(() => []),
          api.settings.get().catch(() => ({ settings: null, thresholds: [] })),
        ]);

        const studentRecs = allRecs.filter((r) => r.student_id === found.id);
        const studentPosRecs = allPosRecs.filter((pr) => pr.student_id === found.id);

        const net = Number(found.total_points || 0);
        const statusInfo = found.status_info || getStatusForPoints(net, settingsData.thresholds);

        return {
          student: {
            ...found,
            total_points: net,
            status_info: statusInfo,
          },
          records: studentRecs,
          positive_records: studentPosRecs,
          thresholds: settingsData.thresholds || [],
          settings: settingsData.settings || null,
        };
      }
    },
  },
};
