import { createClient } from '@supabase/supabase-js';
export const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'x');
export const DEF = { accent:'#C9A24B', wa:'6285260523677', agen:'Yenny Khuang', npoptkp:'80000000', bphtb_pct:'5', notaris_pct:'1', bank_fee:'3000000' };
export async function getSettings(){ try{ const {data}=await sb.from('site_settings').select('*'); return {...DEF,...Object.fromEntries((data||[]).map(r=>[r.key,r.value]))}; }catch{ return DEF; } }
export const rp = n => 'Rp ' + Math.round(Number(n||0)).toLocaleString('id-ID');
export const fotos = p => Array.isArray(p.foto) ? p.foto : [];
export const specs = t => String(t||'').split('\n').map(l=>l.split(':')).filter(a=>a.length>1&&a[0].trim()).map(a=>[a[0].trim(),a.slice(1).join(':').trim()]);
export const tc = t => { t=String(t||''); const l=t.replace(/[^A-Za-z]/g,''); const up=l.replace(/[^A-Z]/g,'').length; return l.length>6 && up/l.length>0.7 ? t.toLowerCase().replace(/(^|[\s\-\/(])([a-z])/g,(m,a,b)=>a+b.toUpperCase()) : t; };
