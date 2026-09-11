import * as XLSX from 'xlsx';

export interface StudentExcelRow {
  student_number: string;
  name: string;
  class: string;
  gender: string;
  halaqah: string;
  academic_year: string;
}

/**
 * Unduh file template resmi Import Santri format .xlsx
 */
export function downloadStudentImportTemplate() {
  const sampleData = [
    {
      'NIS': '2025011',
      'Nama Lengkap': 'Fatih Robbani',
      'Kelas': '7A',
      'Jenis Kelamin (L/P)': 'L',
      'Nama Halaqah': 'Halaqah Doha',
      'Tahun Ajaran': '2025/2026',
    },
    {
      'NIS': '2025012',
      'Nama Lengkap': 'Rayhan Maulana',
      'Kelas': '8B',
      'Jenis Kelamin (L/P)': 'L',
      'Nama Halaqah': 'Halaqah Makkah',
      'Tahun Ajaran': '2025/2026',
    },
    {
      'NIS': '2025013',
      'Nama Lengkap': 'Siti Aisyah Humaira',
      'Kelas': '7C',
      'Jenis Kelamin (L/P)': 'P',
      'Nama Halaqah': 'Halaqah Madinah',
      'Tahun Ajaran': '2025/2026',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // NIS
    { wch: 28 }, // Nama
    { wch: 10 }, // Kelas
    { wch: 20 }, // Gender
    { wch: 22 }, // Halaqah
    { wch: 16 }, // Tahun Ajaran
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Santri');

  // Petunjuk sheet
  const instructionData = [
    { 'Petunjuk Pengisian Import Data Santri': '1. Jangan mengubah nama kolom pada baris pertama.' },
    { 'Petunjuk Pengisian Import Data Santri': '2. Kolom NIS wajib unik dan tidak boleh kosong.' },
    { 'Petunjuk Pengisian Import Data Santri': '3. Kolom Jenis Kelamin diisi "L" untuk Laki-laki atau "P" untuk Perempuan.' },
    { 'Petunjuk Pengisian Import Data Santri': '4. Nama Halaqah dapat menggunakan halaqah yang sudah ada (Halaqah Doha, Makkah, Madinah) atau nama baru.' },
    { 'Petunjuk Pengisian Import Data Santri': '5. Jika nama halaqah baru diisi, sistem akan otomatis mendaftarkannya.' },
    { 'Petunjuk Pengisian Import Data Santri': '6. Simpan file dalam format .xlsx atau .csv sebelum diunggah.' },
  ];
  const wsInst = XLSX.utils.json_to_sheet(instructionData);
  wsInst['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsInst, 'Petunjuk');

  XLSX.writeFile(wb, 'Template_Import_Santri_Halaqah.xlsx');
}

/**
 * Parse file Excel yang diunggah pengguna menjadi array objek santri
 */
export async function parseStudentExcelFile(file: File): Promise<StudentExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);

        const rows: StudentExcelRow[] = rawRows.map((row) => ({
          student_number: (row['NIS'] || row['student_number'] || row['nis'] || '').toString().trim(),
          name: (row['Nama Lengkap'] || row['Nama'] || row['name'] || row['nama'] || '').toString().trim(),
          class: (row['Kelas'] || row['class'] || row['kelas'] || '').toString().trim(),
          gender: (row['Jenis Kelamin (L/P)'] || row['Jenis Kelamin'] || row['gender'] || row['JK'] || 'L').toString().trim(),
          halaqah: (row['Nama Halaqah'] || row['Halaqah'] || row['halaqah'] || '').toString().trim(),
          academic_year: (row['Tahun Ajaran'] || row['academic_year'] || '2025/2026').toString().trim(),
        }));

        resolve(rows);
      } catch (err) {
        reject(new Error('Gagal membaca file Excel. Pastikan format file adalah .xlsx atau .csv yang valid.'));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membuka file Excel.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export data array ke file Excel (.xlsx)
 */
export function exportToExcel(data: any[], fileName: string, sheetName = 'Data') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}
