import { sb } from '@/lib/supabase';
import { brightonList, allProps } from '@/lib/data';
export const dynamic='force-dynamic';
export async function GET(){
  const idx=await sb.from('y2k_listing_index').select('url,price_idr').limit(100);
  const det=await sb.from('y2k_listing_details').select('source_url,image_urls').eq('publish_status','published').limit(100);
  const k=u=>String(u||'').trim().replace(/\/+$/,'');
  const ik=new Set((idx.data||[]).map(x=>k(x.url)));
  const cocok=(det.data||[]).filter(x=>ik.has(k(x.source_url))).length;
  const b=await brightonList(), a=await allProps();
  return Response.json({index_baris:idx.data?.length??null,index_error:idx.error?.message||null,detail_baris:det.data?.length??null,detail_error:det.error?.message||null,url_detail_cocok_index:cocok,contoh_url_index:(idx.data||[]).slice(0,2).map(x=>x.url),contoh_url_detail:(det.data||[]).slice(0,2).map(x=>x.source_url),contoh_harga:(idx.data||[]).slice(0,2).map(x=>x.price_idr),brighton_lolos:b.length,total_beranda:a.length})}
