'use client';
import NextLink from 'next/link';
import {usePathname as useNextPathname,useRouter as useNextRouter} from 'next/navigation';
import {useLanguage} from './provider';
import {localePath,stripLocale,supported} from './config';
export default function Link(props:React.ComponentProps<typeof NextLink>){const {locale}=useLanguage();return <NextLink {...props} href={typeof props.href==='string'?localePath(props.href,locale):props.href}/>;}
export function usePathname(){return stripLocale(useNextPathname());}
export function useRouter(){const router=useNextRouter();const {locale}=useLanguage();const current=()=>{const value=document.cookie.split('; ').find(c=>c.startsWith('devmasters_locale='))?.split('=')[1];return supported(value)?value:locale;};return {...router,push:(href:string)=>router.push(localePath(href,current())),replace:(href:string)=>router.replace(localePath(href,current()))};}
