(() => {
const el = id => document.getElementById(id);
let agent = null;
const say = (msg) => el('message').textContent = msg;
const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validProfile(v){try{const u=new URL(v);return u.protocol==='https:' && ['www.brighton.co.id','brighton.co.id'].includes(u.hostname) && /^\/[A-Za-z0-9_-]+\/?$/.test(u.pathname) && !u.search && !u.hash}catch{return false}}
async function start(){ const {data:{session}}=await sb.auth.getSession();el('loginPanel').hidden=!!session;el('app').hidden=!session;if(session)await load();}
async function load(){const {data,error}=await sb.from('y2k_agents').select('*').maybeSingle();if(error)return say('Database agen belum siap: '+error.message);agent=data;if(agent){el('name').value=agent.display_name;el('wa').value=agent.whatsapp||'';el('profile').value=agent.brighton_profile_url;el('status').textContent='Status sinkronisasi: '+agent.sync_status+(agent.last_sync_at?' · '+new Date(agent.last_sync_at).toLocaleString('id-ID'):'');}await list();}
async function list(){const root=el('results');root.replaceChildren();if(!agent){el('counter').textContent='(0)';root.textContent='Simpan profil agen terlebih dahulu.';return;}const {data,error}=await sb.from('y2k_listing_index').select('url,title,location_text,land_area_m2').eq('agent_id',agent.id).order('created_at',{ascending:false}).limit(100);if(error){say(error.message);return;}el('counter').textContent=`(${data.length}${data.length===100?'+':''})`;if(!data.length){root.textContent='Belum ada link listing yang ditemukan.';return;}for(const item of data){const row=document.createElement('div');row.className='item';const a=document.createElement('a');a.href='/detail-listing.html?url='+encodeURIComponent(item.url);a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.title||item.url;row.append(a);const note=document.createElement('small');note.textContent=' · '+(item.location_text||'metadata belum tersedia');row.append(note);root.append(row);}}
el('login').addEventListener('submit',async e=>{e.preventDefault();say('Memeriksa akun...');const {error}=await sb.auth.signInWithPassword({email:el('email').value,password:el('password').value});if(error)return say(error.message);say('');await start();});
el('logout').onclick=async()=>{await sb.auth.signOut();agent=null;await start();};
el('profileForm').addEventListener('submit',async e=>{e.preventDefault();const url=el('profile').value.trim();if(!validProfile(url))return say('URL harus berupa halaman profil Brighton, contoh https://www.brighton.co.id/aryfin');const {data:{user}}=await sb.auth.getUser();if(!user)return say('Silakan login lagi.');const item={user_id:user.id,display_name:el('name').value.trim(),whatsapp:el('wa').value.trim()||null,brighton_profile_url:url};const {error}=await sb.from('y2k_agents').upsert(item,{onConflict:'user_id'});if(error)return say('Gagal simpan: '+error.message);say('Profil tersimpan.');await load();});
el('sync').onclick=async()=>{if(!agent)return say('Simpan profil terlebih dahulu.');say('Mencoba menemukan listing di profil Brighton...');el('sync').disabled=true;try{const url='/api/brighton-profile-index?url='+encodeURIComponent(agent.brighton_profile_url);const res=await fetch(url);const output=await res.json();if(!res.ok)throw Error(output.error||'Server gagal');let saved=0;for(const item of output.listings){const {error}=await sb.from('y2k_listing_index').upsert({agent_id:agent.id,url:item.url,title:item.title||'',location_text:item.location||''},{onConflict:'agent_id,url'});if(error)throw Error(error.message);saved++;}const status=saved?'sebagian_terindeks':'perlu_pemeriksaan';await sb.from('y2k_agents').update({sync_status:status,last_sync_at:new Date().toISOString()}).eq('id',agent.id);say(`Ditemukan ${output.listings.length} URL dan tersimpan ${saved}. ${output.note||''}`);await load();}catch(err){say('Sinkronisasi gagal: '+err.message);}finally{el('sync').disabled=false;}};
// Impor teks Bagikan Brighton: tidak memerlukan API eksternal.
let bulkItems = [];
function normalizeListingURL(value) {
  try {
    const u = new URL(value.replace(/[),.;]+$/, ''));
    if(u.protocol !== 'https:' || !['brighton.co.id','www.brighton.co.id'].includes(u.hostname)) return null;
    if(!/^\/cari-properti\/view\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)) return null;
    return 'https://www.brighton.co.id'+u.pathname.replace(/\/$/, '')+'/';
  } catch {return null;}
}
function parseNumber(text) {
  if(!text) return null;
  const n = Number(text.replace(/\./g,'').replace(/,/g,'.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function readShareBlocks(value) {
  const pattern = /https:\/\/(?:www\.)?brighton\.co\.id\/cari-properti\/view\/[A-Za-z0-9_-]+\/?(?:\?[^\s]*)?/gi;
  const matches = [...value.matchAll(pattern)];
  const byURL = new Map();
  let cursor = 0;
  for (const m of matches) {
    const url = normalizeListingURL(m[0]);
    const raw = value.slice(cursor, m.index);
    cursor = m.index + m[0].length;
    if (!url || byURL.has(url)) continue;
    const lines = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    const start = lines.findLastIndex((x,i) => i+1 < lines.length && /^(?:JualSewa|Jual|Sewa)\s+/i.test(lines[i+1]));
    const body = start < 0 ? lines : lines.slice(start);
    const title = (body[0] || 'Listing Brighton').slice(0,240);
    const transactionLine = body.find(x => /^(?:JualSewa|Jual|Sewa)\s+/i.test(x)) || '';
    const propertyType = transactionLine.replace(/^(?:JualSewa|Jual|Sewa)\s+/i,'').trim();
    const location = body[body.indexOf(transactionLine)+1] || '';
    const metrics = body.find(x => /\bLT\s*[\d.,]+/i.test(x)) || '';
    const room = body.find(x => /\bKT\s*\d+/i.test(x)) || '';
    const prices = body.filter(x => /^Rp\s*[\d.]+/i.test(x)).map(x => parseNumber((x.match(/^Rp\s*([\d.]+)/i)||[])[1]));
    const land = metrics.match(/\bLT\s*([\d.,]+)/i);
    const building = metrics.match(/\bLB\s*([\d.,]+)/i);
    const beds = room.match(/\bKT\s*(\d+)/i);
    const baths = room.match(/\bKM\s*(\d+)/i);
    const cert = body.find(x => /^(?:SHM|HGB|SHGB|AJB|Girik|PPJB)(?:\s|$)/i.test(x)) || null;
    const facing = (body.find(x => /^Hadap\s+/i.test(x))||'').replace(/^Hadap\s+/i,'') || null;
    const dimensions = (body.find(x => /^Dimensi\s+/i.test(x))||'').replace(/^Dimensi\s+/i,'');
    const both = /^JualSewa/i.test(transactionLine), rentOnly = /^Sewa/i.test(transactionLine);
    const footer=value.slice(m.index+m[0].length, matches[matches.indexOf(m)+1]?.index ?? value.length);
    const contact=(footer.match(/Hubungi\s*:\s*\n?\s*([^\n]+?)\s+-\s+(0\d{8,13})/i)||[]);
    const agentProfile=(footer.match(/https:\/\/(?:www\.)?brighton\.co\.id\/[A-Za-z0-9_-]+\/?/i)||[])[0]||null;
    const office=(footer.match(/Brighton\s+[^\n]+/i)||[])[0]||null;
    const obj = {
      url, title, location_text: location.slice(0,250),
      property_type: propertyType.slice(0,80),
      listing_status: both?'jual_sewa':rentOnly?'sewa':'jual',
      land_area_m2:land?parseNumber(land[1]):null,
      building_area_m2:building?parseNumber(building[1]):null,
      bedrooms:beds?Number(beds[1]):null,
      bathrooms:baths?Number(baths[1]):null,
      dimensions: dimensions && dimensions.toLowerCase()!=='null'?dimensions:null,
      certificate:cert, facing,
      sale_price_idr: rentOnly?null:prices[0]??null,
      rent_price_idr: both?prices[1]??null:rentOnly?prices[0]??null:null,
      share_text: raw+'\n'+m[0]+'\n'+footer,
      agent_name:contact[1]||null,agent_phone:contact[2]||null,
      agent_office:office,agent_profile_url:agentProfile
    };
    byURL.set(url,obj);
  }
  return [...byURL.values()];
}
function showBulk(items){
 const root=el('bulkResults');root.replaceChildren();
 for(const item of items){
   const div=document.createElement('div');div.className='bulk-item';
   const name=document.createElement('strong');name.textContent=item.title;
   const desc=document.createElement('small');desc.textContent=(item.location_text||'Lokasi belum terisi')+' · LT '+(item.land_area_m2??'-')+' m² · '+(item.sale_price_idr!=null?'Jual Rp '+item.sale_price_idr.toLocaleString('id-ID'):item.rent_price_idr!=null?'Sewa Rp '+item.rent_price_idr.toLocaleString('id-ID'):'harga belum terisi');
   const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Lihat sumber Brighton';
   div.append(name,desc,a);root.append(div);
 }
}
el('bulkPreview').onclick=()=>{
 bulkItems=readShareBlocks(el('bulkText').value);
 showBulk(bulkItems);
 el('bulkInfo').textContent=bulkItems.length?`${bulkItems.length} listing unik terdeteksi. Periksa judul, harga dan luas sebelum menyimpan.`:'Belum menemukan link detail Brighton yang valid. Gunakan teks dari tombol Bagikan beberapa listing.';
 el('bulkSave').disabled=!bulkItems.length || !agent;
};
el('bulkSave').onclick=async()=>{
 if(!agent) return say('Simpan profil agen dahulu.');
 if(!bulkItems.length) return;
 el('bulkSave').disabled=true;
 let saved=0;
 try{
   // Batasi per batch agar tidak membebani API/database.
   for(let i=0;i<bulkItems.length;i+=20){
     const batch=bulkItems.slice(i,i+20).map(x=>({agent_id:agent.id,url:x.url,title:x.title,location_text:x.location_text,property_type:x.property_type,listing_status:x.listing_status,land_area_m2:x.land_area_m2,building_area_m2:x.building_area_m2,price_idr:x.sale_price_idr??x.rent_price_idr}));
     const {error}=await sb.from('y2k_listing_index').upsert(batch,{onConflict:'agent_id,url'});
     if(error) throw Error(error.message);
     saved+=batch.length;
   }
   // Perbarui draft detail hanya dengan metadata yang ada, tanpa mengubah status publikasi.
   // Data lama tidak dihapus; sumber Brighton tetap dicatat.
   let detailSaved=0;
   for(let i=0;i<bulkItems.length;i+=20){
     const rows=bulkItems.slice(i,i+20).map(x=>({
       agent_id:agent.id,source_url:x.url,title:x.title,location_text:x.location_text,
       property_type:x.property_type||null,listing_status:x.listing_status||null,
       land_area_m2:x.land_area_m2,building_area_m2:x.building_area_m2,
       sale_price_idr:x.sale_price_idr,rent_price_idr:x.rent_price_idr,
       bedrooms:x.bedrooms,bathrooms:x.bathrooms,dimensions:x.dimensions,
       certificate:x.certificate,facing:x.facing,share_text:x.share_text,
       agent_name:x.agent_name,agent_phone:x.agent_phone,
       agent_office:x.agent_office,agent_profile_url:x.agent_profile_url
     }));
     const {error}=await sb.from('y2k_listing_details').upsert(rows,{onConflict:'agent_id,source_url'});
     if(error)throw Error('Indeks tersimpan, tetapi detail gagal: '+error.message);
     detailSaved+=rows.length;
   }
   el('bulkInfo').textContent=`Detail tersimpan ${detailSaved}. Link yang sama diperbarui, bukan digandakan. Status listing belum diverifikasi.`;
   await list();
 }catch(err){el('bulkInfo').textContent=`Tersimpan/diproses ${saved}; proses berhenti: ${err.message}`;}
 finally {el('bulkSave').disabled=false;}
};

let photoCandidates=[];
el('photoCheck').onclick=async()=>{
  const input=el('photoSource'),status=el('photoMessage'),root=el('photoResults');
  root.replaceChildren();photoCandidates=[];el('photoSave').disabled=true;
  const url=normalizeListingURL(input.value.trim());
  if(!url){status.textContent='Gunakan link detail Brighton yang valid.';return;}
  if(!agent){status.textContent='Login dan simpan profil agen dahulu.';return;}
  el('photoCheck').disabled=true;status.textContent='Memeriksa galeri foto Brighton...';
  try{
    const res=await fetch('/api/brighton-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
    const info=await res.json();
    if(!res.ok)throw Error(info.error||'Tidak dapat memeriksa galeri.');
    const photos=Array.isArray(info.foto)?info.foto.filter(u=>{try{const p=new URL(u);return p.protocol==='https:'&&p.hostname==='cdn.brighton.co.id';}catch{return false;}}):[];
    photoCandidates=photos;
    el('photoSave').disabled=!photos.length;
    status.textContent=photos.length?photos.length+' foto kandidat ditemukan. Periksa kesesuaiannya dengan listing asli. Foto belum disimpan.':'Belum ada foto galeri yang dapat dikenali secara otomatis. Kamu tetap bisa menambahkan foto sendiri.';
    for(const [i,u] of photos.entries()){
      const figure=document.createElement('figure');figure.className='photo-preview';
      const img=document.createElement('img');img.src=u;img.alt='Kandidat foto properti '+(i+1);img.loading='lazy';img.referrerPolicy='no-referrer';
      const mark=document.createElement('span');mark.textContent='Y2K PROPERTY';mark.className='photo-brand-preview';
      const note=document.createElement('figcaption');const choice=document.createElement('label');choice.className='photo-choice';const ck=document.createElement('input');ck.type='checkbox';ck.className='photo-select';ck.value=String(i);choice.append(ck,document.createTextNode(' Pilih foto #'+(i+1)));note.append(choice);figure.append(img,mark,note);root.append(figure);
    }
  }catch(e){status.textContent='Pemeriksaan gagal: '+e.message;}
  finally{el('photoCheck').disabled=false;}
};


async function imageToY2K(blob){
  const bitmap=await createImageBitmap(blob);
  try{
    const ratio=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
    const w=Math.max(1,Math.round(bitmap.width*ratio)),h=Math.max(1,Math.round(bitmap.height*ratio));
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;
    const ctx=cv.getContext('2d');
    ctx.drawImage(bitmap,0,0,w,h);
    const scale=Math.min(w/800,h/600);
    const fs=Math.max(12,Math.min(26,Math.round(20*scale)));
    ctx.font='700 '+fs+'px system-ui,Arial,sans-serif';
    const label='Y2K PROPERTY',tw=ctx.measureText(label).width;
    const px=Math.max(10,Math.round(fs*.75)),py=Math.max(6,Math.round(fs*.5));
    const bw=tw+2*px,bh=fs+2*py;
    const x=Math.max(10,Math.round(w*.022)),y=Math.max(10,Math.round(h*.022));
    ctx.fillStyle='rgba(12,12,14,.58)';
    ctx.beginPath();ctx.roundRect(x,y,bw,bh,bh/2);ctx.fill();
    ctx.strokeStyle='rgba(233,212,167,.48)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#e9d4a7';ctx.textBaseline='middle';ctx.fillText(label,x+px,y+bh/2);
    return await new Promise((resolve,reject)=>cv.toBlob(b=>b?resolve(b):reject(Error('Konversi foto gagal.')),'image/jpeg',.83));
  }finally{bitmap.close();}
}
el('photoSave').onclick=async()=>{
  const checks=[...document.querySelectorAll('#photoResults .photo-select:checked')];
  const status=el('photoMessage');
  if(!checks.length){status.textContent='Pilih minimal satu foto dahulu.';return;}
  const url=normalizeListingURL(el('photoSource').value.trim());
  const {data:{session}}=await sb.auth.getSession();
  if(!session||!agent){status.textContent='Sesi agen habis, silakan login kembali.';return;}
  const base=url.replace(/\/$/,'');
  const {data:detail,error:detailError}=await sb.from('y2k_listing_details').select('id,image_urls,source_url').eq('agent_id',agent.id).like('source_url',base+'%').limit(1).maybeSingle();
  if(detailError||!detail){status.textContent='Listing belum ada di tabel detail milik akun ini. Impor dulu teks Share Brighton untuk listing tersebut.';return;}
  if(!window.createImageBitmap){status.textContent='Browser ini belum mendukung pemrosesan gambar. Gunakan Chrome versi terbaru.';return;}
  el('photoSave').disabled=true;el('photoCheck').disabled=true;
  let saved=0;const failures=[];
  try{
    const {data:{user}}=await sb.auth.getUser();
    if(!user)throw Error('Login ulang diperlukan.');
    const existing=Array.isArray(detail.image_urls)?detail.image_urls.slice():[];
    for(const ck of checks){
      const original=photoCandidates[Number(ck.value)];
      if(!original)continue;
      status.textContent='Memproses foto '+(saved+1)+' dari '+checks.length+'...';
      try{
        const keyBytes=new TextEncoder().encode(original);
        const digest=await crypto.subtle.digest('SHA-256',keyBytes);
        const hex=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,24);
        const path=user.id+'/'+detail.id+'/'+hex+'.jpg';
        const publicUrl=sb.storage.from('y2k-listing-photos').getPublicUrl(path).data.publicUrl;
        if(existing.includes(publicUrl)){saved++;continue;}
        const res=await fetch('/api/y2k-photo-download',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({url:original})});
        if(!res.ok){const err=await res.json().catch(()=>({}));throw Error(err.error||'Gagal mengunduh foto.');}
        const result=await imageToY2K(await res.blob());
        if(result.size>5*1024*1024)throw Error('Foto setelah diproses terlalu besar.');
        const upload=await sb.storage.from('y2k-listing-photos').upload(path,result,{contentType:'image/jpeg',upsert:true});
        if(upload.error)throw Error(upload.error.message);
        const updated=[...existing,publicUrl];
        const {error}=await sb.from('y2k_listing_details').update({image_urls:updated}).eq('id',detail.id).eq('agent_id',agent.id);
        if(error)throw Error(error.message);
        existing.push(publicUrl);saved++;
      }catch(err){failures.push('#'+(Number(ck.value)+1)+': '+err.message);}
    }
    status.textContent=saved+' foto diproses/tersimpan ke Y2K. '+(failures.length?'Gagal: '+failures.slice(0,3).join('; '):'Buka halaman detail Y2K untuk melihat galeri.');
  }catch(err){status.textContent='Gagal menyimpan: '+err.message;}
  finally{el('photoSave').disabled=false;el('photoCheck').disabled=false;}
};

start().catch(e=>say(e.message));
})();
