import React from 'react';
import {
  LogOut,
  User,
  PlusCircle,
  Menu,
  Sparkles,
  Calendar,
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Users,
  ShieldAlert,
  History,
  UserCog,
  Settings as SettingsIcon,
  ScrollText,
  Award,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { User as UserType, SchoolSettings } from '../types';

interface NavbarProps {
  currentUser: UserType | null;
  settings: SchoolSettings | null;
  onLogout: () => void;
  onOpenQuickRecord: () => void;
  onOpenQuickReward?: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  onSettingsUpdated?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  settings,
  onLogout,
  onOpenQuickRecord,
  onOpenQuickReward,
  onToggleSidebar,
  currentTab = 'dashboard',
  onSelectTab,
}) => {
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return { label: 'Dashboard Monitoring', icon: LayoutDashboard };
      case 'students':
        return { label: 'Data Santri & Poin', icon: GraduationCap };
      case 'student_detail':
        return { label: 'Profil Detail Santri', icon: GraduationCap };
      case 'halaqah':
        return { label: 'Kelompok Halaqah Al-Qur\'an', icon: BookOpen };
      case 'teachers':
        return { label: 'Data Asatidz & Muhafizh', icon: Users };
      case 'violations_master':
        return { label: 'Master Pelanggaran & Poin', icon: ShieldAlert };
      case 'violations_tahfizh':
        return { label: 'Master Aturan Tahfizh', icon: ShieldAlert };
      case 'violations_kesantrian':
        return { label: 'Master Aturan Kesantrian', icon: ShieldCheck };
      case 'records':
        return { label: 'Riwayat Pelanggaran Terpadu', icon: History };
      case 'records_tahfizh':
        return { label: 'Pelanggaran Divisi Tahfizh', icon: BookOpen };
      case 'records_kesantrian':
        return { label: 'Pelanggaran Divisi Kesantrian', icon: Building2 };
      case 'rewards_tahfizh':
        return { label: 'Kebaikan & Prestasi Tahfizh', icon: Award };
      case 'rewards_kesantrian':
        return { label: 'Kebaikan & Prestasi Kesantrian', icon: Award };
      case 'users':
        return { label: 'Manajemen Akun Pengguna', icon: UserCog };
      case 'settings':
        return { label: 'Pengaturan & Batas Poin', icon: SettingsIcon };
      case 'audit':
        return { label: 'Log Audit Aktivitas Sistem', icon: ScrollText };
      default:
        return { label: 'Sistem Poin Halaqah', icon: Sparkles };
    }
  };

  const activeTabMeta = getTabTitle(currentTab);
  const TabIcon = activeTabMeta.icon;

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Admin
          </span>
        );
      case 'coordinator':
        return (
          <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Koordinator Tahfizh
          </span>
        );
      case 'kepala_kesantrian':
        return (
          <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Kepala Kesantrian
          </span>
        );
      case 'teacher':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Muhafizh
          </span>
        );
      case 'guru':
        return (
          <span className="bg-teal-100 text-teal-800 border border-teal-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Guru
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Toggle & Desktop Breadcrumb */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile Hamburger Menu */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Logo & App Title */}
        <div
          className="flex lg:hidden items-center gap-2 cursor-pointer"
          onClick={() => onSelectTab && onSelectTab('dashboard')}
        >
          <div className="w-8 h-8 rounded-xl bg-navy-950 p-1 flex items-center justify-center ring-1 ring-brand-400/30">
            <img
              src={settings?.logo_url || '/logo.svg'}
              alt="Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.svg';
              }}
            />
          </div>
          <span className="text-sm font-black text-slate-900 truncate">
            {settings?.app_name || 'Poin Halaqah'}
          </span>
        </div>

        {/* Desktop Active Section Title with Icon */}
        <div className="hidden lg:flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
            <TabIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">
              {activeTabMeta.label}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              {settings?.school_name || "Pesantren Tahfizh Al-Qur'an"}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Academic Year Pill, Quick Action, Profile & Logout */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Academic Year Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs text-slate-700 font-semibold">
          <Calendar className="w-3.5 h-3.5 text-brand-600" />
          <span>T.A. {settings?.current_academic_year || '2025/2026'}</span>
        </div>

        {/* Quick Reward (Kebaikan & Pengurangan Poin) Button */}
        {onOpenQuickReward && (
          <button
            onClick={onOpenQuickReward}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 border border-white/10 transition-all transform active:scale-95"
            title="Catat Kegiatan Baik / Pengurangan Poin Santri"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span className="hidden md:inline">Catat Kebaikan</span>
            <span className="md:hidden font-extrabold">★ Kebaikan</span>
          </button>
        )}

        {/* Quick Violation Record Button */}
        <button
          onClick={onOpenQuickRecord}
          className="flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-brand-500/20 border border-white/10 transition-all transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4 text-brand-100" />
          <span className="hidden sm:inline">Catat Pelanggaran</span>
          <span className="sm:hidden font-extrabold">+ Pelanggaran</span>
        </button>

        {/* User Meta & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
              {currentUser?.name || 'Pengguna'}
            </p>
            <div className="mt-0.5">{getRoleBadge(currentUser?.role)}</div>
          </div>

          {/* User Initial Avatar */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-navy-900 text-white flex items-center justify-center font-black text-sm shadow-sm ring-2 ring-brand-500/20">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            title="Keluar / Logout"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
