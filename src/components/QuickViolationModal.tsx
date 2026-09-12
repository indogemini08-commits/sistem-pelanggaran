import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  UserCheck,
  BookOpen,
  Award,
  Sparkles,
  RotateCcw,
  Eye,
  FileText,
  Building2,
  Search,
  MapPin,
} from 'lucide-react';
import { User, Halaqah, Student, MasterViolation, ViolationDivision } from '../types';
import { api } from '../services/api';

interface QuickViolationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSuccess?: () => void;
  onViewHistory?: () => void;
  initialDivision?: ViolationDivision;
}

export const QuickViolationModal: React.FC<QuickViolationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
  onViewHistory,
  initialDivision = 'tahfizh',
}) => {
  const [division, setDivision] = useState<ViolationDivision>(initialDivision);

  // Halaqah data (for Tahfizh)
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
  const [halaqahStudents, setHalaqahStudents] = useState<Student[]>([]);

  // All Students data (for Kesantrian direct search)
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState<string>('');

  // Selected student
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Violations Master
  const [violations, setViolations] = useState<MasterViolation[]>([]);
  const [selectedViolationId, setSelectedViolationId] = useState<string>('');
  const [points, setPoints] = useState<number>(0);

  // Kesantrian specific fields
  const [locationName, setLocationName] = useState<string>('Asrama Putra');
  const [supervisorName, setSupervisorName] = useState<string>('');

  // Common fields
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successData, setSuccessData] = useState<{
    studentName: string;
    violationName: string;
    division: ViolationDivision;
    points: number;
    newTotalPoints: number;
    tahfizhPoints?: number;
    kesantrianPoints?: number;
  } | null>(null);

  // Initialize date & time and fetch options
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setDate(now.toISOString().split('T')[0]);
      setTime(now.toTimeString().substring(0, 5));
      setSuccessData(null);
      setErrorMsg('');
      setDivision(initialDivision);
      setSupervisorName(currentUser?.name || '');

      loadInitialData();
    }
  }, [isOpen, currentUser, initialDivision]);

  const loadInitialData = async () => {
    try {
      // 1. Fetch halaqahs & all students in parallel
      const [allHalaqahs, studentList, vList] = await Promise.all([
        api.halaqah.list(),
        api.students.list(),
        api.violations.list(),
      ]);

      let accessibleHalaqahs = allHalaqahs;
      if (currentUser?.role === 'teacher' || currentUser?.role === 'guru') {
        const teacherId = currentUser.teacherId;
        if (teacherId) {
          accessibleHalaqahs = allHalaqahs.filter((h) => h.teacher_id === teacherId);
        } else if (currentUser.assignedHalaqahs && currentUser.assignedHalaqahs.length > 0) {
          accessibleHalaqahs = currentUser.assignedHalaqahs;
        }
      }

      setHalaqahs(accessibleHalaqahs);
      setAllStudents(studentList.filter((s) => s.status === 'active'));

      if (accessibleHalaqahs.length > 0) {
        setSelectedHalaqahId(accessibleHalaqahs[0].id);
      }

      // 2. Set master violations
      const activeViolations = vList.filter((v) => v.status === 'active');
      setViolations(activeViolations);
    } catch (err: any) {
      setErrorMsg('Gagal memuat data halaqah dan pelanggaran: ' + err.message);
    }
  };

  // When halaqah changes, fetch students in that halaqah (for Tahfizh mode)
  useEffect(() => {
    if (division === 'tahfizh' && selectedHalaqahId) {
      fetchStudentsForHalaqah(selectedHalaqahId);
    } else if (division === 'tahfizh') {
      setHalaqahStudents([]);
      setSelectedStudentId('');
    }
  }, [selectedHalaqahId, division]);

  const fetchStudentsForHalaqah = async (hId: string) => {
    try {
      const sList = await api.halaqah.getStudents(hId);
      setHalaqahStudents(sList);
      if (sList.length > 0) {
        setSelectedStudentId(sList[0].id);
      } else {
        setSelectedStudentId('');
      }
    } catch (err: any) {
      setErrorMsg('Gagal memuat daftar santri di halaqah ini: ' + err.message);
    }
  };

  // Filtered master violations according to currently active division
  const currentDivisionViolations = useMemo(() => {
    return violations.filter((v) => (v.division || 'tahfizh') === division);
  }, [violations, division]);

  // Filtered all-students for Kesantrian search
  const filteredAllStudents = useMemo(() => {
    if (!studentSearch.trim()) return allStudents;
    const q = studentSearch.toLowerCase();
    return allStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.student_number.toLowerCase().includes(q) ||
        s.class.toLowerCase().includes(q)
    );
  }, [allStudents, studentSearch]);

  // When selected violation changes, automatically set points (READ-ONLY)
  useEffect(() => {
    const found = violations.find((v) => v.id === selectedViolationId);
    if (found) {
      setPoints(found.default_points);
    } else {
      setPoints(0);
    }
  }, [selectedViolationId, violations]);

  const handleResetForNext = () => {
    setSuccessData(null);
    setSelectedViolationId('');
    setPoints(0);
    setNotes('');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (division === 'tahfizh' && !selectedHalaqahId) {
      setErrorMsg('Silakan pilih Halaqah terlebih dahulu.');
      return;
    }
    if (!selectedStudentId) {
      setErrorMsg('Silakan pilih Santri yang melakukan pelanggaran.');
      return;
    }
    if (!selectedViolationId) {
      setErrorMsg('Silakan pilih Jenis Pelanggaran dari master list.');
      return;
    }
    if (points <= 0) {
      setErrorMsg('Poin pelanggaran tidak valid.');
      return;
    }

    setLoading(true);
    try {
      const studentObj =
        (division === 'tahfizh' ? halaqahStudents : allStudents).find((s) => s.id === selectedStudentId) ||
        allStudents.find((s) => s.id === selectedStudentId);
      const violationObj = violations.find((v) => v.id === selectedViolationId);

      const res = await api.records.create({
        studentId: selectedStudentId,
        studentName: studentObj?.name,
        studentNis: studentObj?.student_number,
        studentClass: studentObj?.class,
        halaqahId: division === 'tahfizh' ? selectedHalaqahId : null,
        violationId: selectedViolationId,
        violationName: violationObj?.name,
        points: violationObj?.default_points || points,
        division: division,
        locationName: division === 'kesantrian' ? locationName : undefined,
        supervisorName: division === 'kesantrian' ? (supervisorName || currentUser?.name) : undefined,
        date: date,
        time: time,
        notes: notes,
        createdBy: currentUser?.name || (division === 'tahfizh' ? 'Muhafizh' : 'Bagian Kesantrian'),
      });

      setSuccessData({
        studentName: res.studentName || studentObj?.name || 'Santri',
        violationName: res.violationName || violationObj?.name || 'Pelanggaran',
        division: res.division || division,
        points: res.points,
        newTotalPoints: res.newTotalPoints,
        tahfizhPoints: res.tahfizhPoints,
        kesantrianPoints: res.kesantrianPoints,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Data belum berhasil disimpan. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg m-auto h-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-brand-900 text-white p-4 sm:p-6 relative shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-white/10 rounded-2xl backdrop-blur-sm ring-1 ring-white/20 shrink-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-brand-300" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold tracking-tight">Catat Pelanggaran Santri</h2>
                <p className="text-[11px] sm:text-xs text-brand-200 font-light">
                  Pencatatan resmi terpadu dengan bobot poin otomatis
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Division Switcher Tabs */}
          {!successData && (
            <div className="flex bg-navy-950/80 p-1.5 rounded-2xl border border-white/10 mt-3 sm:mt-4 gap-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setDivision('tahfizh');
                  setSelectedViolationId('');
                  setErrorMsg('');
                }}
                className={`flex-1 min-h-[42px] py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                  division === 'tahfizh'
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30 ring-1 ring-brand-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <BookOpen className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>🕌 Divisi Tahfizh</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDivision('kesantrian');
                  setSelectedViolationId('');
                  setErrorMsg('');
                }}
                className={`flex-1 min-h-[42px] py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                  division === 'kesantrian'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Building2 className="w-4 h-4 text-blue-300 shrink-0" />
                <span>🏢 Divisi Kesantrian</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {/* SUCCESS STATE */}
          {successData ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
                Pelanggaran Berhasil Dicatat!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-5">
                Data telah tersimpan permanen dan terakumulasi ke profil santri.
              </p>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left mb-6 space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Divisi Bagian:</span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-lg text-xs flex items-center gap-1 ${
                    successData.division === 'kesantrian'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {successData.division === 'kesantrian' ? '🏢 Bagian Kesantrian' : '🕌 Bagian Tahfizh'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Santri:</span>
                  <span className="font-bold text-slate-800">{successData.studentName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Pelanggaran:</span>
                  <span className="font-medium text-slate-700">{successData.violationName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Poin Pelanggaran:</span>
                  <span className="font-bold text-rose-600">+{successData.points} Poin</span>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-1.5">
                  <div className="flex justify-between text-sm items-center">
                    <span className="font-bold text-slate-800">Total Akumulasi Poin:</span>
                    <span className="font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200 text-base">
                      {successData.newTotalPoints} Poin
                    </span>
                  </div>
                  {(successData.tahfizhPoints !== undefined || successData.kesantrianPoints !== undefined) && (
                    <div className="flex items-center justify-end gap-2 text-xs text-slate-500 font-medium pt-1">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                        📗 Tahfizh: {successData.tahfizhPoints || 0} Poin
                      </span>
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                        🏢 Kesantrian: {successData.kesantrianPoints || 0} Poin
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleResetForNext}
                  className="flex-1 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Catat Santri Berikutnya
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onViewHistory) onViewHistory();
                  }}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <Eye className="w-4 h-4" />
                  Lihat Riwayat
                </button>
              </div>
            </div>
          ) : (
            /* FORM INPUT */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Tanggal & Waktu (2 Kolom) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-600" />
                    Tanggal Kejadian
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-brand-600" />
                    Waktu
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white"
                    required
                  />
                </div>
              </div>

              {/* ========================================================= */}
              {/* DIVISI 1: TAHFIZH (HALAQAH) MODE */}
              {/* ========================================================= */}
              {division === 'tahfizh' && (
                <>
                  {/* Muhafizh Pelapor */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-brand-600" />
                      Muhafizh Pelapor (Akun Login)
                    </label>
                    <input
                      type="text"
                      value={currentUser?.name || 'Ustadz Pengampu'}
                      disabled
                      className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-medium cursor-not-allowed"
                    />
                  </div>

                  {/* Halaqah Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-brand-600" />
                      Pilih Halaqah
                    </label>
                    <select
                      value={selectedHalaqahId}
                      onChange={(e) => setSelectedHalaqahId(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white font-medium"
                      required
                    >
                      <option value="">-- Pilih Halaqah --</option>
                      {halaqahs.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} {h.schedule ? `(${h.schedule})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Santri Dropdown (Filtered to selected halaqah) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-brand-600" />
                        Nama Santri
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {halaqahStudents.length} santri terdaftar
                      </span>
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={halaqahStudents.length === 0}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400"
                      required
                    >
                      <option value="">-- Pilih Santri di Halaqah Ini --</option>
                      {halaqahStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (NIS: {s.student_number} - Kelas {s.class})
                        </option>
                      ))}
                    </select>
                    {halaqahStudents.length === 0 && selectedHalaqahId && (
                      <p className="text-xs text-amber-600 mt-1">
                        Belum ada santri di halaqah ini. Silakan tambahkan santri melalui menu Data Santri.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* ========================================================= */}
              {/* DIVISI 2: KESANTRIAN (ASRAMA) MODE */}
              {/* ========================================================= */}
              {division === 'kesantrian' && (
                <>
                  {/* Petugas / Wali Asrama */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        Pembina / Petugas
                      </label>
                      <input
                        type="text"
                        value={supervisorName}
                        onChange={(e) => setSupervisorName(e.target.value)}
                        placeholder="Wali Asrama / Bagian Kesantrian"
                        className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        Lokasi Kejadian
                      </label>
                      <input
                        type="text"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="Misal: Kamar 02, Masjid, Kantin"
                        className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
                        required
                      />
                    </div>
                  </div>

                  {/* Santri Selection with live search */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-blue-600" />
                        Pilih Santri (Semua Kelas / Asrama)
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {allStudents.length} santri aktif
                      </span>
                    </label>

                    {/* Quick filter box */}
                    <div className="relative mb-1.5">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Ketik Nama, NIS, atau Kelas santri..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white font-medium"
                      required
                    >
                      <option value="">-- Pilih Santri --</option>
                      {filteredAllStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (NIS: {s.student_number} - Kelas {s.class})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* ========================================================= */}
              {/* MASTER VIOLATION SELECTION (FILTERED BY DIVISION) */}
              {/* ========================================================= */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                    Jenis Pelanggaran ({division === 'kesantrian' ? 'Aturan Kesantrian' : 'Aturan Halaqah'})
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {currentDivisionViolations.length} aturan tersedia
                  </span>
                </label>
                <select
                  value={selectedViolationId}
                  onChange={(e) => setSelectedViolationId(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white font-medium"
                  required
                >
                  <option value="">-- Pilih Jenis Pelanggaran --</option>
                  {currentDivisionViolations.map((v) => (
                    <option key={v.id} value={v.id}>
                      [{v.code}] {v.name} ({v.default_points} Poin - {v.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* POIN OTOMATIS (READ ONLY BADGE) */}
              <div className="bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">
                    Bobot Poin Pelanggaran
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Ditentukan otomatis berdasarkan standar terpadu
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-4 py-1.5 rounded-xl border border-rose-200 shadow-sm">
                  <span className="text-2xl font-black text-rose-600">{points}</span>
                  <span className="text-xs font-bold text-slate-600">POIN</span>
                </div>
              </div>

              {/* Keterangan Tambahan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Kronologi Tambahan (Opsional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    division === 'kesantrian'
                      ? 'Misal: Santri terlambat bangun shalat Subuh, sudah ditegur musyrif...'
                      : 'Misal: Lupa membawa buku mutabaah, target hafalan belum setor...'
                  }
                  rows={2}
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white"
                />
              </div>

              {/* Tombol Simpan */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full min-h-[48px] py-3.5 px-4 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${
                    division === 'kesantrian'
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-navy-900 hover:from-blue-700 hover:to-navy-950'
                      : 'bg-gradient-to-r from-brand-600 via-emerald-600 to-navy-900 hover:from-brand-700 hover:to-navy-950'
                  }`}
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-white/90" />
                      <span>SIMPAN PELANGGARAN {division === 'kesantrian' ? 'KESANTRIAN' : 'TAHFIZH'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
