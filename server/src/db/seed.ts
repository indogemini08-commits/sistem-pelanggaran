import { query, run, logAudit } from './database';

export function seedStudentsIfEmpty() {
  const studentCount = query<{ count: number }>('SELECT COUNT(*) as count FROM students')[0]?.count || 0;
  if (studentCount > 0) return;

  console.log('Tabel santri kosong, menginisialisasi 10 santri awal...');
  const halaqahs = query<{ id: string; teacher_id: string }>('SELECT id, teacher_id FROM halaqah');
  const students = [
    { id: 'std_001', nis: '2025001', name: 'Muhammad Abdullah', class: '8A', gender: 'L', halaqahId: 'hlq_doha' },
    { id: 'std_002', nis: '2025002', name: 'Ahmad Farhan Kamil', class: '8A', gender: 'L', halaqahId: 'hlq_doha' },
    { id: 'std_003', nis: '2025003', name: 'Ibrahim Malik Ar-Rasyid', class: '7B', gender: 'L', halaqahId: 'hlq_doha' },
    { id: 'std_004', nis: '2025004', name: 'Zaid bin Tsabit Robbani', class: '9B', gender: 'L', halaqahId: 'hlq_doha' },
    { id: 'std_005', nis: '2025005', name: 'Hasan Al-Banna Pratama', class: '8B', gender: 'L', halaqahId: 'hlq_makkah' },
    { id: 'std_006', nis: '2025006', name: 'Umar Dani Ramadhan', class: '7A', gender: 'L', halaqahId: 'hlq_makkah' },
    { id: 'std_007', nis: '2025007', name: 'Salman Al-Farisi Munir', class: '7C', gender: 'L', halaqahId: 'hlq_makkah' },
    { id: 'std_008', nis: '2025008', name: 'Ali Zainal Abidin', class: '9A', gender: 'L', halaqahId: 'hlq_madinah' },
    { id: 'std_009', nis: '2025009', name: 'Bilal Habasyi Asy-Syahid', class: '8C', gender: 'L', halaqahId: 'hlq_madinah' },
    { id: 'std_010', nis: '2025010', name: 'Usamah bin Zaid Akbar', class: '8A', gender: 'L', halaqahId: 'hlq_madinah' },
  ];

  for (const s of students) {
    run(
      `INSERT INTO students (id, student_number, name, class, gender, halaqah_id, academic_year, status)
       VALUES (?, ?, ?, ?, ?, ?, '2025/2026', 'active')`,
      [s.id, s.nis, s.name, s.class, s.gender, s.halaqahId]
    );

    const hInfo = halaqahs.find(h => h.id === s.halaqahId);
    run(
      `INSERT INTO student_halaqah_history (id, student_id, halaqah_id, teacher_id, academic_year, class, start_date)
       VALUES (?, ?, ?, ?, '2025/2026', ?, '2025-07-15')`,
      ['hist_' + s.id, s.id, s.halaqahId, hInfo?.teacher_id || null, s.class]
    );
  }
}

export const DEFAULT_KESANTRIAN_VIOLATIONS = [
  { id: 'v_ks_001', code: 'KS001', name: 'Terlambat / Masbuq Shalat Berjamaah', cat: 'Kedisiplinan', points: 5, desc: "Masbuq shalat fardhu berjamaah di masjid pesantren tanpa udzur syar'i" },
  { id: 'v_ks_002', code: 'KS002', name: 'Masbuq Shalat Subuh / Kesiangan', cat: 'Kedisiplinan', points: 8, desc: 'Bangun terlambat sehingga masbuq pada shalat Subuh berjamaah' },
  { id: 'v_ks_003', code: 'KS003', name: 'Tidak Shalat Berjamaah di Masjid', cat: 'Kehadiran', points: 15, desc: 'Tidak hadir shalat fardhu di masjid tanpa izin bagian kesantrian / sakit' },
  { id: 'v_ks_004', code: 'KS004', name: 'Kamar / Lemari Asrama Berantakan & Jorok', cat: 'Kedisiplinan', points: 3, desc: 'Tidak merapikan tempat tidur, pakaian menumpuk, atau lemari tidak teratur saat inspeksi' },
  { id: 'v_ks_005', code: 'KS005', name: 'Membawa / Menyimpan HP & Gawai Ilegal', cat: 'Kedisiplinan', points: 30, desc: 'Membawa smartphone, tablet, atau perangkat elektronik yang tidak diizinkan di asrama' },
  { id: 'v_ks_006', code: 'KS006', name: 'Melewati Jam Malam Asrama (>22:30)', cat: 'Kedisiplinan', points: 5, desc: 'Masih berkeliaran atau berisik di luar kamar setelah bel jam istirahat malam' },
  { id: 'v_ks_007', code: 'KS007', name: 'Keluar Kompleks Tanpa Izin (Kabur/Pesiar Ilegal)', cat: 'Kehadiran', points: 40, desc: 'Meninggalkan area pesantren tanpa surat izin resmi dari bagian kesantrian' },
  { id: 'v_ks_008', code: 'KS008', name: 'Merokok / Vape di Lingkungan Pesantren', cat: 'Kedisiplinan', points: 50, desc: 'Kedapatan merokok, vape, atau menyimpan rokok di area asrama/pesantren' },
  { id: 'v_ks_009', code: 'KS009', name: 'Berkelahi / Mengintimidasi / Bullying', cat: 'Adab & Akhlak', points: 35, desc: 'Melakukan kekerasan fisik atau perundungan kepada sesama santri' },
  { id: 'v_ks_010', code: 'KS010', name: 'Merusak Fasilitas Asrama & Pesantren', cat: 'Kedisiplinan', points: 20, desc: 'Mencoret-coret tembok, memecahkan kaca, atau merusak sarana asrama' },
  { id: 'v_ks_011', code: 'KS011', name: 'Ghashab / Mengambil Barang Teman Tanpa Izin', cat: 'Adab & Akhlak', points: 15, desc: 'Memakai sandal, pakaian, atau perlengkapan santri lain tanpa kerelaan' },
  { id: 'v_ks_012', code: 'KS012', name: 'Membawa Senjata Tajam / Benda Berbahaya', cat: 'Kedisiplinan', points: 60, desc: 'Menyimpan senjata tajam atau benda membahayakan di kamar santri' },
];

export function seedKesantrianViolationsIfEmpty() {
  const ksCount = query<{ count: number }>("SELECT COUNT(*) as count FROM violations WHERE division = 'kesantrian'")[0]?.count || 0;
  if (ksCount > 0) return;

  console.log('Menginisialisasi master pelanggaran divisi kesantrian...');
  for (const v of DEFAULT_KESANTRIAN_VIOLATIONS) {
    run(
      `INSERT INTO violations (id, code, name, division, category, description, default_points, status)
       VALUES (?, ?, ?, 'kesantrian', ?, ?, ?, 'active')`,
      [v.id, v.code, v.name, v.cat, v.desc, v.points]
    );
  }

  // Sample records for kesantrian to demonstrate separated monitoring
  const today = new Date().toISOString().split('T')[0];
  const sampleKsRecords = [
    {
      id: 'rec_ks_001',
      studentId: 'std_002', // Ahmad Farhan Kamil
      studentName: 'Ahmad Farhan Kamil',
      studentClass: '8A',
      violationId: 'v_ks_001',
      violationName: 'Terlambat / Masbuq Shalat Berjamaah',
      points: 5,
      date: today,
      time: '04:50',
      notes: 'Masbuq 1 rakaat shalat Subuh di Masjid Utama',
      supervisor: 'Ustadz Ridwan (Wali Asrama)',
    },
    {
      id: 'rec_ks_002',
      studentId: 'std_001', // Muhammad Abdullah
      studentName: 'Muhammad Abdullah',
      studentClass: '8A',
      violationId: 'v_ks_004',
      violationName: 'Kamar / Lemari Asrama Berantakan & Jorok',
      points: 3,
      date: today,
      time: '07:15',
      notes: 'Pakaian kotor berserakan di atas kasur Kamar Abu Bakar 02',
      supervisor: 'Bagian Kesantrian',
    },
    {
      id: 'rec_ks_003',
      studentId: 'std_005', // Hasan Al-Banna Pratama
      studentName: 'Hasan Al-Banna Pratama',
      studentClass: '8B',
      violationId: 'v_ks_006',
      violationName: 'Melewati Jam Malam Asrama (>22:30)',
      points: 5,
      date: today,
      time: '23:05',
      notes: 'Masih berada di lorong asrama lantai 2 setelah jam malam',
      supervisor: 'Ustadz Pengawas Malam',
    },
  ];

  for (const r of sampleKsRecords) {
    const exists = query<{ id: string }>('SELECT id FROM violation_records WHERE id = ?', [r.id]);
    if (exists.length === 0) {
      run(
        `INSERT INTO violation_records (
          id, student_id, division, halaqah_id, teacher_id, violation_id,
          violation_name_snapshot, points_snapshot, halaqah_name_snapshot,
          teacher_name_snapshot, student_class_snapshot, academic_year_snapshot,
          date, time, notes, status, created_by
        ) VALUES (?, ?, 'kesantrian', NULL, NULL, ?, ?, ?, 'Asrama & Kesantrian', ?, ?, '2025/2026', ?, ?, ?, 'active', 'Bagian Kesantrian')`,
        [
          r.id, r.studentId, r.violationId,
          r.violationName, r.points,
          r.supervisor, r.studentClass,
          r.date, r.time, r.notes
        ]
      );
    }
  }
}

export function seedNewRolesIfEmpty() {
  const kesantrianUser = query<{ id: string }>("SELECT id FROM users WHERE role = 'kepala_kesantrian'")[0];
  if (!kesantrianUser) {
    run(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
       VALUES ('usr_kesantrian', 'Ustadz Zulkifli, S.Pd.I (Kepala Kesantrian)', 'kesantrian@pesantren.id', 'kesantrian123', 'kepala_kesantrian', 'active', datetime('now', 'localtime'))`
    );
    console.log('Seeded demo user: Kepala Kesantrian (kesantrian@pesantren.id / kesantrian123)');
  }

  const guruUser = query<{ id: string }>("SELECT id FROM users WHERE role = 'guru'")[0];
  if (!guruUser) {
    run(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
       VALUES ('usr_guru', 'Ustadz Herman, S.Pd (Guru Pengajar)', 'guru@pesantren.id', 'guru123', 'guru', 'active', datetime('now', 'localtime'))`
    );
    // Link teacher entry for guru
    const existingTch = query<{ id: string }>("SELECT id FROM teachers WHERE user_id = 'usr_guru'")[0];
    if (!existingTch) {
      run(
        `INSERT INTO teachers (id, user_id, name, phone, status)
         VALUES ('tch_herman', 'usr_guru', 'Ustadz Herman, S.Pd', '0812-3456-7804', 'active')`
      );
    }
    console.log('Seeded demo user: Guru (guru@pesantren.id / guru123)');
  }
}

export const DEFAULT_POSITIVE_ACTIONS = [
  // Tahfizh Division
  { id: 'act_t_001', code: 'KB-T01', name: "Tasmi' 1 Juz Sekali Duduk Tanpa Salah", division: 'tahfizh', cat: 'Tahfizh', points: 10, desc: "Menyetorkan hafalan 1 juz bil ghoib sekali duduk dengan lancar dan tajwid mutqin" },
  { id: 'act_t_002', code: 'KB-T02', name: 'Setor Ziyadah Ekstra Melampaui Target', division: 'tahfizh', cat: 'Tahfizh', points: 5, desc: "Menambah capaian hafalan baru melebihi target minimal mingguan/bulanan" },
  { id: 'act_t_003', code: 'KB-T03', name: 'Murojaah Mandiri Terdisiplin (1 Pekan Penuh)', division: 'tahfizh', cat: 'Tahfizh', points: 5, desc: "Konsisten hadir dan murojaah mandiri sebelum halaqah dimulai selama 1 pekan penuh" },
  { id: 'act_t_004', code: 'KB-T04', name: 'Talaqqi / Membimbing Teman Sebaya di Halaqah', division: 'tahfizh', cat: 'Tahfizh', points: 3, desc: "Membantu menyimak dan mengoreksi bacaan teman se-halaqah yang tertinggal" },
  { id: 'act_t_005', code: 'KB-T05', name: "Juara / Peserta Terbaik Musabaqah Hifzhil Qur'an (MHQ)", division: 'tahfizh', cat: 'Prestasi', points: 15, desc: "Meraih juara atau apresiasi terbaik dalam perlombaan tahfizh Qur'an" },

  // Kesantrian Division
  { id: 'act_k_001', code: 'KB-K01', name: 'Muadzin / Imam Shalat Rawatib Tepat Waktu', division: 'kesantrian', cat: 'Ibadah & Shalat', points: 5, desc: "Bertugas adzan atau mengimami shalat fardhu rawatib di masjid tepat waktu" },
  { id: 'act_k_002', code: 'KB-K02', name: 'Piket Kamar / Kebersihan Asrama Teladan', division: 'kesantrian', cat: 'Kedisiplinan', points: 5, desc: "Kamar atau area lorong asrama terbersih dan paling rapi saat inspeksi kesantrian" },
  { id: 'act_k_003', code: 'KB-K03', name: 'Khidmat Sosial Dapur / Membantu Operasional Pesantren', division: 'kesantrian', cat: 'Khidmat & Sosial', points: 10, desc: "Secara sukarela membantu penyiapan makan, kebersihan lingkungan, atau acara pesantren" },
  { id: 'act_k_004', code: 'KB-K04', name: 'Amanah: Menemukan & Mengembalikan Barang Teman', division: 'kesantrian', cat: 'Khidmat & Sosial', points: 5, desc: "Menemukan barang berharga atau uang tercecer dan menyerahkannya ke bagian kesantrian" },
  { id: 'act_k_005', code: 'KB-K05', name: 'Keteladanan Bangun Subuh Tanpa Dibangunkan (1 Pekan)', division: 'kesantrian', cat: 'Kedisiplinan', points: 5, desc: "Bangun mandiri dan membangunkan teman kamar shalat Subuh berjamaah selama 1 pekan" },
  { id: 'act_k_006', code: 'KB-K06', name: 'Prestasi Lomba Akademik / Bahasa / Olahraga', division: 'kesantrian', cat: 'Prestasi', points: 10, desc: "Membawa nama baik pesantren dalam kompetisi akademik, bahasa Arab/Inggris, atau olahraga" },
];

export function seedPositiveActionsIfEmpty() {
  const count = query<{ count: number }>("SELECT COUNT(*) as count FROM positive_actions")[0]?.count || 0;
  if (count === 0) {
    console.log('Menginisialisasi master kegiatan baik (kebaikan & prestasi)...');
    for (const a of DEFAULT_POSITIVE_ACTIONS) {
      run(
        `INSERT INTO positive_actions (id, code, name, division, category, description, default_points_deduction, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [a.id, a.code, a.name, a.division, a.cat, a.desc, a.points]
      );
    }
  }

  const posCount = query<{ count: number }>("SELECT COUNT(*) as count FROM positive_records")[0]?.count || 0;
  if (posCount === 0) {
    const today = new Date().toISOString().split('T')[0];
    run(
      `INSERT INTO positive_records (
        id, student_id, division, action_id, action_name_snapshot, points_deducted,
        halaqah_id, halaqah_name_snapshot, teacher_id, teacher_name_snapshot,
        student_class_snapshot, academic_year_snapshot, date, time, notes, status, created_by
      ) VALUES (
        'pos_rec_001', 'std_002', 'kesantrian', 'act_k_002', 'Piket Kamar / Kebersihan Asrama Teladan', 5,
        NULL, 'Asrama & Kesantrian', NULL, 'Ustadz Ridwan (Wali Asrama)',
        '8A', '2025/2026', ?, '08:30', 'Kamar terbersih dan paling rapi pada inspeksi asrama pekan ini', 'active', 'Bagian Kesantrian'
      )`,
      [today]
    );
    console.log('Seeded sample positive record: -5 poin kesantrian for std_002');
  }
}

export function seedDatabase() {
  const userCount = query<{ count: number }>('SELECT COUNT(*) as count FROM users')[0]?.count || 0;
  if (userCount > 0) {
    seedStudentsIfEmpty();
    seedKesantrianViolationsIfEmpty();
    seedNewRolesIfEmpty();
    seedPositiveActionsIfEmpty();
    console.log('Database sudah memiliki data, melewati seeder awal.');
    return;
  }

  console.log('Mengisi data awal database (seeding)...');

  // 1. Settings
  run(`
    INSERT INTO school_settings (id, app_name, school_name, address, phone, email, logo_url, kop_surat_text, current_academic_year)
    VALUES (
      'settings_default',
      'Sistem Poin Santri Halaqah',
      'Pesantren Tahfizh Al-Qur''an Imam Asy-Syathibi',
      'Jl. Karang Anyar No. 45, Kompleks Islamic Center, Bogor, Jawa Barat',
      '0811-9876-5432 / (0251) 8345678',
      'tahfizh@imamsyathibi.sch.id',
      '/logo.svg',
      'BIDANG PENDIDIKAN DAN KEPENGASUHAN - DIVISI HALAQAH TAHFIZH AL-QUR''AN',
      '2025/2026'
    )
  `);

  // 2. Point Thresholds
  const thresholds = [
    { id: 'th_1', min: 0, max: 19, name: 'AMAN', color: 'emerald', desc: 'Kedisiplinan dan capaian hafalan santri dalam kondisi baik.', order: 1 },
    { id: 'th_2', min: 20, max: 49, name: 'PERLU PEMBINAAN', color: 'amber', desc: 'Perlu bimbingan dan pemantauan berkala oleh Muhafizh.', order: 2 },
    { id: 'th_3', min: 50, max: 74, name: 'PEMBINAAN KHUSUS', color: 'orange', desc: 'Pemanggilan oleh Koordinator Tahfizh dan jadwal murojaah tambahan.', order: 3 },
    { id: 'th_4', min: 75, max: 99, name: 'PERINGATAN RESMI', color: 'rose', desc: 'Penerbitan Surat Peringatan (SP) dan pemanggilan orang tua/wali.', order: 4 },
    { id: 'th_5', min: 100, max: 999, name: 'TINDAKAN LANJUT', color: 'red', desc: 'Sidang Dewan Asatidz dan evaluasi kelanjutan kepesertaan halaqah.', order: 5 },
  ];

  for (const th of thresholds) {
    run(
      `INSERT INTO point_thresholds (id, minimum_points, maximum_points, status_name, badge_color, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [th.id, th.min, th.max, th.name, th.color, th.desc, th.order]
    );
  }

  // 3. Users
  const users = [
    { id: 'usr_admin', name: 'Ustadz Farhan, M.Pd (Admin)', email: 'admin@pesantren.id', pass: 'admin123', role: 'admin' },
    { id: 'usr_koor', name: 'Ustadz Ridwan, Lc (Koordinator)', email: 'koordinator@pesantren.id', pass: 'koor123', role: 'coordinator' },
    { id: 'usr_ahmad', name: 'Ustadz Ahmad Al-Hafizh', email: 'ahmad@pesantren.id', pass: 'ahmad123', role: 'teacher' },
    { id: 'usr_muhammad', name: 'Ustadz Muhammad Al-Hafizh', email: 'muhammad@pesantren.id', pass: 'muhammad123', role: 'teacher' },
    { id: 'usr_abdullah', name: 'Ustadz Abdullah Al-Hafizh', email: 'abdullah@pesantren.id', pass: 'abdullah123', role: 'teacher' },
  ];

  for (const u of users) {
    run(
      `INSERT INTO users (id, name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [u.id, u.name, u.email, u.pass, u.role]
    );
  }

  // 4. Teachers
  const teachers = [
    { id: 'tch_ahmad', userId: 'usr_ahmad', name: 'Ustadz Ahmad Al-Hafizh', phone: '0812-3456-7801' },
    { id: 'tch_muhammad', userId: 'usr_muhammad', name: 'Ustadz Muhammad Al-Hafizh', phone: '0812-3456-7802' },
    { id: 'tch_abdullah', userId: 'usr_abdullah', name: 'Ustadz Abdullah Al-Hafizh', phone: '0812-3456-7803' },
  ];

  for (const t of teachers) {
    run(
      `INSERT INTO teachers (id, user_id, name, phone, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [t.id, t.userId, t.name, t.phone]
    );
  }

  // 5. Halaqah
  const halaqahs = [
    { id: 'hlq_doha', name: 'Halaqah Doha', teacherId: 'tch_ahmad', sched: "Ba'da Subuh & Ba'da Maghrib", loc: 'Masjid Lantai 2 (Sayap Kanan)' },
    { id: 'hlq_makkah', name: 'Halaqah Makkah', teacherId: 'tch_muhammad', sched: "Ba'da Subuh & Ba'da Ashar", loc: 'Ruang Tahfizh A' },
    { id: 'hlq_madinah', name: 'Halaqah Madinah', teacherId: 'tch_abdullah', sched: "Ba'da Subuh & Ba'da Isya", loc: 'Gazebo Barat' },
  ];

  for (const h of halaqahs) {
    run(
      `INSERT INTO halaqah (id, name, teacher_id, schedule, location, academic_year, status)
       VALUES (?, ?, ?, ?, ?, '2025/2026', 'active')`,
      [h.id, h.name, h.teacherId, h.sched, h.loc]
    );
  }

  // 6. Master Violations
  const violations = [
    { id: 'v_001', code: 'P001', name: 'Terlambat halaqah (>10 menit)', cat: 'Kedisiplinan', points: 3, desc: "Datang terlambat tanpa udzur syar'i" },
    { id: 'v_002', code: 'P002', name: 'Tidak murojaah mandiri', cat: 'Tahfizh', points: 4, desc: 'Tidak menyelesaikan target lembar murojaah harian' },
    { id: 'v_003', code: 'P003', name: 'Tidak setor hafalan baru', cat: 'Tahfizh', points: 3, desc: 'Tidak menyetorkan ziyadah sesuai target halaqah' },
    { id: 'v_004', code: 'P004', name: 'Alpa / Tidak hadir tanpa izin', cat: 'Kehadiran', points: 10, desc: 'Meninggalkan halaqah tanpa keterangan atau surat izin resmi' },
    { id: 'v_005', code: 'P005', name: 'Tidak mencapai target bulanan', cat: 'Tahfizh', points: 15, desc: 'Evaluasi bulanan di bawah standar target juz' },
    { id: 'v_006', code: 'P006', name: 'Tidur saat kegiatan halaqah', cat: 'Kedisiplinan', points: 5, desc: 'Tidur saat muhafizh menyimak atau tilawah bersama' },
    { id: 'v_007', code: 'P007', name: 'Bercanda berlebihan / mengganggu', cat: 'Adab & Akhlak', points: 8, desc: 'Mengganggu konsentrasi teman halaqah' },
    { id: 'v_008', code: 'P008', name: 'Meninggalkan halaqah sebelum selesai', cat: 'Kedisiplinan', points: 7, desc: 'Keluar halaqah sebelum doa penutup tanpa izin' },
    { id: 'v_009', code: 'P009', name: 'Tidak membawa mushaf standar', cat: 'Kedisiplinan', points: 2, desc: "Tidak membawa Al-Qur'an pojok / rasm Utsmani" },
    { id: 'v_010', code: 'P010', name: 'Membawa gawai / barang terlarang', cat: 'Kedisiplinan', points: 20, desc: 'Membawa HP atau gadget ke area halaqah tanpa izin' },
  ];

  for (const v of violations) {
    run(
      `INSERT INTO violations (id, code, name, category, description, default_points, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [v.id, v.code, v.name, v.cat, v.desc, v.points]
    );
  }

  // 7. Students
  const students = [
    { id: 'std_001', nis: '2025001', name: 'Muhammad Abdullah', class: '8A', gender: 'L', halaqahId: 'hlq_doha' },
    { id: 'std_002', nis: '2025002', name: 'Ahmad Farhan Kamil', class: '8A', gender: 'L', halaqahId: 'hlq_doha' },
    { id: 'std_003', nis: '2025003', name: 'Ibrahim Malik Ar-Rasyid', class: '7B', gender: 'L', halaqahId: 'hlq_doha' },
    { id: 'std_004', nis: '2025004', name: 'Zaid bin Tsabit Robbani', class: '9B', gender: 'L', halaqahId: 'hlq_doha' },
    { id: 'std_005', nis: '2025005', name: 'Hasan Al-Banna Pratama', class: '8B', gender: 'L', halaqahId: 'hlq_makkah' },
    { id: 'std_006', nis: '2025006', name: 'Umar Dani Ramadhan', class: '7A', gender: 'L', halaqahId: 'hlq_makkah' },
    { id: 'std_007', nis: '2025007', name: 'Salman Al-Farisi Munir', class: '7C', gender: 'L', halaqahId: 'hlq_makkah' },
    { id: 'std_008', nis: '2025008', name: 'Ali Zainal Abidin', class: '9A', gender: 'L', halaqahId: 'hlq_madinah' },
    { id: 'std_009', nis: '2025009', name: 'Bilal Habasyi Asy-Syahid', class: '8C', gender: 'L', halaqahId: 'hlq_madinah' },
    { id: 'std_010', nis: '2025010', name: 'Usamah bin Zaid Akbar', class: '8A', gender: 'L', halaqahId: 'hlq_madinah' },
  ];

  for (const s of students) {
    run(
      `INSERT INTO students (id, student_number, name, class, gender, halaqah_id, academic_year, status)
       VALUES (?, ?, ?, ?, ?, ?, '2025/2026', 'active')`,
      [s.id, s.nis, s.name, s.class, s.gender, s.halaqahId]
    );

    // Initial history
    const hInfo = halaqahs.find(h => h.id === s.halaqahId);
    run(
      `INSERT INTO student_halaqah_history (id, student_id, halaqah_id, teacher_id, academic_year, class, start_date)
       VALUES (?, ?, ?, ?, '2025/2026', ?, '2025-07-15')`,
      ['hist_' + s.id, s.id, s.halaqahId, hInfo?.teacherId || null, s.class]
    );
  }

  // 8. Initial Records (to showcase snapshot functionality and statistics)
  const today = new Date().toISOString().split('T')[0];
  const sampleRecords = [
    {
      id: 'rec_001',
      studentId: 'std_001',
      studentName: 'Muhammad Abdullah',
      studentClass: '8A',
      halaqahId: 'hlq_doha',
      halaqahName: 'Halaqah Doha',
      teacherId: 'tch_ahmad',
      teacherName: 'Ustadz Ahmad Al-Hafizh',
      violationId: 'v_002',
      violationName: 'Tidak murojaah mandiri',
      points: 4,
      date: today,
      time: '05:45',
      notes: 'Lupa membawa buku mutabaah murojaah',
    },
    {
      id: 'rec_002',
      studentId: 'std_001',
      studentName: 'Muhammad Abdullah',
      studentClass: '8A',
      halaqahId: 'hlq_doha',
      halaqahName: 'Halaqah Doha',
      teacherId: 'tch_ahmad',
      teacherName: 'Ustadz Ahmad Al-Hafizh',
      violationId: 'v_004',
      violationName: 'Alpa / Tidak hadir tanpa izin',
      points: 10,
      date: today,
      time: '18:15',
      notes: "Tidak hadir sesi ba'da maghrib",
    },
    {
      id: 'rec_003',
      studentId: 'std_001',
      studentName: 'Muhammad Abdullah',
      studentClass: '8A',
      halaqahId: 'hlq_doha',
      halaqahName: 'Halaqah Doha',
      teacherId: 'tch_ahmad',
      teacherName: 'Ustadz Ahmad Al-Hafizh',
      violationId: 'v_005',
      violationName: 'Tidak mencapai target bulanan',
      points: 15,
      date: '2026-08-28',
      time: '06:00',
      notes: 'Target Juz 29 baru terselesaikan 12 halaman',
    },
    {
      id: 'rec_004',
      studentId: 'std_001',
      studentName: 'Muhammad Abdullah',
      studentClass: '8A',
      halaqahId: 'hlq_doha',
      halaqahName: 'Halaqah Doha',
      teacherId: 'tch_ahmad',
      teacherName: 'Ustadz Ahmad Al-Hafizh',
      violationId: 'v_007',
      violationName: 'Bercanda berlebihan / mengganggu',
      points: 8,
      date: '2026-08-25',
      time: '18:30',
      notes: 'Bercanda saat menyimak setoran teman',
    },
    {
      id: 'rec_005',
      studentId: 'std_005',
      studentName: 'Hasan Al-Banna Pratama',
      studentClass: '8B',
      halaqahId: 'hlq_makkah',
      halaqahName: 'Halaqah Makkah',
      teacherId: 'tch_muhammad',
      teacherName: 'Ustadz Muhammad Al-Hafizh',
      violationId: 'v_001',
      violationName: 'Terlambat halaqah (>10 menit)',
      points: 3,
      date: today,
      time: '05:40',
      notes: 'Terlambat 15 menit',
    },
    {
      id: 'rec_006',
      studentId: 'std_008',
      studentName: 'Ali Zainal Abidin',
      studentClass: '9A',
      halaqahId: 'hlq_madinah',
      halaqahName: 'Halaqah Madinah',
      teacherId: 'tch_abdullah',
      teacherName: 'Ustadz Abdullah Al-Hafizh',
      violationId: 'v_003',
      violationName: 'Tidak setor hafalan baru',
      points: 3,
      date: today,
      time: '19:40',
      notes: 'Hafalan baru belum mutqin',
    }
  ];

  for (const r of sampleRecords) {
    run(
      `INSERT INTO violation_records (
        id, student_id, halaqah_id, teacher_id, violation_id,
        violation_name_snapshot, points_snapshot, halaqah_name_snapshot,
        teacher_name_snapshot, student_class_snapshot, academic_year_snapshot,
        date, time, notes, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2025/2026', ?, ?, ?, 'active', 'Seeder System')`,
      [
        r.id, r.studentId, r.halaqahId, r.teacherId, r.violationId,
        r.violationName, r.points, r.halaqahName,
        r.teacherName, r.studentClass,
        r.date, r.time, r.notes
      ]
    );
  }

  seedStudentsIfEmpty();
  seedKesantrianViolationsIfEmpty();
  seedNewRolesIfEmpty();
  seedPositiveActionsIfEmpty();

  logAudit({
    userName: 'System Initialization',
    action: 'SEED_DATABASE',
    tableName: 'all',
    newData: { status: 'Database berhasil diinisialisasi dengan data awal realistis' },
  });

  console.log('Seeding selesai!');
}
