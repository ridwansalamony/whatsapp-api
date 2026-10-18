import { Pool, PoolConfig } from "pg";
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

export const getPool = (): Pool => {
  if (!pool) {
    const config: PoolConfig = DATABASE_URL
      ? {
          connectionString: DATABASE_URL,
          ssl: PGSSL ? { rejectUnauthorized: false } : false,
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

    console.log("✅ PostgreSQL siap dan tabel terverifikasi!");
  } finally {
    client.release();
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    console.log("🐘 Menutup pool koneksi PostgreSQL...");
    await pool.end();
    pool = null;
    console.log("✅ Pool PostgreSQL ditutup.");
  }
};

export default initDatabase;
