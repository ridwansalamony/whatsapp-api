import { Request, Response } from "express";
import appService from "../services/app.service";
import { getClientState } from "../applications/app";
import { success, error } from "../utils/response";

export default {
  /**
   * Endpoint: POST /api/send-message
   * Send WhatsApp message to destination number or group
   */
  async send(req: Request, res: Response): Promise<void> {
    try {
      const { to, message } = req.body;

      if (!to || !message) {
        error(res, "Field 'to' (nomor tujuan) dan 'message' (teks pesan) wajib diisi.", undefined, 400);
        return;
      }

      const result = await appService.send({ to, message });
      success(res, result, 200);
    } catch (err: any) {
      console.error("[AppController] Send error:", err.message);

      if (err.message.includes("belum siap") || err.message.includes("belum diinisialisasi")) {
        res.status(503).json({
          success: false,
          error: err.message,
          hint: "Buka endpoint /api/qr pada browser untuk menautkan akun WhatsApp.",
        });
        return;
      }

      if (err.message.includes("tidak valid") || err.message.includes("tidak boleh kosong")) {
        error(res, err.message, undefined, 400);
        return;
      }

      error(res, "Gagal mengirim pesan WhatsApp", err.message, 500);
    }
  },

  /**
   * Endpoint: POST /api/whatsapp/send-personal
   * Send personal message
   */
  async sendPersonal(req: Request, res: Response): Promise<void> {
    try {
      const { to, message } = req.body;

      if (!to || !message) {
        error(res, "Missing 'to' or 'message'", undefined, 400);
        return;
      }

      const response = await appService.sendPersonal({ to, message });
      success(res, { to, message, response }, 200);
    } catch (err: any) {
      console.error("[AppController] sendPersonal error:", err.message);
      error(res, err.message || "Failed to send personal message", undefined, 500);
    }
  },

  /**
   * Endpoint: POST /api/whatsapp/send-group
   * Send group message
   */
  async sendGroup(req: Request, res: Response): Promise<void> {
    try {
      const { to, message } = req.body;

      if (!to || !message) {
        error(res, "Missing 'to' or 'message'", undefined, 400);
        return;
      }

      const response = await appService.sendGroup({ to, message });
      success(res, { to, message, response }, 200);
    } catch (err: any) {
      console.error("[AppController] sendGroup error:", err.message);
      error(res, err.message || "Failed to send group message", undefined, 500);
    }
  },

  /**
   * Endpoint: GET /api/whatsapp/groups
   * Get all WhatsApp groups
   */
  async getGroups(_req: Request, res: Response): Promise<void> {
    try {
      const groups = await appService.getGroups();
      success(res, groups, 200);
    } catch (err: any) {
      console.error("[AppController] getGroups error:", err.message);
      error(res, err.message || "Failed to fetch groups", undefined, 500);
    }
  },

  /**
   * Endpoint: GET /api/status
   * Get WhatsApp client status and session info
   */
  async status(req: Request, res: Response): Promise<void> {
    const state = getClientState();
    res.status(200).json({
      success: true,
      data: {
        status: state.status,
        isReady: state.status === "READY",
        user: state.user,
        readyAt: state.readyAt,
        hasQrCode: Boolean(state.qrDataUrl),
        lastError: state.lastError,
      },
    });
  },

  /**
   * Endpoint: GET /api/qr
   * View QR code in browser for easy linking on VPS
   */
  async qrView(req: Request, res: Response): Promise<void> {
    const state = getClientState();

    if (state.status === "READY") {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>WhatsApp Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0b141a; color: #e9edef; }
            .card { background: #111b21; padding: 32px; border-radius: 12px; text-align: center; border: 1px solid #222d34; max-width: 400px; }
            .badge { background: #00a884; color: white; padding: 6px 16px; border-radius: 20px; font-weight: bold; display: inline-block; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Terhubung (READY)</div>
            <h2>WhatsApp Siap Digunakan</h2>
            <p>Nomor: <strong>${state.user?.id || "N/A"}</strong></p>
            <p>Akun: <strong>${state.user?.pushname || "N/A"}</strong></p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    if (!state.qrDataUrl) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>WhatsApp Status</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta http-equiv="refresh" content="3">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0b141a; color: #e9edef; }
            .card { background: #111b21; padding: 32px; border-radius: 12px; text-align: center; border: 1px solid #222d34; max-width: 400px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Status: ${state.status}</h2>
            <p>Sedang memuat client WhatsApp... Halaman ini akan otomatis refresh setiap 3 detik.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Scan WhatsApp QR Code</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="20">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0b141a; color: #e9edef; }
          .card { background: #111b21; padding: 32px; border-radius: 12px; text-align: center; border: 1px solid #222d34; max-width: 400px; }
          img { border-radius: 8px; margin: 16px 0; background: white; padding: 12px; }
          p { color: #8696a0; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Tautkan WhatsApp</h2>
          <p>Buka WhatsApp di ponsel Anda > Perangkat Tertaut > Tautkan Perangkat, lalu scan QR di bawah ini:</p>
          <img src="${state.qrDataUrl}" alt="WhatsApp QR Code" width="260" height="260" />
          <p>QR code akan otomatis diperbarui setiap 20 detik jika belum discan.</p>
        </div>
      </body>
      </html>
    `);
  },

  /**
   * Endpoint: GET /api/logs
   * View recent message logs stored in PostgreSQL
   */
  async logs(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 20;
      const logs = await appService.getLogs(limit);
      res.status(200).json({
        success: true,
        count: logs.length,
        data: logs,
      });
    } catch (err: any) {
      error(res, "Gagal mengambil riwayat pesan", err.message, 500);
    }
  },
};
