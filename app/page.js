import Link from 'next/link';
import { rp, fotos, specs, getSettings, tc } from '@/lib/supabase';
import { allProps, filterProps } from '@/lib/data';
const TIPE=[['','Semua','✨'],['Rumah','Rumah','🏠'],['Tanah','Tanah','🌱'],['Gudang','Gudang','🏭'],['Ruko','Ruko','🏬']];
export const dynamic='force-dynamic';
export default async function Home({searchParams}){
  const {q='',status='',max='',tipe=''}=searchParams, s=await getSettings();
  const list=filterProps(await allProps(),{q,status,max,tipe});
  return <main>
    <header className="border-b border-line"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
      <Link href="/" className="flex min-w-0 items-center gap-3"><img src="/yenny-khuang.jpg" alt={s.agen} className="h-11 w-11 shrink-0 rounded-full object-cover object-top ring-1 ring-gold/60"/>
        <span className="whitespace-nowrap font-serif text-xl tracking-wide text-gold sm:text-2xl">Y2K Property</span></Link>
      <a href={`https://wa.me/${s.wa}`} className="shrink-0 rounded-full border border-line px-4 py-2 text-sm text-stone-300 transition hover:border-gold hover:text-gold">Hubungi<span className="hidden sm:inline"> {s.agen}</span></a></div></header>
    <section className="mx-auto max-w-6xl px-5 pb-10 pt-14 sm:pt-20">
      <p className="mb-3 text-xs uppercase tracking-[.3em] text-gold">Koleksi Terkurasi</p>
      <h1 className="max-w-2xl font-serif text-4xl leading-tight text-white sm:text-6xl">Hunian pilihan, <em className="text-gold">didampingi</em> dari survei hingga akad.</h1>
      <nav aria-label="Jenis properti" className="mt-8 grid grid-cols-5 gap-2 sm:flex sm:flex-wrap">
        {TIPE.map(([v,l,ic])=>{const on=tipe===v,qs=new URLSearchParams({...(q&&{q}),...(status&&{status}),...(max&&{max}),...(v&&{tipe:v})}).toString();
          return <Link key={l} href={qs?`/?${qs}`:'/'} scroll={false} className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-xs transition sm:flex-row sm:gap-2 sm:rounded-full sm:px-5 sm:text-sm ${on?'border-gold bg-gold font-semibold text-black':'border-line bg-card text-stone-300 hover:border-gold hover:text-gold'}`}><span className="text-lg leading-none sm:text-base">{ic}</span>{l}</Link>})}</nav>
      <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_150px_170px_auto]">
        <input type="hidden" name="tipe" value={tipe}/><input name="q" defaultValue={q} placeholder="Cari nama atau lokasi…" className="inp"/>
        <select name="status" defaultValue={status} className="inp"><option value="">Dijual/Disewa</option><option>Dijual</option><option>Disewa</option></select>
        <select name="max" defaultValue={max} className="inp"><option value="">Semua harga</option>{[500e6,1e9,2e9,5e9].map(v=><option key={v} value={v}>≤ {rp(v)}</option>)}</select>
        <button className="btn">Cari</button></form>
    </section>
    <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-3">
      {list.map(p=>{const f=fotos(p)[0],sp=specs(p.spesifikasi).filter(([k])=>/kamar|luas|lt|lb|km|kt/i.test(k)).slice(0,3);
        return <Link key={p.id} href={`/properti/${p.id}`} className="group overflow-hidden rounded-2xl border border-line bg-card transition hover:border-gold/60">
          <div className="relative aspect-[4/3] overflow-hidden bg-black">{f&&<img src={f} alt={tc(p.judul)} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>}
            <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs text-gold backdrop-blur">{p.status}</span></div>
          <div className="space-y-2 p-5"><p className="font-serif text-2xl text-gold">{rp(p.harga)}</p>
            <h3 className="line-clamp-2 font-medium text-white">{tc(p.judul)}</h3><p className="text-sm text-stone-400">📍 {tc(p.lokasi)}</p>
            <div className="flex flex-wrap gap-2 pt-1">{sp.map(([k,v])=><span key={k} className="rounded-md border border-line px-2 py-1 text-xs text-stone-300">{k}: {v}</span>)}</div></div></Link>})}
      {!list.length&&<p className="col-span-full py-20 text-center text-stone-500">Belum ada properti yang cocok.</p>}
    </section></main>}
