(() => {
  const box = $("list"), count = $("resultCount"), q = $("search"), price = $("priceFilter");
  const statusRadios = document.querySelectorAll('input[name="status"]');
  const status = { get value() { const c = document.querySelector('input[name="status"]:checked'); return c ? c.value : ''; } };
  let properties = [];
  const previewMode = new URLSearchParams(location.search).get('preview') === '1';
  let previewStatus = '';
  function card(p) {
    const a = document.createElement("a"); a.className = "lux-card"; a.href = p.y2kSource ? "/detail-listing.html?url=" + encodeURIComponent(p.y2kSource) : "p.html?id=" + encodeURIComponent(p.id);
    a.innerHTML = `<div class="lux-photo"><img alt="Foto properti" loading="lazy"><span class="lux-pill"></span><span class="photo-count"></span></div><div class="lux-card-body"><div class="lux-price"></div><h3></h3><div class="lux-location"></div></div>`;
    setImg(a.querySelector('img'), (Array.isArray(p.foto) ? p.foto : [])[0]);
    a.querySelector('.lux-pill').textContent = p.status || 'Properti';
    a.querySelector('.photo-count').textContent = Array.isArray(p.foto) && p.foto.length > 1 ? p.foto.length+' foto' : '';
    a.querySelector('.lux-location').textContent = (p.lokasi || 'Lokasi tersedia');
    a.querySelector('h3').textContent = p.judul || 'Properti';
    a.querySelector('.lux-price').textContent = p.harga == null ? 'Hubungi agen' : rupiah(p.harga);
    return a;
  }
  function render() {
    const needle = q.value.trim().toLocaleLowerCase('id'); const max = Number(price.value || 0);
    const rows = properties.filter(p => (!needle || `${p.judul||''} ${p.lokasi||''}`.toLocaleLowerCase('id').includes(needle)) && (!status.value || p.status === status.value) && (!max || Number(p.harga) <= max));
    box.replaceChildren();
    count.textContent = `${rows.length} properti ditemukan` + (previewMode ? " · Pratinjau agen" : "");
    if (!rows.length) { const e = document.createElement('div'); e.className='empty-state'; e.textContent=properties.length ? 'Tidak ada properti yang cocok. Coba ubah filter pencarian.' : (previewStatus || 'Belum ada properti. Tambahkan melalui halaman admin.'); box.appendChild(e); return; }
    rows.forEach(p => box.appendChild(card(p)));
  }
  [q,price,...statusRadios].forEach(x => x.addEventListener(x.type === 'search' ? 'input' : 'change',render));
  $("findButton").onclick=()=>{$("properti").scrollIntoView({behavior:'smooth'}) ; render();};
  const wa = String(CONFIG.WA||'').replace(/\D/g,'');
  ['headerWa','bottomWa'].forEach(id => { const a = $(id); a.href = wa ? 'https://wa.me/'+wa+'?text='+encodeURIComponent('Halo, saya ingin konsultasi properti.') : '#kontak'; });
  $("year").textContent = new Date().getFullYear();

  (async () => {
    try {
      if (previewMode) {
        const {data:{user},error:authError}=await sb.auth.getUser();
        if(authError||!user){previewStatus='Login dahulu di Dashboard Agen pada domain Preview ini.';properties=[];render();return;}
        const {data:agent,error:agentError}=await sb.from('y2k_agents').select('id').eq('user_id',user.id).maybeSingle();
        if(agentError||!agent){previewStatus='Profil agen tidak ditemukan. Login melalui Dashboard Agen.';properties=[];render();return;}
        const {data,error}=await sb.from('y2k_listing_details').select('id,agent_id,source_url,title,location_text,listing_status,sale_price_idr,rent_price_idr,image_urls,publish_status').eq('agent_id',agent.id).order('created_at',{ascending:false}).limit(200);
        if(error)throw error;
        properties=(data||[]).filter(d=>Array.isArray(d.image_urls)&&d.image_urls.length>0).map(d=>({
          id:d.id,judul:d.title||'Properti Y2K',lokasi:d.location_text||'Lokasi belum diisi',
          status:d.listing_status==='jual_sewa'?'Dijual & Disewa':d.listing_status==='sewa'?'Disewa':'Dijual',
          harga:d.sale_price_idr??d.rent_price_idr??null,foto:d.image_urls,y2kSource:d.source_url
        }));
        previewStatus='Belum ada listing yang memiliki foto. Impor foto di Dashboard Agen.';
        const heading=document.querySelector('.section-head h2');
        if(heading)heading.textContent='Pratinjau Properti Y2K';
        const note=document.createElement('p');note.className='y2k-preview-banner';
        note.textContent='MODE PRATINJAU AGEN · Listing draft hanya untuk pemeriksaan. Belum dipublikasikan ke website utama.';
        document.getElementById('properti').prepend(note);
      } else {
        const {data,error}=await sb.from('properties').select('id,judul,lokasi,status,harga,foto').order('created_at',{ascending:false});
        if(error)throw error;
        properties=data||[];
      }
      render();
    }catch(e){
      console.error('Properti gagal dimuat',e);box.replaceChildren();
      const msg=document.createElement('div');msg.className='empty-state';
      msg.textContent=previewMode?'Gagal membuka pratinjau: '+(e.message||'Periksa izin Supabase dan sesi agen.'):'Data gagal dimuat. Periksa koneksi dan konfigurasi Supabase.';
      box.append(msg);count.textContent='Gagal memuat';
    }
  })();
})();
