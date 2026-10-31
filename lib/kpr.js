export const anuitas = (pokok, bungaTahun, tahun) => { const n=tahun*12, r=bungaTahun/100/12; if(pokok<=0||n<=0) return 0; return r===0 ? pokok/n : pokok*r/(1-Math.pow(1+r,-n)); };
// Oper kredit: uang oper = harga - sisa pokok. BPHTB dihitung dari harga total.
export function oper({harga,sisa,tenor,bunga,npoptkp,bphtbPct,notarisPct,bankFee,pphPembeli}){
  const uangOper=Math.max(0,harga-sisa), bphtb=Math.max(0,harga-npoptkp)*bphtbPct/100, notaris=harga*notarisPct/100, pph=pphPembeli?harga*0.025:0;
  return {uangOper,bphtb,notaris,bankFee,pph,tunai:uangOper+bphtb+notaris+bankFee+pph,cicilan:anuitas(sisa,bunga,tenor)};
}
export function kprBaru({harga,dpPct,tenor,bunga}){ const dp=harga*dpPct/100; return {dp,pinjaman:harga-dp,cicilan:anuitas(harga-dp,bunga,tenor)}; }
