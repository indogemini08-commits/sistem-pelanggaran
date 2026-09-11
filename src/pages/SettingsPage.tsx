import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Building,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Upload,
  Save,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  Trash2,
  Eye,
  FileText,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { SchoolSettings, PointThreshold, User } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/Badge';

interface SettingsPageProps {
  currentUser: User | null;
  settings: SchoolSettings | null;
  onSettingsUpdated: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentUser,
  settings,
  onSettingsUpdated,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'school' | 'thresholds'>('school');

  // School Settings form
  const [appName, setAppName] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('/logo.svg');
  const [kopSuratText, setKopSuratText] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('2025/2026');

  // Device Logo Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFileError, setLogoFileError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Thresholds form
  const [thresholds, setThresholds] = useState<PointThreshold[]>([]);

  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.settings.get();
      if (data.settings) {
        setAppName(data.settings.app_name);
        setSchoolName(data.settings.school_name);
        setAddress(data.settings.address);
        setPhone(data.settings.phone || '');
        setEmail(data.settings.email || '');
        setLogoUrl(data.settings.logo_url || '/logo.svg');
        setKopSuratText(data.settings.kop_surat_text || '');
        setAcademicYear(data.settings.current_academic_year || '2025/2026');
      }
      if (data.thresholds) {
        setThresholds(data.thresholds);
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
    }
  };

  // Handle image upload from device
  const processImageFile = (file: File) => {
    setLogoFileError('');

    // Validate type
    if (!file.type.startsWith('image/')) {
      setLogoFileError('Format file tidak didukung. Harap pilih file gambar (PNG, JPG, JPEG, SVG, WebP).');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setLogoFileError('Ukuran file gambar terlalu besar (maksimal 5 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setLogoUrl(e.target.result as string);
        setSuccessMsg('Logo baru berhasil dipilih dari perangkat. Klik "Simpan Pengaturan" untuk menerapkan secara permanen.');
      }
    };
    reader.onerror = () => {
      setLogoFileError('Gagal membaca file gambar dari perangkat.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleResetToDefaultLogo = () => {
    setLogoUrl('/logo.svg');
    setLogoFileError('');
    setSuccessMsg('Logo dikembalikan ke logo bawaan sistem (/logo.svg). Jangan lupa simpan perubahan.');
  };

  const handleSaveSchoolSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.settings.updateSchool({
        appName,
        schoolName,
        address,
        phone,
        email,
        logoUrl,
        kopSuratText,
        currentAcademicYear: academicYear,
        actorName: currentUser?.name || 'Admin',
      });
      setSuccessMsg(res.message);
      onSettingsUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan pengaturan lembaga');
    } finally {
      setSaving(false);
    }
  };

  const handleThresholdChange = (index: number, field: keyof PointThreshold, val: any) => {
    const next = [...thresholds];
    (next[index] as any)[field] = val;
    setThresholds(next);
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.settings.updateThresholds(thresholds, currentUser?.name || 'Admin');
      setSuccessMsg(res.message);
      onSettingsUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan batas poin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-scale-in">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-brand-50 text-brand-600 rounded-2xl border border-brand-100 shadow-sm">
              <Settings className="w-6 h-6" />
            </div>
            <span>Pengaturan Lembaga & Sistem</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ubah identitas aplikasi, unggah logo dari perangkat, format Kop Surat PDF, dan konfigurasi ambang batas status poin.
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl max-w-md border border-slate-200/80">
        <button
          onClick={() => {
            setActiveSubTab('school');
            setSuccessMsg('');
            setErrorMsg('');
          }}
          className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all ${
            activeSubTab === 'school'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Identitas & Logo</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('thresholds');
            setSuccessMsg('');
            setErrorMsg('');
          }}
          className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all ${
            activeSubTab === 'thresholds'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Batas Poin (Status)</span>
        </button>
      </div>

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm rounded-2xl flex items-center gap-3 shadow-sm animate-scale-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm rounded-2xl flex items-center gap-3 shadow-sm animate-scale-in">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 1: IDENTITAS SEKOLAH & LOGO UPLOAD          */}
      {/* ==================================================== */}
      {activeSubTab === 'school' && (
        <form onSubmit={handleSaveSchoolSettings} className="space-y-6">
          {/* LOGO UPLOAD SECTION (DARI PERANGKAT DEVICE) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-soft space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Logo Aplikasi & Lembaga (Upload dari Perangkat)
                </h2>
                <p className="text-xs text-slate-500">
                  Logo akan otomatis tampil di Navbar atas, halaman Login, dan Kop Surat resmi PDF.
                </p>
              </div>
            </div>

            {logoFileError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{logoFileError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Dropzone & File Selector */}
              <div className="lg:col-span-7 space-y-3">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-brand-500 bg-brand-50/50 ring-4 ring-brand-500/10 scale-[1.01]'
                      : 'border-slate-300 hover:border-brand-500 bg-slate-50/60 hover:bg-brand-50/20'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-brand-100/80 text-brand-700 flex items-center justify-center shadow-inner">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Klik untuk Pilih Gambar dari Perangkat HP / Laptop
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Atau seret dan lepas (drag & drop) file gambar ke kotak ini
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                    <span>Format: PNG, JPG, JPEG, SVG, WebP</span>
                    <span>•</span>
                    <span>Maksimal 5 MB</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Ingin menggunakan logo bawaan pesantren?
                  </span>
                  <button
                    type="button"
                    onClick={handleResetToDefaultLogo}
                    className="text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1.5 hover:underline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset ke Logo Standar</span>
                  </button>
                </div>
              </div>

              {/* Live Preview Cards */}
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Pratinjau Tampilan (Live Preview)
                </span>

                {/* Preview on Dark Navbar */}
                <div className="p-4 rounded-2xl bg-navy-950 text-white border border-navy-800 shadow-md">
                  <span className="text-[10px] uppercase tracking-wider text-brand-300 font-bold block mb-2">
                    Pratinjau di Header / Navbar:
                  </span>
                  <div className="flex items-center gap-3">
                    <img
                      src={logoUrl || '/logo.svg'}
                      alt="Logo Preview"
                      className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1 ring-2 ring-white/20"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.svg';
                      }}
                    />
                    <div className="truncate">
                      <p className="text-sm font-black text-white truncate">
                        {appName || 'Poin Halaqah'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {schoolName || 'Pesantren Tahfizh'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview on Official Paper / Kop Surat */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-2">
                    Pratinjau di Kop Surat PDF:
                  </span>
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                    <img
                      src={logoUrl || '/logo.svg'}
                      alt="Logo Preview"
                      className="w-10 h-10 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.svg';
                      }}
                    />
                    <div className="text-center flex-1">
                      <p className="text-xs font-bold text-navy-950 uppercase truncate">
                        {schoolName || 'PESANTREN TAHFIZH'}
                      </p>
                      <p className="text-[9px] font-bold text-brand-700 truncate">
                        {kopSuratText || 'DIVISI HALAQAH TAHFIZH'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FORM IDENTITAS SEKOLAH */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-soft space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Informasi Sekolah & Aplikasi
                </h2>
                <p className="text-xs text-slate-500">
                  Informasi ini akan tercantum di kop surat resmi, laporan PDF, dan header aplikasi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Nama Aplikasi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  Nama Aplikasi
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Sistem Poin Santri Halaqah"
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white font-medium"
                  required
                />
              </div>

              {/* Nama Sekolah / Lembaga */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-brand-600" />
                  Nama Lembaga / Pesantren
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Pesantren Tahfizh Al-Qur'an Imam Asy-Syathibi"
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white font-medium"
                  required
                />
              </div>

              {/* Alamat Lengkap */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  Alamat Lengkap Pesantren / Lembaga
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Karang Anyar No. 45, Kompleks Islamic Center, Bogor, Jawa Barat"
                  rows={2}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white font-medium"
                  required
                />
              </div>

              {/* No. Telepon / Kontak */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-brand-600" />
                  Nomor Telepon / Kontak Resmi
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0811-9876-5432 / (0251) 8345678"
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-white"
                />
              </div>

              {/* Email Lembaga */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-brand-600" />
                  Email Resmi Lembaga
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tahfizh@pesantren.sch.id"
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-white"
                />
              </div>

              {/* Teks Sub-Kop Surat */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brand-600" />
                  Teks Baris Kedua Kop Surat (Sub-Lembaga / Bidang)
                </label>
                <input
                  type="text"
                  value={kopSuratText}
                  onChange={(e) => setKopSuratText(e.target.value)}
                  placeholder="BIDANG PENDIDIKAN DAN KEPENGASUHAN - DIVISI HALAQAH TAHFIZH"
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-white font-semibold uppercase"
                />
              </div>

              {/* Tahun Ajaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tahun Ajaran Berjalan
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2025/2026"
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-white font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end pt-5 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="px-7 py-3 bg-gradient-to-r from-brand-600 to-navy-900 hover:from-brand-500 hover:to-navy-800 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 transform active:scale-98 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan Lembaga'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 2: BATAS POIN (THRESHOLDS MANAGEMENT)        */}
      {/* ==================================================== */}
      {activeSubTab === 'thresholds' && (
        <form onSubmit={handleSaveThresholds} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-soft space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Pengaturan Status Ambang Batas Poin
              </h2>
              <p className="text-xs text-slate-500">
                Angka batas poin tidak di-hardcode dan dapat disesuaikan dengan pedoman kepengasuhan pondok.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {thresholds.map((th, idx) => (
              <div
                key={th.id || idx}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 hover:border-brand-200 transition-colors"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                  {/* Min Poin */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Min Poin
                    </label>
                    <input
                      type="number"
                      value={th.minimum_points}
                      onChange={(e) =>
                        handleThresholdChange(idx, 'minimum_points', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900"
                    />
                  </div>

                  {/* Max Poin */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Maks Poin
                    </label>
                    <input
                      type="number"
                      value={th.maximum_points}
                      onChange={(e) =>
                        handleThresholdChange(idx, 'maximum_points', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900"
                    />
                  </div>

                  {/* Status Label */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Label Status
                    </label>
                    <input
                      type="text"
                      value={th.status_name}
                      onChange={(e) => handleThresholdChange(idx, 'status_name', e.target.value)}
                      placeholder="AMAN / PERLU PEMBINAAN..."
                      className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-brand-700 uppercase"
                    />
                  </div>

                  {/* Preview Badge */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Tampilan Badge
                    </label>
                    <div className="pt-1">
                      <StatusBadge statusName={th.status_name} badgeColor={th.badge_color} />
                    </div>
                  </div>
                </div>

                {/* Deskripsi */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Tindakan / Deskripsi Arahan
                  </label>
                  <input
                    type="text"
                    value={th.description || ''}
                    onChange={(e) => handleThresholdChange(idx, 'description', e.target.value)}
                    placeholder="Bimbingan oleh muhafizh / Surat peringatan..."
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-7 py-3 bg-gradient-to-r from-brand-600 to-navy-900 hover:from-brand-500 hover:to-navy-800 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 transform active:scale-98 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan Batas Poin'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
