'use client';
import { useState } from 'react';
export default function Gallery({fotos=[]}){
  const [i,setI]=useState(0),[open,setOpen]=useState(false); if(!fotos.length) return <div className="aspect-[16/10] rounded-2xl bg-card"/>;
  const go=d=>setI((i+d+fotos.length)%fotos.length);
  return <div>
    <button onClick={()=>setOpen(true)} className="relative block aspect-[16/10] w-full overflow-hidden rounded-2xl bg-black"><img src={fotos[i]} alt="" className="h-full w-full object-cover"/>
      <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs">{i+1}/{fotos.length} · perbesar</span></button>
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{fotos.map((f,k)=><button key={k} onClick={()=>setI(k)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${k===i?'border-gold':'border-transparent opacity-60'}`}><img src={f} alt="" className="h-full w-full object-cover"/></button>)}</div>
    {open&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" onClick={()=>setOpen(false)}>
      <img src={fotos[i]} alt="" className="max-h-[90vh] max-w-[94vw] object-contain" onClick={e=>e.stopPropagation()}/>
      <button className="absolute left-3 text-4xl text-gold" onClick={e=>{e.stopPropagation();go(-1)}}>‹</button>
      <button className="absolute right-3 text-4xl text-gold" onClick={e=>{e.stopPropagation();go(1)}}>›</button>
      <button className="absolute right-5 top-4 text-2xl" onClick={()=>setOpen(false)}>✕</button></div>}
  </div>}
