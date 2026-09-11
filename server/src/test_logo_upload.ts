/**
 * Automated test to verify device logo upload and settings persistence
 */
async function testLogoUpload() {
  const BASE = 'http://localhost:5000/api';
  console.log('Testing device logo upload and school settings persistence...');

  // 1. Get current settings
  const res1 = await fetch(`${BASE}/settings`);
  const data1 = await res1.json();
  console.log('Current App Name:', data1.settings.app_name);
  console.log('Current Logo URL:', data1.settings.logo_url.substring(0, 40) + '...');

  // 2. Generate a valid Base64 PNG image (1x1 transparent PNG data URL)
  const sampleBase64Logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // 3. Upload/update logo
  const updateRes = await fetch(`${BASE}/settings/school`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appName: data1.settings.app_name,
      schoolName: data1.settings.school_name,
      address: data1.settings.address,
      phone: data1.settings.phone,
      email: data1.settings.email,
      logoUrl: sampleBase64Logo,
      kopSuratText: data1.settings.kop_surat_text,
      currentAcademicYear: data1.settings.current_academic_year,
      actorName: 'Admin Tester',
    }),
  });

  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    throw new Error('Update failed: ' + JSON.stringify(updateData));
  }
  console.log('Update response:', updateData.message);

  // 4. Re-fetch settings and verify that logo_url is preserved
  const res2 = await fetch(`${BASE}/settings`);
  const data2 = await res2.json();

  if (data2.settings.logo_url !== sampleBase64Logo) {
    throw new Error('Logo URL did not match uploaded base64 data!');
  }
  console.log('SUCCESS! Device Logo was successfully saved and persisted in database.');

  // 5. Check Audit Log
  const auditRes = await fetch(`${BASE}/audit-logs`);
  const auditData = await auditRes.json();
  const latestAudit = auditData[0];
  console.log('Latest Audit Action:', latestAudit?.action, 'by', latestAudit?.actor_name);

  // 6. Reset back to clean SVG logo
  await fetch(`${BASE}/settings/school`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appName: data1.settings.app_name,
      schoolName: data1.settings.school_name,
      address: data1.settings.address,
      phone: data1.settings.phone,
      email: data1.settings.email,
      logoUrl: '/logo.svg',
      kopSuratText: data1.settings.kop_surat_text,
      currentAcademicYear: data1.settings.current_academic_year,
      actorName: 'Admin Tester',
    }),
  });
  console.log('Reset back to /logo.svg completed.');
}

testLogoUpload().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
