import Link from 'next/link';
import { notFound } from 'next/navigation';
import { rp, fotos, specs, getSettings, tc } from '@/lib/supabase';
import { oneProp } from '@/lib/data';
import Gallery from '@/components/Gallery';
import KprCalculator from '@/components/KprCalculator';
import ShareButtons from '@/components/ShareButtons';
export const dynamic='force-dynamic';
const get=oneProp;
export async function generateMetadata({params}){const p=await get(params.id); if(!p) return {};
  const t=tc(p.judul),sp=specs(p.spesifikasi).slice(0,3).map(([k,v])=>`${k} ${v}`).join(' · '),
    desc=[`${p.status==='Disewa'?'Disewakan':'Dijual'} ${rp(p.harga)}`,tc(p.lokasi),sp].filter(Boolean).join(' · '),
    imgs=fotos(p).slice(0,3).map(url=>({url,alt:t})),url=`/properti/${p.id}`;
  return {title:t,description:desc,alternates:{canonical:url},
    openGraph:{type:'website',url,siteName:'Properti Y2K',locale:'id_ID',title:t,description:desc,images:imgs},
    twitter:{card:'summary_large_image',title:t,description:desc,images:imgs.map(i=>i.url).slice(0,1)}}}
export default async function Detail({params}){
  const p=await get(params.id); if(!p) notFound(); const s=await getSettings();
  const fas=String(p.fasilitas||'').split(',').map(x=>x.trim()).filter(Boolean);
  return <main className="mx-auto max-w-6xl px-5 py-6"><Link href="/" className="text-sm text-stone-400 hover:text-gold">← Semua properti</Link>
    <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]"><div className="min-w-0 space-y-8"><Gallery fotos={fotos(p)}/>
      <div><span className="text-xs uppercase tracking-widest text-gold">{p.status}</span><h1 className="mt-1 font-serif text-3xl leading-tight text-white sm:text-4xl">{tc(p.judul)}</h1>
        <p className="mt-1 text-stone-400">📍 {tc(p.lokasi)}</p><p className="mt-3 font-serif text-3xl text-gold sm:text-4xl">{rp(p.harga)}</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{specs(p.spesifikasi).map(([k,v])=><div key={k} className="rounded-xl border border-line bg-card p-3"><p className="text-xs text-stone-500">{k}</p><p className="font-medium text-white">{v}</p></div>)}</div>
      {p.deskripsi&&<p className="whitespace-pre-line leading-relaxed text-stone-300">{p.deskripsi}</p>}
      {!!fas.length&&<div className="flex flex-wrap gap-2">{fas.map(f=><span key={f} className="rounded-full border border-gold/40 px-3 py-1 text-xs text-gold">{f}</span>)}</div>}</div>
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start"><KprCalculator harga={Number(p.harga)} cfg={s} judul={p.judul}/>
        <a className="btn block text-center" href={`https://wa.me/${s.wa}?text=${encodeURIComponent('Halo, saya tertarik dengan '+p.judul)}`}>Hubungi {s.agen}</a>
        <ShareButtons judul={tc(p.judul)} harga={rp(p.harga)}/>
        {p.brighton_url&&<a className="btn2 block text-center" href={p.brighton_url} target="_blank" rel="noopener noreferrer">Lihat listing asli</a>}</aside></div></main>}
