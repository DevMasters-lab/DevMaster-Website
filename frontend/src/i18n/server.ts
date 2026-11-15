import {getLocale,getTranslations} from 'next-intl/server';
import english from '../../messages/en.json';
import {localePath,type Locale} from './config';
const keys=new Map(Object.entries(english.ui).map(([key,value])=>[value,key]));
export async function serverText(source:string){const t=await getTranslations('ui');const key=keys.get(source);return key?t(key):source;}
const titles:Record<string,string>={'/':'DevMasters — Digital services. Human expertise.','/home':'DevMasters — Digital services. Human expertise.','/expertise':'OUR EXPERTISE','/invite-us-to-bid':'Invite Us to Bid','/hire-our-team':'Partner With Our Experts','/be-our-team':'Become an Expert','/contact':'CONTACT US','/privacy':'PRIVACY POLICY','/terms':'TERMS & CONDITIONS','/login':'Expert sign in','/forgot-password':'Password recovery','/reset-password':'Reset password'};
export async function pageMetadata(path:string){const locale=await getLocale() as Locale;return {title:await serverText(titles[path]||'DevMasters — Digital services. Human expertise.'),alternates:{canonical:localePath(path,locale),languages:{km:localePath(path,'km'),en:localePath(path,'en'),'x-default':localePath(path,'km')}}};}
