# ComicPlan

ComicPlan adalah aplikasi web personal untuk merencanakan dan melacak pembelian komik/manga dari toko Shopee target — baik ready stock maupun pre-order (PO) — dilengkapi tracking budget bulanan, integrasi import via Tampermonkey userscript, dan notifikasi deadline.

## Tech Stack
- **Frontend & API**: Next.js 16 (App Router), TypeScript, Tailwind CSS (Mobile-First)
- **Database & Auth**: Supabase (PostgreSQL), Single-User Mode, RLS Strict
- **Icons**: Lucide React

---

## Panduan Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Supabase Database

1. Buat project baru di [Supabase Dashboard](https://supabase.com).
2. Masuk ke menu **SQL Editor**.
3. Buka file [`supabase/schema.sql`](supabase/schema.sql) atau [`supabase/migrations/20261002000000_initial_schema.sql`](supabase/migrations/20261002000000_initial_schema.sql).
4. Salin seluruh isi SQL dan jalankan (Run). Migration ini akan membuat 6 tabel:
   - `budgets`: Periode bulanan (date unique) & alokasi budget.
   - `items`: Master data komik (judul, seri, volume, cover, tipe).
   - `listings`: Listing produk dari marketplace dengan unique constraint `(marketplace, shop_id, item_id_shopee)`.
   - `plans`: Siklus status pembelian (`wishlist` → `po` → `dp` → `lunas` → `diterima` / `batal`).
   - `transactions`: Catatan riwayat pembayaran (`dp`, `pelunasan`, `bayar_penuh`, `refund`).
   - `status_history`: Audit trail otomatis perubahan status plan.
5. Migration juga otomatis mengaktifkan **Row Level Security (RLS)** dan memasang trigger audit status serta guard single-user signup.

### 3. Konfigurasi Auth Single-User di Supabase

Aplikasi dirancang strictly untuk **1 pengguna personal**:
1. Di Supabase Dashboard, buka **Authentication** → **Providers** → **Email**.
2. Matikan toggle **"Allow new users to sign up"** (disable public registration).
3. Buka **Authentication** → **Users** → klik **"Add User"** (atau **"Invite User"**) untuk membuat akun pemilik pertama.
4. Database dilengkapi trigger `prevent_extra_user_signups` pada `auth.users` yang otomatis menolak pendaftaran baru jika sudah ada 1 pengguna terdaftar.
5. Anda juga dapat menentukan email pemilik pada environment variable `ALLOWED_USER_EMAIL` sebagai validasi lapis ganda di middleware dan server actions.

### 4. Konfigurasi Environment Variables

Salin `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Isi variabel berikut:
```env
# URL & Public Anon Key Supabase (Dapat diakses di browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...

# Service Role Key (SERVER ONLY - DILARANG diekspos ke client bundle)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...

# Secret token untuk sync dari Tampermonkey userscript
IMPORT_TOKEN=ganti_dengan_token_rahasia_anda

# Email pemilik (single-user guard)
ALLOWED_USER_EMAIL=owner@example.com
```

> **Catatan Keamanan (Service Key)**:
> `SUPABASE_SERVICE_ROLE_KEY` hanya digunakan di `src/lib/supabase/admin.ts` yang dilindungi dengan package `server-only`. Next.js akan memblokir build jika admin client ini secara tidak sengaja diimpor di client bundle.
> Semua mutasi data melalui server route (RLS strict), dan klien browser hanya memiliki akses SELECT untuk user terautentikasi.

### 5. Menjalankan Server Development

```bash
npm run dev
```

Aplikasi dapat diakses di [http://localhost:3000](http://localhost:3000).

---

## Endpoint Impor (F5)

`POST /api/import` menerima produk Shopee dari userscript Tampermonkey (TASK-006).
Endpoint ini memakai **token**, bukan sesi Supabase, karena userscript berjalan di
origin Shopee dan tidak punya cookie aplikasi.

**Header**

| Header | Nilai |
|---|---|
| `X-Import-Token` | Harus sama persis dengan env `IMPORT_TOKEN` |

**Body** — array polos atau `{ "items": [...] }`:

```json
{
  "items": [
    {
      "itemid": "987654321",
      "shopid": "555000111",
      "nama": "One Piece Vol. 101 (Edisi Indonesia)",
      "harga_raw": 4500000000,
      "label_po": true,
      "deadline_po": "2026-12-01",
      "tanggal_rilis": "2026-11-20",
      "thumbnail": "https://down-...jpg",
      "url": "https://shopee.co.id/product/987654321",
      "nama_toko": "Manga Store ID",
      "seri": "One Piece",
      "volume": "101"
    }
  ]
}
```

- `itemid`, `shopid`, `nama` wajib. Selain itu semua opsional.
- `harga_raw` dalam satuan mentah Shopee: **÷ 100.000 → rupiah** (contoh di atas = Rp 45.000).
- `label_po` boleh `true`/`1`/`"true"`/`"po"` — bila terisi maka `listings.status = 'po'` + `deadline_po`.
- Maks. 200 produk per request.

**Respons**

```json
{ "created": 3, "updated": 12, "skipped": 1, "errors": [{ "index": 7, "itemid": null, "nama": null, "message": "harga tidak bisa dibaca (harga_raw bukan angka)" }] }
```

`errors` berisi produk yang **dilewati**; produk lain tetap diproses
(parsing defensif, PRD F5).

**Perilaku dedup**

- Produk baru → `items` + `listings` + `plans` berstatus `wishlist`.
- Produk lama (kunci `(marketplace, shop_id, item_id_shopee)` sudah ada) → hanya
  `listings` yang di-refresh: harga, status, deadline. `plans` tidak disentuh.
- Harga & deadline yang tidak dibawa payload dipertahankan; listing yang turun
  dari PO ke ready=deadline-nya dibersihkan.
- Semua penulisan berupa 4 statement batch, bukan satu per item (50 produk < 3 detik).

**Status codes:** `400` payload tidak valid · `403` token salah/tak ada ·
`500` `IMPORT_TOKEN` belum dikonfigurasi di server.

---

## Skrip yang Tersedia

- `npm run dev`: Menjalankan Next.js development server
- `npm run build`: Memeriksa type safety dan membuat production build
- `npm run start`: Menjalankan production server
- `npm run lint`: Menjalankan ESLint
- `npm test`: Menjalankan unit test (`node --test`, tanpa dependency baru)
