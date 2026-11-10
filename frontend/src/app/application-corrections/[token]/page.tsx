import {CorrectionForm} from '@/components/correction-form';
import {serverText} from '@/i18n/server';
export async function generateMetadata(){return {title:await serverText('Application corrections'),robots:{index:false,follow:false},referrer:'no-referrer' as const};}
export default async function Page({params}:{params:Promise<{token:string}>}){const {token}=await params;return <CorrectionForm token={token}/>;}
