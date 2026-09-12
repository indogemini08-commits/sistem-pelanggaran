// Client-Side Persistent Storage & Synchronization Manager
// Solves Vercel Serverless ephemeral statelessness so deleted/created data persists across page reloads.

import { Student, ViolationRecord, PositiveRecord, User, Halaqah, Teacher } from '../types';

const KEYS = {
  DELETED_STUDENTS: 'imbs_deleted_student_ids',
  CREATED_STUDENTS: 'imbs_created_students',
  UPDATED_STUDENTS: 'imbs_updated_students',

  DELETED_VIOLATIONS: 'imbs_deleted_violation_ids',
  CREATED_VIOLATIONS: 'imbs_created_violations',

  DELETED_RECORDS: 'imbs_deleted_record_ids',
  CANCELLED_RECORDS: 'imbs_cancelled_records',
  CREATED_RECORDS: 'imbs_created_records',

  DELETED_POS_RECORDS: 'imbs_deleted_pos_record_ids',
  CANCELLED_POS_RECORDS: 'imbs_cancelled_pos_records',
  CREATED_POS_RECORDS: 'imbs_created_pos_records',

  DELETED_USERS: 'imbs_deleted_user_ids',
  CREATED_USERS: 'imbs_created_users',
  UPDATED_USERS: 'imbs_updated_users',

  DELETED_HALAQAHS: 'imbs_deleted_halaqah_ids',
  CREATED_HALAQAHS: 'imbs_created_halaqahs',
  UPDATED_HALAQAHS: 'imbs_updated_halaqahs',

  DELETED_TEACHERS: 'imbs_deleted_teacher_ids',
  CREATED_TEACHERS: 'imbs_created_teachers',
  UPDATED_TEACHERS: 'imbs_updated_teachers',
};


function safeGetItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Failed to parse localStorage key ${key}:`, e);
    return fallback;
  }
}

function safeSetItem(key: string, value: any) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to write localStorage key ${key}:`, e);
  }
}

export const storageSync = {
  notifyDataChange(detail?: { action: string; resource: string; id?: string }) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:data-changed', { detail }));
    }
  },

  // === STUDENTS ===
  getDeletedStudentIds(): Set<string> {
    const arr = safeGetItem<string[]>(KEYS.DELETED_STUDENTS, []);
    return new Set(arr);
  },

  addDeletedStudentId(id: string) {
    const set = this.getDeletedStudentIds();
    set.add(id);
    safeSetItem(KEYS.DELETED_STUDENTS, Array.from(set));

    // Remove from created list if it was locally created
    const created = this.getCreatedStudents().filter((s) => s.id !== id);
    safeSetItem(KEYS.CREATED_STUDENTS, created);

    // Cascade clean locally created records for this student
    const createdRecs = this.getCreatedRecords().filter((r) => r.student_id !== id);
    safeSetItem(KEYS.CREATED_RECORDS, createdRecs);

    const createdPosRecs = this.getCreatedPosRecords().filter((r) => r.student_id !== id);
    safeSetItem(KEYS.CREATED_POS_RECORDS, createdPosRecs);

    this.notifyDataChange({ action: 'delete', resource: 'student', id });
  },

  getCreatedStudents(): Student[] {
    return safeGetItem<Student[]>(KEYS.CREATED_STUDENTS, []);
  },

  saveCreatedStudent(student: Student) {
    const list = this.getCreatedStudents().filter((s) => s.id !== student.id);
    list.unshift(student);
    safeSetItem(KEYS.CREATED_STUDENTS, list);

    // If it was marked deleted previously, unmark
    const delSet = this.getDeletedStudentIds();
    if (delSet.has(student.id)) {
      delSet.delete(student.id);
      safeSetItem(KEYS.DELETED_STUDENTS, Array.from(delSet));
    }

    this.notifyDataChange({ action: 'create', resource: 'student', id: student.id });
  },

  saveCreatedStudentsBulk(students: Student[]) {
    const existing = this.getCreatedStudents();
    const existingIds = new Set(existing.map((s) => s.id));
    const toAdd = students.filter((s) => !existingIds.has(s.id));
    safeSetItem(KEYS.CREATED_STUDENTS, [...toAdd, ...existing]);
    this.notifyDataChange({ action: 'bulk_create', resource: 'student' });
  },

  getUpdatedStudents(): Record<string, Partial<Student>> {
    return safeGetItem<Record<string, Partial<Student>>>(KEYS.UPDATED_STUDENTS, {});
  },

  saveUpdatedStudent(id: string, updates: Partial<Student>) {
    const map = this.getUpdatedStudents();
    map[id] = { ...(map[id] || {}), ...updates };
    safeSetItem(KEYS.UPDATED_STUDENTS, map);
    this.notifyDataChange({ action: 'update', resource: 'student', id });
  },

  // === VIOLATION RECORDS ===
  getDeletedRecordIds(): Set<string> {
    const arr = safeGetItem<string[]>(KEYS.DELETED_RECORDS, []);
    return new Set(arr);
  },

  addDeletedRecordId(id: string) {
    const set = this.getDeletedRecordIds();
    set.add(id);
    safeSetItem(KEYS.DELETED_RECORDS, Array.from(set));

    const created = this.getCreatedRecords().filter((r) => r.id !== id);
    safeSetItem(KEYS.CREATED_RECORDS, created);
    this.notifyDataChange({ action: 'delete', resource: 'record', id });
  },

  getCancelledRecords(): Record<string, string> {
    return safeGetItem<Record<string, string>>(KEYS.CANCELLED_RECORDS, {});
  },

  addCancelledRecord(id: string, reason: string) {
    const map = this.getCancelledRecords();
    map[id] = reason;
    safeSetItem(KEYS.CANCELLED_RECORDS, map);
    this.notifyDataChange({ action: 'cancel', resource: 'record', id });
  },

  getCreatedRecords(): ViolationRecord[] {
    return safeGetItem<ViolationRecord[]>(KEYS.CREATED_RECORDS, []);
  },

  saveCreatedRecord(record: ViolationRecord) {
    const list = this.getCreatedRecords().filter((r) => r.id !== record.id);
    list.unshift(record);
    safeSetItem(KEYS.CREATED_RECORDS, list);

    const delSet = this.getDeletedRecordIds();
    if (delSet.has(record.id)) {
      delSet.delete(record.id);
      safeSetItem(KEYS.DELETED_RECORDS, Array.from(delSet));
    }
    this.notifyDataChange({ action: 'create', resource: 'record', id: record.id });
  },

  // === POSITIVE RECORDS ===
  getDeletedPosRecordIds(): Set<string> {
    const arr = safeGetItem<string[]>(KEYS.DELETED_POS_RECORDS, []);
    return new Set(arr);
  },

  addDeletedPosRecordId(id: string) {
    const set = this.getDeletedPosRecordIds();
    set.add(id);
    safeSetItem(KEYS.DELETED_POS_RECORDS, Array.from(set));

    const created = this.getCreatedPosRecords().filter((r) => r.id !== id);
    safeSetItem(KEYS.CREATED_POS_RECORDS, created);
    this.notifyDataChange({ action: 'delete', resource: 'positive_record', id });
  },

  getCancelledPosRecords(): Record<string, string> {
    return safeGetItem<Record<string, string>>(KEYS.CANCELLED_POS_RECORDS, {});
  },

  addCancelledPosRecord(id: string, reason: string) {
    const map = this.getCancelledPosRecords();
    map[id] = reason;
    safeSetItem(KEYS.CANCELLED_POS_RECORDS, map);
    this.notifyDataChange({ action: 'cancel', resource: 'positive_record', id });
  },

  getCreatedPosRecords(): PositiveRecord[] {
    return safeGetItem<PositiveRecord[]>(KEYS.CREATED_POS_RECORDS, []);
  },

  saveCreatedPosRecord(record: PositiveRecord) {
    const list = this.getCreatedPosRecords().filter((r) => r.id !== record.id);
    list.unshift(record);
    safeSetItem(KEYS.CREATED_POS_RECORDS, list);

    const delSet = this.getDeletedPosRecordIds();
    if (delSet.has(record.id)) {
      delSet.delete(record.id);
      safeSetItem(KEYS.DELETED_POS_RECORDS, Array.from(delSet));
    }
    this.notifyDataChange({ action: 'create', resource: 'positive_record', id: record.id });
  },

  // === MASTER VIOLATIONS ===
  getDeletedViolationIds(): Set<string> {
    const arr = safeGetItem<string[]>(KEYS.DELETED_VIOLATIONS, []);
    return new Set(arr);
  },

  addDeletedViolationId(id: string) {
    const set = this.getDeletedViolationIds();
    set.add(id);
    safeSetItem(KEYS.DELETED_VIOLATIONS, Array.from(set));
    this.notifyDataChange({ action: 'delete', resource: 'violation', id });
  },

  // === USERS ===
  getDeletedUserIds(): Set<string> {
    const arr = safeGetItem<string[]>(KEYS.DELETED_USERS, []);
    return new Set(arr);
  },

  addDeletedUserId(id: string) {
    const set = this.getDeletedUserIds();
    set.add(id);
    safeSetItem(KEYS.DELETED_USERS, Array.from(set));

    // Remove from created list if locally created
    const created = this.getCreatedUsers().filter((u) => u.id !== id);
    safeSetItem(KEYS.CREATED_USERS, created);

    // Remove from updated list
    const updated = this.getUpdatedUsers();
    delete updated[id];
    safeSetItem(KEYS.UPDATED_USERS, updated);

    this.notifyDataChange({ action: 'delete', resource: 'user', id });
  },

  getCreatedUsers(): User[] {
    return safeGetItem<User[]>(KEYS.CREATED_USERS, []);
  },

  saveCreatedUser(user: User) {
    const list = this.getCreatedUsers().filter((u) => u.id !== user.id);
    list.unshift(user);
    safeSetItem(KEYS.CREATED_USERS, list);

    const delSet = this.getDeletedUserIds();
    if (delSet.has(user.id)) {
      delSet.delete(user.id);
      safeSetItem(KEYS.DELETED_USERS, Array.from(delSet));
    }
    this.notifyDataChange({ action: 'create', resource: 'user', id: user.id });
  },

  getUpdatedUsers(): Record<string, Partial<User>> {
    return safeGetItem<Record<string, Partial<User>>>(KEYS.UPDATED_USERS, {});
  },

  saveUpdatedUser(id: string, updates: Partial<User>) {
    const map = this.getUpdatedUsers();
    map[id] = { ...(map[id] || {}), ...updates };
    safeSetItem(KEYS.UPDATED_USERS, map);

    // Also update in created users if present
    const created = this.getCreatedUsers().map((u) => (u.id === id ? { ...u, ...updates } : u));
    safeSetItem(KEYS.CREATED_USERS, created);

    this.notifyDataChange({ action: 'update', resource: 'user', id });
  },

  // === HALAQAHS ===
  getDeletedHalaqahIds(): Set<string> {
    const arr = safeGetItem<string[]>(KEYS.DELETED_HALAQAHS, []);
    return new Set(arr);
  },

  addDeletedHalaqahId(id: string) {
    const set = this.getDeletedHalaqahIds();
    set.add(id);
    safeSetItem(KEYS.DELETED_HALAQAHS, Array.from(set));

    const created = this.getCreatedHalaqahs().filter((h) => h.id !== id);
    safeSetItem(KEYS.CREATED_HALAQAHS, created);

    const updated = this.getUpdatedHalaqahs();
    delete updated[id];
    safeSetItem(KEYS.UPDATED_HALAQAHS, updated);

    this.notifyDataChange({ action: 'delete', resource: 'halaqah', id });
  },

  getCreatedHalaqahs(): Halaqah[] {
    return safeGetItem<Halaqah[]>(KEYS.CREATED_HALAQAHS, []);
  },

  saveCreatedHalaqah(halaqah: Halaqah) {
    const list = this.getCreatedHalaqahs().filter((h) => h.id !== halaqah.id);
    list.unshift(halaqah);
    safeSetItem(KEYS.CREATED_HALAQAHS, list);

    const delSet = this.getDeletedHalaqahIds();
    if (delSet.has(halaqah.id)) {
      delSet.delete(halaqah.id);
      safeSetItem(KEYS.DELETED_HALAQAHS, Array.from(delSet));
    }
    this.notifyDataChange({ action: 'create', resource: 'halaqah', id: halaqah.id });
  },

  getUpdatedHalaqahs(): Record<string, Partial<Halaqah>> {
    return safeGetItem<Record<string, Partial<Halaqah>>>(KEYS.UPDATED_HALAQAHS, {});
  },

  saveUpdatedHalaqah(id: string, updates: Partial<Halaqah>) {
    const map = this.getUpdatedHalaqahs();
    map[id] = { ...(map[id] || {}), ...updates };
    safeSetItem(KEYS.UPDATED_HALAQAHS, map);

    const created = this.getCreatedHalaqahs().map((h) => (h.id === id ? { ...h, ...updates } : h));
    safeSetItem(KEYS.CREATED_HALAQAHS, created);

    this.notifyDataChange({ action: 'update', resource: 'halaqah', id });
  },

  // === TEACHERS ===
  getDeletedTeacherIds(): Set<string> {
    const arr = safeGetItem<string[]>(KEYS.DELETED_TEACHERS, []);
    return new Set(arr);
  },

  addDeletedTeacherId(id: string) {
    const set = this.getDeletedTeacherIds();
    set.add(id);
    safeSetItem(KEYS.DELETED_TEACHERS, Array.from(set));

    const created = this.getCreatedTeachers().filter((t) => t.id !== id);
    safeSetItem(KEYS.CREATED_TEACHERS, created);

    const updated = this.getUpdatedTeachers();
    delete updated[id];
    safeSetItem(KEYS.UPDATED_TEACHERS, updated);

    this.notifyDataChange({ action: 'delete', resource: 'teacher', id });
  },

  getCreatedTeachers(): Teacher[] {
    return safeGetItem<Teacher[]>(KEYS.CREATED_TEACHERS, []);
  },

  saveCreatedTeacher(teacher: Teacher) {
    const list = this.getCreatedTeachers().filter((t) => t.id !== teacher.id);
    list.unshift(teacher);
    safeSetItem(KEYS.CREATED_TEACHERS, list);

    const delSet = this.getDeletedTeacherIds();
    if (delSet.has(teacher.id)) {
      delSet.delete(teacher.id);
      safeSetItem(KEYS.DELETED_TEACHERS, Array.from(delSet));
    }
    this.notifyDataChange({ action: 'create', resource: 'teacher', id: teacher.id });
  },

  getUpdatedTeachers(): Record<string, Partial<Teacher>> {
    return safeGetItem<Record<string, Partial<Teacher>>>(KEYS.UPDATED_TEACHERS, {});
  },

  saveUpdatedTeacher(id: string, updates: Partial<Teacher>) {
    const map = this.getUpdatedTeachers();
    map[id] = { ...(map[id] || {}), ...updates };
    safeSetItem(KEYS.UPDATED_TEACHERS, map);

    const created = this.getCreatedTeachers().map((t) => (t.id === id ? { ...t, ...updates } : t));
    safeSetItem(KEYS.CREATED_TEACHERS, created);

    this.notifyDataChange({ action: 'update', resource: 'teacher', id });
  },

  // === RESET TO FACTORY DEMO ===
  resetToDemo() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
    this.notifyDataChange({ action: 'reset', resource: 'all' });
  },

  // === RECONCILE: Keep deletions permanently to protect against Vercel cold-boot re-seeding ===
  reconcileDeletedStudentIds(_serverStudentIds: string[]) {
    // Intentionally retained: do not auto-delete from localStorage so Vercel lambda cold restarts
    // cannot resurrect deleted students.
  },
};
