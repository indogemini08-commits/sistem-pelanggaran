import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  Search,
  Filter,
  Download,
  Ban,
  CheckCircle2,
  Calendar,
  Layers,
  X,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Building2,
  Sparkles,
  MinusCircle,
  User,
  Trash2,
} from 'lucide-react';
import { PositiveRecord, SchoolSettings, User as UserType, ViolationDivision } from '../types';
import { api } from '../services/api';
import { storageSync } from '../services/storageSync';
import { exportToExcel } from '../utils/excelHelper';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface PositiveRecordsPageProps {
  currentUser: UserType | null;
  settings: SchoolSettings | null;
  onSelectStudent?: (studentId: string) => void;
  initialDivision?: 'tahfizh' | 'kesantrian' | 'all';
  onOpenQuickReward?: () => void;
}

export const PositiveRecordsPage: React.FC<PositiveRecordsPageProps> = ({
  currentUser,
  settings,
  onSelectStudent,
  initialDivision = 'all',
  onOpenQuickReward,
}) => {
  const [records, setRecords] = useState<PositiveRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [filterDivision, setFilterDivision] = useState<'tahfizh' | 'kesantrian' | 'all'>(initialDivision);
  const [search, setSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Cancel Record Dialog
  const [recordToCancel, setRecordToCancel] = useState<PositiveRecord | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string>('');

  // Delete Permanent Dialog (Admin only)
  const [recordToDelete, setRecordToDelete] = useState<PositiveRecord | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Bulk Delete State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState<boolean>(false);

  useEffect(() => {
    setFilterDivision(initialDivision);
  }, [initialDivision]);

  useEffect(() => {
    loadRecords();

    const handleDataChanged = (e: any) => {
      if (!e?.detail?.resource || e?.detail?.resource === 'positive_record' || e?.detail?.resource === 'student' || e?.detail?.resource === 'all') {
        loadRecords();
      }
    };

    window.addEventListener('app:data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChanged);
    };
  }, [filterDivision]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterDivision !== 'all') {
        params.division = filterDivision;
      }
      const data = await api.positiveRecords.list(params);
      setRecords(data);
    } catch (err: any) {
      console.error('Gagal memuat catatan kebaikan:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered list
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Division filter
      if (filterDivision !== 'all' && r.division !== filterDivision) return false;

      // Status filter
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;

      // Date range filter
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const studentName = (r.student_name || '').toLowerCase();
        const actionName = (r.action_name_snapshot || '').toLowerCase();
        const nis = (r.student_nis || '').toLowerCase();
        const notes = (r.notes || '').toLowerCase();
        const teacher = (r.teacher_name_snapshot || '').toLowerCase();

        return (
          studentName.includes(q) ||
          actionName.includes(q) ||
          nis.includes(q) ||
          notes.includes(q) ||
          teacher.includes(q)
        );
      }

      return true;
    });
  }, [records, filterDivision, filterStatus, startDate, endDate, search]);

  // Statistics
  const activeRecords = useMemo(() => filteredRecords.filter((r) => r.status === 'active'), [filteredRecords]);
  const totalPointsDeducted = useMemo(
    () => activeRecords.reduce((sum, r) => sum + Number(r.points_deducted || 0), 0),
    [activeRecords]
  );
  const uniqueStudentsCount = useMemo(
    () => new Set(activeRecords.map((r) => r.student_id)).size,
    [activeRecords]
  );

  // Handle Cancel
  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordToCancel) return;
    const targetId = recordToCancel.id;
    if (!cancelReason.trim()) {
      setCancelError('Alasan pembatalan wajib diisi');
      return;
    }

    setCancelling(true);
    setCancelError('');
    try {
      await api.positiveRecords.cancel(targetId, cancelReason.trim(), currentUser?.name || 'Admin');
      setRecords((prev) =>
        prev.map((r) => (r.id === targetId ? { ...r, status: 'cancelled' as const, cancellation_reason: cancelReason.trim() } : r))
      );
      setRecordToCancel(null);
      setCancelReason('');
      storageSync.notifyDataChange({ action: 'cancel', resource: 'positive_record', id: targetId });
      await loadRecords();
    } catch (err: any) {
      setCancelError(err.message || 'Gagal membatalkan catatan');
    } finally {
      setCancelling(false);
    }
  };

  // Handle Hard Delete
  const handleDelete = async () => {
    if (!recordToDelete) return;
    const targetId = recordToDelete.id;
    setDeleting(true);
    try {
      await api.positiveRecords.delete(targetId, currentUser?.name || 'Admin');
      setRecords((prev) => prev.filter((r) => r.id !== targetId));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(targetId); return n; });
      setRecordToDelete(null);
      storageSync.notifyDataChange({ action: 'delete', resource: 'positive_record', id: targetId });
      await loadRecords();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Toggle selection for bulk delete
  const toggleSelectPosRecord = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk delete positive records
  const handleBulkDeletePosRecords = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await api.positiveRecords.bulkDelete(ids, currentUser?.name || 'Admin');
      setRecords((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setShowBulkConfirm(false);
      storageSync.notifyDataChange({ action: 'delete', resource: 'positive_record', id: ids[0] });
      await loadRecords();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredRecords.map((r, idx) => ({
      No: idx + 1,
      Tanggal: r.date,
      Waktu: r.time,
      NIS: r.student_nis || '-',
      'Nama Santri': r.student_name || '-',
      Kelas: r.student_class_snapshot || '-',
      Divisi: r.division === 'tahfizh' ? 'Tahfizh (Halaqah)' : 'Kesantrian (Asrama)',
      'Kegiatan / Prestasi': r.action_name_snapshot,
      'Poin Pengurang': r.points_deducted,
      Pembimbing: r.teacher_name_snapshot || '-',
      Catatan: r.notes || '-',
      Status: r.status === 'active' ? 'Aktif' : 'Dibatalkan',
      'Dicatat Oleh': r.created_by,
    }));

    exportToExcel(rows, `Rekap_Kebaikan_Santri_${filterDivision}_${new Date().toISOString().split('T')[0]}`);
  };

  const resetFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-scale-in">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
              <Award className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {filterDivision === 'tahfizh'
                ? 'Kebaikan & Prestasi Tahfizh'
                : filterDivision === 'kesantrian'
                ? 'Kebaikan & Prestasi Kesantrian'
                : 'Rekap Kebaikan & Prestasi Santri'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitoring kegiatan positif, prestasi, dan pemulihan poin pelanggaran santri
          </p>
        </div>

        {/* Action Buttons: Stack vertically on mobile, full width */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          {/* Bulk Delete button */}
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm sm:text-xs font-bold rounded-xl shadow-sm transition-all w-full sm:w-auto min-h-[44px] sm:min-h-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus {selectedIds.size} Catatan</span>
            </button>
          )}
          {onOpenQuickReward && (
            <button
              onClick={onOpenQuickReward}
              className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm sm:text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 w-full sm:w-auto min-h-[44px] sm:min-h-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>+ Catat Kebaikan</span>
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-3.5 py-3 sm:py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm sm:text-xs font-bold rounded-xl shadow-xs transition-colors w-full sm:w-auto min-h-[44px] sm:min-h-0"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Data Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Compact padding on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Total Kegiatan Baik</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">{activeRecords.length}</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Amal shalih terverifikasi</p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shrink-0">
            <MinusCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Poin Pelanggaran Dipotong</p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-600">-{totalPointsDeducted} Poin</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Total pemulihan santri</p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <User className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Santri Penerima Reward</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">{uniqueStudentsCount} Santri</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Termotivasi berbuat baik</p>
          </div>
        </div>
      </div>

      {/* Filter Bar: Compact, Stacked, Thumb-Friendly */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-5 space-y-3 sm:space-y-4">
        {/* Division Selector & Reset Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
          <div className="grid grid-cols-3 sm:flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold w-full sm:w-auto gap-1">
            <button
              onClick={() => setFilterDivision('all')}
              className={`py-2 px-2 sm:px-3.5 sm:py-1.5 rounded-lg text-center transition-all ${
                filterDivision === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterDivision('tahfizh')}
              className={`py-2 px-2 sm:px-3.5 sm:py-1.5 rounded-lg flex items-center justify-center gap-1 text-center transition-all ${
                filterDivision === 'tahfizh'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Tahfizh</span>
            </button>
            <button
              onClick={() => setFilterDivision('kesantrian')}
              className={`py-2 px-2 sm:px-3.5 sm:py-1.5 rounded-lg flex items-center justify-center gap-1 text-center transition-all ${
                filterDivision === 'kesantrian'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Kesantrian</span>
            </button>
          </div>

          {(search || filterStatus !== 'all' || startDate || endDate) && (
            <button
              onClick={resetFilters}
              className="text-xs text-rose-600 sm:text-slate-500 hover:text-rose-700 flex items-center justify-center sm:justify-start gap-1 font-bold py-1.5 min-h-[36px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        {/* Search & Select Filters: Vertically stacked on mobile */}
        <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari santri, kegiatan, NIS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[44px] bg-white"
            />
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white min-h-[44px]"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif (Mengurangi Poin)</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>

          <div className="grid grid-cols-2 sm:contents gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 sm:hidden">Dari Tgl:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white min-h-[44px]"
                title="Dari Tanggal"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 sm:hidden">Sampai Tgl:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white min-h-[44px]"
                title="Sampai Tanggal"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Records Container: Responsive Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Memuat riwayat kebaikan santri...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Belum ada riwayat kegiatan baik yang cocok dengan filter
          </div>
        ) : (
          <>
            {/* VIEW 1: Mobile Card List (Stack vertically, large touch targets, single-hand friendly) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredRecords.map((r) => {
                const isCancelled = r.status === 'cancelled';
                return (
                  <div
                    key={r.id}
                    className={`p-3.5 space-y-2.5 transition-colors ${
                      isCancelled ? 'opacity-60 bg-slate-50/40' : selectedIds.has(r.id) ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Header Row: Student name, division badge, and status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelectPosRecord(r.id)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0 mt-1"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onSelectStudent && onSelectStudent(r.student_id)}
                            className="font-bold text-slate-900 text-sm text-left hover:text-emerald-700 transition-colors truncate block"
                          >
                            {r.student_name || 'Santri'}
                          </button>
                          <p className="text-xs text-slate-400 mt-0.5">
                            NIS: {r.student_nis || '-'} • Kls {r.student_class_snapshot}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            r.division === 'tahfizh'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          {r.division === 'tahfizh' ? 'Tahfizh' : 'Kesantrian'}
                        </span>
                        {isCancelled ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Dibatalkan
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Aktif
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Name & Deduction Badge */}
                    <div className="flex items-start justify-between gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 leading-snug">
                          {r.action_name_snapshot}
                        </p>
                        {r.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-2">
                            "{r.notes}"
                          </p>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                        <MinusCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>-{r.points_deducted} Poin</span>
                      </span>
                    </div>

                    {/* Metadata & Actions: Full width buttons on mobile */}
                    <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                      <div>
                        <span>{r.date} • {r.time} WIB</span>
                        <p className="text-slate-400 truncate max-w-[180px]">{r.teacher_name_snapshot}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isCancelled && (
                          <button
                            type="button"
                            onClick={() => setRecordToCancel(r)}
                            className="px-3 py-1.5 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition-colors min-h-[36px] flex items-center gap-1"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Batalkan</span>
                          </button>
                        )}
                        {currentUser?.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setRecordToDelete(r)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="Hapus"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VIEW 2: Desktop Table (screens >= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 text-center w-12">
                      <input
                        type="checkbox"
                        checked={filteredRecords.length > 0 && filteredRecords.every((r) => selectedIds.has(r.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        title="Pilih semua"
                      />
                    </th>
                    <th className="px-4 py-3.5">Tanggal & Waktu</th>
                    <th className="px-4 py-3.5">Santri</th>
                    <th className="px-4 py-3.5">Divisi</th>
                    <th className="px-4 py-3.5">Kegiatan Baik / Prestasi</th>
                    <th className="px-4 py-3.5 text-center">Pengurangan Poin</th>
                    <th className="px-4 py-3.5">Pembimbing</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((r) => {
                    const isCancelled = r.status === 'cancelled';
                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isCancelled ? 'opacity-60 bg-slate-50/40' : selectedIds.has(r.id) ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleSelectPosRecord(r.id)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                          <div className="font-semibold text-slate-800">{r.date}</div>
                          <div className="text-[11px] text-slate-400">{r.time} WIB</div>
                        </td>

                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => onSelectStudent && onSelectStudent(r.student_id)}
                            className="text-left group cursor-pointer"
                          >
                            <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {r.student_name || 'Santri'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              NIS: {r.student_nis || '-'} • Kls {r.student_class_snapshot}
                            </div>
                          </button>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                              r.division === 'tahfizh'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            {r.division === 'tahfizh' ? (
                              <>
                                <BookOpen className="w-3 h-3" />
                                <span>Tahfizh</span>
                              </>
                            ) : (
                              <>
                                <Building2 className="w-3 h-3" />
                                <span>Kesantrian</span>
                              </>
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{r.action_name_snapshot}</div>
                          {r.notes && (
                            <div className="text-[11px] text-slate-500 italic line-clamp-1 mt-0.5">
                              "{r.notes}"
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                            <MinusCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>-{r.points_deducted} Poin</span>
                          </span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                          <div className="font-semibold text-slate-800">{r.teacher_name_snapshot}</div>
                          <div className="text-[11px] text-slate-400">{r.halaqah_name_snapshot || 'Pesantren'}</div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {isCancelled ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              <Ban className="w-3 h-3" />
                              <span>Dibatalkan</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Aktif</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {!isCancelled && (
                            <button
                              onClick={() => setRecordToCancel(r)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Batalkan Catatan Kebaikan"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          {currentUser?.role === 'admin' && (
                            <button
                              onClick={() => setRecordToDelete(r)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
                              title="Hapus Permanen"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Cancel Record Modal: Mobile-friendly full width buttons and tight padding */}
      {recordToCancel &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6 space-y-3 sm:space-y-4 border border-slate-200 my-auto">
              <div className="flex items-center gap-3 text-amber-600">
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 shrink-0">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Batalkan Catatan Kebaikan?</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Poin pengurangan akan ditarik kembali</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                Catatan <span className="font-bold text-slate-800">{recordToCancel.action_name_snapshot}</span> untuk santri{' '}
                <span className="font-bold text-slate-800">{recordToCancel.student_name}</span> akan dibatalkan.
              </p>

              {cancelError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {cancelError}
                </div>
              )}

              <form onSubmit={handleCancel} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alasan Pembatalan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Contoh: Salah input nama santri..."
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white min-h-[44px]"
                    required
                  />
                </div>

                {/* Stacked or side-by-side thumb-friendly buttons */}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRecordToCancel(null);
                      setCancelReason('');
                      setCancelError('');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px] justify-center flex items-center"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={cancelling}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-50 min-h-[44px] justify-center flex items-center"
                  >
                    {cancelling ? 'Memproses...' : 'Ya, Batalkan Catatan'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Permanent Dialog */}
      <ConfirmDialog
        isOpen={Boolean(recordToDelete)}
        title="Hapus Catatan Kebaikan Permanen"
        message={`Apakah Anda yakin ingin menghapus catatan kebaikan "${recordToDelete?.action_name_snapshot}" santri ${recordToDelete?.student_name} secara permanen? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Permanen"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setRecordToDelete(null)}
      />

      {/* Bulk Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={showBulkConfirm}
        title="Hapus Massal Catatan Kebaikan"
        message={`Apakah Anda yakin ingin menghapus ${selectedIds.size} catatan kebaikan yang dipilih secara permanen dari database? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel={isBulkDeleting ? 'Menghapus...' : `Hapus ${selectedIds.size} Catatan`}
        isDestructive={true}
        isLoading={isBulkDeleting}
        onConfirm={handleBulkDeletePosRecords}
        onCancel={() => setShowBulkConfirm(false)}
      />
    </div>
  );
};
