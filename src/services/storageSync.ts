// Client-Side Persistent Storage & Synchronization Manager
// Solves Vercel Serverless ephemeral statelessness so deleted/created data persists across page reloads.

import { Student, ViolationRecord, PositiveRecord } from '../types';

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
