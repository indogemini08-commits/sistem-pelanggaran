import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Users,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  History,
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Clock,
  MapPin,
  CheckCircle2,
  FileText,
  ChevronRight,
  Building2,
  ShieldAlert,
  Award,
} from 'lucide-react';
import { User, DashboardStats, Halaqah, Student } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/Badge';

interface DashboardProps {
  currentUser: User | null;
  onOpenQuickRecord: () => void;
  onOpenQuickReward?: () => void;
  onSelectTab: (tab: string) => void;
  onSelectStudent: (studentId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  onOpenQuickRecord,
  onOpenQuickReward,
  onSelectTab,
  onSelectStudent,
}) => {
  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'guru';

  const [dashboardDivision, setDashboardDivision] = useState<'all' | 'tahfizh' | 'kesantrian'>('all');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [teacherHalaqahs, setTeacherHalaqahs] = useState<Halaqah[]>([]);
  const [teacherStudents, setTeacherStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadDashboardData();
  }, [currentUser, dashboardDivision]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const s = await api.records.stats(dashboardDivision);
      setStats(s);

      if (isTeacher) {
        const allHalaqahs = await api.halaqah.list();
        const myHalaqahs = allHalaqahs.filter(
          (h) => h.teacher_id === currentUser?.teacherId || h.teacher_name?.includes(currentUser?.name || '---')
        );
        setTeacherHalaqahs(myHalaqahs.length > 0 ? myHalaqahs : allHalaqahs.slice(0, 1));

        // Fetch students in my halaqah
        if (myHalaqahs.length > 0) {
          const sList = await api.halaqah.getStudents(myHalaqahs[0].id);
          setTeacherStudents(sList);
        } else if (allHalaqahs.length > 0) {
          const sList = await api.halaqah.getStudents(allHalaqahs[0].id);
          setTeacherStudents(sList);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: DASHBOARD MUHAFAZH (MOBILE-FIRST)
  // ==========================================
  if (isTeacher) {
    const halaqahPrimary = teacherHalaqahs[0];
    const topStudentsInHalaqah = [...teacherStudents].sort(
      (a, b) => (b.total_points || 0) - (a.total_points || 0)
    );

    return (
      <div className="space-y-6 animate-scale-in">
        {/* Sapaan Islami & Kartu Utama Muhafizh */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-950 via-navy-900 to-brand-900 text-white p-6 sm:p-8 shadow-xl border border-navy-800">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold text-brand-200 mb-3 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-brand-300" />
              <span>Portal Muhafizh & Pembina Santri</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Assalamu'alaikum, {currentUser?.name || 'Ustadz'}
            </h1>
            <p className="mt-1 text-sm text-slate-300 max-w-xl font-light">
              Catat dan pantau kedisiplinan santri baik di halaqah Al-Qur'an maupun di lingkungan asrama dengan sistem poin terpadu.
            </p>

            {/* BIG PROMINENT BUTTONS: + CATAT PELANGGARAN & ★ CATAT KEBAIKAN */}
            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onOpenQuickRecord}
                className="w-full sm:w-auto px-5 sm:px-7 py-3.5 sm:py-4 bg-gradient-to-r from-brand-500 to-blue-600 hover:from-brand-600 hover:to-blue-700 text-white text-sm sm:text-lg font-black rounded-2xl shadow-xl shadow-brand-500/30 transition-all flex items-center justify-center gap-2.5 sm:gap-3 transform active:scale-95 group min-h-[48px]"
              >
                <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6 text-brand-200 group-hover:rotate-90 transition-transform duration-300 shrink-0" />
                <span>+ CATAT PELANGGARAN SANTRI</span>
              </button>

              {onOpenQuickReward && (
                <button
                  type="button"
                  onClick={onOpenQuickReward}
                  className="w-full sm:w-auto px-5 sm:px-7 py-3.5 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm sm:text-lg font-black rounded-2xl shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2.5 sm:gap-3 transform active:scale-95 group min-h-[48px]"
                >
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-200 group-hover:scale-110 transition-transform duration-200 shrink-0" />
                  <span>★ CATAT KEBAIKAN SANTRI</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Halaqah Aktif */}
        {halaqahPrimary && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                  Halaqah yang Diampu
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-0.5">
                  {halaqahPrimary.name}
                </h2>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {halaqahPrimary.schedule || 'Jadwal Reguler'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {halaqahPrimary.location || 'Masjid Utama'}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
                    {teacherStudents.length} Santri Bimbingan
                  </span>
                </div>
              </div>
            </div>

            {/* List Santri di Halaqah */}
            <div className="mt-4 divide-y divide-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Daftar Santri & Akumulasi Poin
              </h3>
              {topStudentsInHalaqah.slice(0, 8).map((st) => (
                <div
                  key={st.id}
                  onClick={() => onSelectStudent(st.id)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 font-bold text-xs flex items-center justify-center text-slate-600">
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{st.name}</p>
                      <p className="text-xs text-slate-400">NIS: {st.student_number} • Kelas {st.class}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(st.total_deductions || 0) > 0 && (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full border border-emerald-300">
                        -{st.total_deductions} pts
                      </span>
                    )}
                    <span className="text-sm font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                      {st.total_points || 0} Poin
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}

              {topStudentsInHalaqah.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Belum ada data santri pada halaqah ini.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: DASHBOARD MUDIR / KOORDINATOR / KEPALA KESANTRIAN
  // ==========================================
  return (
    <div className="space-y-6 animate-scale-in">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 bg-gradient-to-r from-navy-950 via-navy-900 to-brand-900 rounded-3xl text-white shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold text-brand-200 mb-2 border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-brand-300" />
            <span>Pusat Kendali Kedisiplinan Terpadu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Dashboard Monitoring Kedisiplinan
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-light mt-1 max-w-xl">
            Monitoring terpadu akumulasi kedisiplinan dan pengurangan poin prestasi santri di Divisi Tahfizh dan Divisi Kesantrian secara real-time.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={onOpenQuickRecord}
            className="w-full sm:w-auto justify-center min-h-[44px] px-5 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 transform active:scale-95 whitespace-nowrap"
          >
            <PlusCircle className="w-5 h-5 text-brand-200" />
            <span>+ Catat Pelanggaran</span>
          </button>

          {onOpenQuickReward && (
            <button
              onClick={onOpenQuickReward}
              className="w-full sm:w-auto justify-center min-h-[44px] px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 transform active:scale-95 whitespace-nowrap"
            >
              <Award className="w-5 h-5 text-emerald-200" />
              <span>★ Catat Kebaikan</span>
            </button>
          )}
        </div>
      </div>

      {/* Division View Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1.5 bg-slate-200/70 rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setDashboardDivision('all')}
          className={`w-full min-h-[42px] justify-center px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            dashboardDivision === 'all'
              ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-300'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🌐 Ringkasan Terpadu</span>
        </button>

        <button
          onClick={() => setDashboardDivision('tahfizh')}
          className={`w-full min-h-[42px] justify-center px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            dashboardDivision === 'tahfizh'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 hover:text-emerald-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>🕌 Divisi Tahfizh</span>
        </button>

        <button
          onClick={() => setDashboardDivision('kesantrian')}
          className={`w-full min-h-[42px] justify-center px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            dashboardDivision === 'kesantrian'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:text-blue-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>🏢 Divisi Kesantrian</span>
        </button>
      </div>

      {/* Metric Cards (Ringkasan Indikator Terpadu) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {/* Total Santri */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-soft">
          <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4 text-brand-600 shrink-0" />
            <span className="truncate">Total Santri</span>
          </div>
          <p className="text-xl sm:text-3xl font-black text-slate-900">
            {stats?.summary.totalStudents || 0}
          </p>
          <span className="text-[10px] sm:text-[11px] text-emerald-600 font-medium block truncate">Santri aktif pondok</span>
        </div>

        {/* Total Poin Bersih Terpadu */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-soft">
          <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="truncate">Poin Netto ({dashboardDivision === 'kesantrian' ? 'Kesantrian' : dashboardDivision === 'tahfizh' ? 'Tahfizh' : 'Terpadu'})</span>
          </div>
          <p className="text-xl sm:text-3xl font-black text-rose-600">
            {stats?.summary.totalPoints || 0}
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block truncate">
            {stats?.summary.totalRecords || 0} pelanggaran aktif
          </span>
        </div>

        {/* Total Pengurangan Kebaikan */}
        <div className="bg-emerald-50/80 p-3.5 sm:p-5 rounded-2xl border border-emerald-200 shadow-soft">
          <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-800 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1">
            <Award className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">Poin Dikurangi</span>
          </div>
          <p className="text-xl sm:text-3xl font-black text-emerald-700">
            -{stats?.summary.totalPointsDeducted || 0}
          </p>
          <span className="text-[10px] sm:text-[11px] text-emerald-600 font-semibold block truncate">
            {stats?.summary.totalPositiveRecords || 0} kebaikan / reward
          </span>
        </div>

        {/* Kontribusi Divisi Tahfizh */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-soft">
          <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-800 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">Divisi Tahfizh</span>
          </div>
          <p className="text-xl sm:text-3xl font-black text-emerald-700">
            {stats?.summary.tahfizhTotalPoints || 0}
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block truncate">
            Ded: -{stats?.summary.tahfizhDeductedPoints || 0} • {stats?.summary.tahfizhRecordsCount || 0} kjdn
          </span>
        </div>

        {/* Kontribusi Divisi Kesantrian */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-soft col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1.5 sm:gap-2 text-blue-800 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">Divisi Kesantrian</span>
          </div>
          <p className="text-xl sm:text-3xl font-black text-blue-700">
            {stats?.summary.kesantrianTotalPoints || 0}
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block truncate">
            Ded: -{stats?.summary.kesantrianDeductedPoints || 0} • {stats?.summary.kesantrianRecordsCount || 0} kjdn
          </span>
        </div>
      </div>

      {/* Grid: Top 10 Santri & Kategori */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Top 10 Santri Poin Tertinggi */}
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-soft overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-lg font-bold text-slate-900">
                  10 Santri Poin Tertinggi
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  Akumulasi terpadu Tahfizh & Kesantrian
                </p>
              </div>
            </div>
            <button
              onClick={() => onSelectTab('students')}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 min-h-[36px] px-2"
            >
              <span>Semua Santri</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Cards List for Top 10 */}
          <div className="block md:hidden divide-y divide-slate-100">
            {stats?.topStudents.map((s, idx) => (
              <div
                key={s.id}
                onClick={() => onSelectStudent(s.id)}
                className="p-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{s.name}</p>
                      <p className="text-[11px] text-slate-400">NIS: {s.student_number} • Kelas {s.class}</p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                    {s.total_points} Poin
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-50">
                  <span className="text-slate-500 truncate">{s.halaqah_name || 'Tanpa Halaqah'}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      T: {s.tahfizh_points || 0}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                      K: {s.kesantrian_points || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {(!stats?.topStudents || stats.topStudents.length === 0) && (
              <div className="p-6 text-center text-slate-400 text-xs">
                Belum ada santri dengan catatan poin pelanggaran.
              </div>
            )}
          </div>

          {/* Desktop Table for Top 10 */}
          <div className="hidden md:block divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3 text-center w-10">#</th>
                  <th className="px-4 py-3">Nama Santri</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Halaqah</th>
                  <th className="px-4 py-3 text-center">Rincian Divisi</th>
                  <th className="px-4 py-3 text-center">Total Poin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.topStudents.map((s, idx) => (
                  <tr
                    key={s.id}
                    onClick={() => onSelectStudent(s.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900 hover:text-brand-600 transition-colors">
                        {s.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">NIS: {s.student_number}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-600">{s.class}</td>
                    <td className="px-4 py-3 text-slate-600">{s.halaqah_name || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                          T: {s.tahfizh_points || 0}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                          K: {s.kesantrian_points || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-3 py-1 rounded-xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                        {s.total_points} Poin
                      </span>
                    </td>
                  </tr>
                ))}
                {(!stats?.topStudents || stats.topStudents.length === 0) && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Belum ada santri dengan catatan poin pelanggaran.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pelanggaran per Kategori */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-soft p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Kategori Pelanggaran</h2>
              <p className="text-xs text-slate-500">Distribusi kejadian per kategori</p>
            </div>
          </div>

          <div className="space-y-3">
            {stats?.byCategory.map((c) => {
              const maxCount = Math.max(...(stats?.byCategory.map((x) => x.count) || [1]), 1);
              const percentage = Math.round((c.count / maxCount) * 100);
              const isKesantrian = c.division === 'kesantrian';

              return (
                <div key={c.category + (c.division || '')} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span>{c.category}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        isKesantrian ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isKesantrian ? 'Kesantrian' : 'Tahfizh'}
                      </span>
                    </span>
                    <span className="text-slate-500">
                      <strong className="text-slate-900">{c.count}</strong>x ({c.points} Poin)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isKesantrian
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-400'
                          : 'bg-gradient-to-r from-brand-600 to-emerald-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(!stats?.byCategory || stats.byCategory.length === 0) && (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada data kategori</p>
            )}
          </div>

          {/* Quick summary reminder */}
          <div className="pt-4 border-t border-slate-100 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <ShieldAlert className="w-4 h-4 text-brand-600" />
              <span>Sistem Poin Terintegrasi</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Santri mendapatkan akumulasi poin dari pelanggaran halaqah dan kesantrian dengan ambang batas sanksi (SP / Tindakan Lanjut) yang seragam.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
