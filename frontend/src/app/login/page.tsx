import {pageMetadata} from '@/i18n/server';
import {AuthForm} from '@/components/auth-form';
export async function generateMetadata(){return pageMetadata('/login');}
export default function Page(){return <AuthForm mode="login"/>;}
