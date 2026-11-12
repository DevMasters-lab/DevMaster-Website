'use client';

import {useState} from 'react';
import {useLanguage,useText} from '@/i18n/provider';

export function LanguageSwitcher(){
  const {locale,change}=useLanguage();
  const t=useText();
  const [error,setError]=useState(false);
  const next=locale==='en'?'km':'en';
  return <div className="language-control">
    <button type="button" className="header-icon-button language-trigger" aria-label={t('Language')} title={t(next==='km'?'Switch to Khmer':'Switch to English')} onClick={()=>{
      setError(false);
      void change(next).catch(()=>setError(true));
    }}><span className="language-flag" aria-hidden="true">{locale==='en'?'🇬🇧':'🇰🇭'}</span></button>
    {error&&<span role="alert">{t('Language changed on this device. Saving your account preference failed; please try again.')}</span>}
  </div>;
}

export function SkipLink(){const t=useText();return <a href="#main" className="skip-link">{t('Skip to content')}</a>;}
