-- F3 — Plans state machine + riwayat status
--
-- 1. plans.deadline_po: deadline PO per plan. Diisi dari listing.deadline_po
--    saat plan masuk status `po` dan bisa di-override user per plan.
-- 2. Guard transisi di Postgres: jaring pengaman terakhir kalau ada penulisan
--    yang tidak lewat server action (mis. SQL manual / integrasi lain).
-- 3. Jaminan setiap perubahan status selalu punya baris status_history.

-- 1. Deadline PO per plan --------------------------------------------------
alter table public.plans
  add column if not exists deadline_po date;

comment on column public.plans.deadline_po is
  'Deadline PO plan. Diisi dari listings.deadline_po saat status=po, bisa di-override.';

-- 2. State machine di database -------------------------------------------
-- Salinan dari src/lib/plans.ts (TRANSITIONS). Jangan diubah di satu sisi saja.
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

-- 3. Riwayat status -------------------------------------------------------
-- Trigger ini sudah dibuat di migrasi awal; di-create ulang agar aman dijalankan
-- pada database yang belum punya trigger history (mis. di-seed ulang).
create or replace function public.log_plan_status_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.status_history (plan_id, status_lama, status_baru, changed_at)
    values (new.id, null, new.status, now());
  elsif old.status is distinct from new.status then
    insert into public.status_history (plan_id, status_lama, status_baru, changed_at)
    values (new.id, old.status, new.status, now());
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_plan_status_changed on public.plans;
create trigger on_plan_status_changed
  after insert or update on public.plans
  for each row execute function public.log_plan_status_change();

-- Timeline per plan selalu diurutkan changed_at desc.
create index if not exists idx_status_history_plan_changed
  on public.status_history (plan_id, changed_at desc);

-- Deadline dipakai untuk sorting/filter plan PO.
create index if not exists idx_plans_status_deadline
  on public.plans (status, deadline_po);