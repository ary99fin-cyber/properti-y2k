import { getSettings } from '@/lib/supabase';
export const dynamic='force-dynamic';
export default async function manifest(){
  const s=await getSettings();
  return {
    name:'Properti Y2K — Hunian Pilihan', short_name:'Properti Y2K',
    description:'Katalog properti pilihan dengan simulasi KPR & oper kredit.',
    id:'/', start_url:'/?source=pwa', scope:'/', display:'standalone', orientation:'portrait',
    lang:'id', background_color:s.bg||'#0B0B0C', theme_color:s.bg||'#0B0B0C',
    icons:[
      {src:'/icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
      {src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
      {src:'/icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}],
    shortcuts:[{name:'Admin',short_name:'Admin',url:'/admin'}],
  };
}
