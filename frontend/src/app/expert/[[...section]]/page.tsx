import {pageMetadata} from '@/i18n/server';
import {notFound} from 'next/navigation';
import {ExpertPortal} from '@/components/expert-portal';
export async function generateMetadata(){return {...await pageMetadata('/expert'),robots:{index:false,follow:false}};}
export default async function Page({params}:{params:Promise<{section?:string[]}>}){const {section=[]}=await params;if(section.length>1||!['','profile','availability','documents','offers','history','notifications','consent'].includes(section[0]||''))notFound();return <ExpertPortal section={section[0]||''}/>;}
