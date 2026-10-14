# Properti Y2K — Luxury Edition

Upgrade dari proyek sebelumnya; **tetap menggunakan tabel `properties` dan bucket `foto` Supabase yang sama**, login admin tersedia di `/admin.html`.

## Penting sebelum upload

1. **Cadangkan `config.js` yang sekarang aktif di GitHub/Vercel**, lalu pertahankan nilainya ketika mengganti file desain. ZIP ini berisi placeholder bawaan dari ZIP lama karena kredensial deployment tidak ada dalam berkas yang diterima. Jangan menimpa konfigurasi aktif dengan placeholder.
2. Upload seluruh file versi ini ke repository GitHub yang sudah terhubung ke Vercel (replace file lama, lalu commit). Pastikan `config.js` berisi URL Supabase dan **anon/publishable key** yang benar serta nomor WA. **Jangan gunakan service_role atau secret key** dalam file publik.
3. Tunggu deployment Vercel selesai, lalu reload halaman. Buka `/admin.html` untuk mengelola properti. Data existing tidak dihapus/diubah oleh upgrade frontend ini.
4. Tabel `properties` dan RLS bucket foto harus memiliki kebijakan baca publik yang benar; untuk tambah/edit/hapus, batasi hanya pengguna admin yang sah lewat RLS. Login Supabase saja tidak otomatis menjamin izin admin.

## Fitur

- Beranda luxury mobile-friendly, hero, katalog, pencarian nama/lokasi, filter status/harga.
- Halaman detail dan galeri foto lama tetap bekerja.
- Login admin, tambah/edit/hapus dan upload foto lama tetap bekerja.
- Musik instrumental lokal `assets/luxury-ambient.mp3`. Browser akan mencoba autoplay; browser mobile biasanya menolak audio bersuara tanpa klik/tap, jadi tersedia tombol play/pause, volume, dan sembunyikan panel.
- Semua detail properti tetap dimuat langsung dari Supabase; tidak ada properti demo palsu.

## Catatan

Gambar hero di `assets/hero-luxury.jpg` bersifat ilustratif. Foto kartu properti berasal dari Supabase. Filter bekerja di browser setelah mengambil daftar properti (cocok untuk katalog kecil-menengah).
