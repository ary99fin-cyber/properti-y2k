(() => {
  const box = $("list"), count = $("resultCount"), q = $("search"), price = $("priceFilter");
  const statusRadios = document.querySelectorAll('input[name="status"]');
  const status = { get value() { const c = document.querySelector('input[name="status"]:checked'); return c ? c.value : ''; } };
  let properties = [];
  function card(p) {
    const a = document.createElement("a"); a.className = "lux-card"; a.href = p.brightonUrl || ("p.html?id=" + encodeURIComponent(p.id));
    if (p.brightonUrl) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
    a.innerHTML = `<div class="lux-photo"><img alt="Foto properti" loading="lazy"><span class="lux-pill"></span><span class="photo-count"></span></div><div class="lux-card-body"><div class="lux-price"></div><h3></h3><div class="lux-location"></div></div>`;
    setImg(a.querySelector('img'), (Array.isArray(p.foto) ? p.foto : [])[0]);
    a.querySelector('.lux-pill').textContent = p.status || 'Properti';
    a.querySelector('.photo-count').textContent = Array.isArray(p.foto) && p.foto.length > 1 ? p.foto.length+' foto' : '';
    a.querySelector('.lux-location').textContent = (p.lokasi || 'Lokasi tersedia');
    a.querySelector('h3').textContent = p.judul || 'Properti';
    a.querySelector('.lux-price').textContent = rupiah(p.harga);
    return a;
  }
  function render() {
    const needle = q.value.trim().toLocaleLowerCase('id'); const max = Number(price.value || 0);
    const rows = properties.filter(p => (!needle || `${p.judul||''} ${p.lokasi||''}`.toLocaleLowerCase('id').includes(needle)) && (!status.value || p.status === status.value) && (!max || Number(p.harga) <= max));
    box.replaceChildren();
    count.textContent = `${rows.length} properti ditemukan`;
    if (!rows.length) { const e = document.createElement('div'); e.className='empty-state'; e.textContent=properties.length ? 'Tidak ada properti yang cocok. Coba ubah filter pencarian.' : 'Belum ada properti. Tambahkan melalui halaman admin.'; box.appendChild(e); return; }
    rows.forEach(p => box.appendChild(card(p)));
  }
  [q,price,...statusRadios].forEach(x => x.addEventListener(x.type === 'search' ? 'input' : 'change',render));
  $("findButton").onclick=()=>{$("properti").scrollIntoView({behavior:'smooth'}) ; render();};
  const wa = String(CONFIG.WA||'').replace(/\D/g,'');
  ['headerWa','bottomWa'].forEach(id => { const a = $(id); a.href = wa ? 'https://wa.me/'+wa+'?text='+encodeURIComponent('Halo, saya ingin konsultasi properti.') : '#kontak'; });
  $("year").textContent = new Date().getFullYear();
  (async () => {
    try {
      const {data,error} = await sb.from('properties').select('id,judul,lokasi,status,harga,foto').order('created_at',{ascending:false});
      if(error) throw error;
      properties = data || [];
      render(); // Keep the original listings even if Brighton loading fails.

      // Only approved, published Brighton listings may appear on the homepage.
      // Index stores prices, while details stores the image gallery.
      try {
        const [detailsResult, indexResult] = await Promise.all([
          sb.from('y2k_listing_details')
            .select('source_url,title,location_text,listing_status,publish_status,image_urls,created_at')
            .eq('publish_status','published')
            .order('created_at',{ascending:false}),
          sb.from('y2k_listing_index')
            .select('url,title,location_text,listing_status,price_idr')
        ]);
        if (detailsResult.error) throw detailsResult.error;
        if (indexResult.error) throw indexResult.error;

        const urlKey = value => String(value || '').trim().replace(new RegExp('/+$'), '');
        const safeBrightonUrl = value => {
          try {
            const u = new URL(value);
            return u.protocol === 'https:' && ['brighton.co.id','www.brighton.co.id'].includes(u.hostname.toLowerCase())
              ? u.href : null;
          } catch (_) { return null; }
        };
        const indexByUrl = new Map();
        for (const item of indexResult.data || []) {
          const key = urlKey(item.url);
          if (key && (!indexByUrl.has(key) || Number(item.price_idr) > Number(indexByUrl.get(key).price_idr))) {
            indexByUrl.set(key, item);
          }
        }
        const unique = new Set();
        const publishedBrighton = [];
        for (const detail of detailsResult.data || []) {
          const key = urlKey(detail.source_url);
          const url = safeBrightonUrl(detail.source_url);
          if (!key || !url || unique.has(key)) continue;
          const index = indexByUrl.get(key);
          const images = Array.isArray(detail.image_urls)
            ? detail.image_urls.filter(src => typeof src === 'string' && src.startsWith('https://'))
            : [];
          const harga = Number(index?.price_idr || 0);
          if (!index || harga <= 0 || !images.length) continue;
          unique.add(key);
          const jenis = String(detail.listing_status || index.listing_status || '').toLowerCase();
          publishedBrighton.push({
            id: key, judul: detail.title || index.title,
            lokasi: detail.location_text || index.location_text,
            status: jenis === 'jual' ? 'Dijual' : jenis === 'sewa' ? 'Disewa' : 'Properti',
            harga, foto: images, brightonUrl: url
          });
        }
        properties = [...properties, ...publishedBrighton];
        render();
      } catch (brightonError) {
        console.warn('Brighton belum dapat dimuat; listing awal tetap tampil.', brightonError);
      }
    } catch(e) { console.error('Properti gagal dimuat',e); box.textContent='Data gagal dimuat. Periksa koneksi dan konfigurasi Supabase.'; count.textContent='Gagal memuat'; }
  })();
})();
