-- Jalankan di Supabase > SQL Editor. Data properti lama TIDAK diubah.
create table if not exists site_settings (key text primary key, value text);
alter table site_settings enable row level security;
create policy "baca publik" on site_settings for select using (true);
-- GANTI email admin Anda:
create policy "admin tulis" on site_settings for all using (auth.jwt()->>'email'='ADMIN@EMAIL.COM') with check (auth.jwt()->>'email'='ADMIN@EMAIL.COM');
-- Pastikan tabel properties: baca publik, tulis hanya admin (contoh):
-- create policy "admin tulis props" on properties for all using (auth.jwt()->>'email'='ADMIN@EMAIL.COM') with check (auth.jwt()->>'email'='ADMIN@EMAIL.COM');
-- Realtime dashboard (opsional): alter publication supabase_realtime add table properties;
