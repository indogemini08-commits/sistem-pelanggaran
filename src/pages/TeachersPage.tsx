import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  BookOpen,
  CheckCircle2,
  X,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  UserPlus,
  User as UserIcon,
  Activity,
} from 'lucide-react';
import type { Teacher, User } from '../types';
import { api } from '../services/api';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface TeachersPageProps {
  currentUser: User | null;
}

export const TeachersPage: React.FC<TeachersPageProps> = ({ currentUser }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');

  // Form State
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const list = await api.teachers.list();
      setTeachers(list);
    } catch (err: any) {
      console.error('Error loading teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormPhone('');
    setFormStatus('active');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setTeacherToEdit(t);
    setFormName(t.name);
    setFormPhone(t.phone || '');
    setFormStatus(t.status);
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName) {
      setFormError('Nama muhafizh wajib diisi');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.teachers.create({
        name: formName,
        phone: formPhone,
        status: formStatus,
        actorName: currentUser?.name || 'Admin',
      });
      setIsAddModalOpen(false);
      await loadTeachers();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menambahkan muhafizh');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherToEdit) return;
    setFormError('');

    if (!formName) {
      setFormError('Nama muhafizh tidak boleh kosong');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.teachers.update(teacherToEdit.id, {
        name: formName,
        phone: formPhone,
        status: formStatus,
        actorName: currentUser?.name || 'Admin',
      });
      setIsEditModalOpen(false);
      await loadTeachers();
    } catch (err: any) {
      setFormError(err.message || 'Gagal memperbarui muhafizh');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!teacherToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.teachers.delete(teacherToDelete.id, currentUser?.name || 'Admin');
      setTeacherToDelete(null);
      await loadTeachers();
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus muhafizh');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-scale-in">
      {/* Title & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-brand-600" />
            <span>Data Muhafizh / Asatidz</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Daftar asatidz pengampu halaqah tahfizh dan monitoring tanggung jawab halaqah.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Muhafizh</span>
        </button>
      </div>

      {/* Grid of Teachers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teachers.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-soft hover:shadow-card transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-navy-800 text-white flex items-center justify-center font-bold text-lg shadow-md">
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(t)}
                    title="Edit Data Muhafizh"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTeacherToDelete(t)}
                    title="Hapus Muhafizh"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h2 className="text-lg font-black text-slate-900 mt-3">{t.name}</h2>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {t.status === 'active' ? 'Muhafizh Aktif' : 'Nonaktif'}
                </span>
                {t.email && <span className="text-xs text-slate-400 truncate">{t.email}</span>}
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>No. HP / WA: {t.phone || '-'}</span>
                </div>
              </div>
            </div>

            {/* Halaqah Binaan */}
            <div className="pt-4 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Halaqah yang Diampu:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {t.halaqahList && t.halaqahList.length > 0 ? (
                  t.halaqahList.map((h) => (
                    <span
                      key={h.id}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 flex items-center gap-1"
                    >
                      <BookOpen className="w-3 h-3 text-brand-500" />
                      <span>{h.name}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Belum mengampu halaqah</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ==================================================== */}
      {/* MODAL: TAMBAH / EDIT MUHAFIZH                       */}
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
                      {isAddModalOpen ? 'Tambah Muhafizh Baru' : 'Edit Data Muhafizh'}
                    </h3>
                    <p className="text-xs text-brand-200 font-light">
                      {isAddModalOpen
                        ? 'Daftarkan ustadz pengampu kegiatan halaqah tahfizh'
                        : 'Perbarui nama lengkap, nomor WhatsApp & status aktif'}
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
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-medium">{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-brand-600" />
                    <span>Nama Lengkap Muhafizh</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Ustadz Ahmad Al-Hafizh"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-50/50 hover:bg-white font-medium transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-brand-600" />
                    <span>Nomor HP / WhatsApp Aktif</span>
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-50/50 hover:bg-white font-medium transition-colors"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Digunakan untuk koordinasi dan kontak pemanggilan santri.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-brand-600" />
                    <span>Status Keaktifan</span>
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-slate-50/50 hover:bg-white font-medium transition-colors"
                  >
                    <option value="active">🟢 Aktif Mengampu Halaqah</option>
                    <option value="inactive">⚪ Nonaktif / Cuti</option>
                  </select>
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
                      <span>{isAddModalOpen ? 'Simpan Muhafizh' : 'Perbarui Muhafizh'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!teacherToDelete}
        title="Hapus Data Muhafizh"
        message={`Apakah Anda yakin ingin menghapus "${teacherToDelete?.name}"? Hubungan pengampu pada halaqah terkait akan dikosongkan.`}
        confirmLabel="Hapus Muhafizh"
        isDestructive={true}
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setTeacherToDelete(null);
          setDeleteError('');
        }}
      />
    </div>
  );
};
