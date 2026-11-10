import {serverText} from '@/i18n/server';
import Link from '@/i18n/navigation';
export default async function NotFound(){return <section className="section-wrap page-content"><h1>{await serverText('Page not found')}</h1><Link href="/" className="button button-purple">{await serverText('Return to homepage')}</Link></section>;}
