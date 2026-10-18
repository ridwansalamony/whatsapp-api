import fs from "fs";
import path from "path";
import { Store } from "whatsapp-web.js";
import { getPool } from "../applications/database";

export interface StoreSessionOption {
  session: string;
  path?: string;
}

/**
 * Custom PostgreSQL Store implementation for whatsapp-web.js RemoteAuth
 */
export class PostgresStore implements Store {
  async sessionExists(options: { session: string }): Promise<boolean> {
    try {
      const pool = getPool();
      const res = await pool.query(
        "SELECT 1 FROM whatsapp_sessions WHERE session_id = $1 LIMIT 1",
        [options.session]
      );
      const exists = (res.rowCount ?? 0) > 0;
      console.log(`[PostgresStore] Checking session '${options.session}': ${exists ? "Found" : "Not Found"}`);
      return exists;
    } catch (error) {
      console.error("[PostgresStore] Error checking session existence:", error);
      return false;
    }
  }

  async save(options: { session: string; path?: string }): Promise<void> {
    try {
      const filePath = options.path || `${options.session}.zip`;
      console.log(`[PostgresStore] Saving session '${options.session}' from: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        console.warn(`[PostgresStore] Session zip file '${filePath}' not found.`);
        return;
      }

      const sessionBuffer = await fs.promises.readFile(filePath);

      const pool = getPool();
      await pool.query(
        `INSERT INTO whatsapp_sessions (session_id, session_data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (session_id)
         DO UPDATE SET session_data = EXCLUDED.session_data, updated_at = NOW()`,
        [options.session, sessionBuffer]
      );

      console.log(`[PostgresStore] ✅ Session '${options.session}' saved to PostgreSQL! (${(sessionBuffer.length / 1024).toFixed(1)} KB)`);
    } catch (error) {
      console.error("[PostgresStore] Error saving session to PostgreSQL:", error);
      throw error;
    }
  }

  async extract(options: { session: string; path: string }): Promise<boolean> {
    try {
      const filePath = options.path || `${options.session}.zip`;
      console.log(`[PostgresStore] Extracting session '${options.session}' to: ${filePath}`);
      const pool = getPool();
      const res = await pool.query(
        "SELECT session_data FROM whatsapp_sessions WHERE session_id = $1 LIMIT 1",
        [options.session]
      );

      if (!res.rows || res.rows.length === 0 || !res.rows[0].session_data) {
        console.log(`[PostgresStore] No existing session found in database for '${options.session}'`);
        return false;
      }

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }

      await fs.promises.writeFile(filePath, res.rows[0].session_data);
      console.log(`[PostgresStore] ✅ Session extracted successfully to ${filePath}`);
      return true;
    } catch (error) {
      console.error("[PostgresStore] Error extracting session:", error);
      return false;
    }
  }

  async delete(options: { session: string }): Promise<void> {
    try {
      console.log(`[PostgresStore] Deleting session '${options.session}'`);
      const pool = getPool();
      await pool.query("DELETE FROM whatsapp_sessions WHERE session_id = $1", [
        options.session,
      ]);
      console.log(`[PostgresStore] ✅ Session '${options.session}' deleted from PostgreSQL`);
    } catch (error) {
      console.error("[PostgresStore] Error deleting session from PostgreSQL:", error);
      throw error;
    }
  }
}

export default PostgresStore;
