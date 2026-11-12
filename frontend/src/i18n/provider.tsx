'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {NextIntlClientProvider,useTranslations,useLocale} from 'next-intl';
import english from '../../messages/en.json';
import khmer from '../../messages/km.json';
import {supported,localePath,type Locale} from './config';
const dictionary={en:english,km:khmer};
const sourceKeys=new Map(Object.entries(english.ui).map(([key,value])=>[value,key]));
const khmerKeys=new Map(Object.entries(khmer.ui).map(([key,value])=>[value,key]));
const LocaleContext=createContext<{locale:Locale;change:(locale:Locale,persist?:boolean)=>Promise<void>}>({locale:'km',change:async()=>{}});
export function LocaleProvider({initialLocale,children}:{initialLocale:Locale;children:React.ReactNode}){
 const [locale,setLocale]=useState(initialLocale);
 async function change(next:Locale,persist=true){
  if(!supported(next))return;
  setLocale(next);document.documentElement.lang=next;document.cookie=`devmasters_locale=${next};path=/;max-age=31536000;samesite=lax`;
  window.history.replaceState(window.history.state,'',localePath(window.location.pathname,next)+window.location.search+window.location.hash);
  const normalized=window.location.pathname.replace(/^\/(km|en)(?=\/|$)/,'')||'/';const titles:Record<string,string>={'/':'DevMasters — Digital services. Human expertise.','/home':'DevMasters — Digital services. Human expertise.','/services':'OUR SERVICES','/expertise':'OUR EXPERTISE','/invite-us-to-bid':'INVITE US TO BID','/hire-our-team':'HIRE OUR TEAM','/be-our-team':'BE OUR TEAM','/contact':'CONTACT US','/privacy':'PRIVACY POLICY','/terms':'TERMS & CONDITIONS','/login':'Expert sign in','/forgot-password':'Password recovery','/reset-password':'Reset password'};const source=titles[normalized]||(normalized.startsWith('/application-corrections/')?'Application corrections':'Expert Portal');const key=sourceKeys.get(source);document.title=(key?(dictionary[next].ui as Record<string,string>)[key]:source)+(normalized==='/'||normalized==='/home'?'':' · DevMasters');
  document.querySelector('link[rel=canonical]')?.setAttribute('href',window.location.origin+window.location.pathname);
  window.dispatchEvent(new CustomEvent('devmasters:locale-changed',{detail:next}));
  if(persist){const {api}=await import('@/lib/api');await api('/locale',{method:'POST',body:JSON.stringify({locale:next})});}
 }
 useEffect(()=>{const listener=(event:Event)=>{const next=(event as CustomEvent).detail;if(supported(next)&&next!==locale)void change(next,false);};window.addEventListener('devmasters:preferred-locale',listener);return()=>window.removeEventListener('devmasters:preferred-locale',listener);},[locale]);
 return <LocaleContext.Provider value={{locale,change}}><NextIntlClientProvider locale={locale} messages={dictionary[locale]} timeZone="Asia/Phnom_Penh">{children}</NextIntlClientProvider></LocaleContext.Provider>;
}
export const useLanguage=()=>useContext(LocaleContext);
export function useText(){const translate=useTranslations('ui');return (source:string,values?:Record<string,string|number>)=>{const key=sourceKeys.get(source)||khmerKeys.get(source);return key?translate(key,values):source;};}
export function useDate(){const locale=useLocale();return (value:string|null|undefined)=>value?new Intl.DateTimeFormat(locale==='km'?'km-KH':'en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Phnom_Penh'}).format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T12:00:00':value)):dictionary[locale as Locale].common.unspecified;}
export function useStatus(){const locale=useLocale();return(value:string)=>(dictionary[locale as Locale].status as Record<string,string>)[value]??value.replaceAll('_',' ');}
