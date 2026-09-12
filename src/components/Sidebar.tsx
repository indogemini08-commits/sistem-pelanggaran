import React, { useRef, useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Users,
  BookOpen,
  GraduationCap,
  ShieldAlert,
  ShieldCheck,
  Building2,
  UserCog,
  Settings,
  ScrollText,
  X,
  ChevronRight,
  Sparkles,
  Camera,
  Check,
  Award,
  HeartHandshake,
} from 'lucide-react';
import { UserRole, SchoolSettings } from '../types';
import { api } from '../services/api';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userRole?: UserRole;
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickRecord: () => void;
  onOpenQuickReward?: () => void;
  settings?: SchoolSettings | null;
  onSettingsUpdated?: () => void;
  userName?: string;
}

interface NavSection {
  title: string;
  items: Array<{
    id: string;
    label: string;
    icon: React.ElementType;
    roles: UserRole[];
    badge?: string;
  }>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole = 'teacher',
  isOpen,
  onClose,
  onOpenQuickRecord,
  onOpenQuickReward,
  settings,
  onSettingsUpdated,
  userName = 'Admin',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const isAdmin = userRole === 'admin';

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Format file tidak didukung. Harap pilih file gambar (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file gambar maksimal 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result && settings) {
        setUploadingLogo(true);
        try {
          await api.settings.updateSchool({
            appName: settings.app_name,
            schoolName: settings.school_name,
            address: settings.address,
            phone: settings.phone,
            email: settings.email,
            logoUrl: event.target.result as string,
            kopSuratText: settings.kop_surat_text,
            currentAcademicYear: settings.current_academic_year,
            actorName: userName,
          });
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
          if (onSettingsUpdated) onSettingsUpdated();
        } catch (err: any) {
          alert('Gagal memperbarui logo: ' + err.message);
        } finally {
          setUploadingLogo(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const sections: NavSection[] = [
    {
      title: 'MENU UTAMA',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Terpadu',
          icon: LayoutDashboard,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
      ],
    },
    {
      title: 'DIVISI TAHFIZH (HALAQAH)',
      items: [
        {
          id: 'records_tahfizh',
          label: 'Pelanggaran Tahfizh',
          icon: BookOpen,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'rewards_tahfizh',
          label: 'Kebaikan & Prestasi',
          icon: Award,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'violations_tahfizh',
          label: 'Master Aturan Tahfizh',
          icon: ShieldAlert,
          roles: ['admin', 'coordinator', 'kepala_kesantrian'],
        },
        {
          id: 'halaqah',
          label: 'Data Halaqah',
          icon: Users,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'teachers',
          label: 'Data Muhafizh',
          icon: GraduationCap,
          roles: ['admin', 'coordinator', 'kepala_kesantrian'],
        },
      ],
    },
    {
      title: 'DIVISI KESANTRIAN (ASRAMA)',
      items: [
        {
          id: 'records_kesantrian',
          label: 'Pelanggaran Kesantrian',
          icon: Building2,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'rewards_kesantrian',
          label: 'Kebaikan & Prestasi',
          icon: Award,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'violations_kesantrian',
          label: 'Master Aturan Kesantrian',
          icon: ShieldCheck,
          roles: ['admin', 'coordinator', 'kepala_kesantrian'],
        },
      ],
    },
    {
      title: 'DATA SANTRI & PUSAT',
      items: [
        {
          id: 'students',
          label: 'Data Santri & Poin',
          icon: GraduationCap,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'records',
          label: 'Rekap Terpadu (Semua)',
          icon: History,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'parent_portal',
          label: 'Portal Wali (Pratinjau)',
          icon: HeartHandshake,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
          badge: 'Cek NIS',
        },
      ],
    },
    {
      title: 'PENGATURAN & AUDIT',
      items: [
        {
          id: 'users',
          label: 'Manajemen Akun',
          icon: UserCog,
          roles: ['admin'],
        },
        {
          id: 'settings',
          label: 'Pengaturan & Batas Poin',
          icon: Settings,
          roles: ['admin'],
        },
        {
          id: 'audit',
          label: 'Audit Log',
          icon: ScrollText,
          roles: ['admin'],
        },
      ],
    },
  ];

  return (
    <>
      {/* Hidden file picker for direct logo upload from device */}
      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
        />
      )}

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Full-Height Modern Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 border-r border-navy-800/90 text-slate-200 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } flex flex-col justify-between overflow-y-auto`}
      >
        <div className="flex flex-col flex-1">
          {/* Top Brand Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-navy-800/80 shrink-0 bg-navy-950/80">
            <div className="flex items-center gap-3 min-w-0">
              {/* Logo Container with Quick Upload Trigger for Admin */}
              <div
                className={`relative group ${isAdmin ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (isAdmin) {
                    fileInputRef.current?.click();
                  }
                }}
                title={isAdmin ? 'Klik untuk ganti logo dari perangkat' : undefined}
              >
                <div className="w-10 h-10 rounded-2xl bg-white/10 p-1.5 flex items-center justify-center ring-2 ring-brand-400/25 shadow-inner flex-shrink-0 transition-transform group-hover:scale-105">
                  <img
                    src={settings?.logo_url || '/logo.svg'}
                    alt="Logo Halaqah"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo.svg';
                    }}
                  />
                </div>

                {isAdmin && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center text-white ring-2 ring-navy-950 shadow-md opacity-80 group-hover:opacity-100 transition-opacity">
                    {uploadingLogo ? (
                      <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : uploadSuccess ? (
                      <Check className="w-3 h-3 text-emerald-300" />
                    ) : (
                      <Camera className="w-2.5 h-2.5" />
                    )}
                  </div>
                )}
              </div>

              {/* Title & Subtitle */}
              <div
                className="truncate cursor-pointer"
                onClick={() => {
                  onSelectTab('dashboard');
                  onClose();
                }}
              >
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-black tracking-tight text-white truncate hover:text-brand-300 transition-colors">
                    {settings?.app_name || 'Poin Halaqah'}
                  </h1>
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[140px] font-medium">
                  {settings?.school_name || "Pesantren Tahfizh"}
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Button & Navigation Links */}
          <div className="p-4 space-y-5 flex-1">
            {/* Quick Action Button with vibrant glow */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  onOpenQuickRecord();
                  onClose();
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 via-brand-500 to-blue-600 hover:from-brand-500 hover:to-blue-500 text-white font-extrabold rounded-2xl shadow-lg shadow-brand-500/25 border border-white/15 transition-all flex items-center justify-center gap-2.5 group transform active:scale-95 text-xs sm:text-sm"
              >
                <PlusCircle className="w-4 h-4 text-white group-hover:rotate-90 transition-transform duration-300" />
                <span className="tracking-wide">+ Catat Pelanggaran</span>
              </button>

              {onOpenQuickReward && (
                <button
                  onClick={() => {
                    onOpenQuickReward();
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-md shadow-emerald-600/20 border border-emerald-400/20 transition-all flex items-center justify-center gap-2 group transform active:scale-95 text-xs"
                >
                  <Award className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform duration-200" />
                  <span className="tracking-wide">★ Catat Kebaikan</span>
                </button>
              )}
            </div>

            {/* Navigation Sections */}
            <nav className="space-y-4 pt-1" aria-label="Menu Navigasi">
              {sections.map((sec, secIdx) => {
                const visibleItems = sec.items.filter((item) => item.roles.includes(userRole));
                if (visibleItems.length === 0) return null;

                return (
                  <div key={sec.title} className="space-y-1">
                    {/* Section Divider (between sections) */}
                    {secIdx > 0 && (
                      <div className="pt-2 pb-1 border-t border-navy-800/70 my-1" />
                    )}

                    {/* Section Title Header with accent dot */}
                    <div className="px-3 py-1 flex items-center gap-2 select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        {sec.title}
                      </span>
                    </div>

                    {/* Section Items */}
                    <div className="space-y-1 mt-1">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentTab === item.id;

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              onSelectTab(item.id);
                              onClose();
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all group ${
                              isActive
                                ? 'bg-brand-600 text-white shadow-md shadow-brand-950/50 border border-brand-400/30'
                                : 'text-slate-300 hover:bg-white/8 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                  isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-white/5 text-slate-400 group-hover:bg-brand-500/20 group-hover:text-brand-300'
                                }`}
                              >
                                <Icon className="w-4 h-4 shrink-0" />
                              </div>
                              <span className="tracking-tight truncate text-left">{item.label}</span>
                            </div>

                            {isActive ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-navy-800/80 bg-navy-950/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <div>
              <p className="font-bold text-slate-200">Tahfizh & Kedisiplinan</p>
              <p className="text-[10px] text-brand-300/80 mt-0.5">Sistem Poin Terintegrasi</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
              Online
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
