// ===== EDIT DATA PROPERTI DI SINI =====
// Foto: taruh file di folder "foto", lalu tulis nama filenya di bawah.
const PROPERTI = {
  judul: "Apartemen 2 Kamar Tidur, Tower A Lantai 12",
  lokasi: "Pekanbaru, Riau",
  status: "Dijual",            // Dijual / Disewa
  harga: 850000000,            // angka saja, tanpa titik
  satuanHarga: "",             // contoh: "/ tahun" untuk sewa
  spesifikasi: [
    { label: "Luas bangunan", nilai: "72 m²" },
    { label: "Kamar tidur", nilai: "2" },
    { label: "Kamar mandi", nilai: "2" },
    { label: "Lantai", nilai: "12" },
    { label: "Sertifikat", nilai: "SHM Sarusun" },
    { label: "Kondisi", nilai: "Furnished" }
  ],
  deskripsi: "Unit rapi dan terawat, pencahayaan alami bagus, langsung bisa huni. Dekat pusat kota dan akses mudah ke kampus, mal, dan rumah sakit.",
  fasilitas: ["AC", "Water heater", "Kolam renang", "Gym", "Parkir", "Keamanan 24 jam"],
  petaUrl: "",                 // opsional: tempel link Google Maps
  whatsapp: "6281234567890",   // format 62..., tanpa + dan tanpa 0 di depan
  agen: "Nama Kamu",
  // Kosongkan = otomatis baca foto/1.jpg, foto/2.jpg, dst (maks 40).
  // Mau caption sendiri? Isi seperti: { file: "foto/1.jpg", ket: "Ruang tamu" },
  foto: []
};
