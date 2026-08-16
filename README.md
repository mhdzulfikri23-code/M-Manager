# Uang Hari Ini

Aplikasi Personal Money Management sederhana untuk mencatat jajan dan pemasukan harian. Frontend menggunakan Next.js + TypeScript + Tailwind CSS, backend menggunakan NestJS + Prisma, dan data disimpan di PostgreSQL.

Desain memakai Hallmark **Carnival / Cold Snap**: tipografi poster yang tegas, palet mustard–oxblood, dan fokus utama pada angka saldo.

## Fitur

- Register, login, logout, dan pemeriksaan sesi JWT.
- Password disimpan sebagai hash bcrypt.
- Dashboard berisi saldo, pemasukan bulan ini, pengeluaran bulan ini, dan transaksi terakhir.
- Tambah, lihat, edit, dan hapus transaksi.
- Hapus transaksi dapat dibatalkan selama notifikasi Undo masih tampil.
- Filter riwayat berdasarkan jenis dan bulan.
- Setiap query transaksi dibatasi dengan `userId` dari JWT.
- Nominal disimpan sebagai `Decimal(19, 2)` dan ditampilkan dalam format Rupiah.

## Struktur proyek

```text
.
├── apps/
│   ├── api/                 # NestJS, Prisma, JWT, REST API
│   │   ├── prisma/
│   │   └── src/
│   │       ├── auth/
│   │       ├── prisma/
│   │       ├── transactions/
│   │       └── users/
│   └── web/                 # Next.js App Router + Tailwind CSS
│       ├── app/
│       ├── components/
│       └── lib/
├── tokens.css               # Token desain Hallmark Cold Snap
├── docker-compose.yml       # Opsional, tidak diperlukan untuk alur lokal di bawah
└── package.json             # npm workspaces
```

## Prasyarat

- Node.js 20.9 atau lebih baru.
- npm 11 atau lebih baru.
- PostgreSQL lokal yang sedang berjalan.

Docker tidak diperlukan untuk langkah utama berikut.

## Menjalankan tanpa Docker

### 1. Instal dependensi

```powershell
npm install
```

### 2. Buat database PostgreSQL lokal

Gunakan `createdb` jika tersedia:

```powershell
createdb money_manager
```

Atau jalankan melalui `psql`:

```sql
CREATE DATABASE money_manager;
```

### 3. Buat file environment backend

Buat `apps/api/.env`:

```dotenv
DATABASE_URL=postgresql://postgres:password-anda@localhost:5432/money_manager?schema=public
JWT_SECRET=ganti-dengan-rangkaian-acak-yang-panjang
API_PORT=4000
WEB_ORIGIN=http://localhost:3000
```

Sesuaikan username dan password PostgreSQL pada `DATABASE_URL`.

### 4. Buat file environment frontend

Buat `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 5. Generate Prisma Client dan buat tabel

```powershell
npm run prisma:generate
npm run prisma:migrate -- --name init
```

### 6. Jalankan backend

Buka terminal pertama:

```powershell
npm run dev:api
```

REST API berjalan di `http://localhost:4000`.

### 7. Jalankan frontend

Buka terminal kedua:

```powershell
npm run dev:web
```

Buka `http://localhost:3000/register`, buat akun, lalu mulai mencatat transaksi.

## Build produksi

```powershell
npm run build
```

Jalankan hasil build:

```powershell
npm run start --workspace @money-manager/api
npm run start --workspace @money-manager/web
```

Pastikan environment backend dan frontend sudah tersedia sebelum menjalankan aplikasi.

## Endpoint REST API

Semua endpoint transaksi memerlukan header `Authorization: Bearer <token>`.

| Method | Endpoint | Kegunaan |
| --- | --- | --- |
| `POST` | `/auth/register` | Membuat akun dan mengembalikan JWT |
| `POST` | `/auth/login` | Masuk dan mengembalikan JWT |
| `GET` | `/auth/me` | Mengambil user yang sedang login |
| `GET` | `/transactions` | Riwayat transaksi milik user |
| `GET` | `/transactions/:id` | Detail satu transaksi milik user |
| `POST` | `/transactions` | Menambah transaksi |
| `PATCH` | `/transactions/:id` | Mengubah transaksi milik user |
| `DELETE` | `/transactions/:id` | Menghapus transaksi milik user |
| `GET` | `/transactions/summary` | Saldo dan ringkasan bulan ini |

Filter opsional:

```text
GET /transactions?type=EXPENSE&month=2026-08
GET /transactions?limit=5
GET /transactions/summary?month=2026-08
```

## Kategori bawaan

Pemasukan: Gaji, Freelance, Bonus, Lainnya.

Pengeluaran: Makanan, Transportasi, Belanja, Tagihan, Hiburan, Kesehatan, Lainnya.

## Docker Compose (opsional nanti)

File `docker-compose.yml` hanya menyiapkan PostgreSQL. Jika nanti ingin memakainya:

```powershell
Copy-Item .env.example .env
docker compose up -d
```

Alur ini tidak diperlukan bila Anda sudah memakai PostgreSQL lokal.
