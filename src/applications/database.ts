import { Pool, PoolConfig } from "pg";
import { pruneMessageLogs } from '../services/message-log-retention';
import {
  DATABASE_URL,
  PGHOST,
  PGPORT,
  PGUSER,
  PGPASSWORD,
  PGDATABASE,
  PGSSL,
} from "../utils/env";

let pool: Pool | null = null;
let retentionTimer: ReturnType<typeof setInterval> | null = null;
let retentionRunning = false;
async function maintainMessageLogs() {
  if (retentionRunning) return;
  retentionRunning = true;
  try { await pruneMessageLogs(getPool()); }
  catch { console.error('Pembersihan riwayat WhatsApp tertunda.'); }
  finally { retentionRunning = false; }
}

export const getPool = (): Pool => {
  if (!pool) {
    const shouldUseSsl =
      PGSSL ||
      (DATABASE_URL
        ? DATABASE_URL.includes("supabase") ||
          DATABASE_URL.includes("sslmode=require") ||
          DATABASE_URL.includes("ssl=true")
        : false);

    const config: PoolConfig = DATABASE_URL
      ? {
          connectionString: DATABASE_URL,
          ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
        }
      : {
          host: PGHOST,
          port: PGPORT,
          user: PGUSER,
          password: PGPASSWORD,
          database: PGDATABASE,
          ssl: PGSSL ? { rejectUnauthorized: false } : false,
        };

    pool = new Pool({
      ...config,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.error("❌ Unexpected error on idle PostgreSQL client:", err.message);
    });
  }

  return pool;
};

export const initDatabase = async (): Promise<void> => {
  const currentPool = getPool();
  const client = await currentPool.connect();

  try {
    console.log("🐘 Memeriksa koneksi dan struktur tabel PostgreSQL...");

    // 1. Table for WhatsApp RemoteAuth session storage
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_sessions (
        session_id VARCHAR(255) PRIMARY KEY,
        session_data BYTEA NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Table for tracking outgoing messages & delivery history
    await client.query(`
      CREATE TABLE IF NOT EXISTS message_logs (
        id SERIAL PRIMARY KEY,
        recipient VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) NOT NULL,
        whatsapp_message_id VARCHAR(100),
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Index on created_at for fast query on message_logs
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_message_logs_created_at 
      ON message_logs(created_at DESC);
    `);

    await client.query(`ALTER TABLE message_logs
      ADD COLUMN IF NOT EXISTS message_sha256 VARCHAR(64),
      ADD COLUMN IF NOT EXISTS message_bytes INTEGER`);

    console.log("✅ PostgreSQL siap dan tabel terverifikasi!");
  } finally {
    client.release();
  }
  await maintainMessageLogs();
  if (!retentionTimer) {
    retentionTimer = setInterval(() => { void maintainMessageLogs(); }, 5 * 60 * 1000);
    retentionTimer.unref();
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (retentionTimer) { clearInterval(retentionTimer); retentionTimer = null; }
  if (pool) {
    console.log("🐘 Menutup pool koneksi PostgreSQL...");
    await pool.end();
    pool = null;
    console.log("✅ Pool PostgreSQL ditutup.");
  }
};

export default initDatabase;
