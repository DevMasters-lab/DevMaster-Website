'use client';
import {useText} from '@/i18n/provider';
export default function ErrorPage({reset}:{reset:()=>void}){const t=useText();return <section className="section-wrap page-content"><h1>{t('The request could not be completed.')}</h1><button type="button" className="button button-purple" onClick={reset}>{t('Try again')}</button></section>;}
