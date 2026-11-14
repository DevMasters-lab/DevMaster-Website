'use client';
import {useText} from '@/i18n/provider';
import {LanguageSwitcher} from './LanguageSwitcher';
import {ThemeToggle} from './ThemeToggle';
import Link from '@/i18n/navigation';
import {ArrowUpRight} from 'lucide-react';
import {FooterBugChase} from './footer-bug-chase';
import chaseStyles from './footer-bug-chase.module.css';
export function SiteHeader(){const t=useText();return <header className="site-header"><Link className="brand" href="/home" aria-label={t("DevMasters home")}><img src="/logo-light.png" alt={t("DevMasters")} width="216" height="74"/></Link><div className="header-actions"><div className="header-tools"><LanguageSwitcher/><ThemeToggle/></div><Link href="/hire-our-team" className="button button-dark small">{""}{t("Let’s work together")}{" "}<ArrowUpRight size={15}/></Link></div></header>;}
export function SiteFooter(){
  const t=useText();
  return <footer className={chaseStyles.footer}>
    <div className={chaseStyles.chaseArea}><FooterBugChase/></div>
    <div className={'footer-bottom '+chaseStyles.bottom}>
      <span className={chaseStyles.copyright}>© {new Date().getFullYear()} {t('DevMasters. Built around people.')}</span>
      <div className={chaseStyles.bottomRight}>
        <div className={chaseStyles.legalLinks}><Link href="/privacy">{t('Privacy policy')}</Link><Link href="/terms">{t('Terms & conditions')}</Link></div>
        <span className={chaseStyles.logo}><img src="/logo-light.png" alt={t('DevMasters')} width="216" height="74"/></span>
      </div>
    </div>
  </footer>;
}
