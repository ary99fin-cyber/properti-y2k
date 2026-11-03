'use client';
import { useEffect, useState } from 'react';
// Tombol bagikan untuk pengunjung di halaman publik. Instagram/TikTok tidak punya URL share web,
// jadi dilayani lewat menu share bawaan HP ("Bagikan…"), yang menampilkan semua aplikasi terpasang.
export default function ShareButtons({judul,harga}){
  const [note,setNote]=useState(''),[canNative,setCan]=useState(false);
  useEffect(()=>{setCan(!!navigator.share)},[]);
  const url=()=>location.href.split('#')[0], text=()=>`${judul} — ${harga}`;
  const native=async()=>{try{await navigator.share({title:judul,text:text(),url:url()})}catch(e){if(e.name!=='AbortError')setNote('Gagal membuka menu bagikan.')}};
  const copy=async()=>{try{await navigator.clipboard.writeText(url());setNote('Link disalin ✓')}catch{setNote('Gagal menyalin link.')}};
  const open=u=>window.open(u,'_blank','noopener,noreferrer');
  return <div className="rounded-2xl border border-line bg-card p-4"><p className="mb-2 text-xs uppercase tracking-widest text-stone-400">Bagikan properti ini</p>
    <div className="grid grid-cols-2 gap-2">
      {canNative&&<button className="btn2 col-span-2" onClick={native}>📤 Bagikan… (IG, TikTok, dll)</button>}
      <button className="btn2" onClick={()=>open(`https://wa.me/?text=${encodeURIComponent(text()+'\n'+url())}`)}>WhatsApp</button>
      <button className="btn2" onClick={()=>open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`)}>Facebook</button>
      <button className="btn2 col-span-2" onClick={copy}>🔗 Salin link</button></div>
    {note&&<p className="mt-2 text-xs text-gold">{note}</p>}</div>}
