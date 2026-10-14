(() => {
 const audio=$('bgMusic'), btn=$('musicToggle'), st=$('musicStatus'), vol=$('musicVolume');
 const refresh=()=>{ const playing=!audio.paused;btn.textContent=playing?'Ⅱ':'▶';btn.setAttribute('aria-label',playing?'Jeda musik':'Putar musik');st.textContent=playing?'Sedang diputar':'Ketuk untuk memutar';};
 audio.volume=.24; vol.oninput=()=>{audio.volume=Number(vol.value)/100;};
 const play=async()=>{try {await audio.play();}catch(e){refresh();}};
 btn.onclick=()=>{audio.paused?play():audio.pause();};
 audio.addEventListener('play',refresh);audio.addEventListener('pause',refresh);audio.addEventListener('error',()=>{st.textContent='Musik tidak tersedia';});
 $('musicHide').onclick=()=>{$('musicWidget').hidden=true;$('musicReopen').hidden=false;};
 $('musicReopen').onclick=()=>{$('musicWidget').hidden=false;$('musicReopen').hidden=true;};
 // Browser modern may reject autoplay with audio; keep the explicit play control usable.
 play(); refresh();
})();