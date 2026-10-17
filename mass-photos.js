(()=>{
'use strict';
const el=id=>document.getElementById(id), tools=window.Y2KPhotoTools;
let rows=[],running=false,stop=false;
const status=t=>{el('massStatus').textContent=t;};
const sleep=t=>new Promise(r=>setTimeout(r,t));
const owns=(url)=>{try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='cdn.brighton.co.id';}catch{return false;}};
const sourceBase=url=>{const u=tools.normalizeListingURL(url);return u?u.replace(/\/$/,''):null;};
const rowStatus=(row,msg)=>{row.message.textContent=msg;};
const currentTarget=()=>Number(el('massLimit').value)||8;
const photoCount=row=>Array.isArray(row.item.image_urls)?row.item.image_urls.length:0;
function chooseBelowTarget(){let n=0;for(const row of rows){row.check.checked=photoCount(row)<currentTarget();if(row.check.checked)n++;}status(n+' listing dipilih karena memiliki kurang dari '+currentTarget()+' foto.');}
function toggleControls(active){
  for(const id of ['massLoad','massAll','massNone','massRun','massLimit'])el(id).disabled=active;
  el('massStop').disabled=!active;
}
function render(items){
 const root=el('massList');root.replaceChildren();rows=[];
 for(const item of items){
   const label=document.createElement('label');label.className='mass-row';
   const check=document.createElement('input');check.type='checkbox';check.className='mass-check';check.checked=(Array.isArray(item.image_urls)?item.image_urls.length:0)<currentTarget();
   const body=document.createElement('span'),heading=document.createElement('strong'),meta=document.createElement('small'),note=document.createElement('small');
   heading.textContent=item.title||'Listing tanpa judul';meta.textContent=(item.image_urls?.length||0)+' foto tersimpan · '+(item.location_text||'Lokasi belum diisi');
   note.textContent='Belum diproses';note.className='mass-result';body.append(heading,meta,note);label.append(check,body);root.append(label);
   rows.push({item,check,message:note});
 }
 status('Ditemukan '+rows.length+' listing. Dipilih otomatis yang memiliki kurang dari '+currentTarget()+' foto.');
 for(const id of ['massAll','massNone','massRun'])el(id).disabled=!rows.length;
}
el('massLoad').onclick=async()=>{
 const agent=tools?.getAgent?.();if(!agent){status('Login dan simpan profil agen dulu.');return;}
 el('massLoad').disabled=true;status('Memuat listing dari Supabase...');
 try{
   const {data,error}=await sb.from('y2k_listing_details').select('id,agent_id,source_url,title,location_text,image_urls').eq('agent_id',agent.id).order('created_at',{ascending:false}).limit(500);
   if(error)throw Error(error.message);
   render(data||[]);
 }catch(e){status('Gagal memuat daftar: '+e.message);}
 finally{el('massLoad').disabled=false;}
};
el('massAll').onclick=chooseBelowTarget;
el('massLimit').onchange=()=>{if(!running&&rows.length)chooseBelowTarget();};
el('massNone').onclick=()=>{rows.forEach(r=>r.check.checked=false);status('Semua pilihan dibatalkan.');};
el('massStop').onclick=()=>{stop=true;status('Menghentikan proses setelah foto yang sedang berjalan selesai...');};
async function saveOne(original,row,session,user,existing){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(original));
 const hash=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,24);
 const path=user.id+'/'+row.item.id+'/'+hash+'.jpg';
 const publicUrl=sb.storage.from('y2k-listing-photos').getPublicUrl(path).data.publicUrl;
 if(existing.includes(publicUrl))return {saved:false,duplicate:true};
 const download=await fetch('/api/y2k-photo-download',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({url:original})});
 if(!download.ok){const result=await download.json().catch(()=>({}));throw Error(result.error||'Download foto gagal (HTTP '+download.status+')');}
 const image=await tools.imageToY2K(await download.blob());
 if(image.size>5*1024*1024)throw Error('Ukuran foto lebih dari 5 MB');
 const upload=await sb.storage.from('y2k-listing-photos').upload(path,image,{contentType:'image/jpeg',upsert:true});
 if(upload.error)throw Error(upload.error.message);
 const next=[...existing,publicUrl];
 // Gunakan optimistic lock untuk mengurangi risiko kehilangan URL yang ditambahkan tab lain.
 const {data:current,error:readError}=await sb.from('y2k_listing_details').select('image_urls').eq('id',row.item.id).eq('agent_id',row.item.agent_id).single();
 if(readError)throw Error(readError.message);
 const merged=[...new Set([...(Array.isArray(current.image_urls)?current.image_urls:[]),...next])];
 const {error:writeError}=await sb.from('y2k_listing_details').update({image_urls:merged}).eq('id',row.item.id).eq('agent_id',row.item.agent_id);
 if(writeError)throw Error(writeError.message);
 existing.splice(0,existing.length,...merged);row.item.image_urls=merged;
 return {saved:true,duplicate:false};
}
async function processListing(row,session,user,limit){
 const base=sourceBase(row.item.source_url);
 if(!base)throw Error('URL Brighton tidak valid');
 const response=await fetch('/api/brighton-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:base+'/'})});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(result.error||'Gagal membaca galeri Brighton');
 const candidates=[...new Set((Array.isArray(result.foto)?result.foto:[]).filter(owns))].slice(0,limit);
 if(!candidates.length)throw Error('Foto galeri tidak ditemukan');
 const existing=Array.isArray(row.item.image_urls)?row.item.image_urls.slice():[];
 let saved=0,duplicates=0,failed=0,firstError='';
 for(const url of candidates){
   if(stop||existing.length>=limit)break;
   try{
     const result=await saveOne(url,row,session,user,existing);
     if(result.saved)saved++;if(result.duplicate)duplicates++;
   }catch(e){failed++;if(!firstError)firstError=e.message;}
 }
 if(!saved&&!duplicates&&failed)throw Error(firstError||'Semua foto gagal diproses');
 return {saved,duplicates,failed,firstError};
}
el('massRun').onclick=async()=>{
 const agent=tools?.getAgent?.();
 if(!agent||running){status('Login agen dahulu atau tunggu batch berjalan selesai.');return;}
 const queue=rows.filter(r=>r.check.checked).slice(0,10);
 if(!queue.length){status('Centang listing yang akan diimpor.');return;}
 const {data:{session}}=await sb.auth.getSession();
 if(!session){status('Sesi habis, login kembali.');return;}
 const {data:{user}}=await sb.auth.getUser();
 if(!user){status('Login kembali sebelum mengimpor.');return;}
 if(!window.createImageBitmap||!window.crypto?.subtle){status('Browser belum mendukung konversi gambar aman. Coba Chrome terbaru.');return;}
 running=true;stop=false;toggleControls(true);
 const limit=currentTarget();let processed=0,saved=0,failed=0;
 try{
   for(const row of queue){
     if(stop)break;
     rowStatus(row,'Memeriksa foto Brighton...');
     try{
       const outcome=await processListing(row,session,user,limit);
       saved+=outcome.saved;
       rowStatus(row,photoCount(row)+' foto total · '+outcome.saved+' baru · '+outcome.duplicates+' duplikat'+(outcome.failed?' · '+outcome.failed+' gagal ('+outcome.firstError+')':''));
       if(outcome.failed)failed++;
       if(!outcome.failed&&!stop)row.check.checked=photoCount(row)<limit;
     }catch(e){failed++;rowStatus(row,'Gagal: '+e.message);}
     processed++;
     status('Batch: '+processed+'/'+queue.length+' listing diperiksa · '+saved+' foto baru · '+failed+' listing bermasalah'+(stop?' · proses dihentikan':''));
     if(!stop)await sleep(600);
   }
   status('Batch selesai: '+processed+' listing, '+saved+' foto baru, '+failed+' listing bermasalah. '+(stop?'Dihentikan atas permintaan. ':'')+'Sisa listing terpilih dapat diproses dengan tombol yang sama. Periksa galeri sebelum publikasi.');
 }catch(e){status('Proses berhenti: '+e.message);}
 finally{running=false;toggleControls(false);}
};
})();