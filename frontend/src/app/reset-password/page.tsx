import {pageMetadata} from '@/i18n/server';
import {AuthForm} from '@/components/auth-form';
export async function generateMetadata(){return pageMetadata('/reset-password');}
export default function Page(){return <AuthForm mode="reset"/>;}
