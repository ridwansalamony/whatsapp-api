import { getClient } from "../applications/app";
import { getPool } from "../applications/database";
import { formatToWhatsAppJid } from "../utils/phone.util";
import { createHash } from 'node:crypto';

export interface SendMessagePayload {
  to: string;
  message: string;
}

export interface SendMessageResult {
  success: boolean;
  to: string;
  jid: string;
  messageId: string;
  timestamp: number;
}

export default {
  async send(payload: SendMessagePayload): Promise<SendMessageResult> {
    const { to, message } = payload;

    // 1. Validasi dan formatting nomor atau JID grup
    const phoneInfo = formatToWhatsAppJid(to);
    if (!phoneInfo.isValid) {
      throw new Error(phoneInfo.error || "Format nomor telepon atau grup tidak valid");
    }

    if (!message || message.trim().length === 0) {
      throw new Error("Pesan teks tidak boleh kosong");
    }

    const client = getClient();
    const pool = getPool();
    const text = message.trim();
    const hash = createHash('sha256').update(text).digest('hex');
    const bytes = Buffer.byteLength(text, 'utf8');

    try {
      // 2. Kirim pesan via WhatsApp Web Client
      const result = await client.sendMessage(phoneInfo.jid, text);
      const messageId = result.id?.id || "unknown";

      // 3. Catat history ke PostgreSQL (asynchronous, non-blocking)
      pool
        .query(
          `INSERT INTO message_logs (recipient, message, status, whatsapp_message_id, message_sha256, message_bytes)
           VALUES ($1, '', $2, $3, $4, $5)`,
          [phoneInfo.formattedNumber, "SUCCESS", messageId, hash, bytes]
        )
        .catch((dbErr) => {
          console.error("Gagal mencatat log pesan ke PostgreSQL:", dbErr.message);
        });

      return {
        success: true,
        to: phoneInfo.formattedNumber,
        jid: phoneInfo.jid,
        messageId,
        timestamp: result.timestamp || Date.now(),
      };
    } catch (error) {
      const err = error as Error;

      // Catat kegagalan ke database
      pool
        .query(
          `INSERT INTO message_logs (recipient, message, status, error_message, message_sha256, message_bytes)
           VALUES ($1, '', $2, $3, $4, $5)`,
          [phoneInfo.formattedNumber || to, "FAILED", 'whatsapp_send_failed', hash, bytes]
        )
        .catch((dbErr) => {
          console.error("Gagal mencatat log kegagalan ke PostgreSQL:", dbErr.message);
        });

      console.error(`[AppService] Gagal mengirim pesan ke ${phoneInfo.jid}:`, err.message);
      throw err;
    }
  },

  async sendPersonal(payload: SendMessagePayload) {
    return this.send(payload);
  },

  async sendGroup(payload: SendMessagePayload) {
    let to = payload.to;
    if (!to.endsWith("@g.us")) {
      to = `${to.replace(/\D/g, "")}@g.us`;
    }
    return this.send({ to, message: payload.message });
  },

  async getGroups() {
    const client = getClient();
    const chats = await client.getChats();
    return chats
      .filter((chat: any) => chat.isGroup)
      .map((g: any) => ({
        id: g.id._serialized,
        name: g.name,
      }));
  },

  async getLogs(limit: number = 50) {
    const pool = getPool();
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const result = await pool.query(
      `SELECT id, recipient, message, status, whatsapp_message_id, error_message, created_at, message_sha256, message_bytes
       FROM message_logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [safeLimit]
    );

    return result.rows;
  },
};
