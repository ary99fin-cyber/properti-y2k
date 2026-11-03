'use client';
import { useEffect, useRef, useState } from 'react';
import { rp, specs, tc } from '@/lib/supabase';
import { tipeOf } from '@/lib/data';
import VideoMaker from '@/components/VideoMaker';

// Ukuran & "safe zone" tiap platform (px). pad = jarak aman bawah/atas agar tidak tertutup tombol/UI aplikasi.
const FORMATS=[
  {k:'ig',label:'Instagram Feed',sub:'1080×1350 (4:5)',w:1080,h:1350,s:1,top:60,bot:70},
  {k:'story',label:'IG Story / Status WA',sub:'1080×1920 (9:16)',w:1080,h:1920,s:1,top:250,bot:290},
  {k:'tt',label:'TikTok',sub:'1080×1920 (9:16)',w:1080,h:1920,s:1,top:200,bot:430},
  {k:'fb',label:'Facebook',sub:'1200×630 (1.91:1)',w:1200,h:630,s:.55,top:30,bot:36},
];
async function loadImg(url){
  for(const u of [url,'/api/img?u='+encodeURIComponent(url)]){
    try{const r=await fetch(u); if(r.ok) return await createImageBitmap(await r.blob())}catch{}
  } throw new Error('Foto tidak bisa dimuat. Coba pilih foto lain.');
}
function wrap(c,text,maxW,maxLines){const words=String(text).split(/\s+/),lines=[];let cur='';
  for(const w of words){const t=cur?cur+' '+w:w;if(c.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}
  if(cur)lines.push(cur);
  if(lines.length>maxLines){lines.length=maxLines;let l=lines[maxLines-1];while(c.measureText(l+'…').width>maxW&&l.length)l=l.slice(0,-1);lines[maxLines-1]=l+'…'}
  return lines}
function rrect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}

async function render(canvas,f,p,img,agentImg,cfg){
  const {w,h,s,top,bot}=f, gold=cfg.accent||'#C9A24B', px=n=>Math.round(n*s);
  const serifVar=getComputedStyle(document.documentElement).getPropertyValue('--f-serif').trim();
  const serif=(serifVar?serifVar+',':'')+'Georgia,serif', sans='system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
  try{await document.fonts.load(`600 40px ${serif}`)}catch{}
  canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');
  const k=Math.max(w/img.width,h/img.height),dw=img.width*k,dh=img.height*k;c.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
  const g=c.createLinearGradient(0,h*(f.k==='fb'?.2:.38),0,h);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.7,'rgba(0,0,0,.8)');g.addColorStop(1,'rgba(0,0,0,.94)');c.fillStyle=g;c.fillRect(0,0,w,h);
  const t=c.createLinearGradient(0,0,0,h*.18);t.addColorStop(0,'rgba(0,0,0,.55)');t.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=t;c.fillRect(0,0,w,h*.18);
  const L=px(64),maxW=w-L*2;c.textBaseline='alphabetic';
  // badge status (kiri atas) + brand (kanan atas)
  const st=String(p.status||'').toUpperCase();c.font=`700 ${px(30)}px ${sans}`;const bw=c.measureText(st).width+px(48),bh=px(56);
  c.fillStyle=gold;rrect(c,L,top,bw,bh,bh/2);c.fill();c.fillStyle='#000';c.textAlign='left';c.fillText(st,L+px(24),top+bh/2+px(11));
  c.font=`600 ${px(30)}px ${sans}`;c.fillStyle='#fff';c.textAlign='right';c.fillText('Y2K PROPERTY',w-L,top+bh/2+px(11));c.textAlign='left';
  // blok bawah (digambar dari bawah ke atas)
  let y=h-bot;const av=px(84);
  if(agentImg){c.save();c.beginPath();c.arc(L+av/2,y-av/2,av/2,0,Math.PI*2);c.clip();const ak=Math.max(av/agentImg.width,av/agentImg.height);c.drawImage(agentImg,L+av/2-agentImg.width*ak/2,y-av,agentImg.width*ak,agentImg.height*ak);c.restore();c.strokeStyle=gold;c.lineWidth=px(3);c.beginPath();c.arc(L+av/2,y-av/2,av/2,0,Math.PI*2);c.stroke()}
  const tx=L+(agentImg?av+px(22):0);c.fillStyle='#fff';c.font=`700 ${px(34)}px ${sans}`;c.fillText(cfg.agen||'',tx,y-av/2-px(2));
  c.fillStyle='rgba(255,255,255,.8)';c.font=`400 ${px(26)}px ${sans}`;c.fillText(`Agen Brighton · WA 0${String(cfg.wa||'').replace(/^62/,'')}`,tx,y-av/2+px(34));
  y-=av+px(34);c.fillStyle=gold;c.fillRect(L,y,px(90),px(4));y-=px(30);
  const sp=specs(p.spesifikasi).filter(([k])=>/kamar|luas|lt|lb|km|kt/i.test(k)).slice(0,3).map(([k,v])=>`${k} ${v}`).join('  ·  ');
  if(sp){c.fillStyle='rgba(255,255,255,.85)';c.font=`500 ${px(28)}px ${sans}`;c.fillText(sp,L,y);y-=px(46)}
  c.fillStyle='rgba(255,255,255,.85)';c.font=`400 ${px(30)}px ${sans}`;const loc=wrap(c,'📍 '+tc(p.lokasi),maxW,1)[0];c.fillText(loc,L,y);y-=px(54);
  c.fillStyle='#fff';c.font=`600 ${px(46)}px ${serif}`;const tl=wrap(c,tc(p.judul),maxW,2);for(let i=tl.length-1;i>=0;i--){c.fillText(tl[i],L,y);y-=px(56)}
  y-=px(8);c.fillStyle=gold;c.font=`700 ${px(86)}px ${serif}`;c.fillText(rp(p.harga),L,y);
}
const slug=s=>String(s||'properti').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
function tags(p){const t=tipeOf(p).toLowerCase(),j=p.status==='Disewa'?'sewa':'jual',loc=String(p.lokasi||'').split(/[,\-\/]/).map(x=>x.replace(/[^A-Za-z0-9]/g,'')).filter(Boolean).slice(0,2).map(x=>'#'+x.toLowerCase());
  return {ig:['#properti',t&&`#${j}${t}`,t&&`#${t}${p.status==='Disewa'?'disewakan':'dijual'}`,'#propertibrighton','#PropertiY2K','#investasiproperti',...loc].filter(Boolean).join(' '),
    tt:['#properti',t&&`#${j}${t}`,'#fyp',...loc].filter(Boolean).join(' '),fb:['#properti','#Brighton','#PropertiY2K',...loc].join(' ')}}
function caption(k,p,cfg,origin){
  const sp=specs(p.spesifikasi).slice(0,5).map(([a,b])=>`▪️ ${a}: ${b}`).join('\n'),wa='0'+String(cfg.wa||'').replace(/^62/,''),tg=tags(p),
    link=`${origin}/properti/${p.id}`,desc=String(p.deskripsi||'').trim().slice(0,220);
  if(k==='story') return `${tc(p.judul)}\n${rp(p.harga)}\n${link}`;
  if(k==='tt') return `${p.status==='Disewa'?'DISEWAKAN':'DIJUAL'} 🏡 ${tc(p.judul)}\n💰 ${rp(p.harga)}\n📍 ${tc(p.lokasi)}\n📲 Chat WA ${cfg.agen}: ${wa}\n${tg.tt}`;
  if(k==='fb') return `🏡 ${p.status==='Disewa'?'DISEWAKAN':'DIJUAL'}: ${tc(p.judul)}\n📍 ${tc(p.lokasi)}\n💰 ${rp(p.harga)}\n${sp?sp+'\n':''}${desc?'\n'+desc+(p.deskripsi.length>220?'…':'')+'\n':''}\n🔗 Detail & simulasi KPR: ${link}\n📲 WhatsApp ${cfg.agen}: https://wa.me/${cfg.wa}\n\n${tg.fb}`;
  return `🏡 ${p.status==='Disewa'?'DISEWAKAN':'DIJUAL'}\n${tc(p.judul)}\n\n📍 ${tc(p.lokasi)}\n💰 ${rp(p.harga)}\n${sp}\n\n📲 Hubungi ${cfg.agen} (Brighton)\nWA ${wa} — link di bio\n\n${tg.ig}`;
}
export default function SharePanel({p,cfg,onClose}){
  const cv=useRef(null),[fi,setFi]=useState(0),[fk,setFk]=useState('ig'),[cap,setCap]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[mode,setMode]=useState('img');
  const f=FORMATS.find(x=>x.k===fk),fotos=(p.foto||[]).slice(0,8);
  useEffect(()=>{setCap(caption(fk,p,cfg,location.origin))},[fk,p]);
  useEffect(()=>{let dead=false;(async()=>{setBusy(true);setNote('');try{
      const img=await loadImg(fotos[fi]);let ag=null;try{ag=await loadImg('/yenny-khuang.jpg')}catch{}
      if(!dead) await render(cv.current,f,p,img,ag,cfg)}catch(e){if(!dead)setNote(e.message)}if(!dead)setBusy(false)})();return()=>{dead=true}},[fk,fi,p,cfg.accent]);
  const blob=()=>new Promise(r=>cv.current.toBlob(r,'image/jpeg',.92));
  const dl=async()=>{const a=document.createElement('a');a.href=URL.createObjectURL(await blob());a.download=`${slug(p.judul)}-${fk}.jpg`;a.click()};
  const copy=async()=>{try{await navigator.clipboard.writeText(cap);setNote('Caption disalin ✓')}catch{setNote('Gagal menyalin, salin manual dari kotak caption.')}};
  const share=async()=>{const file=new File([await blob()],`${slug(p.judul)}-${fk}.jpg`,{type:'image/jpeg'});try{await navigator.clipboard.writeText(cap)}catch{}
    if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],text:cap,title:tc(p.judul)});setNote('Caption sudah disalin — tempel (paste) jika aplikasi tidak mengisinya otomatis.')}catch(e){if(e.name!=='AbortError')setNote(e.message)}}
    else{await dl();setNote('Browser ini belum mendukung kirim langsung. Gambar diunduh & caption disalin — buka aplikasinya lalu unggah.')}};
  return <div className="space-y-4 rounded-2xl border border-line bg-card p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-serif text-2xl text-gold">Bagikan ke sosial media</h2><p className="truncate text-xs text-stone-400">{tc(p.judul)}</p></div><button className="btn2 shrink-0" onClick={onClose}>Tutup</button></div>
    <div className="flex gap-2">{[['img','🖼️ Gambar'],['vid','🎬 Video']].map(([k,l])=><button key={k} onClick={()=>setMode(k)} className={mode===k?'btn':'btn2'}>{l}</button>)}</div>
    {mode==='vid'&&<VideoMaker p={p} cfg={cfg} caption={caption('tt',p,cfg,location.origin)}/>}
    <div className={mode==='img'?'space-y-4':'hidden'}>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{FORMATS.map(x=><button key={x.k} onClick={()=>setFk(x.k)} className={`rounded-xl border p-2 text-left ${fk===x.k?'border-gold bg-gold/10 text-gold':'border-line text-stone-300'}`}><p className="text-sm font-medium">{x.label}</p><p className="text-[11px] text-stone-500">{x.sub}</p></button>)}</div>
    {fotos.length>1&&<div><p className="mb-1 text-xs text-stone-400">Pilih foto utama</p><div className="flex gap-2 overflow-x-auto pb-1">{fotos.map((u,i)=><button key={u} onClick={()=>setFi(i)} className={`shrink-0 rounded-lg border-2 ${i===fi?'border-gold':'border-transparent'}`}><img src={u} alt="" className="h-14 w-20 rounded object-cover"/></button>)}</div></div>}
    <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
      <div className="relative mx-auto w-full max-w-xs"><canvas ref={cv} className="w-full rounded-lg border border-line bg-black" style={{aspectRatio:`${f.w}/${f.h}`}}/>{busy&&<p className="absolute inset-0 grid place-items-center text-sm text-stone-300">Membuat gambar…</p>}</div>
      <div className="space-y-3"><label className="block text-xs text-stone-400">Caption ({f.label}) — boleh diedit<textarea rows="12" className="inp mt-1 font-mono text-xs" value={cap} onChange={e=>setCap(e.target.value)}/></label>
        <div className="flex flex-wrap gap-2"><button className="btn flex-1 sm:flex-none" onClick={share} disabled={busy}>Bagikan ke aplikasi</button><button className="btn2" onClick={dl} disabled={busy}>Unduh gambar</button><button className="btn2" onClick={copy}>Salin caption</button></div>
        <p className="text-xs text-stone-500">“Bagikan ke aplikasi” membuka menu HP — pilih Instagram, TikTok, Facebook, dll. Gambar & caption sudah menyesuaikan ukuran masing-masing platform.</p>
        {note&&<p className="text-sm text-gold">{note}</p>}</div></div></div></div>}
