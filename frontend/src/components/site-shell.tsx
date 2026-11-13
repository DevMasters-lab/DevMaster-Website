'use client';
import {useText} from '@/i18n/provider';
import {LanguageSwitcher} from './LanguageSwitcher';
import {ThemeToggle} from './ThemeToggle';
import Link from '@/i18n/navigation';
import {usePathname} from '@/i18n/navigation';
import {ArrowUpRight} from 'lucide-react';
import {FooterBugChase} from './footer-bug-chase';
import chaseStyles from './footer-bug-chase.module.css';
export function SiteHeader(){const t=useText();const path=usePathname();if((path==='/expert'||path.startsWith('/expert/')))return null;return <header className="site-header"><Link className="brand" href="/home" aria-label={t("DevMasters home")}><img src="/logo-light.png" alt={t("DevMasters")} width="216" height="74"/></Link><div className="header-actions"><Link className="portal-link" href="/login">{""}{t("Expert login")}{""}</Link><div className="header-tools"><LanguageSwitcher/><ThemeToggle/></div><Link href="/hire-our-team" className="button button-dark small">{""}{t("Let’s work together")}{" "}<ArrowUpRight size={15}/></Link></div></header>;}
export function SiteFooter(){
  const path=usePathname();
  const t=useText();
  if(path==='/expert'||path.startsWith('/expert/'))return null;
  return <footer className={chaseStyles.footer}>
    <div className={chaseStyles.chaseArea}><FooterBugChase/></div>
    <div className={'footer-bottom '+chaseStyles.bottom}>
      <span>© {new Date().getFullYear()} {t('DevMasters. Built around people.')}</span>
      <div><Link href="/privacy">{t('Privacy policy')}</Link><Link href="/terms">{t('Terms & conditions')}</Link></div>
      <span className="footer-mark">{t('DM')}<span>✳</span></span>
    </div>
  </footer>;
}
