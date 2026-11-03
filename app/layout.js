import './globals.css';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import { getSettings } from '@/lib/supabase';
import ChatWidget from '@/components/ChatWidget';
import PwaRegister from '@/components/PwaRegister';
const serif=Cormorant_Garamond({subsets:['latin'],weight:['500','600','700'],variable:'--f-serif'});
const sans=Manrope({subsets:['latin'],variable:'--f-sans'});
export const dynamic='force-dynamic';
const SITE=process.env.NEXT_PUBLIC_SITE_URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`:'http://localhost:3000');
const DESC='Katalog properti pilihan dengan simulasi KPR & oper kredit.';
export const metadata={metadataBase:new URL(SITE),title:{default:'Properti Y2K — Hunian Pilihan',template:'%s | Properti Y2K'},description:DESC,
  applicationName:'Properti Y2K',appleWebApp:{capable:true,title:'Properti Y2K',statusBarStyle:'black-translucent'},
  icons:{icon:'/icons/icon-192.png',apple:'/icons/apple-touch-icon.png'},
  openGraph:{type:'website',siteName:'Properti Y2K',locale:'id_ID',title:'Properti Y2K — Hunian Pilihan',description:DESC,images:['/icons/icon-512.png']},
  twitter:{card:'summary_large_image'}};
export const viewport={themeColor:'#0B0B0C',width:'device-width',initialScale:1,viewportFit:'cover'};
const rgb=h=>{const n=parseInt((h||'#C9A24B').slice(1),16);return `${n>>16} ${(n>>8)&255} ${n&255}`};
export default async function Root({children}){const s=await getSettings();
 return <html lang="id" className={`${serif.variable} ${sans.variable}`} style={{'--accent':rgb(s.accent),'--bg':rgb(s.bg||'#0B0B0C')}}><body>{children}<ChatWidget wa={s.wa}/><PwaRegister/></body></html>}
