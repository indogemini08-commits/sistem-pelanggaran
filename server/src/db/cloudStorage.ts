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
      const rows = await sql`SELECT data FROM imbs_snapshots WHERE id = 'master_snapshot' LIMIT 1;`;
      if (rows && rows.length > 0 && rows[0].data) {
        console.log('[CloudStorage] Snapshot berhasil dimuat dari PostgreSQL / Neon.');
        return rows[0].data;
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

// Save database snapshot to configured cloud provider
let isSaving = false;
let pendingSave: any = null;

export async function saveCloudSnapshot(snapshot: any): Promise<boolean> {
  const providerInfo = getActiveCloudProvider();
  if (!providerInfo.isConnected) {
    return false;
  }

  // Debounce saving if already saving
  if (isSaving) {
    pendingSave = snapshot;
    return true;
  }

  isSaving = true;
  try {
    // 1. Neon / PostgreSQL
    if (providerInfo.provider === 'postgres') {
      const dbUrl = (process.env.POSTGRES_URL || process.env.DATABASE_URL)!;
      const sql = neon(dbUrl);
      const dataStr = JSON.stringify(snapshot);
      await sql`
        INSERT INTO imbs_snapshots (id, data, updated_at)
        VALUES ('master_snapshot', ${dataStr}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
      `;
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
  } finally {
    isSaving = false;
    if (pendingSave) {
      const next = pendingSave;
      pendingSave = null;
      setTimeout(() => saveCloudSnapshot(next), 100);
    }
  }

  return false;
}
