import { neon } from '@neondatabase/serverless';
import { put, list } from '@vercel/blob';

export interface CloudProviderInfo {
  provider: 'postgres' | 'vercel-kv' | 'vercel-blob' | 'local-sqlite';
  isConnected: boolean;
  details: string;
}

// Check which cloud storage provider is configured in environment variables
export function getActiveCloudProvider(): CloudProviderInfo {
  if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
    return {
      provider: 'postgres',
      isConnected: true,
      details: 'PostgreSQL / Neon Database Aktif (Shared Cloud Persistence)',
    };
  }

  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return {
      provider: 'vercel-kv',
      isConnected: true,
      details: 'Vercel KV / Upstash Redis Aktif (Shared Cloud Persistence)',
    };
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      provider: 'vercel-blob',
      isConnected: true,
      details: 'Vercel Blob Storage Aktif (Shared Cloud Persistence)',
    };
  }

  return {
    provider: 'local-sqlite',
    isConnected: false,
    details: process.env.VERCEL
      ? 'Mode Serverless Ephemeral (Hubungkan Vercel Postgres/KV di tab Storage untuk cloud persistence 24/7)'
      : 'Mode Localhost SQLite (server/data/halaqah.db)',
  };
}

// Load database snapshot from configured cloud provider
export async function loadCloudSnapshot(): Promise<any | null> {
  const providerInfo = getActiveCloudProvider();

  // 1. Neon / PostgreSQL
  if (providerInfo.provider === 'postgres') {
    const dbUrl = (process.env.POSTGRES_URL || process.env.DATABASE_URL)!;
    try {
      const sql = neon(dbUrl);
      // Ensure table exists
      await sql`
        CREATE TABLE IF NOT EXISTS imbs_snapshots (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      const rows = await sql`SELECT data, updated_at FROM imbs_snapshots WHERE id = 'master_snapshot' LIMIT 1;`;
      if (rows && rows.length > 0 && rows[0].data) {
        console.log('[CloudStorage] Snapshot berhasil dimuat dari PostgreSQL / Neon.');
        if (rows[0].updated_at) {
          localSnapshotTimestamp = new Date(rows[0].updated_at).toISOString();
        }
        let snapshotData = rows[0].data;
        if (typeof snapshotData === 'string') {
          try {
            snapshotData = JSON.parse(snapshotData);
          } catch {}
        }
        return snapshotData;
      }
    } catch (err: any) {
      console.warn('[CloudStorage] Gagal memuat snapshot dari PostgreSQL / Neon:', err?.message || err);
    }
  }

  // 2. Vercel KV / Upstash Redis
  if (providerInfo.provider === 'vercel-kv') {
    const kvUrl = process.env.KV_REST_API_URL!;
    const kvToken = process.env.KV_REST_API_TOKEN!;
    try {
      const res = await fetch(`${kvUrl}/get/imbs_master_snapshot`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result) {
          const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
          console.log('[CloudStorage] Snapshot berhasil dimuat dari Vercel KV.');
          return parsed;
        }
      }
    } catch (err: any) {
      console.warn('[CloudStorage] Gagal memuat snapshot dari Vercel KV:', err?.message || err);
    }
  }

  // 3. Vercel Blob
  if (providerInfo.provider === 'vercel-blob') {
    try {
      const blobs = await list({ prefix: 'imbs-data/master-snapshot.json' });
      if (blobs.blobs && blobs.blobs.length > 0) {
        const blobUrl = blobs.blobs[0].url;
        const res = await fetch(blobUrl);
        if (res.ok) {
          const snapshot = await res.json();
          console.log('[CloudStorage] Snapshot berhasil dimuat dari Vercel Blob.');
          return snapshot;
        }
      }
    } catch (err: any) {
      console.warn('[CloudStorage] Gagal memuat snapshot dari Vercel Blob:', err?.message || err);
    }
  }

  return null;
}

let localSnapshotTimestamp: string | null = null;
let lastCheckTime = 0;

export async function checkAndSyncCloudSnapshot(importCallback: (data: any) => void): Promise<void> {
  const providerInfo = getActiveCloudProvider();
  if (providerInfo.provider !== 'postgres') return;

  const now = Date.now();
  if (now - lastCheckTime < 1000) return;
  lastCheckTime = now;

  try {
    const dbUrl = (process.env.POSTGRES_URL || process.env.DATABASE_URL)!;
    const sql = neon(dbUrl);
    const rows = await sql`SELECT data, updated_at FROM imbs_snapshots WHERE id = 'master_snapshot' LIMIT 1;`;
    if (rows && rows.length > 0 && rows[0].updated_at) {
      const remoteTime = new Date(rows[0].updated_at).toISOString();
      if (localSnapshotTimestamp && remoteTime !== localSnapshotTimestamp) {
        console.log(`[CloudStorage] Remote snapshot is newer (${remoteTime} vs ${localSnapshotTimestamp}), syncing container...`);
        let snapshotData = rows[0].data;
        if (typeof snapshotData === 'string') {
          try {
            snapshotData = JSON.parse(snapshotData);
          } catch {}
        }
        if (snapshotData && (snapshotData.version || snapshotData.timestamp || Array.isArray(snapshotData.users))) {
          importCallback(snapshotData);
          localSnapshotTimestamp = remoteTime;
        }
      } else if (!localSnapshotTimestamp) {
        localSnapshotTimestamp = remoteTime;
      }
    }
  } catch (err: any) {
    // Non-blocking
  }
}

// Save database snapshot to configured cloud provider
export async function saveCloudSnapshot(snapshot: any): Promise<boolean> {
  const providerInfo = getActiveCloudProvider();
  if (!providerInfo.isConnected) {
    return false;
  }

  // Guard against saving an empty or unpopulated database
  const hasContent =
    snapshot &&
    (
      (Array.isArray(snapshot.users) && snapshot.users.length > 0) ||
      (Array.isArray(snapshot.school_settings) && snapshot.school_settings.length > 0) ||
      (Array.isArray(snapshot.point_thresholds) && snapshot.point_thresholds.length > 0) ||
      (Array.isArray(snapshot.students) && snapshot.students.length > 0) ||
      (Array.isArray(snapshot.violations) && snapshot.violations.length > 0)
    );

  if (!hasContent) {
    console.warn('[CloudStorage] Diabaikan: upaya menyimpan snapshot database kosong ke cloud diblokir.');
    return false;
  }

  try {
    // 1. Neon / PostgreSQL
    if (providerInfo.provider === 'postgres') {
      const dbUrl = (process.env.POSTGRES_URL || process.env.DATABASE_URL)!;
      const sql = neon(dbUrl);
      const dataStr = JSON.stringify(snapshot);
      const res = await sql`
        INSERT INTO imbs_snapshots (id, data, updated_at)
        VALUES ('master_snapshot', ${dataStr}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
        RETURNING updated_at;
      `;
      if (res && res.length > 0 && res[0].updated_at) {
        localSnapshotTimestamp = new Date(res[0].updated_at).toISOString();
      }
      console.log('[CloudStorage] Snapshot berhasil disimpan ke PostgreSQL / Neon.');
      return true;
    }

    // 2. Vercel KV / Upstash Redis
    if (providerInfo.provider === 'vercel-kv') {
      const kvUrl = process.env.KV_REST_API_URL!;
      const kvToken = process.env.KV_REST_API_TOKEN!;
      const dataStr = JSON.stringify(snapshot);
      const res = await fetch(`${kvUrl}/set/imbs_master_snapshot`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kvToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataStr),
      });
      if (res.ok) {
        console.log('[CloudStorage] Snapshot berhasil disimpan ke Vercel KV.');
        return true;
      }
    }

    // 3. Vercel Blob
    if (providerInfo.provider === 'vercel-blob') {
      const dataStr = JSON.stringify(snapshot, null, 2);
      await put('imbs-data/master-snapshot.json', dataStr, {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
      });
      console.log('[CloudStorage] Snapshot berhasil disimpan ke Vercel Blob.');
      return true;
    }
  } catch (err: any) {
    console.error('[CloudStorage] Gagal menyimpan snapshot ke cloud provider:', err?.message || err);
  }

  return false;
}
