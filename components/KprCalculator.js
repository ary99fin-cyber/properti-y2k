'use client';
import { useState } from 'react';
import { oper, kprBaru } from '@/lib/kpr';
import { rp } from '@/lib/supabase';
const N=({l,v,s,step,suf})=><label className="block text-xs text-stone-400">{l}<div className="relative mt-1"><input type="number" inputMode="decimal" step={step} value={v} onChange={e=>s(e.target.value)} className="inp"/>{suf&&<span className="absolute right-3 top-2.5 text-stone-500">{suf}</span>}</div></label>;
export default function KprCalculator({harga=0,cfg,judul=''}){
  const [mode,setMode]=useState('oper'),[h,setH]=useState(harga),[sisa,setSisa]=useState(Math.round(harga*.6)),[tenor,setTenor]=useState(10),[bunga,setBunga]=useState(9),[dp,setDp]=useState(20);
  const [a,setA]=useState({npoptkp:+cfg.npoptkp,bphtbPct:+cfg.bphtb_pct,notarisPct:+cfg.notaris_pct,bankFee:+cfg.bank_fee,pphPembeli:false});
  const o=oper({harga:+h,sisa:+sisa,tenor:+tenor,bunga:+bunga,...a}), k=kprBaru({harga:+h,dpPct:+dp,tenor:+tenor,bunga:+bunga});
  const row=(l,v,b)=><div className={`flex justify-between py-2 ${b?'border-t border-gold/40 text-lg font-semibold text-gold':'text-sm'}`}><span className={b?'':'text-stone-400'}>{l}</span><span>{rp(v)}</span></div>;
  const msg=encodeURIComponent(mode==='oper'?`Halo, simulasi oper kredit ${judul}: harga ${rp(h)}, sisa pokok ${rp(sisa)}, tenor ${tenor} th. Estimasi tunai ${rp(o.tunai)}, cicilan ${rp(o.cicilan)}/bln.`:`Halo, simulasi KPR ${judul}: harga ${rp(h)}, DP ${dp}%, tenor ${tenor} th. Cicilan ${rp(k.cicilan)}/bln.`);
  return <div className="rounded-2xl border border-line bg-card p-5 sm:p-7">
    <h2 className="font-serif text-3xl text-white">Simulasi <span className="text-gold">Kredit</span></h2>
    <div className="my-4 grid grid-cols-2 gap-2">{[['oper','Oper Kredit'],['kpr','KPR Baru']].map(([m,t])=><button key={m} onClick={()=>setMode(m)} className={`rounded-lg py-2 text-sm ${mode===m?'bg-gold font-semibold text-black':'border border-line'}`}>{t}</button>)}</div>
    <div className="grid gap-3 sm:grid-cols-2">
      <N l={mode==='oper'?'Harga kesepakatan (Rp)':'Harga properti (Rp)'} v={h} s={setH}/>
      {mode==='oper'?<N l="Sisa pokok KPR (Rp)" v={sisa} s={setSisa}/>:<N l="Uang muka (DP)" v={dp} s={setDp} suf="%"/>}
      <N l={mode==='oper'?'Sisa tenor':'Tenor'} v={tenor} s={setTenor} suf="tahun"/><N l="Bunga estimasi" v={bunga} s={setBunga} step=".1" suf="%/thn"/></div>
    <input type="range" min="1" max="30" value={tenor} onChange={e=>setTenor(e.target.value)} className="mt-3 w-full accent-[rgb(var(--accent))]"/>
    <div className="mt-4 rounded-xl bg-black/40 p-4">{mode==='oper'?<>
      {row('Uang oper ke penjual',o.uangOper)}{row('BPHTB (pembeli)',o.bphtb)}{row('Notaris/PPAT & balik nama',o.notaris)}{row('Biaya bank (alih debitur)',o.bankFee)}{o.pph>0&&row('PPh penjual (ditanggung pembeli)',o.pph)}
      {row('Tunai yang disiapkan',o.tunai,1)}{row('Estimasi cicilan / bulan',o.cicilan,1)}</>:<>
      {row('Uang muka',k.dp)}{row('Pokok pinjaman',k.pinjaman)}{row('Estimasi cicilan / bulan',k.cicilan,1)}</>}</div>
    {mode==='oper'&&<details className="mt-3 text-sm"><summary className="cursor-pointer text-gold">Asumsi biaya (bisa diubah)</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
      <N l="NPOPTKP (Rp)" v={a.npoptkp} s={v=>setA({...a,npoptkp:+v})}/><N l="Tarif BPHTB" v={a.bphtbPct} s={v=>setA({...a,bphtbPct:+v})} suf="%"/>
      <N l="Notaris/PPAT" v={a.notarisPct} s={v=>setA({...a,notarisPct:+v})} suf="%"/><N l="Biaya bank (Rp)" v={a.bankFee} s={v=>setA({...a,bankFee:+v})}/>
      <label className="flex items-center gap-2 text-xs text-stone-400 sm:col-span-2"><input type="checkbox" checked={a.pphPembeli} onChange={e=>setA({...a,pphPembeli:e.target.checked})}/>Pembeli menanggung PPh 2,5% penjual</label></div></details>}
    <p className="mt-3 text-xs text-stone-500">Estimasi saja, bukan penawaran bank atau nasihat hukum. Biaya final mengikuti bank, notaris/PPAT, dan ketentuan Bapenda.</p>
    <a className="btn mt-4 block text-center" href={`https://wa.me/${cfg.wa}?text=${msg}`}>Kirim simulasi ke WhatsApp agen</a></div>}
