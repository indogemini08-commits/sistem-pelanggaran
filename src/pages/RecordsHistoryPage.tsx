import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  History,
  Search,
  Filter,
  Download,
  FileText,
  Trash2,
  Ban,
  CheckCircle2,
  Calendar,
  Layers,
  X,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  BookOpen,
  Building2,
  UserCheck,
} from 'lucide-react';
import { ViolationRecord, Halaqah, Teacher, SchoolSettings, User, ViolationDivision } from '../types';
import { api } from '../services/api';
import { storageSync } from '../services/storageSync';
import { exportToExcel } from '../utils/excelHelper';
import { generateViolationReportPDF } from '../utils/pdfGenerator';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface RecordsHistoryPageProps {
  currentUser: User | null;
  settings: SchoolSettings | null;
  onSelectStudent?: (studentId: string) => void;
  initialDivision?: 'tahfizh' | 'kesantrian' | 'all';
}

export const RecordsHistoryPage: React.FC<RecordsHistoryPageProps> = ({
  currentUser,
  settings,
  onSelectStudent,
  initialDivision = 'all',
}) => {
  const [records, setRecords] = useState<ViolationRecord[]>([]);
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [filterDivision, setFilterDivision] = useState<'tahfizh' | 'kesantrian' | 'all'>(initialDivision);
  const [search, setSearch] = useState<string>('');
  const [filterHalaqah, setFilterHalaqah] = useState<string>('all');
  const [filterTeacher, setFilterTeacher] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Cancel Record Dialog
  const [recordToCancel, setRecordToCancel] = useState<ViolationRecord | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string>('');

  // Hard Delete Dialog
  const [recordToDelete, setRecordToDelete] = useState<ViolationRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  const canDelete =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'coordinator' ||
    currentUser?.role === 'kepala_kesantrian';

  useEffect(() => {
    setFilterDivision(initialDivision);
  }, [initialDivision]);

  useEffect(() => {
    loadRecordsAndOptions();

    const handleDataChanged = (e: any) => {
      if (!e?.detail?.resource || e?.detail?.resource === 'record' || e?.detail?.resource === 'student' || e?.detail?.resource === 'all') {
        loadRecordsAndOptions();
      }
    };

    window.addEventListener('app:data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChanged);
    };
  }, [filterDivision]);

  const loadRecordsAndOptions = async () => {
    setLoading(true);
    try {
      const [recList, hList, tList] = await Promise.all([
        api.records.list(),
        api.halaqah.list(),
        api.teachers.list(),
      ]);

      // If teacher or guru role, filter Tahfizh records to their halaqah
      let filteredByRole = recList;
      if (currentUser?.role === 'teacher' || currentUser?.role === 'guru') {
        const myHalaqahIds = new Set(
          hList.filter((h) => h.teacher_id === currentUser.teacherId).map((h) => h.id)
        );
        filteredByRole = recList.filter(
          (r) =>
            r.division === 'kesantrian' || // Allow seeing kesantrian records if needed
            (r.halaqah_id && myHalaqahIds.has(r.halaqah_id)) ||
            r.teacher_name_snapshot?.includes(currentUser.name)
        );
      }

      setRecords(filteredByRole);
      setHalaqahs(hList);
      setTeachers(tList);
    } catch (err: any) {
      console.error('Error loading records:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cancel / Soft Delete Record
  const handleCancelRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordToCancel) return;
    const targetId = recordToCancel.id;
    setCancelError('');

    setCancelling(true);
    try {
      await api.records.cancel(targetId, cancelReason, currentUser?.name || 'Admin');
      setRecords((prev) =>
        prev.map((r) => (r.id === targetId ? { ...r, status: 'cancelled' as const, cancellation_reason: cancelReason } : r))
      );
      setRecordToCancel(null);
      setCancelReason('');
      storageSync.notifyDataChange({ action: 'cancel', resource: 'record', id: targetId });
      await loadRecordsAndOptions();
    } catch (err: any) {
      setCancelError(err.message || 'Gagal membatalkan catatan');
    } finally {
      setCancelling(false);
    }
  };

  // Hard Delete Record
  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    const targetId = recordToDelete.id;
    setDeleteError('');
    setIsDeleting(true);
    try {
      await api.records.delete(targetId, currentUser?.name || 'Admin');
      setRecords((prev) => prev.filter((r) => r.id !== targetId));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(targetId); return n; });
      setRecordToDelete(null);
      storageSync.notifyDataChange({ action: 'delete', resource: 'record', id: targetId });
      await loadRecordsAndOptions();
    } catch (err: any) {
      console.error('Error deleting record:', err);
      setDeleteError(err.message || 'Gagal menghapus data secara permanen');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete records
  const handleBulkDeleteRecords = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await api.records.bulkDelete(ids, currentUser?.name || 'Admin');
      setRecords((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setShowBulkConfirm(false);
      storageSync.notifyDataChange({ action: 'delete', resource: 'record', id: ids[0] });
      await loadRecordsAndOptions();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectRecord = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtering Logic
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Division Filter
      if (filterDivision !== 'all') {
        const rDiv = r.division || 'tahfizh';
        if (rDiv !== filterDivision) return false;
      }

      // 2. Status Filter
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;

      // 3. Halaqah Filter (only applies if not kesantrian or if matching)
      if (filterHalaqah !== 'all' && r.halaqah_id !== filterHalaqah) return false;

      // 4. Teacher Filter
      if (filterTeacher !== 'all' && r.teacher_id !== filterTeacher) return false;

      // 5. Category Filter
      if (filterCategory !== 'all') {
        const cat = r.violation_category || '';
        if (cat !== filterCategory && !r.violation_name_snapshot?.includes(filterCategory)) {
          return false;
        }
      }

      // 6. Date Range Filter
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;

      // 7. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const sName = (r.student_name || '').toLowerCase();
        const sNis = (r.student_nis || '').toLowerCase();
        const vName = (r.violation_name_snapshot || '').toLowerCase();
        const notes = (r.notes || '').toLowerCase();
        const hName = (r.halaqah_name_snapshot || '').toLowerCase();
        const tName = (r.teacher_name_snapshot || '').toLowerCase();

        return (
          sName.includes(q) ||
          sNis.includes(q) ||
          vName.includes(q) ||
          notes.includes(q) ||
          hName.includes(q) ||
          tName.includes(q)
        );
      }

      return true;
    });
  }, [records, filterDivision, filterStatus, filterHalaqah, filterTeacher, filterCategory, startDate, endDate, search]);

  const totalPoints = useMemo(() => {
    return filteredRecords
      .filter((r) => r.status === 'active')
      .reduce((sum, r) => sum + (r.points_snapshot || 0), 0);
  }, [filteredRecords]);

  const tahfizhRecords = useMemo(() => {
    return records.filter((r) => (r.division || 'tahfizh') === 'tahfizh');
  }, [records]);

  const kesantrianRecords = useMemo(() => {
    return records.filter((r) => r.division === 'kesantrian');
  }, [records]);

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map((r, idx) => ({
      No: idx + 1,
      Tanggal: r.date,
      Waktu: r.time,
      Divisi: r.division === 'kesantrian' ? 'Kesantrian' : 'Tahfizh',
      NIS: r.student_nis || '-',
      'Nama Santri': r.student_name || '-',
      Kelas: r.student_class_snapshot || '-',
      'Jenis Pelanggaran': r.violation_name_snapshot,
      'Poin Pelanggaran': r.points_snapshot,
      'Lokasi / Halaqah': r.halaqah_name_snapshot || '-',
      'Pembina / Muhafizh': r.teacher_name_snapshot || '-',
      Status: r.status === 'active' ? 'Aktif' : `Dibatalkan (${r.cancellation_reason || '-'})`,
      Keterangan: r.notes || '-',
      'Pencatat Data': r.created_by || '-',
    }));

    const prefix = filterDivision === 'kesantrian' ? 'Kesantrian' : filterDivision === 'tahfizh' ? 'Tahfizh' : 'Semua';
    exportToExcel(dataToExport, `Rekap_Pelanggaran_${prefix}_${new Date().toISOString().split('T')[0]}`);
  };

  // Export to PDF with Kop Surat
  const handleExportPDF = () => {
    if (!settings) {
      alert('Pengaturan sekolah belum dimuat.');
      return;
    }

    generateViolationReportPDF(filteredRecords, settings, {
      period: startDate && endDate ? `${startDate} s/d ${endDate}` : (startDate ? `Sejak ${startDate}` : undefined),
      halaqah:
        filterDivision === 'kesantrian'
          ? 'Bagian Kesantrian (Asrama)'
          : filterDivision === 'tahfizh'
          ? 'Bagian Tahfizh (Halaqah)'
          : 'Terpadu (Tahfizh & Kesantrian)',
    });
  };

  // Title rendering
  const pageTitle =
    filterDivision === 'kesantrian'
      ? 'Monitoring & Pelanggaran Kesantrian'
      : filterDivision === 'tahfizh'
      ? 'Monitoring & Pelanggaran Tahfizh'
      : 'Rekap Terpadu Seluruh Pelanggaran';

  const pageDesc =
    filterDivision === 'kesantrian'
      ? 'Pencatatan kedisiplinan asrama, ibadah shalat berjamaah, dan tata tertib santri.'
      : filterDivision === 'tahfizh'
      ? 'Pencatatan kedisiplinan halaqah Al-Quran, mutabaah, hafalan, dan adab halaqah.'
      : 'Monitoring terpadu mencakup divisi Tahfizh dan Kesantrian dengan akumulasi poin yang sama.';

  return (
    <div className="space-y-4 sm:space-y-6 animate-scale-in">
      {/* Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 sm:w-7 sm:h-7 text-brand-600 shrink-0" />
            <span>{pageTitle}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">{pageDesc}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Bulk Delete button — visible when selections are active */}
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="px-4 py-3 sm:py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm sm:text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus {selectedIds.size} Catatan</span>
            </button>
          )}

          <button
            onClick={handleExportPDF}
            className="px-4 py-3 sm:py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm sm:text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 w-full sm:w-auto"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF (Kop Surat)</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-3 sm:py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm sm:text-xs font-semibold rounded-xl border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 w-full sm:w-auto"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Division Tabs Switcher: Responsive full-width grid on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-900/80 border border-slate-300/60 dark:border-slate-800 text-xs font-bold w-full sm:w-fit gap-1.5 shadow-xs">
        <button
          onClick={() => setFilterDivision('all')}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
            filterDivision === 'all'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md ring-1 ring-slate-300 dark:ring-slate-700'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/40 dark:hover:bg-slate-800/60'
          }`}
        >
          <span>🌐 Rekap Terpadu (Semua)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-200 font-extrabold border border-slate-200 dark:border-slate-600">
            {records.length}
          </span>
        </button>

        <button
          onClick={() => setFilterDivision('tahfizh')}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
            filterDivision === 'tahfizh'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-300/40 dark:hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>🕌 Pelanggaran Tahfizh</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
            filterDivision === 'tahfizh' ? 'bg-white/20 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
          }`}>
            {tahfizhRecords.length}
          </span>
        </button>

        <button
          onClick={() => setFilterDivision('kesantrian')}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
            filterDivision === 'kesantrian'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-300/40 dark:hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>🏢 Pelanggaran Kesantrian</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
            filterDivision === 'kesantrian' ? 'bg-white/20 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
          }`}>
            {kesantrianRecords.length}
          </span>
        </button>
      </div>

      {/* Filter and Date Range Card: Compact padding & stacked layout on mobile */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-soft space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Global Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari santri, NIS, pelanggaran..."
              className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-white min-h-[44px]"
            />
          </div>

          {/* Halaqah Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap sm:w-16">Halaqah:</span>
            <select
              value={filterHalaqah}
              onChange={(e) => setFilterHalaqah(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-white min-h-[44px]"
            >
              <option value="all">Semua Halaqah</option>
              {halaqahs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Dari & Sampai */}
          <div className="grid grid-cols-2 sm:contents gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 whitespace-nowrap sm:w-10">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-white min-h-[44px]"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 whitespace-nowrap sm:w-12">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-white min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Secondary Filter Row: Responsive wrap on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3">
            {/* Status Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-auto text-xs px-2.5 py-2 rounded-lg border border-slate-300 bg-white min-h-[38px]"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>

            {/* Kategori Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Kategori:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full sm:w-auto text-xs px-2.5 py-2 rounded-lg border border-slate-300 bg-white min-h-[38px]"
              >
                <option value="all">Semua Kategori</option>
                <option value="Tahfizh">Tahfizh</option>
                <option value="Ibadah & Shalat">Ibadah & Shalat</option>
                <option value="Ketertiban Asrama">Ketertiban Asrama</option>
                <option value="Kedisiplinan">Kedisiplinan</option>
                <option value="Kehadiran">Kehadiran</option>
                <option value="Adab & Akhlak">Adab & Akhlak</option>
              </select>
            </div>
          </div>

          {/* Summary metric of current filtered records */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs pt-1 sm:pt-0">
            <span className="text-slate-500">
              Kejadian: <strong className="text-slate-900">{filteredRecords.length}</strong>
            </span>
            <span className="px-3 py-1 bg-rose-50 text-rose-700 font-black rounded-xl border border-rose-200">
              Total: {totalPoints} Poin
            </span>
            {(search || filterHalaqah !== 'all' || filterCategory !== 'all' || startDate || endDate || filterDivision !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterDivision('all');
                  setFilterHalaqah('all');
                  setFilterTeacher('all');
                  setFilterCategory('all');
                  setFilterStatus('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-rose-600 hover:text-rose-700 font-bold ml-1 min-h-[36px] flex items-center"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Memuat data riwayat...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Tidak ada catatan pelanggaran yang cocok dengan kriteria filter.
          </div>
        ) : (
          <>
            {/* VIEW 1: Mobile Card List (single hand thumb friendly) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredRecords.map((r) => {
                const isCancelled = r.status === 'cancelled';
                const isKesantrian = r.division === 'kesantrian';

                return (
                  <div
                    key={r.id}
                    className={`p-3.5 space-y-2.5 transition-colors ${
                      isCancelled ? 'bg-slate-50/60 opacity-60' : selectedIds.has(r.id) ? 'bg-rose-50/50' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Top Row: Checkbox, Name, NIS, Division Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelectRecord(r.id)}
                          className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0 mt-1"
                        />
                        <div className="min-w-0">
                          <button
                            onClick={() => onSelectStudent && onSelectStudent(r.student_id)}
                            className="font-bold text-slate-900 text-sm text-left hover:text-brand-600 transition-colors truncate block"
                          >
                            {r.student_name}
                          </button>
                          <p className="text-xs text-slate-400 mt-0.5">
                            NIS: {r.student_nis} • Kelas {r.student_class_snapshot}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                            isKesantrian
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isKesantrian ? 'Kesantrian' : 'Tahfizh'}
                        </span>
                        {isCancelled ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            Dibatalkan
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            Aktif
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Violation Detail & Points Badge */}
                    <div className="flex items-start justify-between gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 leading-snug">
                          {r.violation_name_snapshot}
                        </p>
                        {r.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-2">
                            "{r.notes}"
                          </p>
                        )}
                        {isCancelled && r.cancellation_reason && (
                          <p className="text-[10px] text-rose-600 font-semibold mt-1">
                            Alasan batal: {r.cancellation_reason}
                          </p>
                        )}
                      </div>

                      <span
                        className={`inline-block font-black px-2.5 py-1 rounded-xl text-xs shrink-0 ${
                          r.points_snapshot >= 15
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : r.points_snapshot >= 8
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        +{r.points_snapshot} Poin
                      </span>
                    </div>

                    {/* Footer: Date, Location, Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                      <div>
                        <span>{r.date} • {r.time} WIB</span>
                        <p className="text-slate-400 truncate max-w-[180px]">
                          {r.halaqah_name_snapshot} ({r.teacher_name_snapshot || 'Pembina'})
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isCancelled && (
                          <button
                            onClick={() => setRecordToCancel(r)}
                            className="px-3 py-1.5 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition-colors min-h-[36px] flex items-center gap-1"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Batalkan</span>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setRecordToDelete(r)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="Hapus Permanen"
                          >
                            <Trash2 className="w-4 h-4" />
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
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 text-center w-10">
                      <input
                        type="checkbox"
                        checked={filteredRecords.length > 0 && filteredRecords.every((r) => selectedIds.has(r.id))}
                        onChange={() => {
                          if (filteredRecords.every((r) => selectedIds.has(r.id))) {
                            setSelectedIds((prev) => { const n = new Set(prev); filteredRecords.forEach((r) => n.delete(r.id)); return n; });
                          } else {
                            setSelectedIds((prev) => { const n = new Set(prev); filteredRecords.forEach((r) => n.add(r.id)); return n; });
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        title="Pilih semua"
                      />
                    </th>
                    <th className="px-4 py-3.5 text-center w-12">#</th>
                    <th className="px-4 py-3.5">Tanggal & Waktu</th>
                    <th className="px-4 py-3.5">Divisi</th>
                    <th className="px-4 py-3.5">Nama Santri</th>
                    <th className="px-4 py-3.5">Lokasi / Halaqah & Pembina</th>
                    <th className="px-4 py-3.5">Pelanggaran</th>
                    <th className="px-4 py-3.5 text-center">Poin</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((r, index) => {
                    const isCancelled = r.status === 'cancelled';
                    const isKesantrian = r.division === 'kesantrian';

                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isCancelled ? 'bg-slate-50/60 opacity-60' : selectedIds.has(r.id) ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleSelectRecord(r.id)}
                            className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-slate-400 font-medium">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{r.date}</div>
                          <div className="text-[11px] text-slate-400">{r.time} WIB</div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                              isKesantrian
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {isKesantrian ? (
                              <>
                                <Building2 className="w-3 h-3" />
                                Kesantrian
                              </>
                            ) : (
                              <>
                                <BookOpen className="w-3 h-3" />
                                Tahfizh
                              </>
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => onSelectStudent && onSelectStudent(r.student_id)}
                            className="text-left font-bold text-slate-900 hover:text-brand-600 hover:underline transition-colors block truncate max-w-[180px]"
                          >
                            {r.student_name}
                          </button>
                          <span className="text-[11px] text-slate-400">
                            NIS: {r.student_nis} • Kelas {r.student_class_snapshot}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{r.halaqah_name_snapshot}</div>
                          <div className="text-[11px] text-slate-400">
                            {r.teacher_name_snapshot || 'Pembina'}
                          </div>
                        </td>

                        <td className="px-4 py-3 max-w-xs">
                          <div className="font-bold text-slate-800">{r.violation_name_snapshot}</div>
                          {r.notes && (
                            <div className="text-xs text-slate-500 italic mt-0.5 truncate">
                              "{r.notes}"
                            </div>
                          )}
                          {isCancelled && r.cancellation_reason && (
                            <div className="text-[11px] text-rose-600 font-semibold mt-1">
                              Alasan batal: {r.cancellation_reason}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block font-black px-2.5 py-1 rounded-xl text-xs ${
                              isCancelled
                                ? 'line-through bg-slate-100 text-slate-400'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            +{r.points_snapshot}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              r.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {r.status === 'active' ? 'Aktif' : 'Dibatalkan'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                          {r.status === 'active' && (
                            <button
                              onClick={() => setRecordToCancel(r)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Batalkan Catatan (Soft Delete)"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setRecordToDelete(r)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus Permanen"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Cancel Record Modal (Soft Delete with Reason) */}
      {recordToCancel &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-md m-auto h-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Batalkan Catatan Pelanggaran</h3>
                    <p className="text-xs text-slate-500">Poin santri akan otomatis dikurangi kembali</p>
                  </div>
                </div>
                <button
                  onClick={() => setRecordToCancel(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCancelRecord} className="p-5 space-y-4 overflow-y-auto flex-1">
                {cancelError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{cancelError}</span>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-200">
                  <div>
                    <span className="text-slate-500">Santri:</span>{' '}
                    <strong className="text-slate-800">{recordToCancel.student_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Pelanggaran:</span>{' '}
                    <span className="font-semibold text-slate-700">
                      {recordToCancel.violation_name_snapshot} (+{recordToCancel.points_snapshot} Poin)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Divisi:</span>{' '}
                    <span className="font-bold text-slate-700">
                      {recordToCancel.division === 'kesantrian' ? '🏢 Kesantrian' : '🕌 Tahfizh'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alasan Pembatalan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Contoh: Salah input nama santri, sudah ada surat dispensasi dokter..."
                    rows={3}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 focus:border-brand-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRecordToCancel(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={cancelling}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    {cancelling ? 'Memproses...' : 'Ya, Batalkan Catatan'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Hard Delete Dialog */}
      <ConfirmDialog
        isOpen={!!recordToDelete}
        title="Hapus Catatan Permanen"
        message={`Apakah Anda yakin ingin menghapus data pelanggaran "${recordToDelete?.violation_name_snapshot}" santri ${recordToDelete?.student_name} secara permanen dari database? Tindakan ini tidak dapat diurungkan.`}
        confirmLabel="Hapus Permanen"
        isDestructive={true}
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteRecord}
        onCancel={() => setRecordToDelete(null)}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        isOpen={showBulkConfirm}
        title={`Hapus ${selectedIds.size} Catatan Sekaligus`}
        message={`Anda akan menghapus ${selectedIds.size} catatan pelanggaran terpilih secara permanen dari database. Tindakan ini tidak dapat dibatalkan. Lanjutkan?`}
        confirmLabel={isBulkDeleting ? 'Menghapus...' : `Hapus ${selectedIds.size} Catatan`}
        isDestructive={true}
        isLoading={isBulkDeleting}
        onConfirm={handleBulkDeleteRecords}
        onCancel={() => setShowBulkConfirm(false)}
      />
    </div>
  );
};
