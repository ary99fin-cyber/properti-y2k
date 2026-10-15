(()=>{'use strict';
const wait=()=>{const form=document.getElementById('y2kchat-form'),panel=document.getElementById('y2kchat-content');if(!form||!panel)return;
if(document.getElementById('y2k-lead-save'))return;
const create=(tag,txt)=>{const n=document.createElement(tag);if(txt)n.textContent=txt;return n};
const heading=create('p','Untuk membantu menindaklanjuti kebutuhan Anda (opsional)');heading.style.fontWeight='700';form.append(heading);
const purpose=form.querySelector('select[name="purpose"]');const selects=form.querySelectorAll('select');const type=selects[1];const inputs=form.querySelectorAll('input[type="number"]');const query=form.querySelector('textarea');
function field(text,tag,options){const label=create('label',text);const input=create(tag);if(tag==='select')options.forEach(([v,t])=>{const o=create('option',t);o.value=v;input.append(o)});else {input.type='text';input.maxLength=120;}label.append(input);form.append(label);return input;}
const role=field('Mencari untuk siapa?', 'select',[['pribadi','Diri sendiri / keluarga'],['perusahaan','Perusahaan'],['perantara','Saya agen/perantara'],['belum','Belum ditentukan']]);
const timing=field('Rencana transaksi','select',[['segera','Dalam 1 bulan'],['1-3bulan','1–3 bulan'],['belum','Belum menentukan']]);
const name=field('Nama panggilan (opsional)','input');const phone=field('Nomor WhatsApp (opsional)','input');phone.inputMode='tel';phone.placeholder='08...';
const consentLabel=create('label');consentLabel.style.display='flex';consentLabel.style.gap='8px';const consent=create('input');consent.type='checkbox';consentLabel.append(consent,document.createTextNode('Saya setuju kebutuhan dan kontak yang saya isi disimpan untuk tindak lanjut oleh tim Y2K. Nomor tidak dibagikan ke grup agen.'));form.append(consentLabel);
const save=create('button','Simpan permintaan konsultasi');save.type='button';save.id='y2k-lead-save';form.append(save);
const message=create('div');message.setAttribute('role','status');form.append(message);
save.addEventListener('click',async()=>{message.textContent='';if(!consent.checked){message.textContent='Centang persetujuan jika ingin menyimpan permintaan.';return;}if(query.value.trim().length<10){message.textContent='Mohon jelaskan kebutuhan minimal 10 karakter.';return;}if(typeof sb==='undefined'){message.textContent='Koneksi Supabase belum tersedia.';return;}const wa=phone.value.trim();if(wa&&!/^\+?[0-9\s-]{8,20}$/.test(wa)){message.textContent='Periksa format nomor WhatsApp.';return;}save.disabled=true;try{const payload={purpose:purpose.value,needs:query.value.trim().slice(0,1500),property_type:type.value,area_min:inputs[0]?.value?Number(inputs[0].value):null,area_max:inputs[1]?.value?Number(inputs[1].value):null,budget_max:inputs[2]?.value?Number(inputs[2].value):null,buyer_role:role.value,timing:timing.value,contact_name:name.value.trim().slice(0,120)||null,contact_wa:wa||null,consent:true};const {error}=await sb.from('y2k_leads').insert(payload);if(error)throw error;message.textContent='Permintaan tersimpan. Tim Y2K akan meninjau jika dibutuhkan.';save.disabled=true;}catch(e){message.textContent='Belum bisa menyimpan: '+e.message;save.disabled=false;}});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait);else wait();
})();
