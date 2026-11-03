# Y2K Property — Next.js
1. `cp .env.example .env.local` lalu isi URL + anon key Supabase (sama dengan config.js lama; JANGAN service_role).
2. Jalankan `supabase.sql` (ganti email admin). Buat user admin di Supabase > Authentication.
3. `npm install && npm run dev` → beranda `/`, admin `/admin`.
4. Deploy: push ke GitHub, Vercel otomatis (isi 2 env var di Vercel).
Catatan: impor Brighton memakai URL foto asli Brighton (hotlink); konfirmasi izin ke principal. Tabel `properties`, bucket `foto`, `y2k_leads` dipakai ulang.

---
## Tambahan: PWA / Android, Video, Share

### Fitur baru
- **PWA**: `app/manifest.js`, `public/sw.js`, `public/offline.html`, ikon di `public/icons/`, tombol "📲 Pasang aplikasi" (`components/PwaRegister.js`). Service worker hanya meng-cache aset statis; data Supabase, `/api`, dan `/admin` tidak pernah di-cache.
- **Buat Video** (admin → Bagikan → tab 🎬 Video): slideshow 9:16 dari 2–8 foto, 3 gaya (Elegan/Dinamis/Cepat), gerakan kamera + transisi bervariasi, teks beranimasi, penutup foto agen + WA. Tanpa suara — pilih musik langsung di TikTok/IG/FB. Kode: `lib/videoEngine.js` (animasi) + `components/VideoMaker.js` (UI & rekaman).
- **Tombol bagikan publik** di halaman properti (`components/ShareButtons.js`) + Open Graph/Twitter card lebih lengkap.

### Setelan wajib sebelum deploy
Isi `NEXT_PUBLIC_SITE_URL` (domain publik) di Vercel agar preview link WhatsApp/Facebook benar. PWA butuh **HTTPS** (Vercel sudah otomatis).

### Jadi APK / AAB untuk Play Store (TWA)
1. Deploy ke Vercel, buka di Chrome Android → pastikan muncul "Pasang aplikasi".
2. Buka https://www.pwabuilder.com → masukkan URL situs → *Package for stores* → Android.
3. Isi package ID (mis. `com.propertiy2k.app`), unduh paket. **Simpan file keystore & passwordnya.**
4. Tempel `assetlinks.json` dari PWABuilder ke `public/.well-known/assetlinks.json` lalu deploy ulang (menghilangkan bilah alamat Chrome di dalam app).
5. Unggah `.aab` ke Google Play Console (perlu akun developer, biaya sekali USD 25).

### Catatan video
- Hasil terbaik: Chrome Android terbaru (MP4 H.264). Jika browser hanya menghasilkan WebM, muncul peringatan.
- Perekaman real-time (video 13 dtk ≈ 13 dtk proses); layar harus tetap menyala.
- Foto hotlink Brighton tetap lewat `/api/img`; sebaiknya unggah foto sendiri agar tidak hilang/ditolak.
