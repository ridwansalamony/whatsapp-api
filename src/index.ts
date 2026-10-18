import http from "http";
import app, { setupWhatsapp, destroyWhatsapp } from "./applications/app";
import { initDatabase, closeDatabase } from "./applications/database";
import { PORT } from "./utils/env";

let server: http.Server | null = null;
let isShuttingDown = false;

async function bootstrap() {
  try {
    console.log("🚀 Memulai WhatsApp API Gateway...");

    // 1. Hubungkan dan inisialisasi tabel database PostgreSQL
    await initDatabase();

    // 2. Nyalakan server HTTP Express terlebih dahulu
    server = app.listen(PORT, () => {
      console.log(`🌐 Server berjalan di: http://localhost:${PORT}`);
      console.log(`📱 QR Web Interface: http://localhost:${PORT}/api/qr`);
      console.log(`📊 Health check: http://localhost:${PORT}/`);
    });

    // 3. Inisialisasi WhatsApp Client secara asynchronous
    setupWhatsapp().catch((waErr) => {
      console.error("❌ Gagal menginisialisasi WhatsApp Client:", waErr.message);
    });
  } catch (error) {
    const err = error as Error;
    console.error("❌ Fatal Bootstrap Error:", err.message || err);
    process.exit(1);
  }
}

// Graceful Shutdown handling for VPS / Docker / PM2
const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 Menerima sinyal ${signal}. Memulai proses graceful shutdown...`);

  // 1. Tutup server HTTP agar tidak menerima request baru
  if (server) {
    server.close(() => {
      console.log("✅ Server HTTP Express ditutup.");
    });
  }

  try {
    // 2. Matikan WhatsApp Client (menutup Puppeteer / Chromium zombie process)
    await destroyWhatsapp();

    // 3. Tutup koneksi PostgreSQL pool
    await closeDatabase();

    console.log("👋 Sistem berhasil dimatikan dengan aman.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Terjadi error saat shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled Rejection at:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("🔥 Uncaught Exception:", error);
});

bootstrap();
