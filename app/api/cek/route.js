import { sb } from '@/lib/supabase';
export const dynamic='force-dynamic';
export async function GET(){
  const t=async n=>{const r=await sb.from(n).select('*',{count:'exact',head:true});return {tabel:n,jumlah:r.count,error:r.error?.message||null}};
  return Response.json({url_terisi:!!process.env.NEXT_PUBLIC_SUPABASE_URL,key_terisi:!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,hasil:[await t('properties'),await t('y2k_listing_details'),await t('y2k_listing_index')]})}
