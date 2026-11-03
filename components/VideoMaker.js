'use client';
import { useEffect, useRef, useState } from 'react';
import { rp, specs, tc } from '@/lib/supabase';
import { STYLES, buildTimeline, drawFrame } from '@/lib/videoEngine';

const slug = s => String(s || 'properti').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const cache = new Map();
async function loadImg(url) {
  if (cache.has(url)) return cache.get(url);
  for (const u of [url, '/api/img?u=' + encodeURIComponent(url)]) {
    try { const r = await fetch(u); if (r.ok) { const b = await createImageBitmap(await r.blob()); cache.set(url, b); return b } } catch {}
  }
  throw new Error('Ada foto yang tidak bisa dimuat. Coba pilih foto lain.');
}
// Utamakan MP4 H.264 (diterima IG/TikTok/WA). WebM hanya cadangan.
const MIMES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1.4D401F', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
const pickMime = () => typeof MediaRecorder === 'undefined' ? null : MIMES.find(m => MediaRecorder.isTypeSupported(m)) || '';

export default function VideoMaker({ p, cfg, caption }) {
  const cv = useRef(null), recRef = useRef(false);
  const fotos = (p.foto || []).slice(0, 12);
  const [style, setStyle] = useState('luxury'), [q, setQ] = useState(720), [sel, setSel] = useState(() => fotos.slice(0, 5).map((_, i) => i));
  const [tl, setTl] = useState(null), [phase, setPhase] = useState('idle'), [prog, setProg] = useState(0), [note, setNote] = useState('');
  const [res, setRes] = useState(null), [cap, setCap] = useState(caption || '');
  // Minimal dua foto wajib agar timeline memiliki slide foto dan outro.
  const minSel = 2;

  // siapkan timeline tiap kali foto/gaya/kualitas berubah
  useEffect(() => {
    let dead = false;
    if (fotos.length < minSel) {
      setTl(null); setPhase('idle');
      setNote('Properti ini belum memiliki minimal 2 foto untuk dibuat menjadi video.');
      return;
    }
    if (sel.length < minSel || !cv.current) {
      setTl(null); setPhase('idle');
      setNote(sel.length < minSel ? 'Pilih minimal 2 foto untuk membuat video.' : '');
      return;
    }
    (async () => {
      setPhase('loading'); setNote('');
      try {
        const urls = sel.map(i => fotos[i]).filter(Boolean);
        if (urls.length < minSel) throw new Error('Pilih minimal 2 foto yang valid untuk membuat video.');
        const imgs = await Promise.all(urls.map(loadImg));
        if (imgs.length < minSel) throw new Error('Minimal 2 foto harus berhasil dimuat.');
        let ag = null; try { ag = await loadImg('/yenny-khuang.jpg') } catch {}
        const W = q, H = Math.round(q * 16 / 9), c = cv.current.getContext('2d');
        cv.current.width = W; cv.current.height = H;
        const serifVar = getComputedStyle(document.documentElement).getPropertyValue('--f-serif').trim();
        try { await document.fonts.load(`600 40px ${serifVar || 'Georgia'}`) } catch {}
        const sp = specs(p.spesifikasi), pick = sp.filter(([k]) => /kamar|luas|lt|lb|km|kt/i.test(k));
        const info = {
          status: p.status, title: tc(p.judul), loc: '📍 ' + tc(p.lokasi), price: rp(p.harga),
          chips: (pick.length ? pick : sp).slice(0, 3).map(([k, v]) => `${k} ${v}`),
          agen: cfg.agen || '', wa: '0' + String(cfg.wa || '').replace(/^62/, ''), accent: cfg.accent || '#C9A24B',
          serif: (serifVar ? serifVar + ',' : '') + 'Georgia,serif', sans: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
        };
        const t = buildTimeline({ W, H, c, info, imgs, agentImg: ag, style });
        if (!dead) { setTl(t); setPhase('ready') }
      } catch (e) { if (!dead) { setNote(e.message); setPhase('idle') } }
    })();
    return () => { dead = true };
  }, [sel.join(','), style, q, p]);

  // preview berulang (berhenti saat merekam)
  useEffect(() => {
    if (!tl || phase === 'rec') return;
    const c = cv.current.getContext('2d'); let raf; const t0 = performance.now();
    const loop = now => { const t = ((now - t0) / 1000) % (tl.total + .8); drawFrame(c, tl, Math.min(t, tl.total - .001)); raf = requestAnimationFrame(loop) };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [tl, phase === 'rec']);

  useEffect(() => () => { if (res?.url) URL.revokeObjectURL(res.url) }, [res]);

  const toggle = i => setSel(s => s.includes(i) ? s.filter(x => x !== i) : s.length >= 8 ? s : [...s, i]);

  const record = async () => {
    if (!tl || recRef.current) return;
    const mime = pickMime();
    if (mime === null) return setNote('Browser ini tidak mendukung perekaman video. Gunakan Chrome terbaru.');
    if (!Number.isFinite(tl.total) || tl.total < 1) return setNote('Durasi video tidak valid. Muat ulang halaman lalu coba lagi.');
    recRef.current = true; setRes(null); setProg(0); setNote(''); setPhase('rec');
    let stream;
    try {
      const el = cv.current, c = el.getContext('2d');
      if (!el || !c || typeof el.captureStream !== 'function') throw new Error('Canvas video tidak didukung browser ini.');
      // Gambar frame awal sebelum MediaRecorder dimulai agar stream tidak kosong.
      drawFrame(c, tl, 0);
      stream = el.captureStream(30);
      const track = stream.getVideoTracks()[0];
      const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: q >= 1080 ? 8_000_000 : 5_000_000 });
      const chunks = [];
      rec.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      const stopped = new Promise((resolve, reject) => {
        rec.onstop = resolve;
        rec.onerror = e => reject(e.error || new Error('Perekaman video gagal.'));
      });
      rec.start(1000);
      // Beri waktu recorder menginisialisasi container sebelum menghitung durasi.
      await new Promise(resolve => setTimeout(resolve, 250));
      const t0 = performance.now(); let lastP = 0;
      await new Promise((resolve, reject) => {
        let raf = 0, finished = false;
        const finish = () => { if (finished) return; finished = true; if (raf) cancelAnimationFrame(raf); resolve(); };
        const loop = now => {
          if (finished) return;
          const elapsed = (now - t0) / 1000;
          drawFrame(c, tl, Math.min(elapsed, tl.total - 0.001));
          // Beberapa browser Android mendukung requestFrame untuk canvas capture.
          try { track?.requestFrame?.(); } catch {}
          const pr = Math.min(1, elapsed / tl.total);
          if (pr - lastP > 0.015) { lastP = pr; setProg(pr); }
          if (elapsed >= tl.total + 0.35) finish();
          else raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        // Pengaman jika RAF berhenti total ketika browser membatasi tab.
        const guard = setTimeout(() => { if (!finished) { if (raf) cancelAnimationFrame(raf); reject(new Error('Perekaman terhenti oleh browser. Tetap buka halaman dan nyalakan layar, lalu coba lagi.')); } }, (tl.total + 12) * 1000);
        stopped.finally(() => clearTimeout(guard));
      });
      // Minta chunk terakhir, lalu stop dan tunggu event onstop sebelum membuat Blob.
      try { rec.requestData(); } catch {}
      await new Promise(resolve => setTimeout(resolve, 150));
      if (rec.state !== 'inactive') rec.stop();
      await stopped;
      stream.getTracks().forEach(t => t.stop()); stream = null;
      const type = rec.mimeType || mime || 'video/webm';
      const blob = new Blob(chunks, { type });
      if (blob.size < 10_000) throw new Error('File video kosong atau terlalu kecil. Coba lagi dengan layar tetap menyala dan halaman tidak berpindah.');
      // Validasi metadata durasi sebelum tombol unduh ditampilkan.
      const url = URL.createObjectURL(blob);
      const duration = await new Promise((resolve, reject) => {
        const probe = document.createElement('video');
        const cleanup = () => { probe.removeAttribute('src'); probe.load(); };
        probe.preload = 'metadata'; probe.onloadedmetadata = () => { const d = probe.duration; cleanup(); Number.isFinite(d) && d > 0.5 ? resolve(d) : reject(new Error('Video tersimpan dengan durasi 0 detik. Perekaman belum selesai; coba lagi dan jangan pindah aplikasi.')); };
        probe.onerror = () => { cleanup(); reject(new Error('Browser tidak dapat membaca hasil video. Coba gunakan Chrome terbaru.')); };
        probe.src = url;
        setTimeout(() => { if (probe.readyState < 1) { cleanup(); reject(new Error('Pemeriksaan durasi video timeout. Coba ulangi dengan layar tetap menyala.')); } }, 12_000);
      }).catch(e => { URL.revokeObjectURL(url); throw e; });
      const mp4 = type.includes('mp4');
      setRes({ url, blob, ext: mp4 ? 'mp4' : 'webm', type: type.split(';')[0], codecOk: mp4 && /avc1|h264/i.test(type), duration });
      setPhase('done'); setProg(1);
    } catch (e) {
      stream?.getTracks?.().forEach(t => t.stop());
      setNote(e.message || 'Gagal merekam video.'); setPhase('ready');
    } finally { recRef.current = false; }
  };

  const name = () => `${slug(p.judul)}-video.${res.ext}`;
  const dl = () => { const a = document.createElement('a'); a.href = res.url; a.download = name(); a.click() };
  const copy = async () => { try { await navigator.clipboard.writeText(cap); setNote('Caption disalin ✓') } catch { setNote('Gagal menyalin, salin manual dari kotak caption.') } };
  const share = async () => {
    const file = new File([res.blob], name(), { type: res.type }); try { await navigator.clipboard.writeText(cap) } catch {}
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text: cap, title: tc(p.judul) }); setNote('Caption sudah disalin — tempel jika aplikasi tidak mengisinya. Pilih lagu langsung di aplikasinya.') }
      catch (e) { if (e.name !== 'AbortError') setNote(e.message) }
    } else { dl(); setNote('Browser ini belum bisa kirim langsung. Video diunduh & caption disalin — buka aplikasinya lalu unggah.') }
  };

  const busy = phase === 'rec' || phase === 'loading';
  return <div className="grid gap-4 md:grid-cols-[minmax(0,300px)_1fr]">
    <div className="relative mx-auto w-full max-w-[300px]">
      <canvas ref={cv} className="w-full rounded-lg border border-line bg-black" style={{ aspectRatio: '9/16' }} />
      {phase === 'loading' && <p className="absolute inset-0 grid place-items-center text-sm text-stone-300">Memuat foto…</p>}
      {phase === 'rec' && <div className="absolute inset-x-3 bottom-3 rounded-lg bg-black/70 p-2 text-center text-xs text-gold">Merekam… {Math.round(prog * 100)}%<div className="mt-1 h-1 rounded bg-white/20"><div className="h-1 rounded bg-gold" style={{ width: `${prog * 100}%` }} /></div></div>}
    </div>
    <div className="min-w-0 space-y-4">
      <div><p className="mb-1 text-xs text-stone-400">Gaya video</p>
        <div className="grid grid-cols-3 gap-2">{Object.entries(STYLES).map(([k, v]) => <button key={k} disabled={busy} onClick={() => setStyle(k)} className={`rounded-xl border p-2 text-left ${style === k ? 'border-gold bg-gold/10 text-gold' : 'border-line text-stone-300'}`}><p className="text-sm font-medium">{v.label}</p><p className="text-[11px] text-stone-500">{v.sub}</p></button>)}</div></div>
      <div><p className="mb-1 text-xs text-stone-400">Pilih 2–8 foto (urutan sesuai yang diketuk) — {sel.length} dipilih</p>
        {fotos.length < 2 && <p className="mb-2 text-xs text-amber-400">Tambahkan minimal 2 foto pada data properti agar video dapat dibuat.</p>}
        <div className="flex gap-2 overflow-x-auto pb-1">{fotos.map((u, i) => { const n = sel.indexOf(i); return <button key={u} disabled={busy} onClick={() => toggle(i)} className={`relative shrink-0 rounded-lg border-2 ${n >= 0 ? 'border-gold' : 'border-transparent opacity-60'}`}><img src={u} alt="" className="h-14 w-20 rounded object-cover" />{n >= 0 && <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-gold text-[11px] font-bold text-black">{n + 1}</span>}</button> })}</div></div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn" disabled={busy || !tl || sel.length < minSel || fotos.length < minSel} onClick={record}>{res ? 'Buat ulang video' : 'Buat video'}</button>
        <select className="inp !w-auto" disabled={busy} value={q} onChange={e => setQ(Number(e.target.value))}><option value={720}>720p (cepat)</option><option value={1080}>1080p (lebih tajam)</option></select></div>
      <p className="text-xs text-stone-500">Video 9:16 tanpa suara. Proses perekaman berjalan real-time: biarkan halaman tetap terbuka dan layar menyala sampai selesai. Musik dapat ditambahkan di Instagram/TikTok.</p>
      {res && <div className="space-y-3 rounded-xl border border-line p-3">
        <video src={res.url} controls playsInline loop muted className="mx-auto max-h-80 rounded-lg bg-black" />
        <p className="text-xs text-emerald-400">Durasi terverifikasi: {res.duration.toFixed(1)} detik.</p>
        {!res.codecOk && <p className="text-xs text-amber-400">Browser ini menghasilkan {res.ext.toUpperCase()} (bukan MP4 H.264), sebagian aplikasi bisa menolaknya. Untuk hasil paling aman, buka dengan Chrome Android terbaru.</p>}
        <label className="block text-xs text-stone-400">Caption — boleh diedit<textarea rows="7" className="inp mt-1 font-mono text-xs" value={cap} onChange={e => setCap(e.target.value)} /></label>
        <div className="flex flex-wrap gap-2"><button className="btn flex-1 sm:flex-none" onClick={share}>Bagikan ke aplikasi</button><button className="btn2" onClick={dl}>Unduh video</button><button className="btn2" onClick={copy}>Salin caption</button></div></div>}
      {note && <p className="text-sm text-gold">{note}</p>}
    </div>
  </div>;
}
