// Client-Side Event Synchronization Manager
// Ensures unified, real-time data synchronization across devices and browser tabs.
// The Server (Neon PostgreSQL + SQLite) is the SINGLE SOURCE OF TRUTH.

import { Student, ViolationRecord, PositiveRecord, User, Halaqah, Teacher } from '../types';

const LEGACY_KEYS = [
  'imbs_deleted_student_ids',
  'imbs_created_students',
  'imbs_updated_students',
  'imbs_deleted_violation_ids',
  'imbs_created_violations',
  'imbs_deleted_record_ids',
  'imbs_cancelled_records',
  'imbs_created_records',
  'imbs_deleted_pos_record_ids',
  'imbs_cancelled_pos_records',
  'imbs_created_pos_records',
  'imbs_deleted_user_ids',
  'imbs_created_users',
  'imbs_updated_users',
  'imbs_deleted_halaqah_ids',
  'imbs_created_halaqahs',
  'imbs_updated_halaqahs',
  'imbs_deleted_teacher_ids',
  'imbs_created_teachers',
  'imbs_updated_teachers',
  'imbs_cached_server_state',
];

export function cleanupLegacyLocalStorageOverrides() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  for (const k of LEGACY_KEYS) {
    try {
      window.localStorage.removeItem(k);
    } catch {}
  }
  try {
    window.localStorage.setItem('imbs_schema_version', 'v3_server_single_truth');
  } catch {}
}

// Immediately purge legacy client overrides on script evaluation
cleanupLegacyLocalStorageOverrides();

export const storageSync = {
  notifyDataChange(detail?: { action: string; resource: string; id?: string }) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:data-changed', { detail }));
    }
  },

  // === Backward compatibility stubs (always defer to server authority) ===
  getDeletedStudentIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedStudentId(id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'student', id });
  },
  getCreatedStudents(): Student[] {
    return [];
  },
  saveCreatedStudent(student: Student) {
    this.notifyDataChange({ action: 'create', resource: 'student', id: student.id });
  },
  saveCreatedStudentsBulk(_students: Student[]) {
    this.notifyDataChange({ action: 'bulk_create', resource: 'student' });
  },
  getUpdatedStudents(): Record<string, Partial<Student>> {
    return {};
  },
  saveUpdatedStudent(id: string, _updates: Partial<Student>) {
    this.notifyDataChange({ action: 'update', resource: 'student', id });
  },

  // === VIOLATION RECORDS ===
  getDeletedRecordIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedRecordId(id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'record', id });
  },
  getCancelledRecords(): Record<string, string> {
    return {};
  },
  addCancelledRecord(id: string, _reason: string) {
    this.notifyDataChange({ action: 'cancel', resource: 'record', id });
  },
  getCreatedRecords(): ViolationRecord[] {
    return [];
  },
  saveCreatedRecord(record: ViolationRecord) {
    this.notifyDataChange({ action: 'create', resource: 'record', id: record.id });
  },

  // === POSITIVE RECORDS ===
  getDeletedPosRecordIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedPosRecordId(id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'pos_record', id });
  },
  getCancelledPosRecords(): Record<string, string> {
    return {};
  },
  addCancelledPosRecord(id: string, _reason: string) {
    this.notifyDataChange({ action: 'cancel', resource: 'pos_record', id });
  },
  getCreatedPosRecords(): PositiveRecord[] {
    return [];
  },
  saveCreatedPosRecord(record: PositiveRecord) {
    this.notifyDataChange({ action: 'create', resource: 'pos_record', id: record.id });
  },

  // === USERS ===
  getDeletedUserIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedUserId(id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'user', id });
  },
  getCreatedUsers(): User[] {
    return [];
  },
  saveCreatedUser(user: User) {
    this.notifyDataChange({ action: 'create', resource: 'user', id: user.id });
  },
  getUpdatedUsers(): Record<string, Partial<User>> {
    return {};
  },
  saveUpdatedUser(id: string, _updates: Partial<User>) {
    this.notifyDataChange({ action: 'update', resource: 'user', id });
  },

  // === HALAQAHS ===
  getDeletedHalaqahIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedHalaqahId(id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'halaqah', id });
  },
  getCreatedHalaqahs(): Halaqah[] {
    return [];
  },
  saveCreatedHalaqah(h: Halaqah) {
    this.notifyDataChange({ action: 'create', resource: 'halaqah', id: h.id });
  },
  getUpdatedHalaqahs(): Record<string, Partial<Halaqah>> {
    return {};
  },
  saveUpdatedHalaqah(id: string, _updates: Partial<Halaqah>) {
    this.notifyDataChange({ action: 'update', resource: 'halaqah', id });
  },

  // === TEACHERS ===
  getDeletedTeacherIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedTeacherId(id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'teacher', id });
  },
  getCreatedTeachers(): Teacher[] {
    return [];
  },
  saveCreatedTeacher(t: Teacher) {
    this.notifyDataChange({ action: 'create', resource: 'teacher', id: t.id });
  },
  getUpdatedTeachers(): Record<string, Partial<Teacher>> {
    return {};
  },
  saveUpdatedTeacher(id: string, _updates: Partial<Teacher>) {
    this.notifyDataChange({ action: 'update', resource: 'teacher', id });
  },

  // === VIOLATIONS MASTER ===
  getDeletedViolationIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedViolationId(id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'violation', id });
  },
  getCreatedViolations(): any[] {
    return [];
  },
  saveCreatedViolation(v: any) {
    this.notifyDataChange({ action: 'create', resource: 'violation', id: v.id });
  },

  // === RESET & SYNC HELPERS ===
  resetToDemo() {
    cleanupLegacyLocalStorageOverrides();
    this.notifyDataChange({ action: 'reset', resource: 'all' });
  },

  async syncWithServer(): Promise<{ success: boolean; cloud?: any; state?: any }> {
    const apiBase = (import.meta as any).env?.VITE_API_URL || '/api';
    try {
      const res = await fetch(`${apiBase}/sync/state`);
      if (res.ok) {
        const json = await res.json();
        this.notifyDataChange({ action: 'sync_completed', resource: 'all' });
        return { success: true, cloud: json.cloud, state: json.state };
      }
    } catch (err) {
      console.warn('[StorageSync] Server sync notice:', err);
    }
    return { success: false };
  },

  reconcileDeletedStudentIds(_serverStudentIds: string[]) {},
};

// Automatic multi-device / multi-tab synchronizer
if (typeof window !== 'undefined') {
  // Sync when user refocuses the browser or switches tabs
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      storageSync.notifyDataChange({ action: 'visibility_focus', resource: 'all' });
    }
  });

  window.addEventListener('focus', () => {
    storageSync.notifyDataChange({ action: 'window_focus', resource: 'all' });
  });

  // Background light sync every 25s when tab is active
  setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      storageSync.notifyDataChange({ action: 'interval_sync', resource: 'all' });
    }
  }, 25000);
}
