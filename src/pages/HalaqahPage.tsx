import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Users,
  MapPin,
  Clock,
  Eye,
  CheckCircle2,
  X,
  AlertCircle,
  Layers,
  Calendar,
  UserCheck,
} from 'lucide-react';
import type { Halaqah, Teacher, Student, User } from '../types';
import { api } from '../services/api';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface HalaqahPageProps {
  currentUser: User | null;
  onSelectStudent?: (studentId: string) => void;
}

export const HalaqahPage: React.FC<HalaqahPageProps> = ({
  currentUser,
  onSelectStudent,
}) => {
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [halaqahToEdit, setHalaqahToEdit] = useState<Halaqah | null>(null);
  const [halaqahToDelete, setHalaqahToDelete] = useState<Halaqah | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // View students in halaqah modal
  const [viewStudentsHalaqah, setViewStudentsHalaqah] = useState<Halaqah | null>(null);
  const [studentsInHalaqah, setStudentsInHalaqah] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);

  // Form states
  const [formName, setFormName] = useState<string>('');
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formSchedule, setFormSchedule] = useState<string>("Ba'da Subuh & Ba'da Maghrib");
  const [formLocation, setFormLocation] = useState<string>('Masjid Utama');
  const [formYear, setFormYear] = useState<string>('2025/2026');
  const [formError, setFormError] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadData();
    const handleDataChanged = () => {
      loadData();
    };
    window.addEventListener('app:data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChanged);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hList, tList] = await Promise.all([api.halaqah.list(), api.teachers.list()]);
      setHalaqahs(hList);
      setTeachers(tList);
    } catch (err: any) {
      console.error('Error loading halaqah:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormTeacherId(teachers.length > 0 ? teachers[0].id : '');
    setFormSchedule("Ba'da Subuh & Ba'da Maghrib");
    setFormLocation('Masjid Utama');
    setFormYear('2025/2026');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (h: Halaqah) => {
    setHalaqahToEdit(h);
    setFormName(h.name);
    setFormTeacherId(h.teacher_id || '');
    setFormSchedule(h.schedule || "Ba'da Subuh");
    setFormLocation(h.location || 'Masjid');
    setFormYear(h.academic_year || '2025/2026');
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName) {
      setFormError('Nama halaqah wajib diisi');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.halaqah.create({
        name: formName,
        teacherId: formTeacherId || null,
        schedule: formSchedule,
        location: formLocation,
        academicYear: formYear,
        actorName: currentUser?.name || 'Admin',
      });
      setIsAddModalOpen(false);
      setSuccessMsg(`Halaqah "${formName}" berhasil dibuat.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal membuat halaqah');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!halaqahToEdit) return;
    setFormError('');

    if (!formName) {
      setFormError('Nama halaqah tidak boleh kosong');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.halaqah.update(halaqahToEdit.id, {
        name: formName,
        teacherId: formTeacherId || null,
        schedule: formSchedule,
        location: formLocation,
        academicYear: formYear,
        actorName: currentUser?.name || 'Admin',
      });
      setIsEditModalOpen(false);
      setSuccessMsg(`Halaqah "${formName}" berhasil diperbarui.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal mengubah halaqah');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!halaqahToDelete) return;
    const target = halaqahToDelete;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.halaqah.delete(target.id, currentUser?.name || 'Admin');
      setHalaqahs((prev) => prev.filter((h) => h.id !== target.id));
      setHalaqahToDelete(null);
      setSuccessMsg(`Halaqah "${target.name}" berhasil dihapus.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus halaqah');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewStudents = async (h: Halaqah) => {
    setViewStudentsHalaqah(h);
    setLoadingStudents(true);
    try {
      const sList = await api.halaqah.getStudents(h.id);
      setStudentsInHalaqah(sList);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingStudents(false);
    }
  };

  return (
    <div className="space-y-6 animate-scale-in">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-brand-600" />
            <span>Data Halaqah Al-Qur'an</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola kelompok halaqah, ubah nama secara fleksibel, atur muhafizh pengampu, dan pantau anggota santri.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Halaqah Baru</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-2xl flex items-center justify-between shadow-sm animate-scale-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Halaqah Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {halaqahs.map((h) => (
          <div
            key={h.id}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-soft hover:shadow-card transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-2xl bg-brand-50 text-brand-600">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(h)}
                    title="Edit Nama Halaqah & Pengampu"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setHalaqahToDelete(h)}
                    title="Hapus Halaqah"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Halaqah Title */}
              <h2 className="text-xl font-black text-slate-900 mt-3 tracking-tight">
                {h.name}
              </h2>
              <p className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-md inline-block mt-1">
                Muhafizh: {h.teacher_name || 'Belum Ditentukan'}
              </p>

              {/* Meta details */}
              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Jadwal: {h.schedule || "Ba'da Subuh"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lokasi: {h.location || 'Masjid'}</span>
                </div>
              </div>
            </div>

            {/* Bottom Card Action: View Students */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Users className="w-4 h-4 text-brand-600" />
                <span>{h.student_count || 0} Santri Terdaftar</span>
              </div>
              <button
                onClick={() => handleViewStudents(h)}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Lihat Santri</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ==================================================== */}
      {/* MODAL: TAMBAH / EDIT HALAQAH                        */}
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
                    <Layers className="w-6 h-6 text-brand-300" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                      {isAddModalOpen ? 'Tambah Halaqah Baru' : 'Edit Data Halaqah'}
                    </h3>
                    <p className="text-xs text-brand-200 font-light">
                      {isAddModalOpen
                        ? 'Buat kelompok halaqah tahfizh baru & tentukan pengampu'
                        : 'Ubah nama halaqah, asatidz pengampu, jadwal & lokasi'}
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
              onSubmit={isAddModalOpen ? handleAddSubmit : handleEditSubmit}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
                {formError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl flex items-center gap-2.5 animate-scale-in">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span className="font-medium">{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-brand-600" />
                    <span>Nama Kelompok Halaqah</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Misal: Halaqah Doha, Halaqah Makkah..."
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-50/50 hover:bg-white font-medium transition-colors"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <span>💡 Nama halaqah dapat diganti kapan saja tanpa merusak catatan masa lalu.</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-brand-600" />
                    <span>Muhafizh / Ustadz Pengampu</span>
                  </label>
                  <select
                    value={formTeacherId}
                    onChange={(e) => setFormTeacherId(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-slate-50/50 hover:bg-white font-medium transition-colors"
                  >
                    <option value="">-- Belum Ditentukan (Tanpa Pengampu) --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.phone || 'No HP -'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      <span>Jadwal Sesi</span>
                    </label>
                    <input
                      type="text"
                      value={formSchedule}
                      onChange={(e) => setFormSchedule(e.target.value)}
                      placeholder="Ba'da Subuh & Maghrib"
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-slate-50/50 hover:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-600" />
                      <span>Lokasi Sesi</span>
                    </label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="Masjid Lt 2 / Gazebo"
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-slate-50/50 hover:bg-white transition-colors"
                    />
                  </div>
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

              <div className="p-4 sm:p-5 bg-slate-50/70 flex items-center justify-end gap-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-navy-800 hover:from-brand-700 hover:to-navy-900 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {formSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-brand-300" />
                      <span>{isAddModalOpen ? 'Simpan Halaqah' : 'Perbarui Halaqah'}</span>
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
      {/* MODAL: DAFTAR SANTRI DI HALAQAH                     */}
      {/* ==================================================== */}
      {viewStudentsHalaqah &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-scale-in">
            <div className="relative w-full max-w-lg m-auto h-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Santri {viewStudentsHalaqah.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Muhafizh: {viewStudentsHalaqah.teacher_name || '-'}
                </p>
              </div>
              <button
                onClick={() => setViewStudentsHalaqah(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100 overflow-y-auto pr-1 flex-1">
              {studentsInHalaqah.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-500">
                      NIS: {s.student_number} • Kelas {s.class}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                    {s.total_points} Poin
                  </span>
                </div>
              ))}

              {studentsInHalaqah.length === 0 && !loadingStudents && (
                <p className="text-center py-8 text-slate-400 text-xs">
                  Belum ada santri terdaftar di halaqah ini.
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 text-right flex-shrink-0">
              <button
                onClick={() => setViewStudentsHalaqah(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!halaqahToDelete}
        title="Hapus Halaqah"
        message={`Apakah Anda yakin ingin menghapus "${halaqahToDelete?.name}"? Santri yang terdaftar di halaqah ini akan dialihkan menjadi tanpa halaqah.`}
        confirmLabel="Hapus Halaqah"
        isDestructive={true}
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setHalaqahToDelete(null);
          setDeleteError('');
        }}
      />
    </div>
  );
};
