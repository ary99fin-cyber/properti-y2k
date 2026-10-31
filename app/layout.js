import './globals.css';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import { getSettings } from '@/lib/supabase';
import ChatWidget from '@/components/ChatWidget';
const serif=Cormorant_Garamond({subsets:['latin'],weight:['500','600','700'],variable:'--f-serif'});
const sans=Manrope({subsets:['latin'],variable:'--f-sans'});
export const dynamic='force-dynamic';
export const metadata={title:'Properti Y2K — Hunian Pilihan',description:'Katalog properti pilihan dengan simulasi KPR & oper kredit.'};
const rgb=h=>{const n=parseInt((h||'#C9A24B').slice(1),16);return `${n>>16} ${(n>>8)&255} ${n&255}`};
export default async function Root({children}){const s=await getSettings();
 return <html lang="id" className={`${serif.variable} ${sans.variable}`} style={{'--accent':rgb(s.accent)}}><body>{children}<ChatWidget wa={s.wa}/></body></html>}
