'use client';
import { useEffect, useState } from 'react';
// Mendaftarkan service worker + tombol "Pasang aplikasi" (Android/Chrome). Tidak tampil di /admin.
export default function PwaRegister(){
  const [ev,setEv]=useState(null),[hide,setHide]=useState(true);
  useEffect(()=>{
    if('serviceWorker' in navigator && location.hostname!=='localhost') navigator.serviceWorker.register('/sw.js').catch(()=>{});
    let dismissed=false; try{dismissed=localStorage.getItem('y2k-install-dismissed')==='1'}catch{}
    const on=e=>{e.preventDefault();setEv(e);setHide(dismissed)};
    const done=()=>{setEv(null);setHide(true)};
    window.addEventListener('beforeinstallprompt',on);window.addEventListener('appinstalled',done);
    return()=>{window.removeEventListener('beforeinstallprompt',on);window.removeEventListener('appinstalled',done)};
  },[]);
  if(!ev||hide||location.pathname.startsWith('/admin')) return null;
  const close=()=>{setHide(true);try{localStorage.setItem('y2k-install-dismissed','1')}catch{}};
  const install=async()=>{ev.prompt();await ev.userChoice.catch(()=>{});setEv(null)};
  return <div className="fixed bottom-4 left-4 z-40 flex max-w-[calc(100vw-6.5rem)] items-center gap-2 rounded-full border border-gold/50 bg-card py-1.5 pl-4 pr-2 text-sm shadow-xl">
    <button onClick={install} className="whitespace-nowrap font-medium text-gold">📲 Pasang aplikasi</button>
    <button onClick={close} aria-label="Tutup" className="grid h-7 w-7 place-items-center rounded-full text-stone-400 hover:text-white">✕</button></div>}
