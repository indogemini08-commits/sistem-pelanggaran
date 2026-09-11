import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Sparkles,
  Eye,
  EyeOff,
  HelpCircle,
  X,
  AlertCircle,
  PhoneCall,
  Clock,
  Award,
  Zap,
  Check,
  ShieldAlert,
  GraduationCap,
  Building2,
} from 'lucide-react';
import { api } from '../services/api';
import { User as UserType, SchoolSettings } from '../types';

interface LoginProps {
  onLoginSuccess: (user: UserType) => void;
  settings: SchoolSettings | null;
}

interface DemoAccount {
  roleName: string;
  badge: string;
  badgeColor: string;
  name: string;
  email: string;
  pass: string;
  desc: string;
  icon: React.ElementType;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, settings }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  // Quick Demo Accounts List
  const demoAccounts: DemoAccount[] = [
    {
      roleName: 'Mudir (Admin)',
      badge: 'Admin Utama',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      name: 'Ustadz Fakhrur Rodhi, S.H',
      email: 'admin@pesantren.id',
      pass: 'admin123',
      desc: 'Akses penuh sistem, master data & laporan',
      icon: ShieldCheck,
    },
    {
      roleName: 'Koor Tahfizh',
      badge: 'Koordinator Tahfizh',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      name: 'Ustadz Ridwan, Lc',
      email: 'koordinator@pesantren.id',
      pass: 'koor123',
      desc: 'Monitoring seluruh halaqah & aturan tahfizh',
      icon: Award,
    },
    {
      roleName: 'Kp. Kesantrian',
      badge: 'Kepala Kesantrian',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      name: 'Ustadz Zulkifli, S.Pd.I',
      email: 'kesantrian@pesantren.id',
      pass: 'kesantrian123',
      desc: 'Monitoring asrama & kedisiplinan santri',
      icon: Building2,
    },
    {
      roleName: 'Muhafizh',
      badge: 'Guru Halaqah',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      name: 'Ustadz Ansarullah',
      email: 'ahmad@pesantren.id',
      pass: 'ahmad123',
      desc: 'Input poin halaqah & pemantauan santri',
      icon: GraduationCap,
    },
    {
      roleName: 'Guru Pengajar',
      badge: 'Guru Kelas / Asatidz',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
      name: 'Ustadz Herman, S.Pd',
      email: 'guru@pesantren.id',
      pass: 'guru123',
      desc: 'Input kedisiplinan & pemantauan santri',
      icon: BookOpen,
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Silakan masukkan email dan kata sandi Anda.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      if (rememberMe) {
        localStorage.setItem('halaqah_user', JSON.stringify(res.user));
      } else {
        sessionStorage.setItem('halaqah_user', JSON.stringify(res.user));
      }
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Email atau kata sandi tidak cocok dengan akun terdaftar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setSelectedDemo(acc.email);
    setErrorMsg('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isCaps = e.getModifierState && e.getModifierState('CapsLock');
    setCapsLockOn(isCaps);
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center relative overflow-hidden font-sans select-none sm:select-auto">
      {/* Dynamic Background Mesh & Ambient Glows */}
      <div className="absolute inset-0 bg-islamic-pattern opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] bg-brand-600/25 rounded-full blur-[128px] pointer-events-none animate-pulse-glow" />
      <div className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] bg-emerald-600/15 rounded-full blur-[128px] pointer-events-none animate-pulse-glow" />
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-gold-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 z-10 flex flex-col justify-center min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Left Column: Brand Showcase & Institutional Identity (Majestic Enterprise Feel) */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-center space-y-6 lg:pr-6">
            
            {/* Institution Badge & Logo Header */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-gold-500 via-brand-500 to-emerald-500 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-500" />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-navy-900 border border-white/20 rounded-2xl p-2.5 flex items-center justify-center shadow-2xl">
                  <img
                    src={settings?.logo_url || '/logo.svg'}
                    alt="Logo Pesantren"
                    className="w-full h-full object-contain filter drop-shadow-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo.svg';
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-400/30 text-brand-300 text-xs font-semibold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                  <span>Sistem Informasi Terpadu</span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
                  {settings?.app_name || 'Sistem Poin Santri Halaqah'}
                </h1>
                <p className="text-xs sm:text-sm text-brand-200/90 font-medium">
                  {settings?.school_name || "Pesantren Tahfizh Al-Qur'an Imam Asy-Syathibi"}
                </p>
              </div>
            </div>

            {/* Hadith & Arabic Calligraphy Card */}
            <div className="glass-card-dark rounded-2xl p-5 border border-white/10 shadow-xl relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-400 shrink-0 mt-0.5">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <p className="font-arabic text-xl sm:text-2xl text-gold-300 font-bold leading-relaxed text-right dir-rtl">
                    « إِنَّمَا بُعِثْتُ لِأُتَمِّمَ مَكَارِمَ الْأَخْلَاقِ »
                  </p>
                  <p className="text-xs sm:text-sm text-slate-300 italic">
                    "Sesungguhnya aku diutus untuk menyempurnakan kemuliaan akhlak."
                  </p>
                  <p className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
                    HR. Ahmad & Al-Bukhari (Adabul Mufrad)
                  </p>
                </div>
              </div>
            </div>

            {/* Core Pillars / Feature Showcase (Desktop & Tablet) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="glass-card-dark rounded-xl p-3.5 border border-white/10 hover:border-brand-500/40 transition-all duration-300 group">
                <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-300 mb-2 group-hover:scale-110 transition-transform">
                  <Zap className="w-4 h-4 text-brand-400" />
                </div>
                <h3 className="text-xs font-bold text-white mb-0.5">Pencatatan Cepat</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Input poin & kedisiplinan santri saat halaqah tanpa hambatan.
                </p>
              </div>

              <div className="glass-card-dark rounded-xl p-3.5 border border-white/10 hover:border-emerald-500/40 transition-all duration-300 group">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 mb-2 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-xs font-bold text-white mb-0.5">Threshold Otomatis</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Klasifikasi 5 level pembinaan santri terdeteksi secara real-time.
                </p>
              </div>

              <div className="glass-card-dark rounded-xl p-3.5 border border-white/10 hover:border-gold-500/40 transition-all duration-300 group">
                <div className="w-8 h-8 rounded-lg bg-gold-500/20 border border-gold-400/30 flex items-center justify-center text-gold-300 mb-2 group-hover:scale-110 transition-transform">
                  <Clock className="w-4 h-4 text-gold-400" />
                </div>
                <h3 className="text-xs font-bold text-white mb-0.5">Laporan & SP</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Generate berkas PDF & surat pemanggilan dengan Kop Pesantren.
                </p>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-brand-200/80 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-semibold text-emerald-400">Database SQLite Terenkripsi</span>
              </div>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                <span>Audit Log Aktivitas Asatidz</span>
              </div>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-gold-400" />
                <span>Tahun Ajaran {settings?.current_academic_year || '2025/2026'}</span>
              </div>
            </div>

          </div>

          {/* Right Column: Modern Authentication Card */}
          <div className="lg:col-span-6 xl:col-span-5">
            <div className="relative">
              {/* Card Ambient Glow behind */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-brand-500 via-navy-600 to-gold-500/30 rounded-3xl blur-md opacity-40" />

              {/* Main Card Container */}
              <div className="relative bg-white/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-9 shadow-2xl border border-white/50 text-slate-900">
                
                {/* Header within Card */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200/60 text-[11px] font-bold text-brand-700 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
                      Portal Pengurus & Guru
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowHelpModal(true)}
                      className="text-xs font-semibold text-slate-500 hover:text-brand-600 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Bantuan Masuk"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Bantuan</span>
                    </button>
                  </div>

                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Masuk ke Sistem
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                    Silakan masukkan email resmi dan kata sandi akun Anda.
                  </p>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs sm:text-sm animate-scale-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1 font-medium">{errorMsg}</div>
                    <button
                      type="button"
                      onClick={() => setErrorMsg('')}
                      className="text-rose-400 hover:text-rose-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  
                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Email / Nama Pengguna
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contoh: ustadz@pesantren.id"
                        required
                        autoComplete="email"
                        className="block w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Kata Sandi (Password)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowHelpModal(true)}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors cursor-pointer"
                      >
                        Lupa sandi?
                      </button>
                    </div>

                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onKeyUp={handleKeyDown}
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                        className="block w-full pl-10 pr-11 py-3 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Caps Lock Warning Banner */}
                    {capsLockOn && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 animate-scale-in">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        <span>Peringatan: Tombol Caps Lock sedang aktif</span>
                      </div>
                    )}
                  </div>

                  {/* Options: Remember Me & Security notice */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-slate-600 select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="font-medium">Ingat sesi saya</span>
                    </label>

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Sesi Terenkripsi</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full relative overflow-hidden py-3.5 px-5 bg-gradient-to-r from-brand-600 via-brand-700 to-navy-900 hover:from-brand-500 hover:via-brand-600 hover:to-navy-800 text-white font-bold rounded-xl shadow-lg shadow-brand-900/25 transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2.5">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="text-sm font-semibold tracking-wide">Memverifikasi Kredensial...</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-bold tracking-wide">Masuk Aplikasi</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                {/* 1-Click Fast Demo Switcher (High Utility for Evaluation) */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      1-Klik Akun Demo Pengujian:
                    </p>
                    <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                      Klik untuk isi
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {demoAccounts.map((acc) => {
                      const IconComp = acc.icon;
                      const isSelected = selectedDemo === acc.email;
                      return (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => handleSelectDemo(acc)}
                          className={`p-2.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between group cursor-pointer ${
                            isSelected
                              ? 'bg-brand-50 border-brand-500 ring-2 ring-brand-400/20 shadow-sm'
                              : 'bg-slate-50/80 hover:bg-slate-100/90 border-slate-200/80 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className={`p-1 rounded-md ${acc.badgeColor} border`}>
                              <IconComp className="w-3.5 h-3.5" />
                            </div>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {acc.roleName}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {acc.name.split(',')[0]}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer status within card */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Server Aktif</span>
                  </div>
                  <span>Pesantren Terintegrasi</span>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Help / Forgot Password Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-scale-in">
          <div className="relative w-full max-w-md m-auto h-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 relative">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Bantuan Akses Akun</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Kebijakan Keamanan & Reset Kata Sandi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-3.5 text-xs sm:text-sm text-slate-600">
              <p className="leading-relaxed">
                Untuk menjaga integritas dan kerahasiaan data santri halaqah, pergantian kata sandi dikelola secara tersentralisasi oleh Administrator (Mudir) Pesantren.
              </p>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Langkah Pemulihan Sandi:</span>
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-xs">
                  <li>Hubungi Koordinator Tahfizh atau Mudir Bidang Pendidikan.</li>
                  <li>Sebutkan nama lengkap dan email resmi Asatidz Anda.</li>
                  <li>Admin akan mereset kredensial Anda melalui panel Kelola Pengguna.</li>
                </ul>
              </div>

              <div className="flex items-center gap-2 p-3 bg-brand-50 rounded-xl border border-brand-200/60 text-brand-900 text-xs">
                <PhoneCall className="w-4 h-4 text-brand-600 shrink-0" />
                <span>
                  Kontak Sekretariat: <strong>{settings?.phone || '0811-9876-5432'}</strong>
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-md cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
