import Link from 'next/link';
import { rp, fotos, specs, getSettings } from '@/lib/supabase';
import { allProps, filterProps } from '@/lib/data';
export const dynamic='force-dynamic';
export default async function Home({searchParams}){
  const {q='',status='',max=''}=searchParams, s=await getSettings();
  const list=filterProps(await allProps(),{q,status,max});
  return <main>
    <header className="border-b border-line"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
      <span className="font-serif text-2xl tracking-wide text-gold">Properti Y2K</span><a className="text-sm text-stone-400 hover:text-gold" href={`https://wa.me/${s.wa}`}>Hubungi {s.agen}</a></div></header>
    <section className="mx-auto max-w-6xl px-5 pb-10 pt-14 sm:pt-20">
      <p className="mb-3 text-xs uppercase tracking-[.3em] text-gold">Koleksi Terkurasi</p>
      <h1 className="max-w-2xl font-serif text-4xl leading-tight text-white sm:text-6xl">Hunian pilihan, <em className="text-gold">didampingi</em> dari survei hingga akad.</h1>
      <form className="mt-8 grid gap-3 sm:grid-cols-[1fr_150px_170px_auto]">
        <input name="q" defaultValue={q} placeholder="Cari nama atau lokasi…" className="inp"/>
        <select name="status" defaultValue={status} className="inp"><option value="">Dijual/Disewa</option><option>Dijual</option><option>Disewa</option></select>
        <select name="max" defaultValue={max} className="inp"><option value="">Semua harga</option>{[500e6,1e9,2e9,5e9].map(v=><option key={v} value={v}>≤ {rp(v)}</option>)}</select>
        <button className="btn">Cari</button></form>
    </section>
    <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-3">
      {list.map(p=>{const f=fotos(p)[0],sp=specs(p.spesifikasi).filter(([k])=>/kamar|luas|lt|lb|km|kt/i.test(k)).slice(0,3);
        return <Link key={p.id} href={`/properti/${p.id}`} className="group overflow-hidden rounded-2xl border border-line bg-card transition hover:border-gold/60">
          <div className="relative aspect-[4/3] overflow-hidden bg-black">{f&&<img src={f} alt={p.judul} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>}
            <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs text-gold backdrop-blur">{p.status}</span></div>
          <div className="space-y-2 p-5"><p className="font-serif text-2xl text-gold">{rp(p.harga)}</p>
            <h3 className="line-clamp-2 font-medium text-white">{p.judul}</h3><p className="text-sm text-stone-400">📍 {p.lokasi}</p>
            <div className="flex flex-wrap gap-2 pt-1">{sp.map(([k,v])=><span key={k} className="rounded-md border border-line px-2 py-1 text-xs text-stone-300">{k}: {v}</span>)}</div></div></Link>})}
      {!list.length&&<p className="col-span-full py-20 text-center text-stone-500">Belum ada properti yang cocok.</p>}
    </section></main>}
