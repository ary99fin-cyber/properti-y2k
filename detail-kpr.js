(() => {
  const panel=document.getElementById('kprPanel'), jump=document.getElementById('kprJump');
  if(!panel||!jump)return;
  const get=id=>document.getElementById(id), money=v=>'Rp '+Math.round(v).toLocaleString('id-ID');
  let price=0;
  function calculate(){
    const dp=Number(get('kprDp').value),years=Number(get('kprYears').value),rate=Number(get('kprRate').value);
    const output=get('kprMonthly'),summary=get('kprSummary');
    if(!Number.isFinite(dp)||dp<0||dp>=100||!Number.isFinite(rate)||rate<0||rate>50||!Number.isFinite(years)||years<=0){
      output.textContent='Periksa input';summary.textContent='DP 0–99% dan bunga 0–50%.';return;
    }
    const principal=price*(1-dp/100),months=years*12,r=rate/1200;
    const payment=r===0?principal/months:principal*r/(1-Math.pow(1+r,-months));
    output.textContent=money(payment);summary.textContent='DP '+money(price*dp/100)+' · Pinjaman '+money(principal)+' · '+years+' tahun';
  }
  window.addEventListener('y2k-property-ready',event=>{
    const p=Number(event.detail?.price||0),status=String(event.detail?.status||'').toLowerCase();
    if(p<=0||status==='disewa'||status==='sewa')return;
    price=p;get('kprPrice').value=money(p);
    panel.hidden=false;jump.hidden=false;calculate();
  });
  ['kprDp','kprYears','kprRate'].forEach(id=>get(id).addEventListener('input',calculate));
  jump.onclick=()=>panel.scrollIntoView({behavior:'smooth',block:'start'});
})();