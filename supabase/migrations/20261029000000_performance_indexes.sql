-- Migration: Tambahkan Index Performa Database untuk Mempercepat Query dan TTFB
-- Menargetkan query-query utama pada halaman Katalog, Seri, Plans, Dashboard, dan Transaksi

-- 1. Index untuk pencarian dan filter pada tabel items
create index if not exists idx_items_seri on public.items(seri);
create index if not exists idx_items_tipe on public.items(tipe);
create index if not exists idx_items_created_at_desc on public.items(created_at desc);

-- 2. Index untuk filter dan sorting pada tabel plans
create index if not exists idx_plans_status on public.plans(status);
create index if not exists idx_plans_prioritas on public.plans(prioritas);
create index if not exists idx_plans_status_prioritas on public.plans(status, prioritas);
create index if not exists idx_plans_created_at_desc on public.plans(created_at desc);

-- 3. Index untuk tabel transactions (rekapitulasi budget bulanan)
create index if not exists idx_transactions_tanggal_desc on public.transactions(tanggal desc);
create index if not exists idx_transactions_jenis on public.transactions(jenis);

-- 4. Index untuk status history (audit log & aktivitas terbaru)
create index if not exists idx_status_history_changed_at_desc on public.status_history(changed_at desc);

-- 5. Index untuk listings
create index if not exists idx_listings_shop_id on public.listings(shop_id);
create index if not exists idx_listings_updated_at_desc on public.listings(updated_at desc);
