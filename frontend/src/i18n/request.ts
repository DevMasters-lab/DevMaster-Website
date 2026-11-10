import {cookies,headers} from 'next/headers';
import {getRequestConfig} from 'next-intl/server';
import {supported} from './config';
export default getRequestConfig(async()=>{const header=(await headers()).get('x-devmasters-locale');const cookie=(await cookies()).get('devmasters_locale')?.value;const locale=supported(header)?header:supported(cookie)?cookie:'km';return {locale,messages:(await import(`../../messages/${locale}.json`)).default,timeZone:'Asia/Phnom_Penh'};});
