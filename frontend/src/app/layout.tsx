import type {Metadata} from 'next';
import {getLocale} from 'next-intl/server';
import './globals.css';
import {Providers} from '@/components/providers';
import {LocaleProvider} from '@/i18n/provider';
import type {Locale} from '@/i18n/config';
import {serverText,pageMetadata} from '@/i18n/server';
import {SiteHeader,SiteFooter} from '@/components/site-shell';
import {NativeValidation} from '@/i18n/NativeValidation';
import {SkipLink} from '@/components/LanguageSwitcher';
import {themeInitScript} from '@/lib/theme';
import {reloadScrollInitScript} from '@/lib/reload-scroll';
import {PageContent} from '@/components/page-content';
import {SiteLoader} from '@/components/site-loader';
import {siteLoaderInitScript} from '@/lib/site-loader';
export async function generateMetadata():Promise<Metadata>{return {...await pageMetadata('/'),metadataBase:new URL(process.env.FRONTEND_URL||'http://localhost:3000'),description:await serverText('Software, networks, cybersecurity and data. Connect with DevMasters for specialist teams, technical partnerships and an independent expert network.')};}
export default async function RootLayout({children}:{children:React.ReactNode}){const locale=await getLocale() as Locale;return <html lang={locale} dir="ltr" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeInitScript}}/><script dangerouslySetInnerHTML={{__html:reloadScrollInitScript}}/><script dangerouslySetInnerHTML={{__html:siteLoaderInitScript}}/></head><body><LocaleProvider initialLocale={locale}><Providers><SiteLoader/><NativeValidation/><SkipLink/><SiteHeader/><PageContent>{children}</PageContent><SiteFooter/></Providers></LocaleProvider></body></html>;}
