import { sb } from '@/lib/supabase';
const key=u=>String(u||'').trim().replace(/\/+$/,'');
const okUrl=v=>{try{const u=new URL(v);return u.protocol==='https:'&&['brighton.co.id','www.brighton.co.id'].includes(u.hostname.toLowerCase())?u.href:null}catch{return null}};
const enc=s=>'b_'+btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const dec=s=>atob(s.slice(2).replace(/-/g,'+').replace(/_/g,'/'));
// Listing Brighton: harga dari y2k_listing_index, foto dari y2k_listing_details (publish_status = published)
export async function brightonList(){
  const [d,i]=await Promise.all([
    sb.from('y2k_listing_details').select('source_url,title,location_text,listing_status,image_urls,created_at').eq('publish_status','published').order('created_at',{ascending:false}),
    sb.from('y2k_listing_index').select('url,title,location_text,listing_status,price_idr')]);
  if(d.error||i.error) return [];
  const idx=new Map(); for(const x of i.data||[]){const k=key(x.url); if(k&&(!idx.has(k)||+x.price_idr>+idx.get(k).price_idr)) idx.set(k,x)}
  const seen=new Set(),out=[];
  for(const x of d.data||[]){const k=key(x.source_url),url=okUrl(x.source_url),ix=idx.get(k);
    const foto=(Array.isArray(x.image_urls)?x.image_urls:[]).filter(s=>typeof s==='string'&&s.startsWith('https://'));
    const harga=+ix?.price_idr||0; if(!k||!url||seen.has(k)||!ix||harga<=0||!foto.length) continue; seen.add(k);
    const j=String(x.listing_status||ix.listing_status||'').toLowerCase();
    out.push({id:enc(k),judul:x.title||ix.title,lokasi:x.location_text||ix.location_text,status:j==='jual'?'Dijual':j==='sewa'?'Disewa':'Properti',harga,foto,spesifikasi:'',fasilitas:'',deskripsi:'',brighton_url:url})}
  return out}
export async function allProps(){const {data}=await sb.from('properties').select('id,judul,lokasi,status,harga,foto,spesifikasi,created_at').order('created_at',{ascending:false});return [...(data||[]),...await brightonList()]}
export async function oneProp(id){id=decodeURIComponent(id);
  if(id.startsWith('b_')){let k='';try{k=dec(id)}catch{return null}return (await brightonList()).find(p=>p.brighton_url&&key(p.brighton_url)===k)||null}
  return (await sb.from('properties').select('*').eq('id',id).single()).data}
const TIPE={Rumah:/rumah|villa|vila|cluster|town ?house|apartemen/i,Tanah:/tanah|kavling|kavlingan|lahan/i,Gudang:/gudang|pabrik/i,Ruko:/ruko|rukan|toko/i};
// Jenis ditebak dari kata pertama yang muncul di judul (lalu spesifikasi): "Ruko 3 Lantai ..." -> Ruko
export const tipeOf=p=>{for(const src of [p.judul,p.spesifikasi]){const s=String(src||'');let best=null,pos=1e9;for(const [k,re] of Object.entries(TIPE)){const m=s.search(re);if(m>=0&&m<pos){pos=m;best=k}}if(best)return best}return ''};
export const filterProps=(l,{q='',status='',max='',tipe=''})=>{const s=String(q).toLowerCase().trim();return l.filter(p=>(!status||p.status===status)&&(!tipe||tipeOf(p)===tipe)&&(!max||+p.harga<=+max)&&(!s||(p.judul+' '+p.lokasi).toLowerCase().includes(s)))};
