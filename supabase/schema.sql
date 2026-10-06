-- ComicPlan Database Schema
-- 1. Budgets Table
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  periode date not null unique,
  total_budget numeric not null default 0 check (total_budget >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Items Table
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  seri text,
  volume integer,
  penerbit text,
  tipe text check (tipe in ('manga', 'manhua', 'manhwa', 'komik lokal')),
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Listings Table
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  marketplace text not null default 'shopee',
  shop_id text not null,
  item_id_shopee text not null,
  nama_toko text,
  url text,
  harga numeric not null default 0 check (harga >= 0),
  status text not null check (status in ('ready', 'po')),
  deadline_po date,
  tanggal_rilis date,
  updated_at timestamptz not null default now(),
  constraint unique_listing_marketplace_shop_item unique (marketplace, shop_id, item_id_shopee)
);

-- 4. Plans Table
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  prioritas integer not null default 0,
  estimasi_harga numeric not null default 0 check (estimasi_harga >= 0),
  status text not null check (status in ('wishlist', 'po', 'dp', 'lunas', 'diterima', 'batal')),
  deadline_po date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.plans.deadline_po is
  'Deadline PO plan. Diisi dari listings.deadline_po saat status=po, bisa di-override.';

-- 5. Transactions Table
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  jumlah numeric not null default 0 check (jumlah >= 0),
  jenis text not null check (jenis in ('dp', 'pelunasan', 'bayar_penuh', 'refund')),
  tanggal date not null default current_date,
  catatan text,
  created_at timestamptz not null default now()
);

-- 6. Status History Table
create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  status_lama text,
  status_baru text not null,
  changed_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_listings_item_id on public.listings(item_id);
create index if not exists idx_plans_item_id on public.plans(item_id);
create index if not exists idx_plans_listing_id on public.plans(listing_id);
create index if not exists idx_transactions_plan_id on public.transactions(plan_id);
create index if not exists idx_status_history_plan_id on public.status_history(plan_id);
create index if not exists idx_status_history_plan_changed on public.status_history(plan_id, changed_at desc);
create index if not exists idx_plans_status_deadline on public.plans(status, deadline_po);

-- Trigger to track status history on plans
create or replace function public.log_plan_status_change()
returns trigger as $$
begin
  if (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    insert into public.status_history (plan_id, status_lama, status_baru, changed_at)
    values (new.id, old.status, new.status, now());
  elsif (tg_op = 'INSERT') then
    insert into public.status_history (plan_id, status_lama, status_baru, changed_at)
    values (new.id, null, new.status, now());
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_plan_status_changed on public.plans;
create trigger on_plan_status_changed
  after insert or update on public.plans
  for each row execute function public.log_plan_status_change();

-- Plans state machine (F3): tolak transisi status yang tidak legal.
-- Salinan dari src/lib/plans.ts (TRANSITIONS) — ubah keduanya bersamaan.
create or replace function public.plan_status_transition_allowed(p_from text, p_to text)
returns boolean as $$
begin
  -- Status tidak berubah: selalu boleh (update kolom lain).
  if p_from is not distinct from p_to then
    return true;
  end if;

  -- Batal tersedia dari setiap status aktif; `diterima` dan `batal` terminal.
  if p_to = 'batal' then
    return p_from in ('wishlist', 'po', 'dp', 'lunas');
  end if;

  -- Jalur utama: wishlist -> po -> dp -> lunas -> diterima
  -- `po -> lunas` legal untuk pembelian yang dibayar penuh tanpa DP.
  return case p_from
    when 'wishlist' then p_to = 'po'
    when 'po' then p_to in ('dp', 'lunas')
    when 'dp' then p_to = 'lunas'
    when 'lunas' then p_to = 'diterima'
    else false
  end;
end;
$$ language plpgsql immutable;

create or replace function public.guard_plan_status_transition()
returns trigger as $$
begin
  if new.status is distinct from old.status
     and not public.plan_status_transition_allowed(old.status, new.status) then
    raise exception 'Transisi status plan tidak diperbolehkan: % -> %', old.status, new.status
      using errcode = '23514';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists plans_status_transition_guard on public.plans;
create trigger plans_status_transition_guard
  before update of status on public.plans
  for each row execute function public.guard_plan_status_transition();

-- Single-User Mode: Guard against multiple user signups in auth.users
create or replace function public.prevent_extra_user_signups()
returns trigger as $$
begin
  if (select count(*) from auth.users) >= 1 then
    raise exception 'Registration disabled: ComicPlan is configured for single-user mode.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    drop trigger if exists on_auth_user_created_limit on auth.users;
    create trigger on_auth_user_created_limit
      before insert on auth.users
      for each row execute function public.prevent_extra_user_signups();
  end if;
end;
$$;

-- Enable Row Level Security (RLS) on all tables
alter table public.budgets enable row level security;
alter table public.items enable row level security;
alter table public.listings enable row level security;
alter table public.plans enable row level security;
alter table public.transactions enable row level security;
alter table public.status_history enable row level security;

-- Drop existing policies if any
drop policy if exists "Allow authenticated users to read budgets" on public.budgets;
drop policy if exists "Allow authenticated users to read items" on public.items;
drop policy if exists "Allow authenticated users to read listings" on public.listings;
drop policy if exists "Allow authenticated users to read plans" on public.plans;
drop policy if exists "Allow authenticated users to read transactions" on public.transactions;
drop policy if exists "Allow authenticated users to read status_history" on public.status_history;

-- RLS: Authenticated user read-only access
-- All mutations (INSERT, UPDATE, DELETE) must pass through server routes using service_role key
create policy "Allow authenticated users to read budgets" on public.budgets
  for select to authenticated using (true);

create policy "Allow authenticated users to read items" on public.items
  for select to authenticated using (true);

create policy "Allow authenticated users to read listings" on public.listings
  for select to authenticated using (true);

create policy "Allow authenticated users to read plans" on public.plans
  for select to authenticated using (true);

create policy "Allow authenticated users to read transactions" on public.transactions
  for select to authenticated using (true);

create policy "Allow authenticated users to read status_history" on public.status_history
  for select to authenticated using (true);
