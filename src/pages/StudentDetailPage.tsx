import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  Calendar,
  BookOpen,
  User,
  History,
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Download,
  Share2,
  Building2,
  Sparkles,
  MinusCircle,
  Award,
} from 'lucide-react';
import { Student, ViolationRecord, PositiveRecord, SchoolSettings } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/Badge';
import { generateStudentDetailPDF } from '../utils/pdfGenerator';

interface StudentDetailPageProps {
  studentId: string;
  onBack: () => void;
  settings: SchoolSettings | null;
}

export const StudentDetailPage: React.FC<StudentDetailPageProps> = ({
  studentId,
  onBack,
  settings,
}) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<ViolationRecord[]>([]);
  const [positiveRecords, setPositiveRecords] = useState<PositiveRecord[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'violations' | 'rewards'>('violations');
  const [recordDivisionFilter, setRecordDivisionFilter] = useState<'all' | 'tahfizh' | 'kesantrian'>('all');

  useEffect(() => {
    loadStudentDetails();
  }, [studentId]);

  const loadStudentDetails = async () => {
    setLoading(true);
    try {
      const data = await api.students.getDetail(studentId);
      setStudent(data.student);
      setRecords(data.records);
      setPositiveRecords(data.positive_records || []);
      setHistory(data.history);
    } catch (err: any) {
      alert('Gagal memuat profil santri: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    if (recordDivisionFilter === 'all') return records;
    return records.filter((r) => (r.division || 'tahfizh') === recordDivisionFilter);
  }, [records, recordDivisionFilter]);

  const filteredPositiveRecords = useMemo(() => {
    if (recordDivisionFilter === 'all') return positiveRecords;
    return positiveRecords.filter((r) => r.division === recordDivisionFilter);
  }, [positiveRecords, recordDivisionFilter]);

  const tahfizhRecordsCount = useMemo(() => {
    return records.filter((r) => (r.division || 'tahfizh') === 'tahfizh').length;
  }, [records]);

  const kesantrianRecordsCount = useMemo(() => {
    return records.filter((r) => r.division === 'kesantrian').length;
  }, [records]);

  const tahfizhPositiveCount = useMemo(() => {
    return positiveRecords.filter((r) => r.division === 'tahfizh').length;
  }, [positiveRecords]);

  const kesantrianPositiveCount = useMemo(() => {
    return positiveRecords.filter((r) => r.division === 'kesantrian').length;
  }, [positiveRecords]);

  const handlePrintPDF = () => {
    if (!student || !settings) return;
    generateStudentDetailPDF(student, records, settings);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-slate-500">Data santri tidak ditemukan.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-scale-in">
      {/* Top Bar with Back Button & Print PDF */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Data Santri</span>
        </button>

        <button
          onClick={handlePrintPDF}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          <span>Cetak Surat Rekap (PDF)</span>
        </button>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-soft">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Avatar & Bio */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-brand-700 to-navy-900 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg ring-4 ring-brand-500/20 flex-shrink-0">
              {student.name.charAt(0).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {student.name}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 font-mono font-bold text-slate-600">
                  NIS: {student.student_number}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4 text-brand-600" />
                  Kelas: <strong>{student.class}</strong> ({student.gender === 'L' ? 'Ikhwan' : 'Akhawat'})
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-brand-600" />
                  Halaqah: <strong>{student.halaqah_name || 'Belum diplot'}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4 text-brand-600" />
                  Muhafizh: <strong>{student.teacher_name || '-'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* TOTAL POIN & STATUS BOX WITH DIVISION & REWARD BREAKDOWN */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gradient-to-br from-slate-50 to-blue-50/50 p-4 sm:p-5 rounded-2xl border border-blue-100 shadow-inner w-full md:w-auto justify-between md:justify-end">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Poin Bersih (Net)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black text-rose-600 tracking-tight">
                  {student.total_points}
                </span>
                <span className="text-xs font-bold text-slate-600">POIN</span>
                {(student.total_deductions || 0) > 0 && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-0.5 ml-1">
                    <MinusCircle className="w-3 h-3" />
                    -{student.total_deductions} Kebaikan
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Tahfizh: {student.tahfizh_points || 0} pts
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100/70 text-blue-800 border border-blue-200 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Kesantrian: {student.kesantrian_points || 0} pts
                </span>
              </div>
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4 space-y-1 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Status Pembinaan
              </span>
              <StatusBadge
                statusName={student.status_info?.statusName || 'AMAN'}
                badgeColor={student.status_info?.badgeColor || 'emerald'}
                size="lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Riwayat Pelanggaran/Kebaikan & History Halaqah */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Records Box */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden">
          {/* Sub Tab Switcher: Pelanggaran vs Kebaikan */}
          <div className="px-5 pt-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
            <button
              onClick={() => setActiveHistoryTab('violations')}
              className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all ${
                activeHistoryTab === 'violations'
                  ? 'border-brand-600 text-brand-700 bg-white rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4 text-brand-600" />
              <span>Riwayat Pelanggaran ({records.length})</span>
            </button>
            <button
              onClick={() => setActiveHistoryTab('rewards')}
              className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all ${
                activeHistoryTab === 'rewards'
                  ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Kebaikan & Pengurangan Poin ({positiveRecords.length})</span>
            </button>
          </div>

          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {activeHistoryTab === 'violations'
                  ? 'Daftar Catatan Pelanggaran'
                  : 'Daftar Kegiatan Baik & Pemulihan Poin'}
              </h2>
              <p className="text-xs text-slate-500">
                {activeHistoryTab === 'violations'
                  ? `Total ${records.length} kejadian tercatat dalam sistem`
                  : `Total ${positiveRecords.length} kegiatan baik memotong poin pelanggaran`}
              </p>
            </div>

            {/* Division Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setRecordDivisionFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  recordDivisionFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({activeHistoryTab === 'violations' ? records.length : positiveRecords.length})
              </button>
              <button
                onClick={() => setRecordDivisionFilter('tahfizh')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  recordDivisionFilter === 'tahfizh'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                Tahfizh ({activeHistoryTab === 'violations' ? tahfizhRecordsCount : tahfizhPositiveCount})
              </button>
              <button
                onClick={() => setRecordDivisionFilter('kesantrian')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  recordDivisionFilter === 'kesantrian'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                <Building2 className="w-3 h-3" />
                Kesantrian ({activeHistoryTab === 'violations' ? kesantrianRecordsCount : kesantrianPositiveCount})
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {activeHistoryTab === 'violations' ? (
              /* Violations Table */
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="px-4 py-3">Tanggal & Waktu</th>
                    <th className="px-4 py-3">Divisi</th>
                    <th className="px-4 py-3">Jenis Pelanggaran</th>
                    <th className="px-4 py-3">Lokasi / Halaqah & Pembina</th>
                    <th className="px-4 py-3 text-center">Poin</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((r) => {
                    const isKesantrian = r.division === 'kesantrian';
                    const isCancelled = r.status === 'cancelled';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-semibold text-slate-800">{r.date}</p>
                          <p className="text-[11px] text-slate-400">{r.time} WIB</p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                              isKesantrian
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {isKesantrian ? (
                              <>
                                <Building2 className="w-3 h-3" />
                                Kesantrian
                              </>
                            ) : (
                              <>
                                <BookOpen className="w-3 h-3" />
                                Tahfizh
                              </>
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{r.violation_name_snapshot}</p>
                          {r.notes && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5">"{r.notes}"</p>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{r.halaqah_name_snapshot}</p>
                          <p className="text-[11px] text-slate-500">{r.teacher_name_snapshot}</p>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                              isCancelled
                                ? 'line-through bg-slate-100 text-slate-400'
                                : 'text-rose-600 bg-rose-50 border border-rose-200'
                            }`}
                          >
                            +{r.points_snapshot}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {isCancelled ? (
                            <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded">
                              Dibatalkan
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                              Aktif
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Tidak ada catatan pelanggaran untuk filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              /* Rewards & Positive Deeds Table */
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="px-4 py-3">Tanggal & Waktu</th>
                    <th className="px-4 py-3">Divisi</th>
                    <th className="px-4 py-3">Kegiatan Baik / Prestasi</th>
                    <th className="px-4 py-3">Lokasi & Pembimbing</th>
                    <th className="px-4 py-3 text-center">Pengurangan Poin</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPositiveRecords.map((r) => {
                    const isKesantrian = r.division === 'kesantrian';
                    const isCancelled = r.status === 'cancelled';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-semibold text-slate-800">{r.date}</p>
                          <p className="text-[11px] text-slate-400">{r.time} WIB</p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                              isKesantrian
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {isKesantrian ? (
                              <>
                                <Building2 className="w-3 h-3" />
                                Kesantrian
                              </>
                            ) : (
                              <>
                                <BookOpen className="w-3 h-3" />
                                Tahfizh
                              </>
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{r.action_name_snapshot}</p>
                          {r.notes && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5">"{r.notes}"</p>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{r.halaqah_name_snapshot || 'Pesantren'}</p>
                          <p className="text-[11px] text-slate-500">{r.teacher_name_snapshot}</p>
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-xs inline-flex items-center gap-1 ${
                              isCancelled
                                ? 'line-through bg-slate-100 text-slate-400'
                                : 'text-emerald-700 bg-emerald-100 border border-emerald-300'
                            }`}
                          >
                            <MinusCircle className="w-3.5 h-3.5" />
                            -{r.points_deducted} Poin
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {isCancelled ? (
                            <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded">
                              Dibatalkan
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                              Aktif
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPositiveRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Belum ada catatan kebaikan atau pengurangan poin untuk filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Riwayat Halaqah Santri */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-soft p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Histori Halaqah</h2>
              <p className="text-xs text-slate-500">Perjalanan kelas & pengampu</p>
            </div>
          </div>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {history.map((h, idx) => (
              <div key={h.id || idx} className="relative">
                <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-brand-600 ring-4 ring-white" />
                <div>
                  <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                    Tahun Ajaran {h.academic_year}
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1">{h.halaqah_name}</p>
                  <p className="text-xs text-slate-500">Muhafizh: {h.teacher_name || 'Ustadz Pengampu'}</p>
                  <p className="text-[11px] text-slate-400">Mulai: {h.start_date}</p>
                </div>
              </div>
            ))}

            {history.length === 0 && (
              <p className="text-xs text-slate-400 py-4">Belum ada riwayat halaqah tercatat.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
