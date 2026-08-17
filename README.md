# Uang Hari Ini

Aplikasi Personal Money Management sederhana untuk mencatat jajan dan pemasukan harian. Frontend menggunakan Next.js + TypeScript + Tailwind CSS, backend menggunakan NestJS + Prisma, dan data disimpan di PostgreSQL.

Desain memakai Hallmark **Carnival / Cold Snap**: tipografi poster yang tegas, palet mustard–oxblood, dan fokus utama pada angka saldo.

## Fitur

- Register memakai satu username unik sebagai nama akun sekaligus identitas login; login dapat memakai username atau email.
- Password disimpan sebagai hash bcrypt.
- Dashboard berisi saldo, pemasukan bulan ini, pengeluaran bulan ini, dan transaksi terakhir.
- Tambah, lihat, edit, dan hapus transaksi.
- Hapus transaksi dapat dibatalkan selama notifikasi Undo masih tampil.
- Filter riwayat berdasarkan jenis dan bulan.
- Setiap query transaksi dibatasi dengan `userId` dari JWT.
- Nominal disimpan sebagai `Decimal(19, 2)` dan ditampilkan dalam format Rupiah.
- Tabungan bersama dengan target, partner berbasis email, setoran per anggota, dan riwayat kontribusi.
- Panel super admin khusus pemantauan: slider user/tabungan, riwayat setoran 3 per halaman, tabel pengguna dengan scroll/pagination, serta pengelolaan nama, email, dan reset password akun.
- Super admin tidak dapat membuat transaksi atau tabungan; endpoint penulisan user biasa juga dilindungi berdasarkan role.
- Form password memiliki tombol mata untuk menampilkan atau menyembunyikan isi password.
- Frontend dan API dapat diakses perangkat lain di jaringan LAN yang sama.

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
SUPER_ADMIN_EMAIL=admin@uanghariini.local
SUPER_ADMIN_PASSWORD=ganti-password-admin-yang-kuat
```

Sesuaikan username dan password PostgreSQL pada `DATABASE_URL`.

### 4. Buat file environment frontend

Buat `apps/web/.env.local`:

```dotenv
API_INTERNAL_URL=http://127.0.0.1:4000
NEXT_PUBLIC_API_URL=
```

Biarkan `NEXT_PUBLIC_API_URL` kosong. Browser akan memakai prefix relatif `/api` dan Next.js meneruskan permintaan ke backend secara internal; konfigurasi ini berlaku untuk localhost maupun perangkat lain di LAN serta mencegah benturan dengan halaman `/transactions`.

### 5. Generate Prisma Client dan buat tabel

```powershell
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed --workspace @money-manager/api
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

## Akses dari perangkat lain di LAN

Perintah dev frontend sudah bind ke `0.0.0.0`, begitu juga API. Jalankan kedua layanan seperti di atas, cari alamat IPv4 komputer server dengan:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' }
```

Lalu buka `http://IP-KOMPUTER:3000` dari ponsel/laptop yang tersambung ke Wi-Fi atau LAN yang sama. Contoh: `http://192.168.1.2:3000`. Register, login, transaksi, tabungan bersama, dan admin semuanya memakai proxy same-origin sehingga perangkat klien tidak perlu mengakses port API secara langsung.

Jika perangkat lain tidak dapat terhubung, izinkan Node.js atau TCP port 3000 pada Windows Defender Firewall untuk profil jaringan Private. Jangan membuka port tersebut ke internet tanpa HTTPS dan konfigurasi keamanan produksi.

## Tabungan bersama

1. User A dan User B register dengan email masing-masing.
2. User A menekan **Catat transaksi**, memilih **Tabungan bersama**, lalu memilih User B dari dropdown akun terdaftar.
3. Setoran pertama dan grup baru tersimpan dalam satu proses. Setoran berikutnya dapat diarahkan ke grup yang sudah ada dari form yang sama.
4. Riwayat, progres target, dan kontribusi setiap anggota tersedia pada tab **Riwayat tabungan bersama** di halaman Transaksi.

Super admin dibuat/diperbarui lewat perintah seed. Login default lokal dapat memakai username `admin` atau email `admin@uanghariini.local`, dengan password `Admin12345!`. Kredensial email/password dapat diubah melalui `SUPER_ADMIN_EMAIL` dan `SUPER_ADMIN_PASSWORD`; ganti password default sebelum pemakaian selain pengembangan lokal.

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
| `POST` | `/auth/login` | Masuk dengan username/email dan mengembalikan JWT |
| `GET` | `/auth/me` | Mengambil user yang sedang login |
| `GET` | `/transactions` | Riwayat transaksi milik user |
| `GET` | `/transactions/:id` | Detail satu transaksi milik user |
| `POST` | `/transactions` | Menambah transaksi |
| `PATCH` | `/transactions/:id` | Mengubah transaksi milik user |
| `DELETE` | `/transactions/:id` | Menghapus transaksi milik user |
| `GET` | `/transactions/summary` | Saldo dan ringkasan bulan ini |
| `POST` | `/groups` | Membuat tabungan bersama dan opsional mengundang partner |
| `GET` | `/groups` | Daftar tabungan bersama milik user |
| `GET` | `/groups/:id` | Detail, anggota, dan setoran tabungan bersama |
| `POST` | `/groups/:id/members` | Menambah partner berdasarkan email |
| `POST` | `/groups/:id/deposits` | Mencatat setoran user yang sedang login |
| `GET` | `/admin/shared-savings` | Seluruh grup dan kontribusi per anggota (super admin) |

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
