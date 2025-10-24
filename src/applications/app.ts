import express, { type Request, type Response, type NextFunction, type Application } from "express";
import cors from "cors";
import router from "../routes/api";
import mongoose from "mongoose";
import qrcode from "qrcode-terminal";
import { Client, RemoteAuth } from "whatsapp-web.js";
import { MongoStore } from "wwebjs-mongo";
import { SESSION_NAME } from "../utils/env";

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use("/api", router);

app.get("/", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({ status: "Server is running!" });
});

// ✅ Endpoint untuk UptimeRobot
app.get("/ping", (req: Request, res: Response) => {
  res.status(200).send("pong");
});

let clientInstance: Client | null = null; // <-- simpan di sini
let isClientReady = false;

// Getter function supaya bisa digunakan di file lain
export const getClient = (): Client => {
  if (!clientInstance) {
    throw new Error("WhatsApp client belum diinisialisasi. Jalankan setupWhatsapp() terlebih dahulu.");
  }
  if (!isClientReady) {
    throw new Error("WhatsApp client belum ready. Tunggu sampai client siap (event 'ready').");
  }
  return clientInstance;
};

export const setupWhatsapp = async () => {
  return new Promise<void>(async (resolve, reject) => {
    console.log("🔄 Menginisialisasi WhatsApp Client...");

    const store = new MongoStore({ mongoose });

    const client = new Client({
      authStrategy: new RemoteAuth({
        store,
        backupSyncIntervalMs: 300000,
        clientId: SESSION_NAME || "default",
      }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-accelerated-2d-canvas", "--no-first-run", "--no-zygote", "--single-process", "--disable-gpu"],
      },
    });

    // Simpan instance supaya bisa diakses dari luar
    clientInstance = client;

    client.on("qr", (qr) => {
      console.log("🔗 QR code received, scan dengan WhatsApp:");
      qrcode.generate(qr, { small: true });
    });

    client.on("ready", () => {
      isClientReady = true;
      console.log("✅ WhatsApp client ready!");
      resolve();
    });

    client.on("auth_failure", (err) => {
      console.error("Auth failure:", err);
      reject(err);
    });

    client.on("disconnected", (reason) => {
      isClientReady = false;
      console.log("disconnected", reason);
    });

    client.initialize().catch(reject);
  });
};

export default app;
