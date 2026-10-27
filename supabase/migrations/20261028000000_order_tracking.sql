-- Migration: Order Tracking via Kurir & Bukti Foto Penerimaan
-- Branch: feature/order-tracking

create table if not exists public.order_trackings (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade unique,
  resi text not null,
  kurir text not null,
  status_pengiriman text not null default 'ON_PROCESS',
  foto_bukti_url text,
  delivered_at timestamptz,
  tracking_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.order_trackings enable row level security;

-- Policies
create policy "Allow authenticated users to read order_trackings" on public.order_trackings
  for select to authenticated using (true);
create policy "Allow authenticated users to insert order_trackings" on public.order_trackings
  for insert to authenticated with check (true);
create policy "Allow authenticated users to update order_trackings" on public.order_trackings
  for update to authenticated using (true) with check (true);
create policy "Allow authenticated users to delete order_trackings" on public.order_trackings
  for delete to authenticated using (true);

create index if not exists idx_order_trackings_plan_id on public.order_trackings(plan_id);
create index if not exists idx_order_trackings_resi on public.order_trackings(resi);
