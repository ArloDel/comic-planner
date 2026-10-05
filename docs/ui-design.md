# ComicPlan — UI Design Spec (Frontend)

> **Sumber arah desain:** referensi visual dari owner — *clean & light* ala Notion/Linear, dominan putih dengan efek *glassmorphism*, layout *sidebar dashboard*. Gambar referensi asli tidak dapat diproses oleh AI, jadi spec ini disusun dari arah yang dikonfirmasi owner dan disesuaikan dengan alur aplikasi di `prd.md`.
>
> **Konsumen dokumen ini:** frontend dev / worker yang mengerjakan UI (TASK-002, 003, 004, 006, 007). Baca bagian 2–5 dulu sebelum menulis komponen apa pun.

---

## 1. Arah Desain

| Prinsip | Penjelasan |
|---|---|
| Clean & light | Dominan putih/`slate-50`, banyak whitespace, border tipis, tanpa ornamen berlebih. Konten dulu. |
| Glassmorphism sebagai aksen | Panel utama (sidebar, header, kartu statistik, modal) memakai efek frosted glass `bg-white/70 + backdrop-blur`. BUKAN semua elemen — tombol kecil, pill, dan tabel tetap solid. |
| Backdrop berwarna lembut | Glass butuh backdrop agar blur-nya terlihat: gradient halus + 2–3 "blob" warna besar yang blur di belakang konten (lihat `BackdropDecor`). |
| Mobile-first, desktop sidebar | Use case utama owner adalah HP (saat scroll Shopee). Mobile: *bottom tab bar* glass. Desktop (≥`lg`): *sidebar* glass. |
| Bahasa & format | UI Bahasa Indonesia, mata uang Rupiah, tanggal format Indonesia. |

---

## 2. Design Tokens (Tailwind CSS v4)

Scaffold sudah memakai Tailwind v4 (`@import "tailwindcss"` di `src/app/globals.css`). Salin blok berikut ke `globals.css` — token `@theme` otomatis menjadi utility (`bg-primary-600`, `shadow-glass`, `rounded-glass`, dst.):

```css
@import "tailwindcss";

@theme {
  /* Font — daftarkan Inter via next/font, sesuaikan nama variabel.
     (Cara register font di Next.js versi ini: baca node_modules/next/dist/docs/) */
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;

  /* Primary — indigo (kontinu dengan halaman login yang sudah ada) */
  --color-primary-50:  #eef2ff;
  --color-primary-100: #e0e7ff;
  --color-primary-200: #c7d2fe;
  --color-primary-300: #a5b4fc;
  --color-primary-400: #818cf8;
  --color-primary-500: #6366f1;
  --color-primary-600: #4f46e5;
  --color-primary-700: #4338ca;
  --color-primary-800: #3730a3;
  --color-primary-900: #312e81;

  /* Radius khusus */
  --radius-glass: 1.25rem;   /* 20px — panel besar */
  --radius-card: 0.75rem;    /* 12px — elemen kecil */

  /* Shadow glass (lembut, rendah kontras) */
  --shadow-glass:    0 8px 30px rgb(15 23 42 / 0.06);
  --shadow-glass-lg: 0 16px 50px rgb(15 23 42 / 0.12);
  --shadow-soft:     0 1px 3px rgb(15 23 42 / 0.06);
}
```

### 2.1 Palet warna

| Peran | Token / kelas | Catatan |
|---|---|---|
| Primary (aksi, link, aktif) | `primary-600` (indigo) | Tombol utama, item nav aktif, link. |
| Netral teks | `slate-900` judul · `slate-600` body · `slate-500` sekunder | `slate-400` hanya untuk ≥14px non-esensial. |
| Netral permukaan | `slate-50` background halaman · `white` kartu | |
| Sukses / aman | `emerald-600` + `emerald-50` | Sisa aman ≥ 0, status diterima. |
| Peringatan | `amber-600` + `amber-50` | PO / deadline. |
| Bahaya / minus | `rose-600` + `rose-50` | Sisa aman < 0, batal, error. |
| Info / lunas | `sky-600` + `sky-50` | Status lunas (sudah dibayar penuh). |

### 2.2 Tipografi

| Elemen | Kelas Tailwind |
|---|---|
| Judul halaman | `text-2xl font-bold tracking-tight text-slate-900` (desktop boleh `text-3xl`) |
| Subjudul halaman | `text-sm text-slate-500` |
| Judul section | `text-base font-semibold text-slate-900` |
| Judul kartu / baris | `text-sm font-semibold text-slate-900` |
| Body | `text-sm text-slate-600` |
| Sekunder / meta | `text-xs text-slate-500` |
| Angka statistik | `text-2xl font-bold text-slate-900 tabular-nums` (harga: `tabular-nums` wajib) |

### 2.3 Resep glass (hafalkan — dipakai di semua panel utama)

```
Panel glass   →  bg-white/70 backdrop-blur-xl border border-white/60 shadow-glass rounded-2xl
Glass lebih solid (modal, sidebar) → bg-white/80 backdrop-blur-xl border border-white/60 shadow-glass-lg rounded-glass
Overlay modal → bg-slate-900/25 backdrop-blur-sm
Input         →  bg-white/80 backdrop-blur border border-slate-200 (focus: border-primary-400 ring-2 ring-primary-500/20) rounded-xl
```

---

## 3. Mapping Warna Status (WAJIB konsisten di semua halaman)

Status plan (state machine F3) — tampil sebagai **StatusPill**:

| Status `plans.status` | Warna pill | Maksud |
|---|---|---|
| `wishlist` | `bg-slate-100 text-slate-600 border-slate-200` | Netral, belum diputuskan |
| `po` | `bg-amber-50 text-amber-700 border-amber-200` | Menunggu aksi + deadline |
| `dp` | `bg-violet-50 text-violet-700 border-violet-200` | DP sudah dibayar, ada sisa |
| `lunas` | `bg-sky-50 text-sky-700 border-sky-200` | Dibayar penuh, menunggu barang |
| `diterima` | `bg-emerald-50 text-emerald-700 border-emerald-200` | Selesai / punya |
| `batal` | `bg-rose-50 text-rose-600 border-rose-200` | Dibatalkan, hold dilepas |

Status listing (F2): `ready` = dot `bg-emerald-500` + teks "Ready" · `po` = dot `bg-amber-500` + teks "PO".

Jenis transaksi (F4): `dp` violet · `pelunasan` sky · `bayar_penuh` primary · `refund` emerald (uang kembali).

Semantik anggaran: sisa aman ≥ 0 = emerald · < 0 (overspend) = rose · komitmen = amber · realisasi = primary.

---

## 4. App Shell & Navigasi

### 4.1 Route map

| Route | Halaman | Fitur PRD | Tiket |
|---|---|---|---|
| `/login` | Login (sudah ada) | Auth | TASK-001 ✅ |
| `/` | Dashboard | F6 | TASK-007 |
| `/katalog` | Katalog grid + search + filter | F1 | TASK-002 |
| `/katalog/seri/[seri]` | View per seri (tracker volume) | F1 | TASK-002 |
| `/katalog/[id]` | Detail item + listings + plan | F1/F2/F3 | TASK-002/003 |
| `/plans` | Tracker rencana pembelian | F3 | TASK-003 |
| `/budget` | Budget bulanan + transaksi | F4 | TASK-004 |
| `/import` | Riwayat impor + panduan userscript | F5 | TASK-005 |
| `/settings` | Token, budget default, toko, Telegram | F7/F8 | TASK-008 |

Halaman `/` yang sekarang (status sistem) adalah placeholder — digantikan Dashboard saat TASK-007 dikerjakan.

### 4.2 Struktur layout

**Komponen shell (satu kali buat, dipakai semua halaman):** `AppShell` (client component) berisi `BackdropDecor`, `Sidebar` (desktop), `BottomTabBar` (mobile), `Header`, dan slot `{children}`.

```
DESKTOP (≥ lg)                                MOBILE (< lg)
┌────────┬──────────────────────────┐        ┌─────────────────────┐
│        │ Header (glass, sticky)   │        │ Header (glass)      │
│ Sidebar│──────────────────────────│        │                     │
│ (glass)│                          │        │   Konten            │
│  w-64  │   Konten (max-w-6xl,     │        │   (max-w-md,        │
│ sticky │   px-4 lg:px-8 py-6)     │        │    px-4 pb-24)      │
│        │                          │        │                     │
└────────┴──────────────────────────┘        ├─────────────────────┤
                                             │ ▣ TabBar (glass)    │
                                             │ ⌂  ▦  ◫  ₿  ⋯       │
                                             └─────────────────────┘
```

**BackdropDecor** (fixed, `-z-10`, `pointer-events-none`, di belakang semua):
- Body: `bg-slate-50`.
- Blob 1: `absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl`
- Blob 2: `absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full bg-rose-100/50 blur-3xl`
- Blob 3: `absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-amber-100/40 blur-3xl`

### 4.3 Sidebar (desktop)

- `hidden lg:flex lg:flex-col w-64 sticky top-0 h-screen` + resep glass solid + `border-r` (bukan `border-b`).
- Atas: logo — kotak `rounded-xl bg-primary-600 text-white font-bold` berisi "CP" + label "ComicPlan" (`text-sm font-semibold`) + sub-label "Planning Komik" (`text-[11px] text-slate-500`).
- Nav item: `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 transition-colors`.
  - **Aktif**: `bg-primary-600/10 text-primary-700` + dot kecil `bg-primary-600`.
  - Hover: `bg-slate-100`.
- Item: Dashboard `/` · Katalog `/katalog` · Rencana `/plans` · Budget `/budget` · Impor `/import` · Pengaturan `/settings`. Ikon dari `lucide-react` (tambah dependency): `LayoutDashboard`, `BookOpen`, `ListChecks`, `Wallet`, `Download`, `Settings`.
- Badge notifikasi di item "Rencana": pill kecil `bg-amber-100 text-amber-700` berisi jumlah plan `po` dengan deadline ≤ 7 hari.
- Bawah: kartu mini user (email owner, `text-xs text-slate-500`) + tombol "Keluar" ghost.

### 4.4 BottomTabBar (mobile)

- `lg:hidden fixed bottom-0 inset-x-0 z-40` + resep glass solid + `border-t border-white/60` + `pb-[env(safe-area-inset-bottom)]`.
- 5 slot rata tengah, ikon + label `text-[11px]`: Dashboard · Katalog · Rencana · Budget · "Lainnya".
- Aktif: `text-primary-600` + ikon sedikit membesar (`scale-110`); tidak aktif `text-slate-500`.
- "Lainnya" membuka *bottom sheet* glass berisi Impor, Pengaturan, Keluar.

### 4.5 Header

- `sticky top-0 z-30` glass + `border-b border-white/60`; konten: judul halaman (`text-2xl font-bold tracking-tight`) + subjudul (`text-sm text-slate-500`); kanan: slot aksi halaman (tombol utama + dropdown).
- Di `/budget` dan `/` header memuat **pemilih periode**: pill `YYYY-MM` dengan chevron (prev/next bulan).

---

## 5. Komponen Dasar (`src/components/ui/`)

Semua komponen kecil, tanpa logika bisnis, bisa dipakai lintas halaman.

| Komponen | Spec |
|---|---|
| **Button** | `rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200` · Primary: `bg-primary-600 text-white hover:bg-primary-700 shadow-soft` · Secondary: `bg-white/80 backdrop-blur border border-slate-200 text-slate-700 hover:border-primary-300` · Ghost: `text-primary-700 hover:bg-primary-50` · Danger: `bg-rose-600 text-white hover:bg-rose-700` · Disabled: `opacity-50 cursor-not-allowed` · Ukuran sm: `px-3 py-1.5 text-xs` |
| **Input / Select** | resep input di §2.3; label `text-xs font-semibold text-slate-700 mb-1`; error: `border-rose-300` + teks `text-xs text-rose-600` |
| **SearchBar** | input + ikon `Search` (`text-slate-400`) di kiri, `pl-9` |
| **GlassCard** | wrapper panel biasa: resep glass §2.3 + `p-4 sm:p-5` |
| **StatCard** | GlassCard + label `text-xs font-medium text-slate-500 uppercase tracking-wide` + nilai `text-2xl font-bold tabular-nums` + ikon di chip `rounded-lg p-2` (warna per semantik, mis. Wallet=primary, Clock=amber, CheckCircle=emerald, AlertTriangle=rose) |
| **StatusPill** | `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize` — warna dari tabel §3; listing variant: dot 6px + teks |
| **FilterChip** | `rounded-full border px-3 py-1.5 text-xs font-medium` · tidak aktif `border-slate-200 bg-white/60 text-slate-600` · aktif `border-primary-300 bg-primary-600/10 text-primary-700`; bisa disertai count `text-slate-400` |
| **CoverImage** | rasio `aspect-[2/3]` `rounded-xl object-cover bg-slate-100`; fallback: gradient `from-slate-100 to-primary-100` + inisial judul `text-primary-700 font-bold`; loading `animate-pulse` |
| **ProgressBar** | track `h-2 rounded-full bg-slate-200/70`; fill `rounded-full` warna semantik; width = persen; di bawahnya label kiri/kanan `text-xs` |
| **Table** (desktop) | baris `border-b border-slate-100 text-sm`; header `text-xs font-semibold text-slate-500 uppercase`; hover baris `bg-slate-50/60`; angka kolom kanan `text-right tabular-nums`. Di mobile tabel TIDAK scroll horizontal — berubah jadi kartu/baris |
| **Modal** | overlay §2.3 + panel `bg-white/85 backdrop-blur-xl border border-white/60 shadow-glass-lg rounded-glass w-full max-w-md p-5`; muncul: fade + `scale-95→100` 150ms; tutup via backdrop/Esc |
| **BottomSheet** (mobile) | sama seperti modal tapi menempel bawah, `rounded-t-glass` |
| **Toast** | `fixed top-4 inset-x-4 lg:left-auto lg:right-4 lg:w-80 z-50` glass solid; ikon status + judul + deskripsi; auto-hide 4s; `role="status"` |
| **EmptyState** | ikon besar `text-slate-300` (lucide `Inbox`/`BookOpen`) + judul `text-sm font-semibold` + deskripsi `text-xs text-slate-500` + CTA tombol secondary |
| **Skeleton** | `animate-pulse rounded-lg bg-slate-200/60`; grid katalog memakai skeleton kartu dengan rasio cover |
| **WarningBanner** (overspend) | glass dengan aksen rose: `border-rose-200 bg-rose-50/80` + ikon `AlertTriangle text-rose-600` + teks `text-sm text-rose-700`; berisi daftar saran item prioritas rendah (checkbox + tombol "Batalkan plan") |
| **Timeline** (status history) | garis vertikal `w-px bg-slate-200` + dot warna status §3 per event + `text-xs` (status_lama → status_baru, `changed_at` format relatif) |

---

## 6. Spesifikasi Halaman

### 6.1 `/login` (sudah ada — hanya polish)

Struktur yang ada sudah sesuai. Upgrade visual: latar `bg-slate-100` → `BackdropDecor` (gradient + blob); kartu → resep glass solid (`rounded-glass`). Logo CP tetap `rounded-xl bg-primary-600`. Tidak ada perubahan alur.

### 6.2 `/` — Dashboard (F6)

```
┌ Header ──────────────────────────────────────────────┐
│ Dashboard                    [Periode: Okt 2026 ▾]    │
├──────────────────────────────────────────────────────┤
│ [Budget]      [Realisasi]   [Komitmen PO] [Sisa Aman] │  ← 4 StatCard (grid 2×2 mobile,
│  Rp 500.000   Rp 180.000    Rp 120.000   Rp 200.000  │    4 kolom lg) + progress bar
├──────────────────────────────────────────────────────┤
│ ⚠ Sisa aman minus — saran: lepas "One Piece vol 102"  │  ← WarningBanner (kondisional)
├──────────────────────────────────────────────────────┤
│ PO Mendekati Deadline (≤ 7 hari)                     │
│ ┌──────────────────────────────────────────────────┐ │
│ │ ▦ Chainsaw Man vol 12   [PO]        H-3 ┊ Rp 45.000│ │  ← baris: thumb, judul+vol,
│ │   deadline 08 Okt · sisa bayar Rp 45.000  [Bayar →]│ │    chip H-x, sisa, CTA
│ └──────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────┤
│ Aktivitas Terbaru (status_history, maks 5)            │
└──────────────────────────────────────────────────────┘
```

- **StatCard "Sisa Aman"** = kartu paling menonjol: `budget − realisasi − komitmen` (rumus F4). Nilai `< 0` → rose + ikon `AlertTriangle`; ≥ 0 → emerald + `CheckCircle`. Progress bar terisi = `(realisasi+komitmen)/budget`.
- **Daftar PO deadline** ≤ 7 hari, urut naik per deadline. Chip countdown: `H-1`/lewat deadline → rose; `H-2..H-3` → amber; `H-4..7` → slate. Baris terlewat deadline diberi latar `bg-rose-50/60`.
- CTA per baris mengikuti status: `po` → "Bayar DP" · `dp` → "Pelunasan".
- Section "Aktivitas Terbaru": komponen Timeline.
- Empty state bila belum ada data: EmptyState + CTA "Impor dari Shopee" → `/import`.

### 6.3 `/katalog` — Grid Katalog (F1)

```
┌ Header ────────────────────────────────┐
│ Katalog                    [+ Tambah Item] │
├────────────────────────────────────────┤
│ [🔍 Cari judul / seri / volume…]       │
│ (Semua 12)(Wishlist 3)(PO 4)(DP 1)(Lunas 2)(Diterima 2) │  ← FilterChip status
│ Tipe: [Semua][Manga][Manhua][Manhwa][Komik Lokal] · Urut: [Prioritas ▾] │
├────────────────────────────────────────┤
│ ▦▦▦▦  ▦▦▦▦  (grid: 2 kolom mobile,     │
│ ▦▦▦▦  ▦▦▦▦   3 sm, 4 lg, 5 xl)        │
└────────────────────────────────────────┘
```

- **Kartu item**: GlassCard `p-2` → CoverImage `aspect-[2/3]` + StatusPill overlay kiri-atas (`absolute top-2 left-2`, latar `bg-white/85 backdrop-blur`) + harga listing termurah `text-xs font-semibold tabular-nums` + judul `text-sm font-semibold` (truncate 2 baris) + `seri · vol N` `text-xs text-slate-500`.
- Klik kartu → `/katalog/[id]`.
- Chip "Semua" + chip per status plan dengan count. Filter tipe + dropdown urut (prioritas / terbaru / judul A–Z).
- Kondisi kosong per filter → EmptyState "Tidak ada item dengan filter ini".
- Skeleton grid saat loading (9–10 kartu).

### 6.4 `/katalog/seri/[seri]` — View Per Seri (F1)

```
┌────────────────────────────────────────┐
│ ← Katalog                              │
│ [Collage 3 cover] One Piece — Egmont   │
│ 3 punya · 1 wishlist · 2 PO · 4 belum  │
├────────────────────────────────────────┤
│ Volume:  ① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩ ⑪ ⑫    │
│          ⑬ ⑭ ⑮ … (+ Tambah volume)    │
├────────────────────────────────────────┤
│ Daftar volume (baris, urut nomor)      │
└────────────────────────────────────────┘
```

- **Grid volume**: kotak `aspect-square rounded-xl text-sm font-semibold` per nomor 1..max(volume):
  - belum ada → `border-2 border-dashed border-slate-300 text-slate-400` (+ klik → quick-add form)
  - wishlist → `bg-primary-600/10 text-primary-700 border border-primary-200`
  - po → amber §3 · dp → violet · lunas → sky
  - diterima/punya → `bg-emerald-600/10 text-emerald-700 border-emerald-200` + ikon check kecil
- Nomor klik → `/katalog/[id]` bila item ada; bila belum → buka modal "Tambah volume N" (form judul otomatis `seri vol N`).
- Header seri: nama seri + penerbit + ringkasan count per status (pill warna §3).
- Baris bawah opsional (progressive): daftar volume dengan thumbnail + status + harga estimasi.

### 6.5 `/katalog/[id]` — Detail Item (F1 + F2 + F3)

```
┌─────────────────────────────────────────────┐
│ ← Katalog                                   │
│ [Cover]  Chainsaw Man                        │
│ 2:3      vol 12 · Tatsuki Fujimoto           │
│          Penerbit: Elex · [Manga]           │
│          [PO] Prioritas #3 · Est. Rp 48.000 │
│ ── Tombol aksi state machine ──────────────  │
├─────────────────────────────────────────────┤
│ Rencana & Riwayat                           │
│ [Timeline status_history]                   │
│ Transaksi: DP 20 Sep Rp 20.000 …            │
├─────────────────────────────────────────────┤
│ Listings Marketplace (1)                    │
│ ▦ Toko Komik A · Shopee        ● PO         │
│   Rp 48.000 · deadline 10 Okt · rilis 15 Okt│
│   [Buka di Shopee ↗] [Jadikan referensi]    │
└─────────────────────────────────────────────┘
```

- Tombol aksi **mengikuti state machine** (satu item = satu plan aktif): `wishlist` → "Jadikan PO" (muncul input deadline + estimasi harga) · `po` → "Bayar DP" (input jumlah + tanggal) · `dp` → "Pelunasan" · `lunas` → "Tandai Diterima" · semua status ≠ `batal` → "Batalkan" (ghost rose, konfirmasi modal: "hold budget akan dilepas otomatis").
- Transisi memunculkan modal, bukan langsung — agar bisa isi jumlah/deadline/catatan.
- Listing kartu per baris (F2): nama toko (link eksternal `url`, ikon `ExternalLink`), harga `tabular-nums`, dot ready/po, deadline & tanggal rilis bila ada.
- **Warning inline saat aksi membuat sisa aman < 0** (F4): WarningBanner muncul DI DALAM modal sebelum konfirmasi, berisi saran item prioritas lebih rendah.

### 6.6 `/plans` — Tracker Rencana (F3)

```
┌ Header ──────────────────────────────────┐
│ Rencana Pembelian          [+ Rencana Baru] │
├──────────────────────────────────────────┤
│ (Semua 12)(Wishlist 4)(PO 3)(DP 1)(Lunas 2)(Diterima 1)(Batal 1) │
├──────────────────────────────────────────┤
│ ▦ One Piece vol 101   [#3] [Wishlist]     │
│   est Rp 45.000 · belum ada deadline  [⋯] │
│ ▦ Chainsaw Man vol 12  [#1] [PO]          │
│   est Rp 48.000 · deadline H-3 ⚠         │
└──────────────────────────────────────────┘
```

- Baris per plan: thumb 40px, judul + vol, prioritas `#n` (chip `text-xs`), StatusPill, estimasi `tabular-nums`, deadline countdown (chip warna aturan §6.2), progress dibayar (dp → `x/y`).
- Menu `⋯`: ubah prioritas, ubah estimasi, aksi state machine ( sama seperti §6.5), batalkan.
- Desktop boleh tampilan tabel; mobile wajib baris kartu.
- Urutan default: status aktif dulu (wishlist→po→dp→lunas), lalu prioritas naik, deadline terdekat dulu.

### 6.7 `/budget` — Budget & Transaksi (F4)

```
┌ Header ──────────────────────────────────┐
│ Budget           [◀ Periode: Okt 2026 ▶] │
├──────────────────────────────────────────┤
│ [Total Budget]  [Rp 500.000 · ikon pensil] │  ← edit inline (klik pensil → input)
│ [Realisasi Rp180rb][Komitmen Rp120rb]     │
│ [Sisa Aman Rp 200.000 + progress bar]    │
├──────────────────────────────────────────┤
│ Transaksi                [+ Catat Transaksi] │
│ 20 Okt · Chainsaw Man vol 12 [DP]         │
│   Rp 20.000 · catatan: DP awal            │
└──────────────────────────────────────────┘
```

- Tiga angka ringkasan + sisa aman memakai komponen identik dengan Dashboard (§6.2) — jangan bikin varian baru.
- Tombol pensil pada Total Budget → inline edit → simpan (server action) + toast.
- **Tabel/daftar transaksi** bulan terpilih: tanggal (`20 Okt`), item (link ke `/katalog/[id]`), StatusPill jenis (`dp`/`pelunasan`/`bayar_penuh`/`refund` warna §3), jumlah `tabular-nums` (refund tampil `+`, lainnya `−`? — tidak: semua jumlah positif, refund diberi tanda `+` dan warna emerald), catatan `text-xs text-slate-500`.
- "+ Catat Transaksi" → modal: pilih plan aktif (`po`/`dp`), jenis otomatis dari konteks, jumlah, tanggal (default hari ini), catatan.
- Bila sisa aman < 0 di periode ini → WarningBanner di atas ringkasan (aturan §6.2).

### 6.8 `/import` — Riwayat & Panduan Impor (F5, sisi web)

```
┌────────────────────────────────────────┐
│ Impor Shopee                           │
│ Token: ● aktif (dirotasi 02 Okt)       │
│ ┌ Cara Pakai ────────────────────────┐ │
│ │ 1. Install Tampermonkey           │ │
│ │ 2. Tambah script dari userscript/ │ │
│ │ 3. Buka toko Shopee → panel muncul│ │
│ │ [Copy token] (masked: ••••abcd)   │ │
│ └───────────────────────────────────┘ │
│ Riwayat Impor                          │
│ 05 Okt 14:32 · 3 dibuat · 12 diperbarui │
│ 04 Okt 09:10 · 0 dibuat · 8 diperbarui  │
└────────────────────────────────────────┘
```

- Kartu panduan glass: langkah bernomor + tombol "Copy token" (ikon `Copy`, token masked `••••`+4 karakter akhir, toast "Token tersalin").
- Riwayat per eksekusi impor: waktu, `created`/`updated` (angka + label), baris terakhir di-highlight bila hari ini.
- Data riwayat idealnya dari tabel baru/log import — bila belum tersedia di skema, tampilkan versi minimal (jumlah item & listing + `updated_at` terbaru) dan tandai TODO.

### 6.9 Panel Userscript (F5 — UI di dalam Tampermonkey, bukan app)

- Panel floating di halaman Shopee: `position: fixed; bottom: 16px; right: 16px;` lebar `320px`, **resep glass identik** (`rgba(255,255,255,0.8) + backdrop-blur(16px) + border putih semi + radius 16px + shadow lembut`) — glassmorphism tetap terlihat menempel di halaman Shopee mana pun.
- Header: "ComicPlan Sync" + tombol minimize (menyusut jadi FAB bulat `56px` bertuliskan "CP").
- Daftar produk: thumb 32px, nama (truncate), harga, checkbox; toggle "Hanya item baru".
- Tombol **Sync** (primary indigo, full width). Hasil: toast dalam panel `3 dibuat · 12 diperbarui`; gagal parse → pesan error jelas merah, panel tetap hidup (parsing defensif).
- Halaman detail produk Shopee: FAB "Impor produk ini" → single import.

### 6.10 `/settings` — Pengaturan (F7/F8)

Empat GlassCard bertumpuk:

1. **Akun** — email owner (readonly), tombol "Keluar" (danger ghost).
2. **Import Token** — token masked, "Copy", "Rotasi Token" (konfirmasi modal: "userscript lama berhenti bekerja sampai token baru dipasang").
3. **Budget Default** — input angka Rupiah bulanan default + periode terapkan.
4. **Toko Terlacak** — daftar toko: nama + `shop_id` + switch aktif/nonaktif; "+ Tambah Toko".
5. **Notifikasi Telegram** (F7): status bot (terhubung/belum), chat ID, tombol "Kirim Test", penjelasan reminder H-3/H-1.

---

## 7. Format & Konvensi

Buat `src/lib/format.ts`:

```ts
export const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export const formatTanggal = (d: string | Date) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

/** "H-3" / "Hari ini" / "Terlewat 2 hari" — untuk chip deadline */
export const formatCountdown = (deadline: string) => {
  const hari = Math.ceil((new Date(deadline).getTime() - new Date().setHours(0,0,0,0)) / 86_400_000);
  if (hari > 0) return `H-${hari}`;
  if (hari === 0) return 'Hari ini';
  return `Terlewat ${-hari} hari`;
};
```

- Semua teks UI Bahasa Indonesia; label status ditampilkan apa adanya (`wishlist`, `po`, `dp`, …) sesuai PRD — jangan diterjemahkan.
- Angka harga selalu `tabular-nums`; jangan pakai "rb"/"jt" — tampilkan penuh dengan `formatRupiah`.

---

## 8. Motion & Interaksi

- Transisi default: `transition-all duration-200 ease-out` (hover tombol, chip, nav).
- Modal: fade + `scale-95 → 100` (150ms); bottom sheet: slide-up 200ms.
- Skeleton `animate-pulse`; JANGAN spinner untuk loading grid/list.
- Tanpa page transition antar-route (kesan Notion yang instan).
- Semua animasi hormati `@media (prefers-reduced-motion: reduce)` (bisa dinonaktifkan total).

---

## 9. Aksesibilitas

- Focus visible: `focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2` di semua interaktif.
- Cover image `alt` = judul item; tombol ikon wajib `aria-label`.
- Modal: fokus ter-trap, tutup via `Esc`, `role="dialog" aria-modal`.
- Toast `role="status"`; error toast `role="alert"`.
- Kontras teks minimal AA: body `slate-600` ke atas di latar putih; `slate-400` hanya teks non-esensial ≥ 14px.

---

## 10. Catatan Implementasi

1. **Struktur folder:**
   ```
   src/components/layout/  → AppShell, Sidebar, BottomTabBar, Header, BackdropDecor
   src/components/ui/      → Button, Input, StatusPill, GlassCard, StatCard, CoverImage,
                             ProgressBar, Modal, Toast, EmptyState, Skeleton, Timeline
   src/components/features/{dashboard,katalog,plans,budget,import,settings}/
   src/lib/format.ts
   ```
2. `AppShell` dibuat SEKALI di awal (bagian dari pengerjaan UI pertama / TASK-002), dipakai semua halaman setelah login. `/login` tidak memakai shell.
3. Ikon: tambahkan dependency `lucide-react`.
4. Tailwind v4: token hanya via `@theme` di `globals.css` (§2) — jangan buat file `tailwind.config`.
5. Next.js di repo ini punya breaking changes dari yang umum dikenal — sebelum memakai API Next.js (font, image, link), cek `node_modules/next/dist/docs/`.
6. Halaman statis bisa server component; komponen interaktif (filter, modal, tab) client component — pecah sekecil mungkin.
7. Urutan pengerjaan menyusul tiket: shell+ui dasar → TASK-002 (katalog+seri+detail) → TASK-003 (plans) → TASK-004 (budget) → TASK-007 (dashboard) → TASK-008 (settings+Telegram).
8. Konsistensi: komponen §5 jangan didefinisikan ulang per halaman — satu sumber di `components/ui`.
