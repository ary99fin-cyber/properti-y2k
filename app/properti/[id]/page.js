import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sb, rp, fotos, specs, getSettings } from '@/lib/supabase';
import Gallery from '@/components/Gallery';
import KprCalculator from '@/components/KprCalculator';
export const dynamic='force-dynamic';
const get=async id=>(await sb.from('properties').select('*').eq('id',id).single()).data;
export async function generateMetadata({params}){const p=await get(params.id);return p?{title:p.judul,openGraph:{title:p.judul,description:`${rp(p.harga)} · ${p.lokasi}`,images:fotos(p).slice(0,1)}}:{}}
export default async function Detail({params}){
  const p=await get(params.id); if(!p) notFound(); const s=await getSettings();
  const fas=String(p.fasilitas||'').split(',').map(x=>x.trim()).filter(Boolean);
  return <main className="mx-auto max-w-6xl px-5 py-6"><Link href="/" className="text-sm text-stone-400 hover:text-gold">← Semua properti</Link>
    <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]"><div className="space-y-8"><Gallery fotos={fotos(p)}/>
      <div><span className="text-xs uppercase tracking-widest text-gold">{p.status}</span><h1 className="mt-1 font-serif text-4xl text-white">{p.judul}</h1>
        <p className="mt-1 text-stone-400">📍 {p.lokasi}</p><p className="mt-3 font-serif text-4xl text-gold">{rp(p.harga)}</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{specs(p.spesifikasi).map(([k,v])=><div key={k} className="rounded-xl border border-line bg-card p-3"><p className="text-xs text-stone-500">{k}</p><p className="font-medium text-white">{v}</p></div>)}</div>
      {p.deskripsi&&<p className="whitespace-pre-line leading-relaxed text-stone-300">{p.deskripsi}</p>}
      {!!fas.length&&<div className="flex flex-wrap gap-2">{fas.map(f=><span key={f} className="rounded-full border border-gold/40 px-3 py-1 text-xs text-gold">{f}</span>)}</div>}</div>
      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start"><KprCalculator harga={Number(p.harga)} cfg={s} judul={p.judul}/>
        <a className="btn block text-center" href={`https://wa.me/${s.wa}?text=${encodeURIComponent('Halo, saya tertarik dengan '+p.judul)}`}>Hubungi {s.agen}</a></aside></div></main>}
