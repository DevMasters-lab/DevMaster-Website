'use client';
import {useId,useState} from 'react';
import {useLanguage,useText} from '@/i18n/provider';
import {supported} from '@/i18n/config';
export function LanguageSwitcher(){const {locale,change}=useLanguage();const id=useId();const [error,setError]=useState(false);const t=useText();return <div className="language-control"><label className="sr-only" htmlFor={id}>{t('Language')}</label><select id={id} value={locale} aria-label={t('Language')} onChange={event=>{const next=event.target.value;if(supported(next)){setError(false);void change(next).catch(()=>setError(true));}}}><option value="km" lang="km">🇰🇭 ខ្មែរ</option><option value="en" lang="en">🇬🇧 English</option></select>{error&&<span role="alert">{t('Language changed on this device. Saving your account preference failed; please try again.')}</span>}</div>;}
export function SkipLink(){const t=useText();return <a href="#main" className="skip-link">{t('Skip to content')}</a>;}
