import {getLocale} from 'next-intl/server';
import {redirect} from 'next/navigation';
import {localePath,type Locale} from '@/i18n/config';

export default async function Page(){
 redirect(localePath('/home',await getLocale() as Locale));
}
