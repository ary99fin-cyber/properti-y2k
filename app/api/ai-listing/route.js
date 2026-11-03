import { sb } from '@/lib/supabase';

export const maxDuration = 30;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

const SYSTEM = `Kamu adalah copywriter properti profesional untuk agen properti di Indonesia.
Tugasmu: membaca teks iklan mentah (biasanya dari WhatsApp/Facebook) lalu mengisi form listing dengan bahasa Indonesia yang lebih rapi, profesional, dan menarik.

ATURAN KETAT:
1. JANGAN mengarang fakta. Hanya pakai informasi yang ada di teks. Jika sertifikat, tahun bangun, listrik, dll tidak disebut, jangan ditulis.
2. Angka (harga, luas, kamar, lantai) harus persis sesuai teks. Harga ditulis penuh dalam Rupiah (Rp3,5 miliar = 3500000000). Jika harga per unit, isi harga per unit dan sebut jumlah unit di deskripsi.
3. Jangan melebih-lebihkan. Hindari klaim tak terbukti ("terbaik", "pasti untung"). Klaim dari teks (misal nilai premium historis) boleh dipertahankan dengan kata yang hati-hati ("berdasarkan riwayat").
4. Tanpa emoji dan tanpa HURUF KAPITAL SEMUA di semua field (teks ini tampil di website dan video).
5. judul: maksimal 70 karakter, jelas dan menjual (jenis properti + nilai jual utama + area).
6. spesifikasi: satu baris per item, format "Label: nilai". Urutan wajib: Luas bangunan, Kamar tidur, Kamar mandi, lalu item lain yang disebut (Tower, Lantai, Kondisi, dll). Nilai singkat (contoh "±140–143 m²", "3 + 1").
7. deskripsi: 2-3 paragraf pendek (total sekitar 90-150 kata), hangat dan meyakinkan, ditutup ajakan menghubungi untuk jadwal viewing. Sebutkan negosiasi jika teks menyebutnya.
8. fasilitas: daftar singkat dipisah koma, hanya yang ada di teks.
9. catatan: isi daftar hal yang ambigu atau perlu dicek admin (misal dua luas berbeda, harga tidak jelas). Kosongkan jika tidak ada.`;

const TOOL = {
  name: 'isi_form',
  description: 'Isi semua kolom form listing properti.',
  input_schema: {
    type: 'object',
    properties: {
      judul: { type: 'string' },
      lokasi: { type: 'string', description: 'Area dan kota, contoh: Grand Jati Junction, Medan Timur' },
      status: { type: 'string', enum: ['Dijual', 'Disewa'] },
      harga: { type: 'number', description: 'Rupiah penuh. 0 jika tidak disebut.' },
      spesifikasi: { type: 'string' },
      deskripsi: { type: 'string' },
      fasilitas: { type: 'string' },
      catatan: { type: 'array', items: { type: 'string' } },
    },
    required: ['judul', 'lokasi', 'status', 'harga', 'spesifikasi', 'deskripsi', 'fasilitas', 'catatan'],
  },
};

const err = (error, status) => Response.json({ error }, { status });

export async function POST(req) {
  // Hanya admin: cegah orang lain memakai kuota API.
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!process.env.ANTHROPIC_API_KEY) return err('ANTHROPIC_API_KEY belum diisi di environment (Vercel / .env.local).', 500);
  if (!adminEmail) return err('ADMIN_EMAIL belum diisi di environment (samakan dengan email admin Supabase).', 500);
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return err('Silakan login admin dulu.', 401);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return err('Sesi login habis. Masuk ulang.', 401);
  if ((data.user.email || '').toLowerCase() !== adminEmail) return err('Akun ini bukan admin.', 403);

  const body = await req.json().catch(() => ({}));
  const text = String(body.text || '').trim().slice(0, 6000);
  if (text.length < 30) return err('Teks iklan terlalu pendek.', 400);

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'isi_form' },
        messages: [{ role: 'user', content: `Teks iklan mentah:\n\n${text}` }],
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    return err('AI tidak merespons. Coba lagi.', 504);
  }
  if (!res.ok) return err(`AI gagal (HTTP ${res.status}). Periksa API key / kuota.`, 502);

  const out = await res.json().catch(() => null);
  const f = out?.content?.find(b => b.type === 'tool_use')?.input;
  if (!f) return err('AI tidak mengembalikan hasil yang valid. Coba lagi.', 502);

  return Response.json({
    judul: String(f.judul || '').slice(0, 120),
    lokasi: String(f.lokasi || ''),
    status: f.status === 'Disewa' ? 'Disewa' : 'Dijual',
    harga: Math.max(0, Math.round(Number(f.harga) || 0)),
    spesifikasi: String(f.spesifikasi || ''),
    deskripsi: String(f.deskripsi || ''),
    fasilitas: String(f.fasilitas || ''),
    catatan: Array.isArray(f.catatan) ? f.catatan.map(String).filter(Boolean) : [],
  });
}
