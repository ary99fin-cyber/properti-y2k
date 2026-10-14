(() => {
  const box = $("list"), count = $("resultCount"), q = $("search"), status = $("statusFilter"), price = $("priceFilter");
  let properties = [];
  function card(p) {
    const a = document.createElement("a"); a.className = "lux-card"; a.href = "p.html?id=" + encodeURIComponent(p.id);
    a.innerHTML = `<div class="lux-photo"><img alt="Foto properti" loading="lazy"><span class="lux-pill"></span><span class="photo-count"></span></div><div class="lux-card-body"><div class="lux-location"></div><h3></h3><div class="lux-card-bottom"><div class="lux-price"></div><span class="detail-arrow" aria-label="Lihat detail">↗</span></div></div>`;
    setImg(a.querySelector('img'), (Array.isArray(p.foto) ? p.foto : [])[0]);
    a.querySelector('.lux-pill').textContent = p.status || 'Properti';
    a.querySelector('.photo-count').textContent = Array.isArray(p.foto) && p.foto.length > 1 ? '▣ '+p.foto.length+' foto' : '';
    a.querySelector('.lux-location').textContent = '⌖  ' + (p.lokasi || 'Lokasi tersedia');
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
  [q,status,price].forEach(x => x.addEventListener('input',render));
  $("findButton").onclick=()=>{$("properti").scrollIntoView({behavior:'smooth'}) ; render();};
  const wa = String(CONFIG.WA||'').replace(/\D/g,'');
  ['headerWa','bottomWa'].forEach(id => { const a = $(id); a.href = wa ? 'https://wa.me/'+wa+'?text='+encodeURIComponent('Halo, saya ingin konsultasi properti.') : '#kontak'; });
  $("year").textContent = new Date().getFullYear();
  (async () => {
    try {
      const {data,error} = await sb.from('properties').select('id,judul,lokasi,status,harga,foto').order('created_at',{ascending:false});
      if(error) throw error;
      properties=data||[]; render();
    } catch(e) { console.error('Properti gagal dimuat',e); box.textContent='Data gagal dimuat. Periksa koneksi dan konfigurasi Supabase.'; count.textContent='Gagal memuat'; }
  })();
})();