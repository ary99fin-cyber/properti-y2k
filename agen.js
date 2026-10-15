(() => {
const el = id => document.getElementById(id);
let agent = null;
const say = (msg) => el('message').textContent = msg;
const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validProfile(v){try{const u=new URL(v);return u.protocol==='https:' && ['www.brighton.co.id','brighton.co.id'].includes(u.hostname) && /^\/[A-Za-z0-9_-]+\/?$/.test(u.pathname) && !u.search && !u.hash}catch{return false}}
async function start(){ const {data:{session}}=await sb.auth.getSession();el('loginPanel').hidden=!!session;el('app').hidden=!session;if(session)await load();}
async function load(){const {data,error}=await sb.from('y2k_agents').select('*').maybeSingle();if(error)return say('Database agen belum siap: '+error.message);agent=data;if(agent){el('name').value=agent.display_name;el('wa').value=agent.whatsapp||'';el('profile').value=agent.brighton_profile_url;el('status').textContent='Status sinkronisasi: '+agent.sync_status+(agent.last_sync_at?' · '+new Date(agent.last_sync_at).toLocaleString('id-ID'):'');}await list();}
async function list(){const root=el('results');root.replaceChildren();if(!agent){el('counter').textContent='(0)';root.textContent='Simpan profil agen terlebih dahulu.';return;}const {data,error}=await sb.from('y2k_listing_index').select('url,title,location_text,land_area_m2').eq('agent_id',agent.id).order('created_at',{ascending:false}).limit(100);if(error){say(error.message);return;}el('counter').textContent=`(${data.length}${data.length===100?'+':''})`;if(!data.length){root.textContent='Belum ada link listing yang ditemukan.';return;}for(const item of data){const row=document.createElement('div');row.className='item';const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.title||item.url;row.append(a);const note=document.createElement('small');note.textContent=' · '+(item.location_text||'metadata belum tersedia');row.append(note);root.append(row);}}
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
  // Satu blok dimulai dari link halaman detail Brighton dan mengambil teks sebelum link itu.
  const pattern = /https:\/\/(?:www\.)?brighton\.co\.id\/cari-properti\/view\/[A-Za-z0-9_-]+\/?(?:\?[^\s]*)?/gi;
  const matches = [...value.matchAll(pattern)];
  const byURL = new Map();
  let start = 0;
  for(const m of matches) {
    const url = normalizeListingURL(m[0]);
    const preceding = value.slice(start, m.index);
    start = m.index + m[0].length;
    if(!url || byURL.has(url)) continue;
    // Hapus footer bagian yang dibagikan pada blok sebelumnya.
    const raw = preceding.replace(/^[\s\S]*?(?:https:\/\/(?:www\.)?brighton\.co\.id\/[a-z0-9_-]+\s*)?(?=\S)/i, x=>x);
    const filtered = raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).filter(x=>
       !/^untuk foto dan keterangan/i.test(x) && !/^hubungi\s*:/i.test(x) &&
       !/^brighton wisdom$/i.test(x) && !/^amir hamzah/i.test(x) &&
       !/^https?:\/\//i.test(x) && !/^aryfin khuang/i.test(x)
    );
    const title = (filtered.find(x=>!/^((jual|sewa)\s|LT\b|LB\b|KT\b|KM\b|dimensi\b|Rp\b|SHM\b|hadap\b)/i.test(x)) || '').slice(0,240);
    const transactionLine = filtered.find(x=>/^(jual|sewa)\s/i.test(x)) || '';
    const type = transactionLine.replace(/^(jual|sewa)\s*/i,'').trim().slice(0,50);
    const location = (filtered[filtered.indexOf(transactionLine)+1] || '').slice(0,250);
    const metrics = filtered.find(x=>/\bLT\s*[\d.,]+/i.test(x)) || '';
    const land = metrics.match(/\bLT\s*([\d.,]+)/i);
    const building = metrics.match(/\bLB\s*([\d.,]+)/i);
    const price = filtered.join(' ').match(/\bRp\s*([\d.]+)/i);
    const obj = {
      url, title: title || 'Listing Brighton', location_text: location,
      property_type: type,
      listing_status: /^sewa/i.test(transactionLine)?'sewa':/^jual/i.test(transactionLine)?'jual':'',
      land_area_m2: land ? parseNumber(land[1]) : null,
      building_area_m2: building ? parseNumber(building[1]) : null,
      price_idr: price ? parseNumber(price[1]) : null
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
   const desc=document.createElement('small');desc.textContent=(item.location_text||'Lokasi belum terisi')+' · LT '+(item.land_area_m2??'-')+' m² · '+(item.price_idr!=null?'Rp '+item.price_idr.toLocaleString('id-ID'):'harga belum terisi');
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
     const batch=bulkItems.slice(i,i+20).map(x=>({agent_id:agent.id,...x}));
     const {error}=await sb.from('y2k_listing_index').upsert(batch,{onConflict:'agent_id,url'});
     if(error) throw Error(error.message);
     saved+=batch.length;
   }
   el('bulkInfo').textContent=`Berhasil memproses ${saved} link unik. Link yang sama untuk agen ini diperbarui, bukan digandakan. Status aktif/co-listing belum diverifikasi otomatis.`;
   await list();
 }catch(err){el('bulkInfo').textContent=`Tersimpan/diproses ${saved}; proses berhenti: ${err.message}`;}
 finally {el('bulkSave').disabled=false;}
};
start().catch(e=>say(e.message));
})();
