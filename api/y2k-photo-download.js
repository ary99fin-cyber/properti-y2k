'use strict';
const BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;
const cdnHost='cdn.brighton.co.id';
function fail(res,status,msg){return res.status(status).json({error:msg});}
async function checkAgent(token){
  const headers={apikey:KEY,authorization:'Bearer '+token};
  const me=await fetch(BASE+'/auth/v1/user',{headers,signal:AbortSignal.timeout(10000)});
  if(!me.ok)throw Error('Sesi agen tidak valid.');
  const user=await me.json();
  if(!user.id)throw Error('Sesi agen tidak ditemukan.');
  const agents=await fetch(BASE+'/rest/v1/y2k_agents?select=id&user_id=eq.'+encodeURIComponent(user.id)+'&limit=1',{headers,signal:AbortSignal.timeout(10000)});
  if(!agents.ok)throw Error('Gagal memeriksa profil agen.');
  const rows=await agents.json();
  if(!Array.isArray(rows)||!rows.length)throw Error('Profil agen tidak terdaftar.');
  return true;
}
module.exports=async(req,res)=>{
  if(req.method!=='POST')return fail(res,405,'Gunakan POST.');
  if(!BASE||!KEY)return fail(res,503,'Konfigurasi server SUPABASE_URL / SUPABASE_ANON_KEY belum tersedia.');
  const token=(req.headers.authorization||'').match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token)return fail(res,401,'Login agen terlebih dahulu.');
  try{
    await checkAgent(token);
    const u=new URL(String(req.body?.url||''));
    if(u.protocol!=='https:'||u.hostname!==cdnHost||u.username||u.password||u.port) return fail(res,400,'URL foto Brighton tidak valid.');
    const response=await fetch(u.href,{redirect:'error',headers:{'Accept':'image/avif,image/webp,image/jpeg,image/png'},signal:AbortSignal.timeout(18000)});
    if(!response.ok)return fail(res,502,'Foto Brighton tidak dapat diunduh: HTTP '+response.status);
    const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(!['image/jpeg','image/png','image/webp'].includes(type))return fail(res,415,'Format foto belum didukung.');
    const max=8*1024*1024;
    const len=Number(response.headers.get('content-length')||0);
    if(len>max)return fail(res,413,'Foto lebih besar dari 8 MB.');
    const chunks=[];let size=0;
    for await(const chunk of response.body){
      size+=chunk.length;
      if(size>max){await response.body.cancel?.().catch(()=>{});return fail(res,413,'Foto lebih besar dari 8 MB.');}
      chunks.push(chunk);
    }
    const data=Buffer.concat(chunks);
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Type',type);
    res.setHeader('X-Content-Type-Options','nosniff');
    return res.status(200).send(data);
  }catch(e){
    console.error('Y2K_PHOTO_DOWNLOAD_ERROR',{reason:e.cause?.code||e.code||e.name,message:String(e.message).slice(0,120)});
    return fail(res,/sesi|profil/i.test(e.message)?403:502,e.message||'Gagal mengambil foto.');
  }
};