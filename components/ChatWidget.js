'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { sb, rp } from '@/lib/supabase';
export default function ChatWidget({wa}){
  const path=usePathname(),[open,setOpen]=useState(false),[step,setStep]=useState(0),[a,setA]=useState({}),[res,setRes]=useState(null);
  if(path.startsWith('/admin')) return null;
  const Q=[{t:'Halo! Anda mencari properti untuk…',o:['Dijual','Disewa'],k:'status'},{t:'Budget maksimal?',o:['500 juta','1 miliar','2 miliar','5 miliar'],k:'budget',v:[5e8,1e9,2e9,5e9]},{t:'Lokasi yang diinginkan? (ketik, mis. Medan Johor)',k:'lokasi'}];
  const next=async(k,val)=>{const n={...a,[k]:val};setA(n);if(step<2) return setStep(step+1);
    let q=sb.from('properties').select('id,judul,harga,lokasi').eq('status',n.status).lte('harga',n.budget).limit(3); const w=String(n.lokasi||'').replace(/[,()%]/g,' ').trim(); if(w) q=q.ilike('lokasi',`%${w}%`);
    const {data}=await q; setRes(data||[]); setStep(3);
    try{await sb.from('y2k_leads').insert({purpose:n.status,needs:`Chatbot: ${n.lokasi||'bebas'}`,budget_max:n.budget})}catch{}};
  const cur=Q[step];
  return <div className="fixed bottom-4 right-4 z-40">
    {open&&<div className="mb-3 w-[min(92vw,340px)] overflow-hidden rounded-2xl border border-gold/40 bg-card shadow-2xl">
      <div className="bg-gold px-4 py-3 text-sm font-semibold text-black">Asisten Properti</div>
      <div className="space-y-3 p-4 text-sm">{cur&&<><p>{cur.t}</p>{cur.o?<div className="flex flex-wrap gap-2">{cur.o.map((o,i)=><button key={o} className="btn2" onClick={()=>next(cur.k,cur.v?cur.v[i]:o)}>{o}</button>)}</div>
        :<form onSubmit={e=>{e.preventDefault();next(cur.k,e.target.l.value)}} className="flex gap-2"><input name="l" className="inp" placeholder="Lokasi / kosongkan"/><button className="btn">OK</button></form>}</>}
        {step===3&&<><p>{res.length?'Berikut yang cocok:':'Belum ada yang pas, tim kami bantu carikan.'}</p>
          {res.map(p=><Link key={p.id} href={`/properti/${p.id}`} className="block rounded-lg border border-line p-2 hover:border-gold"><b className="text-white">{p.judul}</b><br/><span className="text-gold">{rp(p.harga)}</span></Link>)}
          <a className="btn block text-center" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Halo, cari properti ${a.status}, budget ≤ ${rp(a.budget)}, lokasi ${a.lokasi||'bebas'}`)}`}>Lanjut via WhatsApp</a></>}</div></div>}
    <button onClick={()=>setOpen(!open)} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold text-2xl text-black shadow-xl">{open?'✕':'💬'}</button></div>}
