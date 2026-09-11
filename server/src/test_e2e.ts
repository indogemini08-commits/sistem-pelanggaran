/**
 * Automated End-to-End Test for Halaqah Violation & Point System
 */
async function runTests() {
  const BASE = 'http://localhost:5000/api';
  console.log('=== MEMULAI TEST VERIFIKASI SISTEM ===');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. Health & Settings
  await test('1. Health Check & Settings', async () => {
    const res = await fetch(`${BASE}/health`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Health check status is not ok');

    const sRes = await fetch(`${BASE}/settings`);
    const sData = await sRes.json();
    if (!sData.settings || !sData.thresholds) throw new Error('Settings or thresholds missing');
  });

  // 2. Auth Login as Muhafizh
  let teacherToken = '';
  let teacherUser: any = null;
  await test('2. Auth Login sebagai Muhafizh Ustadz Ahmad', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ahmad@pesantren.id', password: 'ahmad123' }),
    });
    const data = await res.json();
    if (data.user.role !== 'teacher') throw new Error('Role should be teacher');
    if (!data.user.assignedHalaqahs || data.user.assignedHalaqahs.length === 0) {
      throw new Error('Teacher should have assigned halaqahs');
    }
    teacherToken = data.user.token;
    teacherUser = data.user;
  });

  // 3. Auth Login as Admin
  let adminUser: any = null;
  await test('3. Auth Login sebagai Mudir / Admin', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@pesantren.id', password: 'admin123' }),
    });
    const data = await res.json();
    if (data.user.role !== 'admin') throw new Error('Role should be admin');
    adminUser = data.user;
  });

  // 4. Students in Halaqah Doha
  let studentToRecord: any = null;
  await test('4. Santri di Halaqah Doha dapat diakses', async () => {
    const halaqahDoha = teacherUser.assignedHalaqahs[0];
    const res = await fetch(`${BASE}/halaqah/${halaqahDoha.id}/students`);
    const students = await res.json();
    if (students.length === 0) throw new Error('No students in Halaqah Doha');
    studentToRecord = students[0];
  });

  // 5. Quick Record Violation
  let createdRecordId = '';
  let studentPointsBefore = 0;
  await test('5. Catat Pelanggaran Cepat dengan Snapshot Poin Otomatis', async () => {
    // Get master violation for Tidak Murojaah (P002 = 4 points)
    const vRes = await fetch(`${BASE}/violations`);
    const violations = await vRes.json();
    const vMurojaah = violations.find((v: any) => v.code === 'P002');
    if (!vMurojaah) throw new Error('Violation P002 not found');

    // Check student points before
    const sDetailBefore = await (await fetch(`${BASE}/students/${studentToRecord.id}`)).json();
    studentPointsBefore = sDetailBefore.student.total_points;

    const res = await fetch(`${BASE}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: studentToRecord.id,
        halaqahId: teacherUser.assignedHalaqahs[0].id,
        violationId: vMurojaah.id,
        date: '2026-09-09',
        time: '06:30',
        notes: 'Uji coba pencatatan muhafizh via HP',
        createdBy: teacherUser.name,
      }),
    });

    const data = await res.json();
    if (!data.recordId) throw new Error('Record ID not returned');
    if (data.points !== 4) throw new Error('Points should be 4');
    if (data.newTotalPoints !== studentPointsBefore + 4) {
      throw new Error(`New total points mismatch: expected ${studentPointsBefore + 4}, got ${data.newTotalPoints}`);
    }
    createdRecordId = data.recordId;
  });

  // 6. Test Snapshot Integrity: Changing Master Points doesn't change historical record points!
  await test('6. Uji Integritas Snapshot (Ubah Poin Master Tidak Merusak Catatan Lama)', async () => {
    const vRes = await fetch(`${BASE}/violations`);
    const violations = await vRes.json();
    const vMurojaah = violations.find((v: any) => v.code === 'P002');

    // Change master points from 4 to 12
    await fetch(`${BASE}/violations/${vMurojaah.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultPoints: 12,
        name: vMurojaah.name,
        category: vMurojaah.category,
      }),
    });

    // Verify previously created record still has 4 points snapshot!
    const recsRes = await fetch(`${BASE}/records?studentId=${studentToRecord.id}`);
    const recs = await recsRes.json();
    const previousRecord = recs.find((r: any) => r.id === createdRecordId);
    if (previousRecord.points_snapshot !== 4) {
      throw new Error(`Snapshot points should remain 4, but got ${previousRecord.points_snapshot}`);
    }

    // Restore master points back to 4
    await fetch(`${BASE}/violations/${vMurojaah.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultPoints: 4,
        name: vMurojaah.name,
        category: vMurojaah.category,
      }),
    });
  });

  // 7. Soft Delete / Batalkan Pelanggaran & Recalculate Points
  await test('7. Pembatalan Pelanggaran & Pengurangan Poin Otomatis', async () => {
    const cancelRes = await fetch(`${BASE}/records/${createdRecordId}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cancellationReason: 'Uji pembatalan verifikasi',
        actorName: 'Admin Farhan',
      }),
    });
    const cData = await cancelRes.json();
    if (!cData.message.includes('berhasil dibatalkan')) throw new Error('Cancellation message not returned');

    // Check student total points recalculated
    const sDetailAfter = await (await fetch(`${BASE}/students/${studentToRecord.id}`)).json();
    if (sDetailAfter.student.total_points !== studentPointsBefore) {
      throw new Error(`Total points should return to ${studentPointsBefore}, got ${sDetailAfter.student.total_points}`);
    }
  });

  // 8. Add, Edit, Delete User Account (Admin)
  await test('8. Manajemen Akun Pengguna (Tambah, Edit, Hapus)', async () => {
    // Add user
    const addRes = await fetch(`${BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ustadz Test Akun',
        email: 'testakun@pesantren.id',
        password: 'testpassword123',
        role: 'teacher',
        status: 'active',
      }),
    });
    const addData = await addRes.json();
    if (!addData.userId) throw new Error('User creation failed');

    // Edit user
    await fetch(`${BASE}/users/${addData.userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ustadz Test Akun (Updated)',
        status: 'active',
      }),
    });

    // Delete user
    const delRes = await fetch(`${BASE}/users/${addData.userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorName: 'Admin' }),
    });
    const delData = await delRes.json();
    if (!delData.message.includes('berhasil dihapus')) throw new Error('User delete failed');
  });

  // 9. Flexible Halaqah Name Editing
  await test('9. Edit Nama Halaqah secara Fleksibel', async () => {
    const halaqahs = await (await fetch(`${BASE}/halaqah`)).json();
    const target = halaqahs[0];
    const originalName = target.name;

    // Edit name
    await fetch(`${BASE}/halaqah/${target.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${originalName} (Tahfizh Unggulan)`,
        location: target.location,
        schedule: target.schedule,
      }),
    });

    // Verify updated
    const updated = await (await fetch(`${BASE}/halaqah`)).json();
    const found = updated.find((h: any) => h.id === target.id);
    if (!found.name.includes('Unggulan')) throw new Error('Halaqah name not updated');

    // Restore original name
    await fetch(`${BASE}/halaqah/${target.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: originalName,
        location: target.location,
        schedule: target.schedule,
      }),
    });
  });

  // 10. Audit Logs Verification
  await test('10. Audit Log Mencatat Seluruh Aktivitas', async () => {
    const res = await fetch(`${BASE}/audit-logs`);
    const logs = await res.json();
    if (logs.length === 0) throw new Error('Audit logs are empty');
    console.log(`    Total entri audit log tersimpan: ${logs.length}`);
  });

  console.log(`\n=== HASIL PENGUJIAN: ${passed} BERHASIL, ${failed} GAGAL ===`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
