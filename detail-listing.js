(()=>{
const el=id=>document.getElementById(id), source=new URLSearchParams(location.search).get('url');
let photos=[],selected=0;
const fail=t=>{el('state').textContent=t;};
function money(v){return 'Rp '+Number(v).toLocaleString('id-ID');}
function metric(label,value){if(value===null||value===undefined||value==='')return;const d=document.createElement('div');d.className='metric';const s=document.createElement('small'),b=document.createElement('strong');s.textContent=label;b.textContent=String(value);d.append(s,b);el('metrics').append(d);}
function chip(label,value){if(value===null||value===undefined||value==='')return;const s=document.createElement('span');s.className='chip';s.textContent=label+' '+value;el('quick').append(s);}
function updateSelected(index,scroll){if(!photos.length)return;selected=(index+photos.length)%photos.length;el('photoCounter').textContent=(selected+1)+' / '+photos.length;el('fullCounter').textContent=(selected+1)+' / '+photos.length;[...el('thumbs').children].forEach((b,i)=>b.classList.toggle('on',i===selected));if(scroll)el('slides').children[selected]?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});if(!el('lightbox').hidden)el('fullPhoto').src=photos[selected];}
function showFull(index){updateSelected(index,false);el('fullPhoto').src=photos[selected];el('lightbox').hidden=false;document.body.style.overflow='hidden';}
function closeFull(){el('lightbox').hidden=true;document.body.style.overflow='';}
el('prevPhoto').onclick=()=>updateSelected(selected-1,true);
el('nextPhoto').onclick=()=>updateSelected(selected+1,true);
el('fullPrev').onclick=()=>updateSelected(selected-1,false);
el('fullNext').onclick=()=>updateSelected(selected+1,false);
el('closeLightbox').onclick=closeFull;
el('lightbox').addEventListener('click',e=>{if(e.target===el('lightbox'))closeFull();});
document.addEventListener('keydown',e=>{if(el('lightbox').hidden)return;if(e.key==='Escape')closeFull();if(e.key==='ArrowRight')updateSelected(selected+1,false);if(e.key==='ArrowLeft')updateSelected(selected-1,false);});
let lastScroll=0;
el('slides').addEventListener('scroll',()=>{
 const now=Date.now();if(now-lastScroll<80)return;lastScroll=now;
 const root=el('slides'),width=root.clientWidth;if(!width)return;
 updateSelected(Math.round(root.scrollLeft/width),false);
},{passive:true});
async function start(){
 if(!source||!/^https:\/\/(?:www\.)?brighton\.co\.id\/cari-properti\/view\//.test(source))return fail('Link Brighton tidak valid.');
 const base=source.split('?')[0].replace(/\/$/,'');
 let q=await sb.from('y2k_listing_details').select('*').eq('source_url',source).limit(10);
 if(!q.error&&!q.data?.length)q=await sb.from('y2k_listing_details').select('*').like('source_url',base+'%').limit(10);
 if(q.error)return fail('Tidak dapat memuat properti: '+q.error.message);
 if(!q.data?.length)return fail('Properti belum tersedia atau belum dipublikasikan.');
 const d=q.data[0];
 el('state').textContent='';
 el('draft').hidden=d.publish_status!=='draft';
 el('tag').textContent=d.listing_status==='jual_sewa'?'Jual & Sewa':d.listing_status==='sewa'?'Disewa':d.listing_status==='jual'?'Dijual':'Properti';
 el('title').textContent=d.title||'Properti Brighton';document.title=(d.title||'Detail Properti')+' | Y2K PROPERTY';
 el('location').textContent=d.location_text||'Lokasi belum dilengkapi';
 for(const [label,p] of [['Harga jual',d.sale_price_idr],['Harga sewa',d.rent_price_idr]]){
 if(p==null)continue;const div=document.createElement('p'),small=document.createElement('small');div.className='price';small.textContent=label;div.append(small,document.createTextNode(money(p)+(label==='Harga sewa'&&d.rent_period?' / '+d.rent_period:'')));el('prices').append(div);
 }
 const area=v=>v==null?'':Number(v).toLocaleString('id-ID')+' m²';
 chip('LT',area(d.land_area_m2));chip('LB',area(d.building_area_m2));chip('KT',d.bedrooms);chip('KM',d.bathrooms);
 metric('Jenis properti',d.property_type);metric('Luas tanah',area(d.land_area_m2));metric('Luas bangunan',area(d.building_area_m2));metric('Kamar tidur',d.bedrooms);metric('Kamar mandi',d.bathrooms);metric('Dimensi',d.dimensions);metric('Sertifikat',d.certificate);metric('Arah hadap',d.facing);
 photos=(Array.isArray(d.image_urls)?d.image_urls:[]).filter(v=>{try{const u=new URL(v);return u.protocol==='https:';}catch{return false;}}).slice(0,30);
 if(!photos.length){const empty=document.createElement('div');empty.className='no-photo';empty.textContent='Foto belum ditambahkan';el('slides').append(empty);}
 else{
 for(const [i,u] of photos.entries()){
 const slide=document.createElement('figure');slide.className='slide';const img=document.createElement('img');img.src=u;img.loading=i===0?'eager':'lazy';img.alt='Foto properti '+(i+1);img.decoding='async';img.addEventListener('click',()=>showFull(i));slide.append(img);el('slides').append(slide);
 const thumb=document.createElement('button');thumb.type='button';thumb.setAttribute('aria-label','Lihat foto '+(i+1));const mini=document.createElement('img');mini.src=u;mini.alt='';mini.loading='lazy';thumb.append(mini);thumb.onclick=()=>updateSelected(i,true);el('thumbs').append(thumb);
 }
 const multiple=photos.length>1;el('photoCounter').hidden=!multiple;el('prevPhoto').hidden=!multiple;el('nextPhoto').hidden=!multiple;el('thumbs').hidden=!multiple;updateSelected(0,false);
 }
 el('description').textContent=d.description||'Hubungi agen untuk informasi dan ketersediaan terbaru.';
 el('agent').textContent=[d.agent_name,d.agent_office].filter(Boolean).join(' · ')||'Informasi agen belum dilengkapi';
 let digits=String(d.agent_phone||'').replace(/\D/g,'');
 if(digits.startsWith('0'))digits='62'+digits.slice(1);
 if(/^62\d{8,13}$/.test(digits)){el('whatsapp').href='https://wa.me/'+digits+'?text='+encodeURIComponent('Halo, saya ingin bertanya mengenai properti: '+d.title);el('whatsapp').hidden=false;}
 el('source').href=d.source_url;el('content').hidden=false;
}
start().catch(e=>fail(e.message||'Terjadi kesalahan.'));
})();