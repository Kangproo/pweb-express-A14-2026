# MLBB Shop — Diamond & BP

Backend REST API untuk simulasi toko dalam game Mobile Legends: Bang Bang (MLBB). Aplikasi ini menyediakan fitur pengelolaan hero, skin, player, top up diamond, pertandingan, pembelian hero, dan statistik.

Proyek ini dikembangkan untuk memenuhi tugas praktikum Pemrograman Web kelompok **A14**.

## Teknologi yang Digunakan

- **Node.js** — Runtime JavaScript.
- **Express 5** — Framework REST API.
- **TypeScript** — Bahasa pemrograman.
- **PostgreSQL (Neon)** — Database.
- **Prisma ORM** — Pengelolaan database dan query.
- **AWS S3-compatible Object Storage** — Penyimpanan file.

## Fitur

- Pengelolaan data hero dan skin.
- Pembuatan dan pengelolaan player.
- Top up diamond.
- Pencatatan hasil pertandingan.
- Pembelian hero menggunakan Battle Point (BP) atau Diamond.
- Pencegahan pembelian hero yang sama lebih dari satu kali.
- Statistik data permainan.
- Validasi input dan penanganan error API.

## Persyaratan

Pastikan perangkat sudah memiliki:

- Node.js
- npm
- Git

## Instalasi

1. Clone repository:

   ```bash
   git clone https://github.com/Kangproo/pweb-express-A14-2026.git
   ```

2. Masuk ke direktori proyek:

   ```bash
   cd pweb-express-A14-2026
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Buat file `.env.local` di direktori utama proyek. Isi variabel lingkungan sesuai konfigurasi pada `src/config/env.ts`, `src/config/prisma.ts`, dan `src/config/storage.ts`.

   Gunakan kredensial database Neon dan Object Storage milik sendiri. Jangan mengunggah file `.env.local` ke GitHub.

5. Generate Prisma Client:

   ```bash
   npx prisma generate
   ```

6. Terapkan migration ke database:

   ```bash
   npx prisma migrate deploy
   ```

## Menjalankan Aplikasi

Mode development:

```bash
npm run dev
```

Build TypeScript:

```bash
npm run build
```

Menjalankan hasil build:

```bash
npm start
```

Server berjalan pada port `3000`.

## API Endpoints

Base URL:

```text
http://localhost:3000
```

### Health Check

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/health` | Memeriksa status server |

### Heroes

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/heroes` | Mengambil seluruh hero |
| GET | `/api/heroes/:hero_id` | Mengambil detail hero |
| POST | `/api/heroes` | Menambahkan hero |

### Skins

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/skins` | Mengambil seluruh skin |
| GET | `/api/skins/:skin_id` | Mengambil detail skin |

### Players

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/players` | Membuat player |
| GET | `/api/players/:player_id` | Mengambil detail player |
| PATCH | `/api/players/:player_id` | Memperbarui data player |
| DELETE | `/api/players/:player_id` | Menghapus player |

### Player Actions

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/players/:player_id/topup` | Melakukan top up diamond |
| POST | `/api/players/:player_id/matches` | Mencatat hasil pertandingan |
| POST | `/api/players/:player_id/heroes` | Membeli hero |

### Statistics

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/statistics` | Mengambil statistik permainan |

## Aturan Bisnis

- Player baru mendapatkan saldo awal **10.000 BP** dan **0 Diamond**.
- Top up diamond harus menggunakan jumlah positif.
- Pertandingan dengan hasil `WIN` memberikan 300 BP.
- Pertandingan dengan hasil `LOSE` memberikan 100 BP.
- Hero dapat dibeli menggunakan BP atau Diamond sesuai harga yang tersedia.
- Player tidak dapat membeli hero yang sudah dimiliki.
- Pembelian hero diproses secara transaksional untuk mencegah pengurangan saldo ganda pada pembelian bersamaan.

## Format Response

Response berhasil:

```json
{
  "status": true,
  "message": "Berhasil mengambil data",
  "data": {}
}
```

Response gagal:

```json
{
  "status": false,
  "message": "Terjadi kesalahan"
}
```

Endpoint yang mendukung pagination juga menyediakan metadata seperti `currentPage`, `limit`, `totalItems`, dan `totalPages`.

## Struktur Direktori

```text
mlbb-shop/
├── data/
│   ├── heroes.csv
│   └── skins.csv
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── config/
│   ├── controllers/
│   ├── generated/
│   ├── middlewares/
│   ├── routes/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── .gitignore
├── neon.ts
├── package.json
├── prisma.config.ts
└── tsconfig.json
```

## Repository

GitHub: https://github.com/Kangproo/pweb-express-A14-2026

---

**Kelompok A14 — Praktikum Pemrograman Web 2026**