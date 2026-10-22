import type { Pool } from 'pg';

// Finite batches, protected by a transaction-scoped lock across gateway replicas.
export async function pruneMessageLogs(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lock = await client.query('SELECT pg_try_advisory_xact_lock(8100112) AS acquired');
    if (lock.rows[0]?.acquired) {
      await client.query(`UPDATE message_logs SET message='' WHERE id IN
        (SELECT id FROM message_logs WHERE message<>'' LIMIT 5000)`);
      await client.query(`DELETE FROM message_logs WHERE id IN (
        SELECT id FROM message_logs WHERE
          (status='SUCCESS' AND created_at < now()-interval '7 days') OR
          (status<>'SUCCESS' AND created_at < now()-interval '30 days')
        ORDER BY created_at LIMIT 5000)`);
      await client.query(`DELETE FROM message_logs WHERE id IN (
        SELECT id FROM message_logs ORDER BY created_at DESC,id DESC OFFSET 5000 LIMIT 5000)`);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
