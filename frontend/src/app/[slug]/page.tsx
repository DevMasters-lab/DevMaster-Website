import {Home} from '@/components/public-home';
import {PublicPage} from '@/components/public-page';
import {pageMetadata} from '@/i18n/server';
import {getLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
const known=new Set(['home','services','expertise','invite-us-to-bid','hire-our-team','be-our-team','contact','privacy','terms']);
async function customPage(slug:string){
 const response=await fetch(`${process.env.LARAVEL_URL||'http://127.0.0.1:8081'}/api/v1/pages/${encodeURIComponent(slug)}`,{headers:{Accept:'application/json','X-Locale':await getLocale()},cache:'no-store'});
 if(response.status===404)notFound();
 if(!response.ok)throw new Error('CMS content could not be loaded.');
 return (await response.json()).data as {title:string;body_markdown:string};
}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const metadata=await pageMetadata('/'+slug);return known.has(slug)?metadata:{...metadata,title:(await customPage(slug)).title};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;if(!known.has(slug))await customPage(slug);return slug==='home'?<Home/>:<PublicPage slug={slug}/>;}
