const cheerio = require('cheerio');

const validUrl = (raw) => {
  const url = new URL(String(raw || ''));
  if (url.protocol !== 'https:' || url.hostname !== 'www.brighton.co.id' || !/^\/cari-properti\/view\/[a-z0-9-]+\/?$/i.test(url.pathname)) throw Error('Gunakan link DETAIL properti Brighton, bukan profil agen.');
  return url;
};
function textAfter($, label) {
  const labels = $('body *').filter((_,e) => e.children.length && e.children.every(x=>x.type==='text') && $(e).text().trim().toLowerCase() === label.toLowerCase());
  for (const e of labels.toArray().slice(0,5)) {
    const next = $(e).next().text().trim() || $(e).parent().next().text().trim();
    if (next && next.length < 150) return next;
    const par = $(e).parent().text().trim();
    if (par.length < 150 && par.toLowerCase() !== label.toLowerCase()) return par.replace(new RegExp('^'+label+'\\s*','i'),'').trim();
  }
  return '';
}
const norm = s => (s||'').replace(/\s+/g,' ').trim();
module.exports = async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'POST') return res.status(405).json({error:'Gunakan POST.'});
  try {
    const target=validUrl(req.body?.url);
    const response=await fetch(target.href,{headers:{'User-Agent':'Mozilla/5.0 (compatible; PropertyY2K/1.0)','Accept':'text/html'},redirect:'error',signal:AbortSignal.timeout(13000)});
    if(!response.ok) throw Error('Halaman Brighton tidak dapat dibaca (HTTP '+response.status+').');
    const html=await response.text();
    if(html.length>5_000_000) throw Error('Halaman terlalu besar.');
    const $=cheerio.load(html);
    const meta=n=> $(`meta[property="${n}"]`).attr('content')||$(`meta[name="${n}"]`).attr('content')||'';
    const body=norm($('body').text());
    const title=norm($('h1').first().text() || meta('og:title') || $('title').text()).replace(/\s*\|\s*Brighton.*$/i,'');
    const findNum=(label) => {
      const re=new RegExp(label+'\\s*:?\\s*([\\d.,]+)\\s*(?:m²|m2|m\\^2)?','i');
      const match=body.match(re);return match?.[1]||'';
    };
    const money=body.match(/Rp\s*([\d.,]+)\s*(Miliar|Milyar|M|Juta|JT)\b/i);
    const price=money?Math.round(Number(money[1].replace(/\./g,'').replace(',','.')) * (/juta|jt/i.test(money[2])?1e6:1e9)):0;
    const photos=new Set();
    const addPhoto=raw=>{
      if(!raw)return;
      try {
        const u=new URL(raw,target.href);
        if(u.protocol !=='https:' || u.hostname!=='cdn.brighton.co.id')return;
        if(!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(u.pathname+u.search) && !/image|photo|property|listing/i.test(u.pathname))return;
        photos.add(u.href);
      }catch{}
    };
    $('img').each((_,e)=>{
      const alt=$(e).attr('alt')||'';
      if (/logo|icon|agent|jhrh|profile|avatar|brighton/i.test(alt) && !/gudang|rumah|apartemen|tanah|ruko|pabrik|villa|properti/i.test(alt)) return;
      ['src','data-src','data-original'].forEach(k=>addPhoto($(e).attr(k)));
      const set=$(e).attr('srcset')||'';set.split(',').forEach(v=>addPhoto(v.trim().split(/\s+/)[0]));
    });
    // Many Brighton pages embed image links in hydration scripts instead of <img>.
    for (const m of html.matchAll(/https?:\\?\/\\?\/(?:cdn\.brighton\.co\.id)[^\s"'<>]+/g)) {
      const uri=m[0].replace(/\\\//g,'/').replace(/\\u0026/g,'&').replace(/&amp;/g,'&');
      addPhoto(uri);
    }
    addPhoto(meta('og:image'));
    let location=norm(textAfter($,'Lokasi')||textAfter($,'Alamat'));
    const tanah=findNum('Luas Tanah'), bangunan=findNum('Luas Bangunan');
    const details=[tanah&&'Luas tanah: '+tanah+' m²',bangunan&&'Luas bangunan: '+bangunan+' m²',...['Listrik','Sertifikat','Hadap','Kamar Tidur','Kamar Mandi','Tipe Properti'].map(l=>{const v=norm(textAfter($,l));return v && v!=='-' ?l+': '+v:''})].filter(Boolean);
    const descHeading=$('h2,h3').filter((_,e)=>/^(keterangan|deskripsi)$/i.test(norm($(e).text()))).first();
    const desc=norm(descHeading.next().text() || descHeading.parent().next().text()).slice(0,3000);
    return res.status(200).json({url:target.href,judul:title, lokasi:location,harga:price,status:/sewa/i.test(body.slice(0,700))?'Disewa':'Dijual',spesifikasi:details.join('\n'),deskripsi:desc,foto:[...photos].slice(0,25),warnings:photos.size===0?['Belum berhasil menemukan URL foto. Periksa halaman Brighton.']:[],source:'Brighton',tested:false});
  }catch(e){return res.status(400).json({error:e.message||'Gagal membaca listing Brighton.'});}
};
