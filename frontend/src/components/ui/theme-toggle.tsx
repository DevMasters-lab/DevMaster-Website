'use client';

import {useSyncExternalStore} from 'react';
import {Moon,Sun} from 'lucide-react';
import {useText} from '@/i18n/provider';
import {themeStorageKey} from '@/lib/theme';

function applyTheme(theme:'light'|'dark'){
  document.documentElement.dataset.theme=theme;
  document.documentElement.style.colorScheme=theme;
}

function subscribe(listener:()=>void){
  const observer=new MutationObserver(listener);
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const system=window.matchMedia?.('(prefers-color-scheme: dark)');
  const followSystem=()=>{
    let preference:string|null=null;
    try{preference=localStorage.getItem(themeStorageKey);}catch{}
    if(preference!=='light'&&preference!=='dark')applyTheme(system?.matches?'dark':'light');
  };
  const storage=(event:StorageEvent)=>{
    if(event.key!==themeStorageKey&&event.key!==null)return;
    if(event.newValue==='light'||event.newValue==='dark')applyTheme(event.newValue);
    else followSystem();
  };
  system?.addEventListener('change',followSystem);
  window.addEventListener('storage',storage);
  return ()=>{observer.disconnect();system?.removeEventListener('change',followSystem);window.removeEventListener('storage',storage);};
}

export function ThemeToggle(){
  const t=useText();
  const dark=useSyncExternalStore(subscribe,()=>document.documentElement.dataset.theme==='dark',()=>false);
  const label=t(dark?'Switch to light mode':'Switch to dark mode');
  return <button type="button" className="header-icon-button theme-toggle" aria-label={label} title={label} aria-pressed={dark} onClick={()=>{
    const next=dark?'light':'dark';
    applyTheme(next);
    try{localStorage.setItem(themeStorageKey,next);}catch{}
  }}>{dark?<Sun size={22} strokeWidth={1.8} aria-hidden="true"/>:<Moon size={22} strokeWidth={1.8} aria-hidden="true"/>}</button>;
}
