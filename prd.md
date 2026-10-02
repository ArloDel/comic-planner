PRD — ComicPlan (nama kerja)
Versi: 0.1 · Status: Draft · Produk: Web app personal untuk planning pembelian komik/manga

1. Ringkasan Eksekutif
ComicPlan adalah aplikasi web personal untuk merencanakan dan melacak pembelian komik/manga dari satu toko Shopee tertentu — baik ready stock maupun pre-order (PO) — dilengkapi tracking budget bulanan. Data produk diimpor dari Shopee melalui userscript Tampermonkey (bukan scraping server-side), lalu dikelola di aplikasi yang dibangun dengan Next.js + Supabase.

2. Latar Belakang & Masalah
Pembelian tersebar di banyak tempat: checkout Shopee, chat admin toko, catatan, ingatan
PO punya deadline tutup dan budaya DP/pelunasan — mudah kelewat deadline atau lupa sisa pelunasan
Tidak ada gambaran "berapa lagi yang aman dibelanjakan bulan ini", karena PO yang belum dibayar tidak muncul di riwayat transaksi
Cek produk baru/kembali ready di toko dilakukan dengan scroll manual berulang-ulang
3. Goals & Non-Goals
Goals

Satu tempat terpusat: wishlist → PO → DP → lunas → diterima
Budget bulanan dengan konsep hold/commitment khas PO, plus warning overspend
Impor produk dari toko Shopee target dengan satu klik via userscript
Pengingat deadline PO
Non-Goals (v1)

Multi-user / fitur sosial
Scraping otomatis server-side berkala
Integrasi checkout/pembayaran
Multi-marketplace (skema DB tetap disiapkan agar mudah diperluas)
Riwayat pergerakan harga
4. Persona
Kolektor personal (owner) — 1 user, akses dari HP (saat scroll Shopee) dan desktop. Membeli rutin, campuran ready & PO, punya alokasi budget bulanan.

5. User Stories
ID	Story
U1	Sebagai kolektor, saya ingin mengimpor produk dari toko Shopee sekali klik, agar tidak input manual
U2	Saya ingin menandai item sebagai PO dengan deadline, agar tidak ada PO yang terlewat
U3	Saya ingin mencatat DP dan pelunasan, agar tahu sisa uang yang harus dibayar
U4	Saya ingin melihat sisa budget ("aman dibelanjakan"), dengan PO aktif dihitung sebagai komitmen
U5	Saya diberi peringatan saat menambah item yang membuat budget minus
U6	Saya ingin melihat koleksi per seri, agar tahu volume mana yang belum punya
U7	Saya ingin diingatkan H-3/H-1 sebelum deadline PO
U8	Saya ingin membatalkan plan, agar hold budget dilepas otomatis
6. Kebutuhan Fungsional
Prioritas: P0 = MVP · P1 = fase berikutnya · P2 = nice to have

F1 — Katalog Item (P0)
CRUD item: judul, seri, nomor volume, penerbit, tipe (manga/manhua/manhwa/komik lokal), URL cover
Tampilan grid dengan cover, search, filter status
View per seri: daftar volume + status masing-masing (belum ada / wishlist / PO / punya)
F2 — Listings Marketplace (P0)
Setiap item bisa punya ≥1 listing: marketplace, shop_id, item_id_shopee, nama toko, URL, harga, status (ready/PO), deadline PO, tanggal rilis
Unique key: (marketplace, shop_id, item_id_shopee) — re-import tidak membuat duplikat, hanya update
F3 — Rencana Pembelian / Plans (P0)
Satu item = satu plan aktif, dengan prioritas (angka) dan estimasi harga
State machine:
wishlist → po → dp → lunas → diterima     ↘──────── batal ←────────↙
Transisi ke batal dari status mana pun; hold budget otomatis dilepas
Riwayat perubahan status tersimpan (timestamp)
F4 — Budget & Transaksi (P0)
Set budget per periode (YYYY-MM)
Transaksi terkait plan: dp, pelunasan, bayar_penuh, refund
Rumus dashboard:
Realisasi  = Σ transaksi (kecuali refund) pada bulan berjalanKomitmen   = Σ (estimasi − sudah dibayar) atas plan berstatus po/dpSisa aman  = budget − realisasi − komitmen
Warning inline saat menambah/mengubah plan yang membuat sisa aman < 0, disertai saran item prioritas rendah yang bisa dilepas
F5 — Import via Userscript (P0)
Tampermonkey script aktif di halaman toko Shopee target + halaman detail produk
Ekstrak data dari respons jaringan halaman itu sendiri (tanpa request baru): itemid, shopid, nama, harga (field mentah ÷ 100.000), label pre-order, thumbnail, URL
Panel floating: daftar produk + checkbox + flag "hanya item baru"
Tombol "Sync" → POST /api/import dengan header X-Import-Token
Server melakukan upsert: item baru → dibuat dengan status wishlist + listingnya; item lama → update harga/status/deadline
Response: {created: n, updated: m} ditampilkan di panel
Parsing gagal → pesan error jelas, tidak crash (parsing defensif)
Tombol impor satuan di halaman detail produk
F6 — Dashboard (P1)
Kartu ringkasan: budget bulan ini, sisa aman (progress bar), komitmen PO, realisasi
Daftar "PO mendekati deadline" (≤ 7 hari), diurutkan
Warning overspend
F7 — Notifikasi Deadline PO (P1–P2)
Reminder H-3 dan H-1 untuk plan berstatus po
Channel: kandidat email (cron/edge function) atau bot Telegram (rekomendasi untuk personal: gratis & mudah)
F8 — Settings (P1)
Ganti import token, set budget default bulanan, kelola daftar toko yang di-track
7. Kebutuhan Non-Fungsional
Aspek	Requirement
Responsif	Mobile-first; layar HP adalah use case utama
Performa	Page load < 2 detik; impor 50 item < 3 detik
Keamanan	Supabase service key hanya di server; akses data lewat auth single-user; import token disimpan di env, mudah dirotasi
Keandalan	Data sumber kebenaran di Supabase; ekspor CSV manual sebagai backup
Kompatibilitas	Userscript: Chrome/Edge/Firefox + Tampermonkey
Bahasa	UI Bahasa Indonesia, format Rupiah
8. Arsitektur & Skema Data
Browser + Tampermonkey ──POST /api/import (token)──> Next.js (Vercel) ──> SupabaseOwner browser ──────────web app (auth 1 user)───────┘
budgets (  id, periode date unique, total_budget numeric)items (  id, judul text, seri text, volume int, penerbit text,  tipe text, cover_url text, created_at timestamptz)listings (  id, item_id → items, marketplace text,  shop_id text, item_id_shopee text,  nama_toko text, url text, harga numeric,  status text check in ('ready','po'),  deadline_po date, tanggal_rilis date, updated_at,  unique (marketplace, shop_id, item_id_shopee))plans (  id, item_id → items, listing_id → listings nullable,  prioritas int, estimasi_harga numeric,  status text check in ('wishlist','po','dp','lunas','diterima','batal'),  created_at, updated_at)transactions (  id, plan_id → plans, jumlah numeric,  jenis text check in ('dp','pelunasan','bayar_penuh','refund'),  tanggal date, catatan text)status_history (  id, plan_id → plans, status_lama, status_baru, changed_at)
9. Tech Stack
Layer	Pilihan	Alasan
Frontend + API	Next.js (App Router)	Satu repo untuk UI + endpoint import
Database	Supabase (Postgres)	Free tier cukup, SQL jelas, auth built-in
Hosting	Vercel	Deploy gratis, cocok Next.js
Styling	Tailwind CSS	Cepat, mobile-first
Import	Tampermonkey userscript	Paling tahan anti-bot, biaya nol
10. User Flow Utama
A. Impor dari Shopee: buka toko di HP → scroll → panel muncul → centang item → Sync → item masuk sebagai wishlist → di app: set prioritas & budget check.

B. Siklus PO: item wishlist → lihat listing PO → jadikan plan po + deadline (hold terbentuk) → bayar DP (transaksi dp) → pelunasan → status lunas → barang datang → diterima.

C. Cek budget: buka dashboard → lihat sisa aman → tambah item baru → muncul warning jika minus → pilih item prioritas rendah untuk dilepas.

11. Metrik Keberhasilan
Metrik	Target
PO aktif yang tercatat di app	100% (tidak ada yang dicatat di luar)
Deadline PO terlewat	0 setelah F7 jadi
Waktu input item baru via userscript	≤ 30 detik
Transaksi tercatat di app	≤ 1 hari setelah pembayaran
Pemakaian	Dashboard dibuka ≥ 1×/minggu
12. Roadmap
Fase	Isi	Estimasi
1 — MVP	Skema DB + auth + CRUD item/plan + halaman budget & transaksi	Minggu 1–2
2 — Import	Userscript + endpoint /api/import + dedup	Minggu 3
3 — Insight	Dashboard, warning overspend, view per seri	Minggu 4
4 — Notifikasi	Reminder deadline (email/Telegram)	Minggu 5
5 — Opsional (P2)	PWA, rollover budget, riwayat harga, ekspor CSV otomatis	Setelahnya
13. Risiko & Mitigasi
Risiko	Dampak	Mitigasi
Shopee mengubah struktur API internal	Script gagal parse	Parsing defensif, fallback input manual selalu tersedia, update script saat perlu
Import token bocor	Pihak lain bisa push data	Endpoint hanya upsert (read tetap lewat auth), token mudah dirotasi
Harga berubah antara import dan beli	Data harga basi	Re-import untuk update; harga final tercatat di transaksi
Batal setelah DP	Budget realisasi salah	Transaksi refund manual tercatat
Scope creep	Terlambat jadi	Patuhi fase; P2 tidak disentuh sebelum P0 selesai
14. Keputusan Terbuka
Nama produk final — "ComicPlan" masih nama kerja
Channel notifikasi — email vs bot Telegram (saran: Telegram, lebih mudah untuk personal)
PO lintas bulan — v1: komitmen dihitung terhadap budget bulan berjalan; rollover ditunda ke P2
DP hangus atau refund saat batal — v1: dicatat manual sebagai transaksi `refund
