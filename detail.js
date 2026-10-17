(async () => {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const brighton = params.get("brighton");
  let P, error;
  if (brighton) {
    // Only fetch listings deliberately published for visitors.
    const norm = v => String(v || '').trim().replace(/\/+$/, '');
    const safeUrl = v => {
      try { const u = new URL(v); return u.protocol === 'https:' && ['brighton.co.id','www.brighton.co.id'].includes(u.hostname.toLowerCase()) ? u.href : null; }
      catch (_) { return null; }
    };
    const validUrl = safeUrl(brighton);
    if (!validUrl) {
      $("app").textContent = "Tautan properti tidak valid."; return;
    }
    const [dr, ir] = await Promise.all([
      sb.from("y2k_listing_details").select("*").eq("publish_status", "published"),
      sb.from("y2k_listing_index").select("url,title,location_text,listing_status,price_idr")
    ]);
    error = dr.error || ir.error;
    const detail = (dr.data || []).find(x => norm(x.source_url) === norm(validUrl));
    const idx = (ir.data || []).filter(x => norm(x.url) === norm(validUrl)).sort((a,b) => Number(b.price_idr || 0) - Number(a.price_idr || 0))[0];
    if (detail && idx) {
      const images = Array.isArray(detail.image_urls) ? detail.image_urls.filter(x => typeof x === 'string' && x.startsWith('https://')) : [];
      const st = String(detail.listing_status || idx.listing_status || '').toLowerCase();
      const status = st === 'jual' ? 'Dijual' : st === 'sewa' ? 'Disewa' : 'Properti';
      P = {
        judul: detail.title || idx.title || 'Properti Brighton',
        lokasi: detail.location_text || idx.location_text || '',
        status, harga: Number(idx.price_idr || 0),
        deskripsi: typeof detail.description === 'string' ? detail.description : 'Informasi lengkap dan ketersediaan dapat dikonfirmasi kepada agen.',
        spesifikasi: typeof detail.spesifikasi === 'string' ? detail.spesifikasi : '',
        fasilitas: typeof detail.fasilitas === 'string' ? detail.fasilitas : '',
        foto: images, brighton_url: validUrl
      };
    }
  } else if (id) {
    const r = await sb.from("properties").select("*").eq("id", id).single();
    P = r.data; error = r.error;
  }
  if (error || !P) { $("app").innerHTML = '<p class="block">Properti tidak ditemukan atau belum dipublikasikan. <a class="link" href="index.html">Kembali</a></p>'; return; }
  const fotos = (P.foto && P.foto.length ? P.foto : [""]).map((f, i) => ({ file: f, ket: "Foto " + (i + 1) }));
  let idx = 0;
  document.title = P.judul;
  $("judul").textContent = P.judul; $("lokasi").textContent = P.lokasi || ""; $("status").textContent = P.status || "";
  $("harga").textContent = rupiah(P.harga); $("deskripsi").textContent = P.deskripsi || "";
  $("agen").textContent = "Dipasarkan oleh " + CONFIG.AGEN;
  window.dispatchEvent(new CustomEvent("y2k-property-ready", { detail: { price: Number(P.harga || 0), status: P.status || "" } }));
  const wa = "https://wa.me/" + CONFIG.WA + "?text=" + encodeURIComponent("Halo, saya tertarik dengan properti: " + P.judul);
  $("waBtn").href = wa; $("waBtn2").href = wa;
  if (P.brighton_url) {
    try {
      const x = new URL(P.brighton_url);
      if (x.protocol === "https:" && ["brighton.co.id", "www.brighton.co.id"].includes(x.hostname.toLowerCase())) {
        $("brightonBtn").href = x.href; $("brightonBtn").hidden = false;
      }
    } catch (_) { /* Keep hidden for invalid links. */ }
  }
  parseSpek(P.spesifikasi).forEach(s => {
    const d = document.createElement("div"); d.innerHTML = "<dt></dt><dd></dd>";
    d.children[0].textContent = s.label; d.children[1].textContent = s.nilai; $("specs").appendChild(d);
  });
  (P.fasilitas || "").split(",").map(x => x.trim()).filter(Boolean).forEach(f => {
    const li = document.createElement("li"); li.textContent = f; $("fasilitas").appendChild(li);
  });
  fotos.forEach((f, i) => {
    const b = document.createElement("button"); b.setAttribute("aria-label", f.ket);
    const im = document.createElement("img"); im.alt = f.ket; im.loading = "lazy"; setImg(im, f.file);
    b.appendChild(im); b.onclick = () => show(i); $("thumbs").appendChild(b);
  });
  function show(i) {
    idx = (i + fotos.length) % fotos.length; const f = fotos[idx];
    setImg($("mainImg"), f.file); $("cap").textContent = f.ket; $("count").textContent = (idx + 1) + " / " + fotos.length;
    [...$("thumbs").children].forEach((t, k) => t.classList.toggle("on", k === idx));
    if (!$("lb").hidden) setImg($("lbImg"), f.file);
  }
  $("main").onclick = () => { $("lb").hidden = false; show(idx); };
  $("lbClose").onclick = () => $("lb").hidden = true;
  $("lbPrev").onclick = () => show(idx - 1); $("lbNext").onclick = () => show(idx + 1);
  document.addEventListener("keydown", e => {
    if ($("lb").hidden) return;
    if (e.key === "Escape") $("lb").hidden = true;
    if (e.key === "ArrowLeft") show(idx - 1); if (e.key === "ArrowRight") show(idx + 1);
  });
  show(0);
})();
