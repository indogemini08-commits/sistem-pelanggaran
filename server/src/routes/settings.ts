import { Router, Request, Response } from 'express';
import { query, get, run, logAudit } from '../db/database';

const router = Router();

// GET settings & thresholds
router.get('/', (req: Request, res: Response) => {
  try {
    let settings = get<any>('SELECT * FROM school_settings WHERE id = "settings_default"');
    if (!settings) {
      // Fallback
      settings = {
        app_name: 'Sistem Poin Santri Halaqah',
        school_name: "Pesantren Tahfizh Al-Qur'an Imam Asy-Syathibi",
        address: 'Jl. Karang Anyar No. 45, Kompleks Islamic Center, Bogor, Jawa Barat',
        phone: '0811-9876-5432',
        email: 'tahfizh@imamsyathibi.sch.id',
        logo_url: '/logo.svg',
        kop_surat_text: 'BIDANG PENDIDIKAN DAN KEPENGASUHAN - DIVISI HALAQAH TAHFIZH',
        current_academic_year: '2025/2026',
      };
    }

    const thresholds = query<any>('SELECT * FROM point_thresholds ORDER BY sort_order ASC');

    return res.json({
      settings,
      thresholds,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update school settings (APP NAME, LOGO, SCHOOL NAME, ADDRESS, KOP SURAT)
router.put('/school', (req: Request, res: Response) => {
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

    const updatedAppName = appName ? appName.trim() : old?.app_name;
    const updatedSchoolName = schoolName ? schoolName.trim() : old?.school_name;
    const updatedAddress = address ? address.trim() : old?.address;
    const updatedPhone = phone !== undefined ? phone.trim() : old?.phone;
    const updatedEmail = email !== undefined ? email.trim() : old?.email;
    const updatedLogo = logoUrl !== undefined ? logoUrl.trim() : old?.logo_url;
    const updatedKop = kopSuratText !== undefined ? kopSuratText.trim() : old?.kop_surat_text;
    const updatedYear = currentAcademicYear ? currentAcademicYear.trim() : old?.current_academic_year;

    run(
      `UPDATE school_settings
       SET app_name = ?, school_name = ?, address = ?, phone = ?, email = ?, logo_url = ?, kop_surat_text = ?, current_academic_year = ?
       WHERE id = "settings_default"`,
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

    return res.json({ message: 'Pengaturan identitas sekolah & aplikasi berhasil disimpan' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update point thresholds (BATAS POIN)
router.put('/thresholds', (req: Request, res: Response) => {
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

    return res.json({ message: 'Batas status poin berhasil diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
