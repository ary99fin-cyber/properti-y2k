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
start().catch(e=>say(e.message));
})();
