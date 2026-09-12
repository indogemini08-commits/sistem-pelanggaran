import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Award,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Users,
  Search,
  BookOpen,
  Building2,
  FileText,
  MinusCircle,
  HelpCircle,
} from 'lucide-react';
import { api } from '../services/api';
import {
  Student,
  Halaqah,
  MasterPositiveAction,
  User as UserType,
  ViolationDivision,
} from '../types';

interface QuickRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserType | null;
  initialDivision?: ViolationDivision;
  onSuccess?: () => void;
  onViewStudent?: (studentId: string) => void;
  onViewHistory?: () => void;
}

export const QuickRewardModal: React.FC<QuickRewardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialDivision = 'tahfizh',
  onSuccess,
  onViewStudent,
  onViewHistory,
}) => {
  const [division, setDivision] = useState<ViolationDivision>(initialDivision);

  // Data lists
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [halaqahStudents, setHalaqahStudents] = useState<Student[]>([]);
  const [actions, setActions] = useState<MasterPositiveAction[]>([]);

  // Selection state
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedActionId, setSelectedActionId] = useState<string>('');
  const [customActionName, setCustomActionName] = useState<string>('');
  const [customPoints, setCustomPoints] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [supervisorName, setSupervisorName] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('');

  // Date & Time
  const todayStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().substring(0, 5);
  const [recordDate, setRecordDate] = useState<string>(todayStr);
  const [recordTime, setRecordTime] = useState<string>(timeStr);

  // Search filter for direct student selection
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<{
    studentName: string;
    actionName: string;
    pointsDeducted: number;
    studentId: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setDivision(initialDivision);
      loadInitialData();
      resetForm();
    }
  }, [isOpen, initialDivision]);

  const resetForm = () => {
    setSelectedStudentId('');
    setSelectedActionId('');
    setCustomActionName('');
    setNotes('');
    setLocationName('');
    setSupervisorName(currentUser?.name || '');
    setRecordDate(new Date().toISOString().split('T')[0]);
    setRecordTime(new Date().toTimeString().substring(0, 5));
    setSearchStudentQuery('');
    setErrorMsg('');
    setSuccessData(null);
  };

  const loadInitialData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [allHalaqahs, studentList, actList] = await Promise.all([
        api.halaqah.list(),
        api.students.list(),
        api.positiveActions.list(),
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
      setActions(actList.filter((a) => a.status === 'active'));

      if (accessibleHalaqahs.length > 0) {
        setSelectedHalaqahId(accessibleHalaqahs[0].id);
      }
    } catch (err: any) {
      setErrorMsg('Gagal memuat data awal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // When halaqah changes (Tahfizh division)
  useEffect(() => {
    if (division === 'tahfizh' && selectedHalaqahId) {
      fetchStudentsForHalaqah(selectedHalaqahId);
    }
  }, [selectedHalaqahId, division]);

  const fetchStudentsForHalaqah = async (hId: string) => {
    try {
      const list = await api.halaqah.getStudents(hId);
      setHalaqahStudents(list.filter((s) => s.status === 'active'));
      if (list.length > 0) {
        setSelectedStudentId(list[0].id);
      } else {
        setSelectedStudentId('');
      }
    } catch (err: any) {
      console.error('Gagal memuat santri halaqah:', err);
    }
  };

  // Filter actions by division
  const currentDivisionActions = actions.filter((a) => a.division === division);

  // Auto-set default points when an action is selected
  useEffect(() => {
    if (selectedActionId) {
      const found = actions.find((a) => a.id === selectedActionId);
      if (found) {
        setCustomPoints(found.default_points_deduction);
      }
    }
  }, [selectedActionId, actions]);

  // Direct student search filter (Kesantrian division)
  const filteredStudents = allStudents.filter((s) => {
    const q = searchStudentQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.student_number.includes(q) ||
      s.class.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setErrorMsg('Harap pilih santri terlebih dahulu.');
      return;
    }

    if (!selectedActionId && !customActionName.trim()) {
      setErrorMsg('Pilih jenis kegiatan baik atau masukkan nama kegiatan.');
      return;
    }

    if (customPoints <= 0) {
      setErrorMsg('Poin pengurangan harus lebih dari 0.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const studentObj = allStudents.find((s) => s.id === selectedStudentId);
      const actionObj = actions.find((a) => a.id === selectedActionId);
      const chosenName = actionObj ? actionObj.name : customActionName.trim();

      const res = await api.positiveRecords.create({
        studentId: selectedStudentId,
        studentName: studentObj?.name,
        studentNis: studentObj?.student_number,
        studentClass: studentObj?.class,
        division,
        actionId: selectedActionId || undefined,
        customActionName: chosenName,
        customPoints,
        supervisorName: supervisorName.trim() || currentUser?.name || 'Pembina',
        locationName: locationName.trim() || (division === 'kesantrian' ? 'Asrama' : undefined),
        date: recordDate,
        time: recordTime,
        notes: notes.trim(),
        actorName: currentUser?.name || 'Admin',
      });

      setSuccessData({
        studentName: studentObj?.name || 'Santri',
        actionName: chosenName,
        pointsDeducted: res.pointsDeducted || customPoints,
        studentId: selectedStudentId,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan catatan kegiatan baik.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden animate-fade-in">
      {/* Backdrop with rich Islamic blur */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-emerald-100 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden m-auto z-10">
        {/* Header with Emerald Gradient */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-5 bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white flex items-center justify-between border-b border-emerald-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner shrink-0">
              <Award className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Catat Kegiatan Baik & Prestasi
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 uppercase tracking-wider">
                  Pengurang Poin
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-200/80 font-normal mt-0.5">
                Pemberian reward amal shalih untuk mengurangi poin pelanggaran santri
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Division Segmented Switcher */}
        <div className="px-3.5 sm:px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200/80 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 p-1 bg-slate-200/80 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => {
                setDivision('tahfizh');
                setSelectedActionId('');
                setErrorMsg('');
              }}
              className={`flex items-center justify-center gap-2 min-h-[42px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                division === 'tahfizh'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Divisi Tahfizh (Halaqah)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDivision('kesantrian');
                setSelectedActionId('');
                setErrorMsg('');
              }}
              className={`flex items-center justify-center gap-2 min-h-[42px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                division === 'kesantrian'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Divisi Kesantrian (Asrama)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-3.5 sm:space-y-5">
          {successData ? (
            /* Success State */
            <div className="py-8 text-center space-y-4 animate-scale-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900">
                  Kegiatan Baik Berhasil Dicatat!
                </h4>
                <p className="text-sm text-slate-600 mt-1">
                  Poin pelanggaran{' '}
                  <span className="font-bold text-slate-900">{successData.studentName}</span>{' '}
                  pada <span className="font-bold text-emerald-700 capitalize">Divisi {division}</span> berhasil dikurangi{' '}
                  <span className="inline-flex items-center gap-1 font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <MinusCircle className="w-3.5 h-3.5" /> {successData.pointsDeducted} Poin
                  </span>
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 max-w-md mx-auto text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kegiatan / Prestasi:</span>
                  <span className="font-semibold text-slate-800">{successData.actionName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Divisi Pengurang:</span>
                  <span className="font-semibold text-emerald-700 uppercase">{division}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Catat Kebaikan Lain
                </button>
                {onViewHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewHistory();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Lihat Riwayat Kebaikan</span>
                  </button>
                )}
                {onViewStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewStudent(successData.studentId);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Lihat Profil Santri</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : (
            /* Main Input Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
                  <X className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Selection based on Division */}
              {division === 'tahfizh' ? (
                /* Tahfizh: Pick Halaqah then Pick Student */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Halaqah Al-Qur'an</span>
                    </label>
                    <select
                      value={selectedHalaqahId}
                      onChange={(e) => setSelectedHalaqahId(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      required
                    >
                      {halaqahs.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} {h.teacher_name ? `(${h.teacher_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pilih Santri</span>
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      required
                    >
                      <option value="">-- Pilih Santri --</option>
                      {halaqahStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.student_number} - Kls {s.class}) • {s.total_points} Poin
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                /* Kesantrian: Direct Student Search */
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pilih Santri (Pencarian Langsung)</span>
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Ketik Nama, NIS, atau Kelas santri..."
                      value={searchStudentQuery}
                      onChange={(e) => setSearchStudentQuery(e.target.value)}
                      className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                    {filteredStudents.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Santri tidak ditemukan</p>
                    ) : (
                      filteredStudents.slice(0, 10).map((s) => {
                        const isSelected = selectedStudentId === s.id;
                        return (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => setSelectedStudentId(s.id)}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                              isSelected ? 'bg-emerald-100/70 text-emerald-900 font-bold' : 'hover:bg-slate-100'
                            }`}
                          >
                            <div>
                              <span className="font-semibold">{s.name}</span>{' '}
                              <span className="text-slate-500">({s.student_number} - Kls {s.class})</span>
                            </div>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200">
                              {s.total_points} Poin
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Pick Master Good Deed / Positive Action */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Jenis Kegiatan Baik / Prestasi</span>
                </label>
                <select
                  value={selectedActionId}
                  onChange={(e) => {
                    setSelectedActionId(e.target.value);
                    if (e.target.value) setCustomActionName('');
                  }}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                >
                  <option value="">-- Pilih Aturan Kebaikan ({division.toUpperCase()}) --</option>
                  {currentDivisionActions.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name} (Pengurangan -{a.default_points_deduction} Poin)
                    </option>
                  ))}
                  <option value="__custom__">+ Kegiatan / Prestasi Kustom Lainnya</option>
                </select>
              </div>

              {/* Custom action name if selected */}
              {selectedActionId === '__custom__' && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Nama Kegiatan Baik Kustom</label>
                  <input
                    type="text"
                    placeholder="Contoh: Juara 1 Pidato Bahasa Arab, Inisiatif membantu musibah..."
                    value={customActionName}
                    onChange={(e) => setCustomActionName(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    required
                  />
                </div>
              )}

              {/* Deduction Points & Supervisor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MinusCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Bobot Pengurangan Poin</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      -{customPoints} Pts
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={customPoints}
                    onChange={(e) => setCustomPoints(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-mono font-bold text-emerald-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Pembimbing / Pencatat</span>
                  </label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    placeholder="Nama Ustadz / Pembina..."
                    className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Tanggal</span>
                  </label>
                  <input
                    type="date"
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Waktu</span>
                  </label>
                  <input
                    type="time"
                    value={recordTime}
                    onChange={(e) => setRecordTime(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Catatan Apresiasi / Dokumentasi Kegiatan (Opsional)</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Deskripsikan prestasi atau kegiatan positif yang dilakukan santri..."
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                />
              </div>

              {/* Notice */}
              <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-2 text-[11px] text-emerald-800">
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  Poin ini akan secara otomatis memotong poin pelanggaran aktif santri pada{' '}
                  <span className="font-bold capitalize">Divisi {division}</span>. Jika santri memiliki 0 pelanggaran, nilai poin santri tetap 0 (tidak minus).
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto justify-center min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedStudentId}
                  className="w-full sm:w-auto justify-center min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2 active:scale-[0.98]"
                >
                  {submitting ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Simpan & Kurangi Poin (-{customPoints})</span>
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
