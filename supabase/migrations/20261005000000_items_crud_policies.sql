-- Allow authenticated users to perform CRUD on items and plans
create policy "Allow authenticated users to insert items" on public.items
  for insert to authenticated with check (true);

create policy "Allow authenticated users to update items" on public.items
  for update to authenticated using (true) with check (true);

create policy "Allow authenticated users to delete items" on public.items
  for delete to authenticated using (true);

create policy "Allow authenticated users to insert plans" on public.plans
  for insert to authenticated with check (true);

create policy "Allow authenticated users to update plans" on public.plans
  for update to authenticated using (true) with check (true);

create policy "Allow authenticated users to delete plans" on public.plans
  for delete to authenticated using (true);
