import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { User, SchoolSettings } from '../types';
import { api } from '../services/api';

interface FirstTimePasswordModalProps {
  currentUser: User;
  settings: SchoolSettings | null;
  onPasswordChanged: (updatedUser: User) => void;
  onLogout: () => void;
}

export const FirstTimePasswordModal: React.FC<FirstTimePasswordModalProps> = ({
  currentUser,
  settings,
  onPasswordChanged,
  onLogout,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok. Harap periksa kembali.');
      return;
    }

    setSubmitting(true);
    try {
      await api.auth.changePassword({
        userId: currentUser.id,
        newPassword: newPassword,
        actorName: currentUser.name,
      });

      const updatedUser: User = {
        ...currentUser,
        mustChangePassword: false,
        must_change_password: 0,
      };

      onPasswordChanged(updatedUser);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah kata sandi. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const isTooShort = newPassword && newPassword.length < 6;

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-slate-900 to-brand-950 flex items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 animate-scale-in">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-brand-900 text-white p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold text-brand-200 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-brand-300" />
              <span>Aktivasi Akun Pengguna Baru</span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Atur Kata Sandi Baru
                </h1>
                <p className="text-xs sm:text-sm text-blue-200/90 font-light">
                  {settings?.school_name || "Imam Muzani Boarding School"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60 text-xs sm:text-sm text-blue-900 dark:text-blue-200 space-y-1.5">
            <p className="font-bold">
              Ahlan wa Sahlan, {currentUser.name}!
            </p>
            <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed font-normal">
              Akun Anda baru saja dibuat oleh Administrator. Demi keamanan data dan kerahasiaan akun, silakan perbarui kata sandi awal Anda dengan kata sandi baru yang hanya Anda ketahui.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="text-slate-500 dark:text-slate-400">Username Login:</span>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 font-mono text-blue-700 dark:text-blue-300">
                {currentUser.email}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2.5 animate-scale-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Password Baru */}
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  <span>Kata Sandi Baru</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">Min. 6 karakter</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ketik kata sandi baru Anda..."
                  className="w-full text-sm pl-3.5 pr-10 py-3 rounded-xl border border-slate-300 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 bg-slate-50/50 dark:bg-slate-900/50 dark:text-white font-mono transition-all"
                  required
                  minLength={6}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isTooShort && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                  Panjang kata sandi minimal 6 karakter.
                </p>
              )}
            </div>

            {/* Input Konfirmasi Password */}
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Ulangi Kata Sandi Baru</span>
                </span>
                {confirmPassword && (
                  <span className={`text-[11px] font-bold ${isMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {isMatch ? '✓ Cocok' : '✗ Tidak cocok'}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru..."
                  className={`w-full text-sm pl-3.5 pr-10 py-3 rounded-xl border ${
                    confirmPassword && !isMatch
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-300 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20'
                  } bg-slate-50/50 dark:bg-slate-900/50 dark:text-white font-mono transition-all`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !newPassword || !confirmPassword || !isMatch}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-brand-600 to-navy-800 hover:from-brand-700 hover:to-navy-900 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-600/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan Kata Sandi...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Simpan & Masuk ke Aplikasi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Logout Option */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Bukan akun milik Anda?</span>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar / Ganti Akun</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
