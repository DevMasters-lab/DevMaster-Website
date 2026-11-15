import {Home} from '@/components/public-home';
import {PublicPage} from '@/components/public-page';
import {pageMetadata} from '@/i18n/server';
import {notFound} from 'next/navigation';

function isPublicPage(slug:string):slug is 'home'|'privacy'|'terms'{
 return slug==='home'||slug==='privacy'||slug==='terms';
}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!isPublicPage(slug))notFound();
 return pageMetadata('/'+slug);
}
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!isPublicPage(slug))notFound();
 return slug==='home'?<Home/>:<PublicPage slug={slug}/>;
}
