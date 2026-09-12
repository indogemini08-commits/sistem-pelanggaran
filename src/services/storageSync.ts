// Client-Side Event Synchronization & Data Broadcast Manager
// Ensures 100% synchronization with the backend database without ghost client suppression.

const STALE_SUPPRESSION_KEYS = [
  'imbs_deleted_student_ids',
  'imbs_deleted_record_ids',
  'imbs_deleted_pos_record_ids',
  'imbs_cancelled_records',
  'imbs_cancelled_pos_records',
  'sistem_pelanggaran_deleted_student_ids',
  'sistem_pelanggaran_deleted_record_ids',
  'sistem_pelanggaran_deleted_pos_record_ids',
];

// Auto-sanitize on load: ensure no stale local ghost suppression hides active database records
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    STALE_SUPPRESSION_KEYS.forEach((k) => window.localStorage.removeItem(k));
  } catch (e) {
    // Ignore localStorage access restrictions
  }
}

export const storageSync = {
  // Global event broadcast for real-time reactivity across all modules
  notifyDataChange(detail?: { action: string; resource: string; id?: string }) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:data-changed', { detail }));
    }
  },

  // Backward compatibility stubs that safely return empty sets/arrays
  getDeletedStudentIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedStudentId(_id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'student', id: _id });
  },

  getDeletedRecordIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedRecordId(_id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'record', id: _id });
  },

  getCancelledRecords(): Record<string, string> {
    return {};
  },
  addCancelledRecord(_id: string, _reason: string) {
    this.notifyDataChange({ action: 'cancel', resource: 'record', id: _id });
  },

  getDeletedPosRecordIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedPosRecordId(_id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'positive_record', id: _id });
  },

  getCancelledPosRecords(): Record<string, string> {
    return {};
  },
  addCancelledPosRecord(_id: string, _reason: string) {
    this.notifyDataChange({ action: 'cancel', resource: 'positive_record', id: _id });
  },

  getCreatedStudents(): any[] {
    return [];
  },
  saveCreatedStudent(_student: any) {
    this.notifyDataChange({ action: 'create', resource: 'student' });
  },
  saveCreatedStudentsBulk(_students: any[]) {
    this.notifyDataChange({ action: 'bulk_create', resource: 'student' });
  },
  getUpdatedStudents(): Record<string, any> {
    return {};
  },
  saveUpdatedStudent(_id: string, _updates: any) {
    this.notifyDataChange({ action: 'update', resource: 'student', id: _id });
  },

  getCreatedRecords(): any[] {
    return [];
  },
  saveCreatedRecord(_record: any) {
    this.notifyDataChange({ action: 'create', resource: 'record' });
  },

  getCreatedPosRecords(): any[] {
    return [];
  },
  saveCreatedPosRecord(_record: any) {
    this.notifyDataChange({ action: 'create', resource: 'positive_record' });
  },

  resetToDemo() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.clear();
    } catch (e) {}
    this.notifyDataChange({ action: 'reset', resource: 'all' });
  },
};
