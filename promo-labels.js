(()=>{
const el=id=>document.getElementById(id);
const options=[['','Tanpa label'],['harga_menarik','Harga Menarik'],['nego_sampai_jadi','Nego Sampai Jadi']];
let agentId=null;
el('promoLoad').onclick=async()=>{
 const msg=el('promoMessage'),root=el('promoRows');root.replaceChildren();msg.textContent='Memuat daftar...';el('promoLoad').disabled=true;
 try{
  const {data:{user}}=await sb.auth.getUser();if(!user)throw Error('Login sebagai agen dulu.');
  const {data:agent,error:ae}=await sb.from('y2k_agents').select('id').eq('user_id',user.id).maybeSingle();
  if(ae||!agent)throw Error('Profil agen tidak ditemukan.');
  agentId=agent.id;
  const {data,error}=await sb.from('y2k_listing_details').select('id,title,location_text,promo_label').eq('agent_id',agentId).order('created_at',{ascending:false}).limit(150);
  if(error)throw Error(error.message.includes('promo_label')?'Kolom promo_label belum ada. Jalankan SQL migrasi label promosi di Supabase terlebih dahulu.':error.message);
  msg.textContent=(data||[]).length+' properti ditemukan. Pilih label lalu tekan Simpan di listing tersebut.';
  for(const item of data||[]){
   const row=document.createElement('div');row.className='promo-row';
   const info=document.createElement('div'),name=document.createElement('strong'),loc=document.createElement('small');
   name.textContent=item.title||'Tanpa judul';loc.textContent=item.location_text||'';info.append(name,loc);
   const select=document.createElement('select');select.setAttribute('aria-label','Label promosi untuk '+(item.title||'listing'));
   for(const [value,title] of options){const op=document.createElement('option');op.value=value;op.textContent=title;select.append(op);}
   select.value=item.promo_label||'';
   const button=document.createElement('button');button.type='button';button.textContent='Simpan';button.disabled=true;
   const feedback=document.createElement('small');feedback.className='promo-feedback';
   select.onchange=()=>{button.disabled=select.value===(item.promo_label||'');feedback.textContent='';};
   button.onclick=async()=>{
    button.disabled=true;select.disabled=true;feedback.textContent='Menyimpan...';
    const next=select.value||null;
    const {data:updated,error:saveError}=await sb.from('y2k_listing_details').update({promo_label:next}).eq('id',item.id).eq('agent_id',agentId).select('id,promo_label').maybeSingle();
    if(saveError||!updated){feedback.textContent='Gagal: '+(saveError?.message||'Izin update ditolak');button.disabled=false;}
    else{item.promo_label=updated.promo_label;feedback.textContent='✓ Tersimpan';}
    select.disabled=false;
   };
   const actions=document.createElement('div');actions.className='promo-action';actions.append(select,button,feedback);
   row.append(info,actions);root.append(row);
  }
 }catch(e){msg.textContent='Tidak dapat memuat: '+e.message;}
 finally{el('promoLoad').disabled=false;}
};
})();