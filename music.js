(()=>{
'use strict';
const audio=document.getElementById('bgMusic');
if(!audio)return;
const key='y2k_music_play_requested';
audio.volume=0.22;audio.loop=true;
let wanted=sessionStorage.getItem(key)==='1';
let blocked=false;
const panel=document.createElement('div');
panel.className='y2k-music-panel';
const button=document.createElement('button');button.type='button';button.className='y2k-music-button';
button.setAttribute('aria-label','Putar musik latar properti');
button.textContent='♫ Putar Musik';
const message=document.createElement('span');message.className='y2k-music-message';message.textContent='Musik properti';
panel.append(button,message);document.body.append(panel);
function status(t){message.textContent=t;}
function update(){button.textContent=audio.paused?'♫ Putar Musik':'Ⅱ Jeda Musik';button.setAttribute('aria-label',audio.paused?'Putar musik latar':'Jeda musik latar');}
async function play(){
 wanted=true;sessionStorage.setItem(key,'1');
 try{await audio.play();blocked=false;status('Musik latar Y2K');}
 catch(e){blocked=true;status(e.name==='NotAllowedError'?'Ketuk Putar Musik untuk mengaktifkan suara':'File musik belum tersedia di website');}
 update();
}
function pause(){wanted=false;sessionStorage.setItem(key,'0');audio.pause();status('Musik dijeda');update();}
button.addEventListener('click',()=>{if(!audio.paused){pause();return;}void play();});
audio.addEventListener('playing',update);audio.addEventListener('pause',update);
audio.addEventListener('error',()=>{status('File musik belum tersedia di website');update();});
// Click properti is user activation; save intent before navigation.
document.addEventListener('click',event=>{
 const link=event.target.closest?.('a.lux-card');
 if(!link)return;
 sessionStorage.setItem(key,'1');
 if(audio.paused)void play();
},true);
if(wanted)void play();
update();
})();