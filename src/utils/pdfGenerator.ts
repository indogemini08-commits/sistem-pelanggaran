import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SchoolSettings, Student, ViolationRecord } from '../types';

/**
 * Gambar Kop Surat Resmi Lembaga / Sekolah
 */
function drawOfficialHeader(doc: jsPDF, settings: SchoolSettings): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let startY = 15;

  // Render Official Logo if present (supports Base64 from device upload or URL)
  if (settings.logo_url && settings.logo_url.trim() !== '') {
    try {
      let format = 'PNG';
      if (settings.logo_url.includes('image/jpeg') || settings.logo_url.includes('image/jpg')) {
        format = 'JPEG';
      } else if (settings.logo_url.includes('image/webp')) {
        format = 'WEBP';
      }
      // Draw 20x20 mm logo on the top-left margin
      doc.addImage(settings.logo_url, format, 14, 13, 20, 20);
    } catch (err) {
      console.warn('PDF Header Logo render warning:', err);
    }
  }

  // Nama Sekolah Utama (Bold Navy)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 36, 63); // #0f243f Deep Navy
  doc.text((settings.school_name || 'PESANTREN TAHFIZH AL-QUR\'AN').toUpperCase(), pageWidth / 2, startY, { align: 'center' });

  // Sub-header Divisi / Kop Surat Text
  startY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 86, 160); // #1e56a0 Royal Navy
  doc.text(settings.kop_surat_text || 'DIVISI HALAQAH TAHFIZH AL-QUR\'AN', pageWidth / 2, startY, { align: 'center' });

  // Alamat & Kontak
  startY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 90, 105);
  const addressText = `${settings.address || ''}`;
  const contactText = `Telp: ${settings.phone || '-'} | Email: ${settings.email || '-'}`;
  doc.text(addressText, pageWidth / 2, startY, { align: 'center' });

  startY += 4.5;
  doc.text(contactText, pageWidth / 2, startY, { align: 'center' });

  // Double horizontal divider line (Kop Surat Style)
  startY += 5;
  doc.setDrawColor(15, 36, 63);
  doc.setLineWidth(1.2);
  doc.line(14, startY, pageWidth - 14, startY);

  doc.setLineWidth(0.4);
  doc.line(14, startY + 1.2, pageWidth - 14, startY + 1.2);

  return startY + 8;
}

/**
 * Cetak Laporan Riwayat Pelanggaran Lengkap (Filterable)
 */
export function generateViolationReportPDF(
  records: ViolationRecord[],
  settings: SchoolSettings,
  filterInfo?: {
    period?: string;
    halaqah?: string;
    muhafizh?: string;
    category?: string;
    printedBy?: string;
  }
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Kop Surat
  let currentY = drawOfficialHeader(doc, settings);

  // 2. Judul Dokumen
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 36, 63);
  doc.text('LAPORAN PENCATATAN PELANGGARAN & POIN HALAQAH', pageWidth / 2, currentY, { align: 'center' });

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Tahun Ajaran: ${settings.current_academic_year || '2025/2026'} | Dicetak pada: ${printDate}`, pageWidth / 2, currentY, { align: 'center' });

  // 3. Metadata Filter
  currentY += 5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, 12, 1.5, 1.5, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('Filter Laporan:', 18, currentY + 5);
  doc.setFont('helvetica', 'normal');
  const halaqahText = filterInfo?.halaqah ? `Halaqah: ${filterInfo.halaqah}` : 'Halaqah: Semua';
  const periodText = filterInfo?.period ? `Periode: ${filterInfo.period}` : 'Periode: Semua Riwayat';
  const categoryText = filterInfo?.category ? `Kategori: ${filterInfo.category}` : 'Kategori: Semua';
  doc.text(`${halaqahText}   |   ${periodText}   |   ${categoryText}`, 42, currentY + 5);

  const totalPoints = records
    .filter((r) => r.status === 'active')
    .reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 36, 63);
  doc.text(`Total Kejadian: ${records.length}  |  Akumulasi Poin: ${totalPoints} Poin`, 18, currentY + 9.5);

  currentY += 16;

  // 4. Tabel Pelanggaran
  const tableRows = records.map((r, idx) => [
    (idx + 1).toString(),
    r.date || '-',
    r.student_name || '-',
    r.student_class_snapshot || '-',
    r.halaqah_name_snapshot || '-',
    r.violation_name_snapshot || '-',
    `${r.points_snapshot} Poin`,
    r.status === 'cancelled' ? 'Dibatalkan' : 'Aktif',
    r.notes || '-',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'Tanggal', 'Nama Santri', 'Kls', 'Halaqah', 'Jenis Pelanggaran', 'Poin', 'Status', 'Keterangan']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 36, 63],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 18 },
      2: { cellWidth: 32 },
      3: { halign: 'center', cellWidth: 10 },
      4: { cellWidth: 24 },
      5: { cellWidth: 36 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
      7: { halign: 'center', cellWidth: 16 },
      8: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Signature Section
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();

  // If near bottom, add page
  let sigY = finalY;
  if (sigY + 35 > pageHeight) {
    doc.addPage();
    sigY = 20;
  }

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');

  const locDate = `Bogor, ${printDate}`;
  doc.text(locDate, pageWidth - 65, sigY);

  sigY += 5;
  doc.text('Mengetahui,', 25, sigY);
  doc.text('Koordinator Tahfizh / Mudir', 25, sigY + 4);

  doc.text('Muhafizh Halaqah', pageWidth - 65, sigY + 4);

  sigY += 22;
  doc.setFont('helvetica', 'bold');
  doc.text('( ............................................ )', 25, sigY);
  doc.text(`( ${filterInfo?.muhafizh || '............................................'} )`, pageWidth - 65, sigY);

  doc.save(`Laporan_Pelanggaran_Halaqah_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Cetak Surat Rekap Poin & Pelanggaran Individual Santri
 * (Untuk arsip wali santri & pembinaan)
 */
export function generateStudentDetailPDF(
  student: Student,
  records: ViolationRecord[],
  settings: SchoolSettings
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Kop Surat
  let currentY = drawOfficialHeader(doc, settings);

  // 2. Judul
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 36, 63);
  doc.text('SURAT REKAPITULASI POIN & PELANGGARAN SANTRI', pageWidth / 2, currentY, { align: 'center' });

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Lembar Informasi Kedisiplinan & Capaian Kegiatan Halaqah Tahfizh', pageWidth / 2, currentY, { align: 'center' });

  // 3. Biodata Santri Card
  currentY += 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, pageWidth - 28, 28, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Nama Santri', 20, currentY + 6);
  doc.text('NIS / ID', 20, currentY + 12);
  doc.text('Kelas', 20, currentY + 18);
  doc.text('Jenis Kelamin', 20, currentY + 24);

  doc.setFont('helvetica', 'normal');
  doc.text(`:  ${student.name}`, 48, currentY + 6);
  doc.text(`:  ${student.student_number}`, 48, currentY + 12);
  doc.text(`:  ${student.class}`, 48, currentY + 18);
  doc.text(`:  ${student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}`, 48, currentY + 24);

  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('Halaqah', 110, currentY + 6);
  doc.text('Muhafizh', 110, currentY + 12);
  doc.text('Tahun Ajaran', 110, currentY + 18);
  doc.text('Status Santri', 110, currentY + 24);

  doc.setFont('helvetica', 'normal');
  doc.text(`:  ${student.halaqah_name || '-'}`, 136, currentY + 6);
  doc.text(`:  ${student.teacher_name || '-'}`, 136, currentY + 12);
  doc.text(`:  ${student.academic_year || '2025/2026'}`, 136, currentY + 18);

  const statusName = student.status_info?.statusName || 'AMAN';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 36, 63);
  doc.text(`:  ${statusName} (${student.total_points} POIN)`, 136, currentY + 24);

  currentY += 34;

  // 4. Tabel Riwayat Pelanggaran
  const tableRows = records.map((r, idx) => [
    (idx + 1).toString(),
    r.date || '-',
    r.time || '-',
    r.violation_name_snapshot || '-',
    `${r.points_snapshot} Poin`,
    r.halaqah_name_snapshot || '-',
    r.teacher_name_snapshot || '-',
    r.status === 'cancelled' ? 'Dibatalkan' : 'Aktif',
    r.notes || '-',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'Tanggal', 'Waktu', 'Jenis Pelanggaran', 'Poin', 'Halaqah', 'Muhafizh', 'Status', 'Catatan']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 36, 63],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 12 },
      3: { cellWidth: 40 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
      5: { cellWidth: 22 },
      6: { cellWidth: 26 },
      7: { halign: 'center', cellWidth: 15 },
      8: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Signature Section
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();

  let sigY = finalY;
  if (sigY + 40 > pageHeight) {
    doc.addPage();
    sigY = 20;
  }

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');

  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Dikeluarkan di Bogor pada: ${printDate}`, pageWidth - 70, sigY);

  sigY += 5;
  doc.text('Mengetahui,', 25, sigY);
  doc.text('Koordinator Tahfizh', 25, sigY + 4);

  doc.text('Muhafizh Pengampu', pageWidth - 70, sigY + 4);

  sigY += 22;
  doc.setFont('helvetica', 'bold');
  doc.text('( ............................................ )', 25, sigY);
  doc.text(`( ${student.teacher_name || '............................................'} )`, pageWidth - 70, sigY);

  doc.save(`Rekap_Poin_${student.name.replace(/\s+/g, '_')}_${student.student_number}.pdf`);
}
