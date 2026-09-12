import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  UploadCloud,
  FileDown,
  GraduationCap,
  UserPlus,
  UserCheck,
  Hash,
  User as UserIcon,
  Calendar,
  BookOpen,
  Users,
} from 'lucide-react';
import type { Student, Halaqah, User } from '../types';
import { api } from '../services/api';
import { storageSync } from '../services/storageSync';
import { StatusBadge } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  downloadStudentImportTemplate,
  parseStudentExcelFile,
  exportToExcel,
  StudentExcelRow,
} from '../utils/excelHelper';

interface StudentsPageProps {
  currentUser: User | null;
  onSelectStudent: (studentId: string) => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  currentUser,
  onSelectStudent,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filters
  const [search, setSearch] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedHalaqah, setSelectedHalaqah] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');

  // Form State for Add / Edit
  const [formNIS, setFormNIS] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formClass, setFormClass] = useState<string>('');
  const [formGender, setFormGender] = useState<'L' | 'P'>('L');
  const [formHalaqahId, setFormHalaqahId] = useState<string>('');
  const [formYear, setFormYear] = useState<string>('2025/2026');
  const [formError, setFormError] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // Excel Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<StudentExcelRow[]>([]);
  const [importValidCount, setImportValidCount] = useState<number>(0);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [importing, setImporting] = useState<boolean>(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string>('');

  useEffect(() => {
    loadStudentsAndHalaqah();

    const handleDataChanged = (e: any) => {
      if (!e?.detail?.resource || e?.detail?.resource === 'student' || e?.detail?.resource === 'record' || e?.detail?.resource === 'all') {
        loadStudentsAndHalaqah();
      }
    };

    window.addEventListener('app:data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChanged);
    };
  }, []);

  const loadStudentsAndHalaqah = async () => {
    setLoading(true);
    try {
      const [sList, hList] = await Promise.all([api.students.list(), api.halaqah.list()]);
      setStudents(sList);
      setHalaqahs(hList);
    } catch (err: any) {
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormNIS('');
    setFormName('');
    setFormClass('7A');
    setFormGender('L');
    setFormHalaqahId(halaqahs.length > 0 ? halaqahs[0].id : '');
    setFormYear('2025/2026');
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Submit Add Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formNIS || !formName || !formClass) {
      setFormError('NIS, Nama, dan Kelas wajib diisi');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.students.create({
        studentNumber: formNIS,
        name: formName,
        studentClass: formClass,
        gender: formGender,
        halaqahId: formHalaqahId,
        academicYear: formYear,
        actorName: currentUser?.name || 'Admin',
      });
      setIsAddModalOpen(false);
      await loadStudentsAndHalaqah();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menambahkan santri');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (student: Student) => {
    setStudentToEdit(student);
    setFormNIS(student.student_number);
    setFormName(student.name);
    setFormClass(student.class);
    setFormGender(student.gender);
    setFormHalaqahId(student.halaqah_id || '');
    setFormYear(student.academic_year || '2025/2026');
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Submit Edit Student
  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit) return;
    setFormError('');

    setFormSubmitting(true);
    try {
      await api.students.update(studentToEdit.id, {
        studentNumber: formNIS,
        name: formName,
        studentClass: formClass,
        gender: formGender,
        halaqahId: formHalaqahId,
        academicYear: formYear,
        actorName: currentUser?.name || 'Admin',
      });
      setIsEditModalOpen(false);
      await loadStudentsAndHalaqah();
    } catch (err: any) {
      setFormError(err.message || 'Gagal memperbarui santri');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Student
  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    const targetId = studentToDelete.id;
    setIsDeleting(true);
    setDeleteError('');
    try {
      // 1. Trigger HTTP DELETE request to backend database
      await api.students.delete(targetId, currentUser?.name || 'Admin');

      // 2. Immediately update local state so row is removed without delay or resurrection
      setStudents((prev) => prev.filter((s) => s.id !== targetId));
      setStudentToDelete(null);

      // 3. Notify application data changed
      storageSync.notifyDataChange({ action: 'delete', resource: 'student', id: targetId });

      // 4. Refetch from database to ensure full synchronization
      await loadStudentsAndHalaqah();
    } catch (err: any) {
      console.error('Error deleting student:', err);
      setDeleteError(err.message || 'Gagal menghapus data santri dari database');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle file select for Excel import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportSuccessMsg('');
    try {
      const rows = await parseStudentExcelFile(file);
      setParsedRows(rows);

      // Validate on client
      const existingNIS = new Set(students.map((s) => s.student_number));
      const errors: Array<{ row: number; error: string }> = [];
      let valid = 0;

      rows.forEach((r, idx) => {
        const rowNum = idx + 2;
        if (!r.student_number) {
          errors.push({ row: rowNum, error: 'NIS kosong' });
        } else if (existingNIS.has(r.student_number)) {
          errors.push({ row: rowNum, error: `NIS ${r.student_number} (${r.name}) sudah ada di database` });
        } else if (!r.name) {
          errors.push({ row: rowNum, error: 'Nama santri kosong' });
        } else {
          valid++;
        }
      });

      setImportValidCount(valid);
      setImportErrors(errors);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Submit Excel Import to Database
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    try {
      const res = await api.students.importExcel(parsedRows, currentUser?.name || 'Admin');
      setImportSuccessMsg(res.message);
      setParsedRows([]);
      setImportFile(null);
      await loadStudentsAndHalaqah();
    } catch (err: any) {
      alert('Gagal mengimpor ke database: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Export to Excel
  const handleExportStudents = () => {
    const exportData = filteredStudents.map((s, idx) => ({
      'No': idx + 1,
      'NIS': s.student_number,
      'Nama Lengkap': s.name,
      'Kelas': s.class,
      'Jenis Kelamin': s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      'Nama Halaqah': s.halaqah_name || 'Tanpa Halaqah',
      'Muhafizh Pengampu': s.teacher_name || '-',
      'Total Poin': s.total_points,
      'Status Poin': s.status_info?.statusName || 'AMAN',
      'Tahun Ajaran': s.academic_year,
    }));
    exportToExcel(exportData, 'Data_Santri_Halaqah');
  };

  // Filter & Sorting logic
  const filteredStudents = students
    .filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.student_number.toLowerCase().includes(search.toLowerCase()) ||
        (s.halaqah_name && s.halaqah_name.toLowerCase().includes(search.toLowerCase()));

      const matchClass = selectedClass === 'all' || s.class === selectedClass;
      const matchHalaqah = selectedHalaqah === 'all' || s.halaqah_id === selectedHalaqah;

      return matchSearch && matchClass && matchHalaqah;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'nis') {
        comparison = a.student_number.localeCompare(b.student_number);
      } else if (sortBy === 'class') {
        comparison = a.class.localeCompare(b.class);
      } else if (sortBy === 'points') {
        comparison = (a.total_points || 0) - (b.total_points || 0);
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

  const uniqueClasses = Array.from(new Set(students.map((s) => s.class))).sort();

  return (
    <div className="space-y-6 animate-scale-in">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-brand-600 shrink-0" />
            <span>Data Santri Halaqah</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola santri, import dari Excel dengan template resmi, dan pantau status poin.
          </p>
        </div>

        {/* Buttons: Tambah Santri, Import Excel, Export */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto justify-center min-h-[44px] px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Santri</span>
          </button>

          <button
            onClick={() => {
              setImportFile(null);
              setParsedRows([]);
              setImportSuccessMsg('');
              setIsImportModalOpen(true);
            }}
            className="w-full sm:w-auto justify-center min-h-[44px] px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 shadow-sm transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleExportStudents}
            className="w-full sm:w-auto justify-center min-h-[44px] px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 shadow-sm transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <Download className="w-4 h-4 text-brand-600" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Card */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-soft space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Global Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIS, atau halaqah..."
              className="w-full min-h-[44px] text-xs sm:text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white"
            />
          </div>

          {/* Filter Kelas */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 sm:whitespace-nowrap">Kelas:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full min-h-[44px] text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-white"
            >
              <option value="all">Semua Kelas</option>
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Halaqah */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 sm:whitespace-nowrap">Halaqah:</span>
            <select
              value={selectedHalaqah}
              onChange={(e) => setSelectedHalaqah(e.target.value)}
              className="w-full min-h-[44px] text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-white"
            >
              <option value="all">Semua Halaqah</option>
              {halaqahs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Control */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 sm:whitespace-nowrap">Urutkan:</span>
            <select
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => {
                const [by, dir] = e.target.value.split('-');
                setSortBy(by);
                setSortDir(dir as 'asc' | 'desc');
              }}
              className="w-full min-h-[44px] text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-white"
            >
              <option value="name-asc">Nama (A - Z)</option>
              <option value="name-desc">Nama (Z - A)</option>
              <option value="points-desc">Poin Tertinggi (Z - A)</option>
              <option value="points-asc">Poin Terendah (A - Z)</option>
              <option value="class-asc">Kelas</option>
              <option value="nis-asc">NIS</option>
            </select>
          </div>
        </div>

        {/* Total stats count indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Menampilkan <strong>{filteredStudents.length}</strong> dari <strong>{students.length}</strong> santri
          </span>
          {(search || selectedClass !== 'all' || selectedHalaqah !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedClass('all');
                setSelectedHalaqah('all');
              }}
              className="text-brand-600 hover:text-brand-700 font-semibold min-h-[36px] px-2 flex items-center"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* MOBILE CARDS VIEW (block md:hidden)        */}
      {/* Ergonomis untuk penggunaan satu tangan     */}
      {/* ========================================== */}
      <div className="block md:hidden space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            Tidak ditemukan data santri yang cocok dengan filter.
          </div>
        ) : (
          filteredStudents.map((s, idx) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-soft p-3.5 space-y-3 hover:border-brand-300 transition-colors"
            >
              {/* Card Header: NIS, Nama, Gender & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {s.student_number}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200">
                      Kelas {s.class}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectStudent(s.id)}
                    className="font-black text-slate-900 hover:text-brand-600 text-base transition-colors text-left line-clamp-1 active:text-brand-700"
                  >
                    {s.name}
                  </button>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {s.gender === 'L' ? 'Laki-laki' : 'Perempuan'} • TA {s.academic_year}
                  </p>
                </div>

                <div className="shrink-0">
                  <StatusBadge
                    statusName={s.status_info?.statusName || 'AMAN'}
                    badgeColor={s.status_info?.badgeColor || 'emerald'}
                  />
                </div>
              </div>

              {/* Halaqah & Pengampu */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                  <span>{s.halaqah_name || 'Tanpa Halaqah'}</span>
                </p>
                <p className="text-[11px] text-slate-500 ml-5 mt-0.5">
                  Ustadz: {s.teacher_name || '-'}
                </p>
              </div>

              {/* Points Summary & Deductions */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                    {s.total_points} Poin
                  </span>
                  {(s.total_deductions || 0) > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ★ -{s.total_deductions}
                    </span>
                  )}
                </div>

                {(s.tahfizh_points !== undefined || s.kesantrian_points !== undefined) && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      T: {s.tahfizh_points || 0}
                    </span>
                    <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      K: {s.kesantrian_points || 0}
                    </span>
                  </div>
                )}
              </div>

              {/* One-Handed Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectStudent(s.id)}
                  className="min-h-[40px] px-2 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center gap-1 border border-brand-200 active:scale-95 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Profil</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEditModal(s)}
                  className="min-h-[40px] px-2 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center gap-1 border border-amber-200 active:scale-95 transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStudentToDelete(s)}
                  className="min-h-[40px] px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1 border border-rose-200 active:scale-95 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ========================================== */}
      {/* DESKTOP TABLE VIEW (hidden md:block)       */}
      {/* ========================================== */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">#</th>
                <th className="px-4 py-3.5">NIS</th>
                <th className="px-4 py-3.5">Nama Santri</th>
                <th className="px-4 py-3.5 text-center">Kelas</th>
                <th className="px-4 py-3.5">Halaqah & Muhafizh</th>
                <th className="px-4 py-3.5 text-center">Akumulasi Poin</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 text-center font-bold text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-600 font-semibold">
                    {s.student_number}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => onSelectStudent(s.id)}
                      className="font-bold text-slate-900 hover:text-brand-600 transition-colors text-left"
                    >
                      {s.name}
                    </button>
                    <p className="text-[11px] text-slate-400">
                      {s.gender === 'L' ? 'Laki-laki' : 'Perempuan'} • TA: {s.academic_year}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-bold text-slate-700">
                      {s.class}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-800">{s.halaqah_name || 'Tanpa Halaqah'}</p>
                    <p className="text-[11px] text-slate-500">{s.teacher_name || '-'}</p>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                        {s.total_points} Poin
                      </span>
                      {(s.total_deductions || 0) > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300"
                          title={`Pengurangan Melalui Kegiatan Baik: -${s.total_deductions} Poin`}
                        >
                          <span>★</span>
                          <span>-{s.total_deductions}</span>
                        </span>
                      )}
                    </div>
                    {(s.tahfizh_points !== undefined || s.kesantrian_points !== undefined) && (
                      <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 mt-1">
                        <span
                          className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                          title={`Poin Bersih Tahfizh: ${s.tahfizh_points || 0} (${s.tahfizh_deductions ? `dikurangi ${s.tahfizh_deductions}` : 'tanpa pengurangan'})`}
                        >
                          T: {s.tahfizh_points || 0}
                        </span>
                        <span
                          className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200"
                          title={`Poin Bersih Kesantrian: ${s.kesantrian_points || 0} (${s.kesantrian_deductions ? `dikurangi ${s.kesantrian_deductions}` : 'tanpa pengurangan'})`}
                        >
                          K: {s.kesantrian_points || 0}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge
                      statusName={s.status_info?.statusName || 'AMAN'}
                      badgeColor={s.status_info?.badgeColor || 'emerald'}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onSelectStudent(s.id)}
                        title="Lihat Profil Santri"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(s)}
                        title="Edit Data Santri"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setStudentToDelete(s)}
                        title="Hapus Santri"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Tidak ditemukan data santri yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL: TAMBAH / EDIT SANTRI                         */}
      {/* ==================================================== */}
      {(isAddModalOpen || isEditModalOpen) &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-scale-in">
            <div className="relative w-full max-w-lg m-auto h-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
            {/* Header with Islamic Navy Gradient */}
            <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-brand-800 text-white p-5 sm:p-6 relative shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-sm ring-1 ring-white/20">
                    {isAddModalOpen ? (
                      <UserPlus className="w-6 h-6 text-brand-300" />
                    ) : (
                      <UserCheck className="w-6 h-6 text-brand-300" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                      {isAddModalOpen ? 'Tambah Data Santri' : 'Edit Profil Santri'}
                    </h3>
                    <p className="text-xs text-brand-200 font-light">
                      {isAddModalOpen
                        ? 'Daftarkan santri baru ke dalam sistem & halaqah'
                        : 'Perbarui biodata dan penempatan halaqah santri'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                  aria-label="Tutup modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form
              onSubmit={isAddModalOpen ? handleAddStudent : handleEditStudent}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
                {formError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl flex items-center gap-2.5 animate-scale-in">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span className="font-medium">{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-brand-600" />
                      <span>NIS / No. Induk</span>
                    </label>
                    <input
                      type="text"
                      value={formNIS}
                      onChange={(e) => setFormNIS(e.target.value)}
                      placeholder="Misal: 2025001"
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-50/50 hover:bg-white transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
                      <span>Kelas</span>
                    </label>
                    <input
                      type="text"
                      value={formClass}
                      onChange={(e) => setFormClass(e.target.value)}
                      placeholder="Contoh: 7A / 8B / 9C"
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-50/50 hover:bg-white transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-brand-600" />
                    <span>Nama Lengkap Santri</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Masukkan nama lengkap santri..."
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-50/50 hover:bg-white transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-brand-600" />
                      <span>Jenis Kelamin</span>
                    </label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value as 'L' | 'P')}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-slate-50/50 hover:bg-white font-medium transition-colors"
                    >
                      <option value="L">Laki-laki (Ikhwan)</option>
                      <option value="P">Perempuan (Akhawat)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-brand-600" />
                      <span>Tahun Ajaran</span>
                    </label>
                    <input
                      type="text"
                      value={formYear}
                      onChange={(e) => setFormYear(e.target.value)}
                      placeholder="2025/2026"
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-slate-50/50 hover:bg-white font-medium transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-brand-600" />
                    <span>Penempatan Halaqah Al-Qur'an</span>
                  </label>
                  <select
                    value={formHalaqahId}
                    onChange={(e) => setFormHalaqahId(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-slate-50/50 hover:bg-white font-medium transition-colors"
                  >
                    <option value="">-- Belum Ditempatkan (Tanpa Halaqah) --</option>
                    {halaqahs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} — Pengampu: {h.teacher_name || 'Belum Ada Ustadz'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3.5 sm:p-5 bg-slate-50/70 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="w-full sm:w-auto justify-center min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-sm active:scale-[0.98] flex items-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full sm:w-auto justify-center min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-navy-800 hover:from-brand-700 hover:to-navy-900 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2 active:scale-[0.98]"
                >
                  {formSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-brand-300" />
                      <span>{isAddModalOpen ? 'Simpan Santri' : 'Perbarui Data Santri'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================================================== */}
      {/* MODAL: IMPORT EXCEL (DENGAN TEMPLATE RESMI & PREVIEW) */}
      {/* ==================================================== */}
      {isImportModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-scale-in">
            <div className="relative w-full max-w-2xl m-auto h-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Import Data Santri dari Excel</h3>
                  <p className="text-xs text-slate-500">
                    Sistem akan memvalidasi dan menyimpan langsung ke database relasional
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Notice */}
            <div className="mt-4 p-4 rounded-2xl bg-brand-50 border border-brand-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-brand-900">
                  Unduh Template Excel Resmi (.xlsx)
                </h4>
                <p className="text-xs text-brand-700 mt-0.5">
                  Gunakan format kolom yang telah disesuaikan agar data tervalidasi dengan sempurna.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadStudentImportTemplate}
                className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                <FileDown className="w-4 h-4" />
                <span>Unduh Template</span>
              </button>
            </div>

            {/* File Upload Zone */}
            <div className="mt-4">
              <label className="block border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-brand-50/30 transition-all">
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <span className="text-sm font-bold text-slate-700 block">
                  {importFile ? importFile.name : 'Pilih file Excel (.xlsx / .csv)'}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Klik untuk mencari file atau seret file ke sini
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Success Feedback */}
            {importSuccessMsg && (
              <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {/* Preview Validation Section */}
            {parsedRows.length > 0 && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Preview Data Validasi
                  </h4>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg">
                      ✓ {importValidCount} Data Siap Disimpan
                    </span>
                    {importErrors.length > 0 && (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg">
                        ✗ {importErrors.length} Baris Error
                      </span>
                    )}
                  </div>
                </div>

                {/* Errors list if any */}
                {importErrors.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1 max-h-24 overflow-y-auto">
                    {importErrors.map((err, i) => (
                      <p key={i}>
                        • Baris {err.row}: {err.error}
                      </p>
                    ))}
                  </div>
                )}

                {/* Table Preview */}
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                      <tr>
                        <th className="px-3 py-2">NIS</th>
                        <th className="px-3 py-2">Nama</th>
                        <th className="px-3 py-2">Kelas</th>
                        <th className="px-3 py-2">Halaqah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 8).map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono">{r.student_number}</td>
                          <td className="px-3 py-2 font-medium">{r.name}</td>
                          <td className="px-3 py-2">{r.class}</td>
                          <td className="px-3 py-2">{r.halaqah || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 sm:pt-5 mt-4 sm:mt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="w-full sm:w-auto justify-center min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center"
              >
                Tutup
              </button>
              {parsedRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importing || importValidCount === 0}
                  className="w-full sm:w-auto justify-center min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                >
                  {importing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Konfirmasi & Simpan ke Database</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!studentToDelete}
        title="Hapus Data Santri"
        message={`Apakah Anda yakin ingin menghapus santri "${studentToDelete?.name}" (NIS: ${studentToDelete?.student_number})? Seluruh riwayat pelanggaran dan poin santri ini akan dihapus permanen dari database.`}
        confirmLabel="Hapus Santri"
        isDestructive={true}
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setStudentToDelete(null);
          setDeleteError('');
        }}
      />
    </div>
  );
};
