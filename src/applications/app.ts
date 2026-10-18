import express, { Request, Response, NextFunction, Application } from "express";
import cors from "cors";
import qrcodeTerminal from "qrcode-terminal";
import QRCode from "qrcode";
import { Client, RemoteAuth } from "whatsapp-web.js";
import router from "../routes/api";
import PostgresStore from "../services/postgres-store.service";
import {
  SESSION_NAME,
  PUPPETEER_EXECUTABLE_PATH,
  NODE_ENV,
} from "../utils/env";

export type ClientStatus =
  | "STOPPED"
  | "INITIALIZING"
  | "QR_READY"
  | "AUTHENTICATED"
  | "READY"
  | "DISCONNECTED";

export interface WhatsAppState {
  status: ClientStatus;
  qrRaw: string | null;
  qrDataUrl: string | null;
  user: {
    id?: string;
    pushname?: string;
  } | null;
  readyAt: Date | null;
  lastError: string | null;
}

const state: WhatsAppState = {
  status: "STOPPED",
  qrRaw: null,
  qrDataUrl: null,
  user: null,
  readyAt: null,
  lastError: null,
};

let clientInstance: Client | null = null;

export const getClientState = (): WhatsAppState => ({ ...state });

export const getClient = (): Client => {
  if (!clientInstance) {
    throw new Error(
      "WhatsApp client belum diinisialisasi. Tunggu hingga proses startup selesai."
    );
  }
  if (state.status !== "READY") {
    throw new Error(
      `WhatsApp client belum siap (Status saat ini: ${state.status}). Silakan scan QR code terlebih dahulu.`
    );
  }
  return clientInstance;
};

export const setupWhatsapp = async (): Promise<Client> => {
  if (clientInstance) {
    console.log("ℹ️ WhatsApp client sudah berjalan.");
    return clientInstance;
  }

  return new Promise<Client>((resolve, reject) => {
    try {
      console.log("🔄 Menginisialisasi WhatsApp Client dengan PostgreSQL RemoteAuth...");
      state.status = "INITIALIZING";
      state.lastError = null;

      const store = new PostgresStore();

      const puppeteerArgs = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
        "--disable-extensions",
      ];

      const client = new Client({
        authStrategy: new RemoteAuth({
          store,
          backupSyncIntervalMs: 300000, // 5 menit sinkronisasi
          clientId: SESSION_NAME || "default",
        }),
        puppeteer: {
          headless: true,
          executablePath: PUPPETEER_EXECUTABLE_PATH || undefined,
          args: puppeteerArgs,
        },
      });

      clientInstance = client;

      // Event: QR Code received
      client.on("qr", async (qr) => {
        state.status = "QR_READY";
        state.qrRaw = qr;

        try {
          state.qrDataUrl = await QRCode.toDataURL(qr);
        } catch (e) {
          console.error("Gagal convert QR ke dataURL:", e);
        }

        console.log("\n=======================================================");
        console.log("🔗 QR CODE DITERIMA! Silakan scan dari WhatsApp:");
        console.log("=======================================================\n");
        qrcodeTerminal.generate(qr, { small: true });
        console.log("\n💡 Anda juga dapat scan QR via browser di: /api/qr");
      });

      // Event: Authenticated
      client.on("authenticated", () => {
        state.status = "AUTHENTICATED";
        state.qrRaw = null;
        state.qrDataUrl = null;
        console.log("🔐 WhatsApp Client terautentikasi!");
      });

      // Event: Ready
      client.on("ready", () => {
        state.status = "READY";
        state.qrRaw = null;
        state.qrDataUrl = null;
        state.readyAt = new Date();
        state.user = {
          id: client.info?.wid?.user,
          pushname: client.info?.pushname,
        };

        console.log("\n=======================================================");
        console.log("✅ WhatsApp Client SIAP!");
        console.log(`📱 Nomor: ${state.user.id || "N/A"}`);
        console.log(`👤 Nama: ${state.user.pushname || "N/A"}`);
        console.log("=======================================================\n");

        resolve(client);
      });

      // Event: Auth Failure
      client.on("auth_failure", (msg) => {
        state.status = "STOPPED";
        state.lastError = `Auth failure: ${msg}`;
        console.error("❌ Auth failure:", msg);
      });

      // Event: Disconnected
      client.on("disconnected", (reason) => {
        state.status = "DISCONNECTED";
        state.readyAt = null;
        state.lastError = `Disconnected: ${reason}`;
        console.warn("⚠️ WhatsApp client disconnected:", reason);
      });

      client.initialize().catch((err) => {
        state.status = "STOPPED";
        state.lastError = err.message;
        console.error("❌ WhatsApp initialization error:", err);
        reject(err);
      });
    } catch (error) {
      state.status = "STOPPED";
      state.lastError = (error as Error).message;
      reject(error);
    }
  });
};

export const destroyWhatsapp = async (): Promise<void> => {
  if (clientInstance) {
    console.log("🛑 Mematikan WhatsApp Client...");
    try {
      await clientInstance.destroy();
    } catch (e) {
      console.error("Error destroying WhatsApp client:", e);
    }
    clientInstance = null;
    state.status = "STOPPED";
    console.log("✅ WhatsApp Client berhasil dimatikan.");
  }
};

// ======================== EXPRESS CONFIG ========================
const app: Application = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Basic Request Logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path !== "/ping") {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check / Root
app.get("/", (req: Request, res: Response) => {
  const currentStatus = getClientState();
  res.status(200).json({
    success: true,
    service: "WhatsApp API Gateway",
    environment: NODE_ENV,
    whatsapp: {
      status: currentStatus.status,
      user: currentStatus.user,
      readyAt: currentStatus.readyAt,
      error: currentStatus.lastError,
    },
    timestamp: new Date().toISOString(),
  });
});

// UptimeRobot / Heartbeat
app.get("/ping", (req: Request, res: Response) => {
  res.status(200).send("pong");
});

// API Routes
app.use("/api", router);

// 404 Route
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} tidak ditemukan`,
  });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("🔥 Unhandled Application Error:", err);
  res.status(500).json({
    success: false,
    error: "Terjadi kesalahan internal pada server",
    detail: NODE_ENV === "development" ? err.message : undefined,
  });
});

export default app;
