-- F4 — Budget & Transaksi.
--
-- Migrasi awal (`20261002000000_initial_schema.sql`) hanya mengizinkan SELECT
-- pada `budgets` dan `transactions`, dengan asumsi semua mutasi lewat service
-- role. Server action F4 sekarang memakai client sesi user biasa (sama seperti
-- `plans/actions.ts`), jadi RLS perlu mengizinkan INSERT/UPDATE.
--
-- Single-user: `using (true)` cukup — RLS sudah membatasi akses ke role
-- `authenticated`, dan middleware hanya mengizinkan satu email owner.
--
-- `status_history` tidak perlu policy mutasi: barisnya ditulis trigger
-- `on_plan_status_changed`, bukan dari client.

create policy "Allow authenticated users to insert budgets" on public.budgets
  for insert to authenticated with check (true);

create policy "Allow authenticated users to update budgets" on public.budgets
  for update to authenticated using (true) with check (true);

create policy "Allow authenticated users to insert transactions" on public.transactions
  for insert to authenticated with check (true);

create policy "Allow authenticated users to update transactions" on public.transactions
  for update to authenticated using (true) with check (true);

create policy "Allow authenticated users to delete transactions" on public.transactions
  for delete to authenticated using (true);