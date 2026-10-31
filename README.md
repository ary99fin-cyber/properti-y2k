# Properti Y2K — Next.js
1. `cp .env.example .env.local` lalu isi URL + anon key Supabase (sama dengan config.js lama; JANGAN service_role).
2. Jalankan `supabase.sql` (ganti email admin). Buat user admin di Supabase > Authentication.
3. `npm install && npm run dev` → beranda `/`, admin `/admin`.
4. Deploy: push ke GitHub, Vercel otomatis (isi 2 env var di Vercel).
Catatan: impor Brighton memakai URL foto asli Brighton (hotlink); konfirmasi izin ke principal. Tabel `properties`, bucket `foto`, `y2k_leads` dipakai ulang.
