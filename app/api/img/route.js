// Proxy gambar agar foto dari situs lain (mis. Brighton) bisa digambar ke canvas tanpa terblokir CORS.
export const dynamic='force-dynamic';
const bad=h=>/^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/.test(h)||/\.(local|internal)$/.test(h)||h.includes(':');
export async function GET(req){
  let url; try{url=new URL(new URL(req.url).searchParams.get('u'))}catch{return new Response('bad url',{status:400})}
  for(let i=0;i<4;i++){
    if(url.protocol!=='https:'||bad(url.hostname.toLowerCase())) return new Response('blocked',{status:400});
    const r=await fetch(url,{redirect:'manual'}).catch(()=>null); if(!r) return new Response('fetch failed',{status:502});
    if(r.status>=300&&r.status<400&&r.headers.get('location')){url=new URL(r.headers.get('location'),url);continue}
    const ct=r.headers.get('content-type')||''; if(!r.ok||!ct.startsWith('image/')) return new Response('not image',{status:415});
    const buf=await r.arrayBuffer(); if(buf.byteLength>10e6) return new Response('too big',{status:413});
    return new Response(buf,{headers:{'content-type':ct,'cache-control':'public, max-age=86400'}});
  }
  return new Response('too many redirects',{status:508});
}
