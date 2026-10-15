// Beta, best-effort discovery only. No claim of complete listings.
// Returns URLs visible in initial HTML; no private/internal Brighton APIs.
const MAX_HTML = 1_000_000;
module.exports = async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 let url;try{url=new URL(req.query.url);if(url.protocol!=='https:'||!['www.brighton.co.id','brighton.co.id'].includes(url.hostname)||!/^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)||url.search||url.hash)throw Error('Invalid profile');}catch{return res.status(400).json({error:'URL profil Brighton tidak valid'});}
 try{
  const response = await fetch(url.toString(), {
  redirect: 'follow',
  if(!response.ok)throw Error('Brighton HTTP '+response.status);
  const type=response.headers.get('content-type')||'';if(!type.includes('text/html'))throw Error('Respons bukan HTML');
  const size=Number(response.headers.get('content-length')||0);if(size>MAX_HTML)throw Error('Halaman terlalu besar');
  const html=(await response.text()).slice(0,MAX_HTML);
  const regex=/(?:href|"url")\s*[=:]\s*["'](\/cari-properti\/view\/[^"'?#<>\s]+|https:\/\/(?:www\.)?brighton\.co\.id\/cari-properti\/view\/[^"'?#<>\s]+)["']/gi;
  const found=new Map();let m;while((m=regex.exec(html))!==null&&found.size<100){try{const link=new URL(m[1],url);if(['brighton.co.id','www.brighton.co.id'].includes(link.hostname)){link.hash='';link.search='';found.set(link.href,{url:link.href,title:decodeURIComponent(link.pathname.split('/').at(-1)).replace(/-/g,' ').slice(0,150),location:''});}}catch{}}
  return res.status(200).json({listings:[...found.values()],note:'Hanya link yang terlihat dalam HTML awal. Profil Brighton dapat memuat sebagian/semua listing secara dinamis; hasil 0 bukan berarti agen tidak punya listing.'});

}catch(err){
  console.error('BRIGHTON FETCH ERROR:', {
    message: err.message,
    cause: err.cause?.message,
    code: err.cause?.code,
    errno: err.cause?.errno
  });

  return res.status(502).json({
    error: 'Gagal menghubungi Brighton. Periksa Logs Vercel.'
  });
}
 };
