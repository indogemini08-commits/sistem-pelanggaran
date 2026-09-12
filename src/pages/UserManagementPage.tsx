import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  UserCog,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Mail,
  Lock,
  CheckCircle2,
  X,
  AlertCircle,
  UserCheck,
  UserPlus,
  User as UserIcon,
  Shield,
  Activity,
  Phone,
} from 'lucide-react';
import type { User, UserRole } from '../types';
import { api } from '../services/api';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface UserManagementPageProps {
  currentUser: User | null;
  onUserUpdated?: (user: User) => void;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({
  currentUser,
  onUserUpdated,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');

  // Form states
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formRole, setFormRole] = useState<UserRole>('teacher');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadUsers();
    const handleDataChanged = () => {
      loadUsers();
    };
    window.addEventListener('app:data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChanged);
    };
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await api.users.list();
      setUsers(list);
    } catch (err: any) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('teacher');
    setFormStatus('active');
    setFormPhone('');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setUserToEdit(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword(''); // leave empty to not change
    setFormRole(u.role);
    setFormStatus(u.status);
    setFormPhone('');
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = formName.trim();
    const cleanEmail = formEmail.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !formPassword) {
      setFormError('Nama, email/username, dan kata sandi wajib diisi');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.users.create({
        name: cleanName,
        email: cleanEmail,
        password: formPassword,
        role: formRole,
        status: formStatus,
        phone: formPhone,
        actorName: currentUser?.name || 'Admin',
      });
      setIsAddModalOpen(false);
      setSuccessMsg(`Akun "${cleanName}" (${cleanEmail}) berhasil ditambahkan.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadUsers();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menambahkan akun');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    setFormError('');

    const cleanName = formName.trim();
    const cleanEmail = formEmail.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      setFormError('Nama dan email/username wajib diisi');
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await api.users.update(userToEdit.id, {
        name: cleanName,
        email: cleanEmail,
        password: formPassword || undefined,
        role: formRole,
        status: formStatus,
        actorName: currentUser?.name || 'Admin',
      });

      const updatedUser: User = res.user || {
        ...userToEdit,
        name: cleanName,
        email: cleanEmail,
        role: formRole,
        status: formStatus,
      };

      // If the edited user is the current logged-in user, update profile in Navbar & session immediately!
      if (
        currentUser &&
        (userToEdit.id === currentUser.id || userToEdit.email.toLowerCase() === currentUser.email.toLowerCase())
      ) {
        const fullCurrentUser = {
          ...currentUser,
          name: cleanName,
          email: cleanEmail,
          role: formRole,
          status: formStatus,
        };
        onUserUpdated?.(fullCurrentUser);
        localStorage.setItem('halaqah_user', JSON.stringify(fullCurrentUser));
        if (sessionStorage.getItem('halaqah_user')) {
          sessionStorage.setItem('halaqah_user', JSON.stringify(fullCurrentUser));
        }
      }

      setIsEditModalOpen(false);
      setSuccessMsg(`Akun "${cleanName}" berhasil diperbarui.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadUsers();
    } catch (err: any) {
      setFormError(err.message || 'Gagal memperbarui akun');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.users.delete(userToDelete.id, currentUser?.name || 'Admin');
      const deletedName = userToDelete.name;
      setUserToDelete(null);
      setSuccessMsg(`Akun "${deletedName}" berhasil dihapus.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadUsers();
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus pengguna');
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            Admin
          </span>
        );
      case 'coordinator':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            Koordinator Tahfizh
          </span>
        );
      case 'kepala_kesantrian':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            Kepala Kesantrian
          </span>
        );
      case 'teacher':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Muhafizh Halaqah
          </span>
        );
      case 'guru':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
            Guru Pengajar
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-scale-in">
      {/* Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserCog className="w-7 h-7 text-brand-600" />
            <span>Manajemen Akun Pengguna</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola hak akses pengguna, tambahkan akun baru, ubah role, dan atur kata sandi.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Akun Baru</span>
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

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">#</th>
                <th className="px-4 py-3.5">Nama Pengguna</th>
                <th className="px-4 py-3.5">Email / Login ID</th>
                <th className="px-4 py-3.5">Role / Hak Akses</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5">Tanggal Terdaftar</th>
                <th className="px-4 py-3.5 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u, idx) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 text-center font-bold text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900">{u.name}</p>
                    {u.id === currentUser?.id && (
                      <span className="text-[10px] text-brand-600 font-bold bg-brand-50 px-1.5 py-0.2 rounded border border-brand-200 inline-block mt-0.5">
                        (Akun Anda)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-600">
                    {u.email}
                  </td>
                  <td className="px-4 py-3.5">
                    {getRoleBadge(u.role)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {u.status === 'active' ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">
                    {u.created_at ? u.created_at.substring(0, 10) : '-'}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        title="Edit Akun"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setUserToDelete(u)}
                        disabled={u.id === currentUser?.id}
                        title={u.id === currentUser?.id ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Akun'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL: TAMBAH / EDIT AKUN USER                      */}
      {/* ==================================================== */}
      {/* ==================================================== */}
      {/* MODAL: TAMBAH / EDIT AKUN USER                      */}
      {/* ==================================================== */}
      {(isAddModalOpen || isEditModalOpen) &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-scale-in">
            <div className="relative w-full max-w-lg m-auto h-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
              {/* Header with Islamic Navy gradient */}
              <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-brand-800 text-white p-5 sm:p-6 flex items-center justify-between shrink-0 relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                    {isAddModalOpen ? (
                      <UserPlus className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {isAddModalOpen ? 'Tambah Akun Pengguna' : 'Edit Akun Pengguna'}
                    </h3>
                    <p className="text-xs text-blue-200/80 font-normal">
                      {isAddModalOpen
                        ? 'Daftarkan hak akses login pengurus atau muhafizh'
                        : `Memperbarui kredensial & hak akses: ${userToEdit?.name || ''}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors relative z-10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={isAddModalOpen ? handleAddSubmit : handleEditSubmit}
                className="flex flex-col flex-1 min-h-0 overflow-hidden"
              >
                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
                  {formError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-brand-600" />
                      <span>Nama Lengkap Pengguna</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Contoh: Ustadz Ahmad Dahlan / Petugas Piket"
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 bg-slate-50/50 hover:bg-white focus:bg-white font-medium transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Alamat Email (Username Login)</span>
                    </label>
                    <input
                      type="text"
                      inputMode="email"
                      autoComplete="username"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="contoh: ustadz@pesantren.id atau username"
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 bg-slate-50/50 hover:bg-white focus:bg-white font-medium transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        {isAddModalOpen ? 'Kata Sandi (Password)' : 'Kata Sandi Baru (Opsional)'}
                      </span>
                    </label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={isAddModalOpen ? 'Minimal 6 karakter...' : 'Biarkan kosong jika tidak diganti'}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 bg-slate-50/50 hover:bg-white focus:bg-white transition-all font-mono"
                      required={isAddModalOpen}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isAddModalOpen
                        ? 'Gunakan password yang aman dan mudah diingat pengurus'
                        : 'Biarkan kosong bila pengguna tetap memakai password lama'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                        <Shield className="w-3.5 h-3.5 text-brand-600" />
                        <span>Role Akses</span>
                      </label>
                      <select
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value as UserRole)}
                        className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 bg-slate-50/50 hover:bg-white focus:bg-white font-medium transition-all"
                      >
                        <option value="teacher">Muhafizh (Input HP Halaqah)</option>
                        <option value="guru">Guru (Input Kedisiplinan / Kelas)</option>
                        <option value="coordinator">Koordinator Tahfizh</option>
                        <option value="kepala_kesantrian">Kepala Kesantrian</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Status Akun</span>
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 bg-slate-50/50 hover:bg-white focus:bg-white font-medium transition-all"
                      >
                        <option value="active">Aktif (Dapat Login)</option>
                        <option value="inactive">Nonaktif (Diblokir)</option>
                      </select>
                    </div>
                  </div>

                  {isAddModalOpen && (formRole === 'teacher' || formRole === 'guru') && (
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>No. WhatsApp {formRole === 'guru' ? 'Guru' : 'Muhafizh'} (Opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="0812-3456-7890"
                        className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 bg-slate-50/50 hover:bg-white focus:bg-white transition-all"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Otomatis sinkron jika akun terhubung ke data muhafizh halaqah</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 sm:p-5 bg-slate-50 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsEditModalOpen(false);
                    }}
                    className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all shadow-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-navy-800 hover:from-brand-700 hover:to-navy-900 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {formSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>{isAddModalOpen ? 'Simpan Akun Baru' : 'Simpan Perubahan'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Delete User Dialog */}
      <ConfirmDialog
        isOpen={!!userToDelete}
        title="Hapus Akun Pengguna"
        message={`Apakah Anda yakin ingin menghapus akun "${userToDelete?.name}" (${userToDelete?.email})? Pengguna tidak akan dapat login kembali.`}
        confirmLabel="Hapus Akun"
        isDestructive={true}
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setUserToDelete(null);
          setDeleteError('');
        }}
      />
    </div>
  );
};
