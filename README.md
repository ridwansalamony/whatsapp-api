# WhatsApp API Gateway (Node.js + TypeScript + PostgreSQL)

REST API Gateway untuk mengirim pesan WhatsApp secara terprogram menggunakan **Node.js**, **Express**, **TypeScript**, dan **PostgreSQL** sebagai tempat penyimpanan sesi autentikasi (`RemoteAuth`) serta riwayat pesan.

---

## 🌟 Fitur & Best Practices yang Diterapkan

1. **PostgreSQL RemoteAuth Store**:
   - Sesi login WhatsApp disimpan ke tabel database PostgreSQL dalam format biner (`BYTEA`).
   - Sesi **tidak hilang** saat server direstart atau container di-deploy ulang.
2. **Pencatatan Riwayat Pesan (`message_logs`)**:
   - Setiap pengiriman pesan dicatat ke PostgreSQL (status `SUCCESS` / `FAILED`, WhatsApp message ID, dan pesan error jika gagal).
3. **Web QR Scanner (`/api/qr`)**:
   - Anda tidak perlu memantau log terminal SSH VPS untuk scan QR code. Cukup buka `http://ip-vps:3000/api/qr` di browser ponsel/laptop Anda untuk scan.
4. **Auto-Formatting Nomor Telepon**:
   - Mendukung konversi otomatis format lokal Indonesia (`0812...` atau `+62812...`) menjadi format WhatsApp standar (`62812...@c.us`).
   - Mendukung pengiriman ke grup WhatsApp (`...@g.us`).
5. **Non-Blocking Bootstrap & Graceful Shutdown**:
   - Server Express menyala seketika tanpa tertahan menunggu WhatsApp discan, sehingga health check server tidak timeout.
   - Menangani sinyal `SIGINT` dan `SIGTERM` untuk mematikan browser Chromium tanpa meninggalkan zombie process di VPS.
6. **API Key Authentication**:
   - Endpoint pengiriman pesan dapat dilindungi dengan `API_KEY` (via header `x-api-key` atau `Authorization: Bearer <key>`) untuk mencegah penyalahgunaan API di VPS publik.
7. **Production Ready**:
   - Dilengkapi `Dockerfile` multi-stage, `docker-compose.yml`, dan `ecosystem.config.js` (PM2).

---

## 📁 Struktur Direktori

```text
├── src/
│   ├── applications/
│   │   ├── app.ts                  # Inisialisasi Express & Lifecycle Client WhatsApp
│   │   └── database.ts             # PostgreSQL Pool & Auto-Migration Tabel
│   ├── controllers/
│   │   └── app.controller.ts       # Controller Endpoint (send, status, qr, logs)
│   ├── middlewares/
│   │   └── auth.middleware.ts      # Proteksi Endpoint dengan API Key
│   ├── routes/
│   │   └── api.ts                  # Definisi Routing API
│   ├── services/
│   │   ├── app.service.ts          # Pengiriman pesan WhatsApp & pencatatan DB
│   │   └── postgres-store.service.ts # Implementasi RemoteAuth Store untuk PostgreSQL
│   ├── utils/
│   │   ├── env.ts                  # Manajemen Environment Variables
│   │   └── phone.util.ts           # Sanitasi dan Normalisasi Nomor Telepon
│   └── index.ts                    # Entry Point & Graceful Shutdown
├── Dockerfile                      # Build image Node.js + Chromium untuk VPS Linux
├── docker-compose.yml              # Setup instan PostgreSQL 16 + WhatsApp API
├── ecosystem.config.js             # Konfigurasi PM2 untuk VPS non-Docker
├── package.json
└── tsconfig.json
```

---

## 🗄️ Skema Database PostgreSQL

Sistem secara otomatis membuat tabel-tabel berikut saat startup jika belum ada:

```sql
-- Menyimpan sesi login WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  session_data BYTEA NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menyimpan riwayat pesan terkirim
CREATE TABLE IF NOT EXISTS message_logs (
  id SERIAL PRIMARY KEY,
  recipient VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  whatsapp_message_id VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🚀 Panduan Deployment ke VPS

### METODE 1: Menggunakan Docker Compose (Sangat Direkomendasikan)
Metode ini adalah yang paling mudah dan bersih karena PostgreSQL dan Chromium dependencies sudah terisolasi di dalam container.

1. **Clone repository ke VPS**:
   ```bash
   git clone https://github.com/username/whatsapp-api.git
   cd whatsapp-api
   ```

2. **Salin environment file**:
   ```bash
   cp .env.example .env
   nano .env
   ```
   *Atur `API_KEY` untuk mengamankan API Anda.*

3. **Jalankan Docker Compose**:
   ```bash
   docker compose up -d --build
   ```

4. **Tautkan Akun WhatsApp**:
   - Buka browser Anda: `http://<IP-VPS-ANDA>:3000/api/qr`
   - Buka WhatsApp di HP > **Perangkat Tertaut** > Scan QR Code yang muncul.

---

### METODE 2: Manual di VPS Ubuntu/Debian (Node.js + PostgreSQL + PM2)

#### 1. Install PostgreSQL & Buat Database
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Masuk ke PostgreSQL
sudo -u postgres psql

# Di dalam prompt PostgreSQL:
CREATE DATABASE whatsapp_api;
CREATE USER myuser WITH ENCRYPTED PASSWORD 'mypassword123';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_api TO myuser;
\q
```

#### 2. Install Chromium & Dependencies untuk Puppeteer
```bash
sudo apt install -y chromium-browser fonts-freefont-ttf ca-certificates
```

#### 3. Install Node.js (v20 LTS) & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

#### 4. Setup Project
```bash
git clone <repo-url> whatsapp-api
cd whatsapp-api
npm install

# Buat file .env
nano .env
```
Isi file `.env`:
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://myuser:mypassword123@localhost:5432/whatsapp_api
SESSION_NAME=whatsapp_session_vps
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
API_KEY=rahasia_api_key_anda
```

#### 5. Build dan Jalankan dengan PM2
```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 📡 Daftar Endpoint API

### 1. Health Check
- **URL**: `GET /`
- **Respons**:
  ```json
  {
    "success": true,
    "service": "WhatsApp API Gateway",
    "whatsapp": {
      "status": "READY",
      "user": { "id": "6281234567890", "pushname": "Admin" },
      "readyAt": "2026-10-18T10:00:00.000Z"
    }
  }
  ```

### 2. Scan QR Web View
- **URL**: `GET /api/qr`
- **Keterangan**: Membuka tampilan web responsif untuk scan QR Code langsung dari browser.

### 3. Cek Status WhatsApp
- **URL**: `GET /api/status`
- **Respons**:
  ```json
  {
    "success": true,
    "data": {
      "status": "READY",
      "isReady": true,
      "user": { "id": "6281234567890", "pushname": "Admin" },
      "hasQrCode": false
    }
  }
  ```

### 4. Kirim Pesan WhatsApp
- **URL**: `POST /api/send-message`
- **Headers**:
  - `Content-Type: application/json`
  - `x-api-key: <API_KEY>` *(jika diaktifkan)*
- **Body Request**:
  ```json
  {
    "to": "081234567890",
    "message": "Halo! Pesan ini dikirim otomatis via WhatsApp API."
  }
  ```
- **Respons Sukses (200)**:
  ```json
  {
    "success": true,
    "message": "Pesan berhasil dikirim",
    "data": {
      "to": "6281234567890",
      "jid": "6281234567890@c.us",
      "messageId": "3EB0C1234567890",
      "timestamp": 1729250000
    }
  }
  ```

### 5. Riwayat Pesan Terkirim
- **URL**: `GET /api/logs?limit=20`
- **Headers**:
  - `x-api-key: <API_KEY>` *(jika diaktifkan)*
- **Respons**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "id": 1,
        "recipient": "6281234567890",
        "message": "Halo! Pesan ini dikirim otomatis via WhatsApp API.",
        "status": "SUCCESS",
        "whatsapp_message_id": "3EB0C1234567890",
        "created_at": "2026-10-18T10:05:00.000Z"
      }
    ]
  }
  ```
