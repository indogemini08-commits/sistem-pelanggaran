import { Router, Request, Response } from 'express';
import { query, get, run, logAudit, persistDb } from '../db/database';

const router = Router();

// GET settings & thresholds
router.get('/', (req: Request, res: Response) => {
  try {
    let settings = get<any>('SELECT * FROM school_settings WHERE id = "settings_default"');
    if (!settings) {
      settings = {
        id: 'settings_default',
        app_name: 'Sistem Poin Santri Halaqah',
        school_name: "Pesantren Tahfizh Al-Qur'an Imam Asy-Syathibi",
        address: 'Jl. Karang Anyar No. 45, Kompleks Islamic Center, Bogor, Jawa Barat',
        phone: '0811-9876-5432',
        email: 'tahfizh@imamsyathibi.sch.id',
        logo_url: '/logo.svg',
        kop_surat_text: 'BIDANG PENDIDIKAN DAN KEPENGASUHAN - DIVISI HALAQAH TAHFIZH',
        current_academic_year: '2025/2026',
      };
      run(
        `INSERT OR IGNORE INTO school_settings (id, app_name, school_name, address, phone, email, logo_url, kop_surat_text, current_academic_year)
         VALUES ('settings_default', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [settings.app_name, settings.school_name, settings.address, settings.phone, settings.email, settings.logo_url, settings.kop_surat_text, settings.current_academic_year]
      );
    }

    let thresholds = query<any>('SELECT * FROM point_thresholds ORDER BY sort_order ASC');
    if (!thresholds || thresholds.length === 0) {
      const defaultThresholds = [
        { id: 'th_1', min: 0, max: 19, name: 'AMAN', color: 'emerald', desc: 'Kedisiplinan dan capaian hafalan santri dalam kondisi baik.', order: 1 },
        { id: 'th_2', min: 20, max: 49, name: 'PERLU PEMBINAAN', color: 'amber', desc: 'Perlu bimbingan dan pemantauan berkala oleh Muhafizh.', order: 2 },
        { id: 'th_3', min: 50, max: 74, name: 'PEMBINAAN KHUSUS', color: 'orange', desc: 'Pemanggilan oleh Koordinator Tahfizh dan jadwal murojaah tambahan.', order: 3 },
        { id: 'th_4', min: 75, max: 99, name: 'PERINGATAN RESMI', color: 'rose', desc: 'Penerbitan Surat Peringatan (SP) dan pemanggilan orang tua/wali.', order: 4 },
        { id: 'th_5', min: 100, max: 999, name: 'TINDAKAN LANJUT', color: 'red', desc: 'Sidang Dewan Asatidz dan evaluasi kelanjutan kepesertaan halaqah.', order: 5 },
      ];
      for (const th of defaultThresholds) {
        run(
          `INSERT OR IGNORE INTO point_thresholds (id, minimum_points, maximum_points, status_name, badge_color, description, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [th.id, th.min, th.max, th.name, th.color, th.desc, th.order]
        );
      }
      thresholds = query<any>('SELECT * FROM point_thresholds ORDER BY sort_order ASC');
    }

    return res.json({
      settings,
      thresholds,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update school settings (APP NAME, LOGO, SCHOOL NAME, ADDRESS, KOP SURAT)
router.put('/school', async (req: Request, res: Response) => {
  try {
    const {
      appName,
      schoolName,
      address,
      phone,
      email,
      logoUrl,
      kopSuratText,
      currentAcademicYear,
      actorName = 'Admin',
    } = req.body;

    const old = get<any>('SELECT * FROM school_settings WHERE id = "settings_default"');

    const updatedAppName = appName ? appName.trim() : (old?.app_name || 'Sistem Poin Santri Halaqah');
    const updatedSchoolName = schoolName ? schoolName.trim() : (old?.school_name || "Pesantren Tahfizh Al-Qur'an Imam Asy-Syathibi");
    const updatedAddress = address ? address.trim() : (old?.address || 'Jl. Karang Anyar No. 45, Kompleks Islamic Center, Bogor, Jawa Barat');
    const updatedPhone = phone !== undefined ? phone.trim() : (old?.phone || '0811-9876-5432');
    const updatedEmail = email !== undefined ? email.trim() : (old?.email || 'tahfizh@imamsyathibi.sch.id');
    const updatedLogo = logoUrl !== undefined ? logoUrl.trim() : (old?.logo_url || '/logo.svg');
    const updatedKop = kopSuratText !== undefined ? kopSuratText.trim() : (old?.kop_surat_text || 'BIDANG PENDIDIKAN DAN KEPENGASUHAN - DIVISI HALAQAH TAHFIZH');
    const updatedYear = currentAcademicYear ? currentAcademicYear.trim() : (old?.current_academic_year || '2025/2026');

    run(
      `INSERT OR REPLACE INTO school_settings (id, app_name, school_name, address, phone, email, logo_url, kop_surat_text, current_academic_year)
       VALUES ('settings_default', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [updatedAppName, updatedSchoolName, updatedAddress, updatedPhone, updatedEmail, updatedLogo, updatedKop, updatedYear]
    );

    logAudit({
      userName: actorName,
      action: 'UPDATE_SCHOOL_SETTINGS',
      tableName: 'school_settings',
      recordId: 'settings_default',
      oldData: old,
      newData: { appName: updatedAppName, schoolName: updatedSchoolName, address: updatedAddress, logoUrl: updatedLogo },
    });

    await persistDb();
    return res.json({ message: 'Pengaturan identitas sekolah & aplikasi berhasil disimpan' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update point thresholds (BATAS POIN)
router.put('/thresholds', async (req: Request, res: Response) => {
  try {
    const { thresholds, actorName = 'Admin' } = req.body;
    if (!Array.isArray(thresholds)) {
      return res.status(400).json({ error: 'Data batas poin tidak valid' });
    }

    const oldThresholds = query<any>('SELECT * FROM point_thresholds');

    // Clear and re-insert
    run('DELETE FROM point_thresholds');

    for (let i = 0; i < thresholds.length; i++) {
      const th = thresholds[i];
      const id = th.id || 'th_' + (i + 1);
      run(
        `INSERT INTO point_thresholds (id, minimum_points, maximum_points, status_name, badge_color, description, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          parseInt(th.minimum_points || th.min, 10),
          parseInt(th.maximum_points || th.max, 10),
          th.status_name || th.name,
          th.badge_color || th.color || 'blue',
          th.description || th.desc || '',
          i + 1,
        ]
      );
    }

    logAudit({
      userName: actorName,
      action: 'UPDATE_POINT_THRESHOLDS',
      tableName: 'point_thresholds',
      oldData: oldThresholds,
      newData: thresholds,
    });

    await persistDb();
    return res.json({ message: 'Batas status poin berhasil diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
