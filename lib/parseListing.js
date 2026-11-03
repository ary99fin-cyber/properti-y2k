// Parser teks iklan -> isian form properti. Tanpa AI: aturan tetap, gratis, berjalan di browser.
const EMOJI = /[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu;
const BULLET = /^\s*(?:✅|✔️?|☑️?|✓|•|▪️?|▫️?|◾|◽|➤|➢|►|▶️?|-|–|—|\*|·)/u;
const CTA = /(hubungi|serious\s*buyer|whatsapp|\bwa\b|\bcall\b|telp|telepon|\bdm\b|info\s*lebih\s*lanjut|private\s*viewing|jadwalkan|\bhub\b)/i;
const SEC = /^(keunggulan|kelebihan|fasilitas|spesifikasi|detail|keterangan|deskripsi)\b/i;
const KV = /^([A-Za-zÀ-ÿ0-9 .\/]{2,28}?)\s*[:=]\s*(\S.*)$/;

const clean = l => l.replace(EMOJI, '').replace(/^[\s\-–—*•·>#_=~|]+/, '').replace(/\s+/g, ' ').trim();
const upRatio = s => { const l = s.replace(/[^A-Za-z]/g, ''); return l.length ? l.replace(/[^A-Z]/g, '').length / l.length : 0 };
const tcase = s => { s = String(s || '').trim(); return s.length > 3 && upRatio(s) > .7 ? s.toLowerCase().replace(/(^|[\s\-\/(–])([a-z])/g, (m, a, b) => a + b.toUpperCase()) : s };
const cap1 = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const sentence = s => { s = s.replace(/[.;:,\s]+$/, ''); return cap1(s) + '.' };
const uniq = a => { const seen = new Set(); return a.filter(x => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true }) };

// "3,5" -> 3.5 ; "1.250" -> 1250 (titik ribuan) ; tanpa satuan semua pemisah dibuang
function num(str, hasUnit) {
  str = String(str).replace(/[.,]+$/, '');
  if (hasUnit) return /^\d{1,3}(\.\d{3})+$/.test(str) ? +str.replace(/\./g, '') : +str.replace(',', '.');
  return +str.replace(/[.,]/g, '');
}
const MULT = [[/^(miliar|milyar|m)$/i, 1e9], [/^(juta|jt)$/i, 1e6], [/^(ribu|rb)$/i, 1e3]];
function money(s) {
  const m = String(s).match(/(?:rp\.?|idr)?\s*(\d[\d.,]*)\s*(miliar|milyar|m(?![a-z0-9²])|juta|jt|ribu|rb)?/i);
  if (!m) return 0;
  const u = m[2], n = num(m[1], !!u);
  if (!u) return n >= 1000 ? Math.round(n) : 0;
  return Math.round(n * MULT.find(([re]) => re.test(u))[1]);
}
const areas = s => [...String(s).matchAll(/(\d[\d.,]*)\s*(?:m²|m2|m\^2|㎡)/gi)].map(m => num(m[1], true)).filter(n => n > 0);
const bare = s => { const m = String(s).match(/(\d[\d.,]*)/); return m ? num(m[1], true) : 0 };
const fmtArea = (v, approx) => { v = [...new Set(v)].sort((a, b) => a - b); const f = n => String(Math.round(n * 10) / 10).replace('.', ','); return `${approx ? '±' : ''}${f(v[0])}${v.length > 1 ? '–' + f(v[v.length - 1]) : ''} m²` };
const plus = s => s.replace(/\s*\+\s*/g, ' + ').trim();

const FASILITAS = [
  [/kolam\s*renang|swimming\s*pool/i, 'Kolam renang'], [/\bpool\s*view\b/i, 'Pool view'], [/\bgym\b|fitness|pusat\s*kebugaran/i, 'Gym'],
  [/\btaman\b/i, 'Taman'], [/playground|area\s*bermain/i, 'Playground'], [/keamanan\s*24|security\s*24|satpam/i, 'Keamanan 24 jam'],
  [/cctv/i, 'CCTV'], [/\bparkir/i, 'Parkir'], [/\blift\b|elevator/i, 'Lift'], [/carport/i, 'Carport'], [/garasi/i, 'Garasi'],
  [/\bAC\b|air\s*conditioner/, 'AC'], [/water\s*heater/i, 'Water heater'], [/kitchen\s*set/i, 'Kitchen set'], [/balkon|balcony/i, 'Balkon'],
  [/mini\s*market/i, 'Minimarket'], [/jogging\s*track/i, 'Jogging track'], [/sauna/i, 'Sauna'], [/one\s*gate\s*system/i, 'One gate system'],
  [/rooftop/i, 'Rooftop'], [/musholla|mushola/i, 'Musholla'], [/laundry/i, 'Laundry'], [/sky\s*lounge/i, 'Sky lounge'],
];
const TIPE = [[/apartemen|apartment/i, 'Apartemen'], [/rumah/i, 'Rumah'], [/villa|vila/i, 'Villa'], [/ruko|rukan/i, 'Ruko'], [/tanah|kavling|lahan/i, 'Tanah'], [/gudang|pabrik/i, 'Gudang'], [/kantor/i, 'Kantor'], [/condotel/i, 'Condotel']];

export function parseListing(raw) {
  const text = String(raw || '').replace(/\r/g, '');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const kv = lines.map(clean).map(c => c.match(KV)).filter(Boolean).map(m => [m[1].trim(), m[2].trim()]);
  const get = re => (kv.find(([k]) => re.test(k)) || [])[1] || '';
  const catatan = [];

  // status & jenis
  const iJ = text.search(/\b(dijual|jual)\b/i), iS = text.search(/\b(disewakan|disewa|sewa)\b/i);
  const status = iS >= 0 && (iJ < 0 || iS < iJ) ? 'Disewa' : 'Dijual';
  let tipe = ''; { let best = 1e9; for (const [re, lab] of TIPE) { const i = text.search(re); if (i >= 0 && i < best) { best = i; tipe = lab } } }
  const mu = text.match(/(\d+)\s*unit\b/i), units = mu ? +mu[1] : 0;

  // harga
  let harga = 0, hl = '';
  for (const [k, v] of kv) if (/^(harga|price|hrg)/i.test(k)) { harga = money(v); if (harga) { hl = v; break } }
  if (!harga) for (const l of lines) { const m = l.match(/(?:rp\.?|idr)\s*\d[\d.,]*\s*(?:miliar|milyar|m(?![a-z0-9²])|juta|jt|ribu|rb)?.*/i); if (m) { harga = money(m[0]); if (harga) { hl = m[0]; break } } }
  const perUnit = /\/\s*unit|per\s*unit/i.test(hl), periode = (hl.match(/(?:\/|per)\s*(tahun|thn|bulan|bln)/i) || [])[1];
  if (!harga) catatan.push('Harga tidak terbaca, isi manual.');
  if (perUnit && units > 1) catatan.push(`Harga dibaca per unit (${units} unit tersedia).`);

  // lokasi
  let lokasi = get(/^(lokasi|alamat|area|letak)$/i);
  if (!lokasi) { const l = lines.find(l => /[📍📌🗺]/u.test(l)); if (l) lokasi = clean(l) }
  if (!lokasi) { const m = text.match(/\b(?:berlokasi di|terletak di|lokasi)\s*[:\-]?\s*([^\n.]{4,60})/i); if (m) lokasi = m[1] }
  if (!lokasi) { const m = text.match(/\bdi\s+((?:Jl\.?\s*)?[A-Z][^\n.,;]*?)(?=[.,;\n]|\s+(?:Rp|harga|luas|dengan|cocok)\b|$)/); if (m) lokasi = m[1] }
  lokasi = tcase(lokasi.replace(/^(lokasi|alamat)\s*[:\-]\s*/i, '').replace(/[\s,.;]+$/, ''));
  if (!lokasi) catatan.push('Lokasi tidak terbaca, isi manual.');

  // spesifikasi
  const spek = [];
  const lb = [], lt = [], un = [];
  for (const [k, v] of kv) {
    if (/^(luas\s*bangunan|lb|l\.b)$/i.test(k)) lb.push(...(areas(v).length ? areas(v) : [bare(v)]));
    else if (/^(luas\s*tanah|lt|l\.t)$/i.test(k)) lt.push(...(areas(v).length ? areas(v) : [bare(v)]));
    else if (/^(unit\s*\d+|luas|luas\s*unit|tipe\s*unit)$/i.test(k)) un.push(...(areas(v).length ? areas(v) : /^luas/i.test(k) ? [bare(v)] : []));
  }
  const inl = (re, arr) => { const m = text.match(re); if (m && !arr.length) arr.push(num(m[1], true)) };
  inl(/\bLB\s*[:.=]?\s*[±~]?\s*(\d[\d.,]*)/i, lb); inl(/\bLT\s*[:.=]?\s*[±~]?\s*(\d[\d.,]*)/i, lt);
  inl(/luas\s*bangunan\s*[:=]?\s*[±~]?\s*(\d[\d.,]*)/i, lb); inl(/luas\s*tanah\s*[:=]?\s*[±~]?\s*(\d[\d.,]*)/i, lt);
  if (!lb.length && !lt.length && !un.length) un.push(...areas(text));
  const approx = /[±~]|sekitar|kurang\s*lebih/i.test(lines.filter(l => /m²|m2|luas|\bl[bt]\b/i.test(l)).join(' '));
  const LB = lb.filter(n => n > 0), LT = lt.filter(n => n > 0), UN = un.filter(n => n > 0);
  if (LB.length) spek.push(['Luas bangunan', fmtArea(LB, approx)]);
  if (UN.length) spek.push([tipe === 'Tanah' ? 'Luas tanah' : tipe === 'Apartemen' || units ? 'Luas unit' : 'Luas bangunan', fmtArea(UN, approx)]);
  if (LT.length) spek.push(['Luas tanah', fmtArea(LT, approx)]);
  const allAreas = [...new Set([...LB, ...UN])];
  if (allAreas.length > 1 && !LB.length) catatan.push(`Ada lebih dari satu luas (${allAreas.join(', ')} m²); pastikan sesuai unit.`);

  const N = '(\\d+(?:\\s*\\+\\s*\\d+)?)';
  const kt = get(/^(kamar\s*tidur|k\.?t\.?|bedroom|bed)$/i).match(new RegExp(N)) || text.match(new RegExp(N + '\\s*(?:kamar\\s*tidur|kt\\b|k\\.t\\b|bedroom|br\\b)', 'i')) || text.match(new RegExp('\\bk\\.?t\\.?\\s*[:=]\\s*' + N, 'i'));
  if (kt) spek.push(['Kamar tidur', plus(kt[1])]);
  const hasKT = /\bkt\b/i.test(text);
  const km = get(/^(kamar\s*mandi|k\.?m\.?|bathroom|bath)$/i).match(new RegExp(N)) || text.match(new RegExp(N + '\\s*(?:kamar\\s*mandi|bathroom)', 'i')) || text.match(new RegExp('\\bk\\.?m\\.?\\s*[:=]\\s*' + N, 'i')) || (hasKT ? text.match(new RegExp(N + '\\s*km\\b(?!\\s*(?:dari|ke|menuju))', 'i')) : null);
  if (km) spek.push(['Kamar mandi', plus(km[1])]);

  const tower = get(/^(tower|blok|cluster)$/i); if (tower) spek.push([cap1(get(/^(tower|blok|cluster)$/i) ? kv.find(([k]) => /^(tower|blok|cluster)$/i.test(k))[0].toLowerCase() : 'Tower'), tcase(tower)]);
  const lantaiKv = get(/^(lantai|jumlah\s*lantai|tingkat)$/i).match(/\d+/), lantaiIn = text.match(/(\d+)\s*lantai\b/i);
  if (lantaiKv) spek.push(['Lantai', lantaiKv[0]]); else if (lantaiIn) spek.push(['Jumlah lantai', lantaiIn[1]]);
  let kondisi = get(/^(kondisi|furnish\w*)$/i) || (text.match(/semi[\s-]*furnish\w*|full[\s-]*furnish\w*|un[\s-]*furnish\w*|furnished/i) || [''])[0];
  if (kondisi) spek.push(['Kondisi', tcase(kondisi)]);
  const sert = get(/sertifikat|legalitas/i) || (text.match(/\b(SHM|SHGB|HGB|SHSRS|AJB|PPJB|girik|strata\s*title)\b/i) || [''])[0];
  if (sert) spek.push(['Sertifikat', /strata/i.test(sert) ? tcase(sert) : sert.toUpperCase()]);
  const lis = get(/^listrik$/i) || ((text.match(/(\d{3,5})\s*(watt|w\b|va\b)/i) || [])[0] || '');
  if (lis) spek.push(['Listrik', lis.replace(/\bwatt\b|\bw\b/i, 'Watt').replace(/\bva\b/i, 'VA')]);
  const arah = get(/^(hadap|arah\s*hadap|menghadap)$/i); if (arah) spek.push(['Hadap', tcase(arah)]);
  const thn = get(/^tahun\s*bangun$/i); if (thn) spek.push(['Tahun bangun', thn]);
  if (status === 'Disewa' && periode) spek.push(['Periode sewa', 'per ' + (/^t/i.test(periode) ? 'tahun' : 'bulan')]);

  const sp0 = Object.fromEntries(spek);
  // judul (setelah spesifikasi, agar bisa dipakai sebagai cadangan)
  let judul = '';
  for (const l of lines) { const c = clean(l); if (c.replace(/[^A-Za-z]/g, '').length < 10 || /^[^:]{1,28}:/.test(c) || /[📍📌]/u.test(l)) continue; judul = c; break }
  judul = judul.replace(/!{2,}/g, '').replace(/^(dijual|disewakan|disewa|jual|sewa)(\s+cepat|\s+murah|\s+segera)?\s*[:\-–]?\s*/i, '').replace(/[\s\-–|:,.]+$/, '');
  if (judul.length > 72 && /[|–-]/.test(judul)) { const cut = judul.slice(0, 72), i = Math.max(cut.lastIndexOf(' – '), cut.lastIndexOf(' | '), cut.lastIndexOf(' - ')); if (i > 25) judul = cut.slice(0, i).trim() }
  if (judul.length > 72 || judul.length < 10 || /\bRp\b|\d\s*(juta|miliar)/i.test(judul)) {
    const lu = sp0['Luas unit'] || sp0['Luas tanah'] || sp0['Luas bangunan'];
    judul = `${tipe || 'Properti'}${lu ? ' ' + lu : ''} ${status === 'Dijual' ? 'dijual' : 'disewakan'}${lokasi ? ' di ' + lokasi : ''}`;
  }
  judul = tcase(judul);

  // narasi, keunggulan, fasilitas
  let sec = ''; const keung = [], fasSec = [], prose = [];
  for (const l of lines) {
    const c = clean(l); if (!c) continue;
    const h = c.match(SEC);
    if (h) { sec = h[1].toLowerCase(); if (c.length < 45 || /:$/.test(c)) continue }
    if (KV.test(c) || upRatio(c) > .6 || CTA.test(c)) continue;
    if (BULLET.test(l)) { if (sec === 'fasilitas') fasSec.push(c); else if (sec !== 'spesifikasi' && c.length >= 12) keung.push(c); continue }
    if (sec === 'fasilitas' && /^\p{Extended_Pictographic}/u.test(l)) { fasSec.push(c); continue }
    if (c.length >= 50 && !/:$/.test(c) && !/\bRp\b|\d\s*(juta|miliar)/i.test(c) && (c.match(/,/g) || []).length / c.split(' ').length < .25) prose.push(c);
  }
  const fasKv = get(/^fasilitas$/i).split(/[,;•]/).map(s => s.trim()).filter(Boolean);
  const fasKw = FASILITAS.filter(([re]) => re.test(text)).map(([, lab]) => lab);
  const fasilitas = uniq([...fasKv, ...fasSec.filter(s => s.length <= 40).map(s => cap1(s.replace(/[.;,]+$/, ''))), ...fasKw]).slice(0, 14).join(', ');

  // deskripsi
  const sp = Object.fromEntries(spek.map(([k, v]) => [k, v]));
  const bagian = [];
  for (const k of ['Luas unit', 'Luas bangunan', 'Luas tanah']) if (sp[k]) bagian.push(`${k.toLowerCase()} ${sp[k]}`);
  if (sp['Kamar tidur']) bagian.push(`${sp['Kamar tidur']} kamar tidur`);
  if (sp['Kamar mandi']) bagian.push(`${sp['Kamar mandi']} kamar mandi`);
  if (sp['Kondisi']) bagian.push(`kondisi ${sp['Kondisi'].toLowerCase()}`);
  if (sp['Lantai']) bagian.push(`berada di lantai ${sp['Lantai']}${sp['Tower'] ? ' Tower ' + sp['Tower'] : ''}`);
  else if (sp['Tower']) bagian.push(`di Tower ${sp['Tower']}`);
  const buka = `${tipe || 'Properti'} ${status === 'Dijual' ? 'dijual' : 'disewakan'}${units > 1 ? ` (${units} unit tersedia)` : ''}${lokasi ? ' di ' + lokasi : ''}.`;
  const p1 = buka + (bagian.length ? ' ' + cap1(bagian.join(', ')) + '.' : '');
  const kal = a => sentence(a);
  const paras = [];
  if (prose[0]) paras.push(kal(prose[0]));
  paras.push(p1);
  const ku = keung.slice(0, 6).map(kal); if (ku.length) paras.push(ku.join(' '));
  else if (fasilitas) paras.push(`Fasilitas: ${fasilitas}.`);
  if (prose.length > 1) paras.push(prose.slice(1, 3).map(kal).join(' '));
  const tail = [];
  if (perUnit) tail.push('Harga per unit.');
  if (/nego/i.test(text)) tail.push('Harga masih dapat dinegosiasikan.');
  tail.push('Hubungi kami untuk informasi lebih lanjut dan jadwalkan kunjungan.');
  paras.push(tail.join(' '));
  if (/\d+\s*%/.test(text)) catatan.push('Ada klaim persentase di teks; pastikan datanya akurat.');

  return { judul, lokasi, status, harga, spesifikasi: spek.map(([k, v]) => `${k}: ${v}`).join('\n'), deskripsi: paras.join('\n\n'), fasilitas, catatan };
}
