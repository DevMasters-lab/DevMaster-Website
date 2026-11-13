'use client';
import {useText} from '@/i18n/provider';
import {LanguageSwitcher} from './LanguageSwitcher';
import {ThemeToggle} from './ThemeToggle';
import Link from '@/i18n/navigation';
import {usePathname} from '@/i18n/navigation';
import {ArrowUpRight,ArrowRight} from 'lucide-react';
import {useScrollReveal} from '@/hooks/use-scroll-reveal';
import revealStyles from './scroll-reveal.module.css';
export function SiteHeader(){const t=useText();const path=usePathname();if((path==='/expert'||path.startsWith('/expert/')))return null;return <header className="site-header"><Link className="brand" href="/home" aria-label={t("DevMasters home")}><img src="/logo-light.png" alt={t("DevMasters")} width="216" height="74"/></Link><div className="header-actions"><Link className="portal-link" href="/login">{""}{t("Expert login")}{""}</Link><div className="header-tools"><LanguageSwitcher/><ThemeToggle/></div><Link href="/hire-our-team" className="button button-dark small">{""}{t("Let’s work together")}{" "}<ArrowUpRight size={15}/></Link></div></header>;}
export function SiteFooter(){
  const path=usePathname();
  if(path==='/expert'||path.startsWith('/expert/'))return null;
  return <PublicSiteFooter/>;
}

function PublicSiteFooter(){
  const t=useText();
  const revealRef=useScrollReveal<HTMLElement>();
  return <footer ref={revealRef} className={revealStyles.scope}>
    <div className="footer-top">
      <div>
        <span className="eyebrow light" data-reveal="up">{t('GOOD WORK STARTS WITH A CONVERSATION')}</span>
        <h2 data-reveal="up" data-reveal-delay="1">{t('Let’s make')}<br/><span>{t('what’s next.')}</span></h2>
        <Link href="/contact" className="footer-contact" data-reveal="up" data-reveal-delay="2">{t('Start a conversation')} <ArrowUpRight size={24}/></Link>
      </div>
      <div className="footer-links">
        <div data-reveal="up" data-reveal-delay="2">
          <strong>{t('Explore')}</strong>
          <Link href="/services">{t('Our services')}</Link>
          <Link href="/expertise">{t('Our expertise')}</Link>
        </div>
        <div data-reveal="up" data-reveal-delay="3">
          <strong>{t('Work with us')}</strong>
          <Link href="/invite-us-to-bid">{t('Invite us to bid')}</Link>
          <Link href="/hire-our-team">{t('Hire our team')}</Link>
          <Link href="/be-our-team">{t('Be our team')}</Link>
          <Link href="/login">{t('Expert Portal')} <ArrowRight size={12}/></Link>
        </div>
      </div>
    </div>
    <div className="footer-bottom" data-reveal="up">
      <span>© {new Date().getFullYear()} {t('DevMasters. Built around people.')}</span>
      <div><Link href="/privacy">{t('Privacy policy')}</Link><Link href="/terms">{t('Terms & conditions')}</Link></div>
      <span className="footer-mark">{t('DM')}<span>✳</span></span>
    </div>
  </footer>;
}
