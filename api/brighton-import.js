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
    // Ikuti redirect resmi Brighton secara terbatas; jangan pernah keluar dari domain yang diizinkan.
    let current=target;
    let response;
    for(let attempt=0;attempt<4;attempt++){
      response=await fetch(current.href,{
        headers:{'User-Agent':'Mozilla/5.0 (compatible; PropertyY2K/1.0)','Accept':'text/html'},
        redirect:'manual',signal:AbortSignal.timeout(13000)
      });
      if(![301,302,303,307,308].includes(response.status))break;
      if(attempt===3)throw Error('Terlalu banyak redirect Brighton.');
      const next=response.headers.get('location');
      if(!next)throw Error('Redirect Brighton tanpa tujuan.');
      const dest=new URL(next,current.href);
      if(dest.protocol!=='https:'||!['brighton.co.id','www.brighton.co.id'].includes(dest.hostname)||dest.username||dest.password||dest.port)throw Error('Redirect keluar dari domain Brighton diblokir.');
      current=dest;
    }
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
    // Brighton property gallery photos repeat a descriptive ALT such as
    // "Gudang Langkat — DIJUAL CEPAT BANGUNAN...". Agent avatars and footer
    // social-media icons do not have the listing heading in their ALT.
    // Conservative matching is intentional: never import unrelated images.
    const photos=new Set();
    const clean = str => norm(str).toLocaleLowerCase('id-ID').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const heading=clean(title);
    const significant = heading.split(' ').filter(w=>w.length>=4 && !/^(dijual|disewa|cepat|tanah|luas|bangunan|untuk|harga)$/i.test(w));
    const type=clean(textAfter($,'Tipe Properti'));
    const place=clean(textAfter($,'Lokasi'));
    const placeWords=place.split(' ').filter(w=>w.length>=4 && !/^(utara|selatan|barat|timur|sumatera|jawa|kota|kabupaten)$/i.test(w));
    const matchesListing = (alt) => {
      const x=clean(alt);
      if(!x || /^(logo|icon|avatar|profile|instagram|facebook|youtube|tiktok|whatsapp|jhrh|brighton)/.test(x)) return false;
      if(heading.length>=18 && (x.includes(heading.slice(0,Math.min(35,heading.length))) || heading.includes(x) && x.length>=18)) return true;
      const hits=significant.filter(w=>x.includes(w));
      return hits.length>=Math.min(3,significant.length) && hits.length>=2 ||
        (type.length>=4 && x.includes(type) && placeWords.some(w=>x.includes(w)));
    };
    const addPhoto = raw => {
      if(!raw)return;
      try {
        const u=new URL(raw,target.href);
        if(u.protocol !=='https:' || u.hostname!=='cdn.brighton.co.id')return;
        if(!/\.(jpe?g|png|webp)$/i.test(u.pathname) && !/image|photo|property|listing/i.test(u.pathname)) return;
        photos.add(u.href);
      }catch{}
    };
    $('img').each((_,e)=>{
      const alt=$(e).attr('alt')||'';
      if(!matchesListing(alt))return;
      for(const k of ['src','data-src','data-original','data-lazy-src'])addPhoto($(e).attr(k));
      // Prefer explicit image URL over srcset thumbnails.
      if(!$(e).attr('src') && !$(e).attr('data-src')){
        const srcset=$(e).attr('srcset')||'';
        srcset.split(',').forEach(v=>addPhoto(v.trim().split(/\s+/)[0]));
      }
    });
    // Do not scrape arbitrary image URLs from hydration scripts or the footer.
    // Also do not fall back to og:image: it may be an agent or site banner.
    let location=norm(textAfter($,'Lokasi')||textAfter($,'Alamat'));
    const tanah=findNum('Luas Tanah'), bangunan=findNum('Luas Bangunan');
    const details=[tanah&&'Luas tanah: '+tanah+' m²',bangunan&&'Luas bangunan: '+bangunan+' m²',...['Listrik','Sertifikat','Hadap','Kamar Tidur','Kamar Mandi','Tipe Properti'].map(l=>{const v=norm(textAfter($,l));return v && v!=='-' ?l+': '+v:''})].filter(Boolean);
    const descHeading=$('h2,h3').filter((_,e)=>/^(keterangan|deskripsi)$/i.test(norm($(e).text()))).first();
    const desc=norm(descHeading.next().text() || descHeading.parent().next().text()).slice(0,3000);
    return res.status(200).json({url:target.href,judul:title, lokasi:location,harga:price,status:/sewa/i.test(body.slice(0,700))?'Disewa':'Dijual',spesifikasi:details.join('\n'),deskripsi:desc,foto:[...photos].slice(0,25),warnings:photos.size===0?['Foto galeri belum teridentifikasi. Tambahkan foto secara manual atau periksa struktur halaman Brighton.']:[],source:'Brighton',tested:false});
  }catch(e){
    const code=e.cause?.code||e.code||'';
    const causeMessage=e.cause?.message||'';
    const causeName=e.cause?.name||'';
    const syscall=e.cause?.syscall||'';
    const hostname=e.cause?.hostname||'';
    const network=e instanceof TypeError && /fetch failed/i.test(e.message);
    const timeout=e.name==='TimeoutError'||e.name==='AbortError'||/timeout/i.test(code);
    const detail=timeout?'timeout':network?'network':'request';
    console.error('BRIGHTON_IMPORT_FAILURE',{type:detail,code:String(code).slice(0,40),message:String(e.message).slice(0,130),cause:String(causeMessage).slice(0,180),causeName:String(causeName).slice(0,40),syscall:String(syscall).slice(0,30),hostname:String(hostname).slice(0,80)});
    return res.status(network||timeout?502:400).json({
      error:network?'Server Y2K tidak dapat terhubung ke Brighton. Data lama aman. Coba lagi nanti atau gunakan teks Bagikan Brighton.':timeout?'Koneksi ke Brighton melewati batas waktu. Coba lagi nanti.':e.message||'Gagal membaca listing Brighton.',
      reason:detail
    });
  }
};
