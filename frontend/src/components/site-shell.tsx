'use client';
import {useText} from '@/i18n/provider';
import {useId,useRef,useState} from 'react';
import {ArrowRight} from 'lucide-react';
import {LanguageSwitcher} from './LanguageSwitcher';
import {ThemeToggle} from './ThemeToggle';
import Link from '@/i18n/navigation';
import {FooterBugChase} from './footer-bug-chase';
import chaseStyles from './footer-bug-chase.module.css';
import {EngagementDialog} from './engagement-dialog';
import portalStyles from './expert-portal-button.module.css';
export function SiteHeader(){
  const t=useText();
  const id=useId();
  const portalTrigger=useRef<HTMLButtonElement>(null);
  const [activeDialog,setActiveDialog]=useState<'portal'|'expert'|null>(null);
  function close(kind:'portal'|'expert'){
    if(activeDialog!==kind)return;
    setActiveDialog(current=>current===kind?null:current);
    portalTrigger.current?.focus();
  }
  return <><header className="site-header">
    <div className="section-wrap site-header-inner">
      <Link className="brand" href="/home" aria-label={t("DevMasters home")}><img src="/logo-light.png" alt={t("DevMasters")} width="216" height="74"/></Link>
      <div className="header-actions">
        <button ref={portalTrigger} type="button" className={portalStyles.trigger} aria-haspopup="dialog" aria-controls={id+'-portal'} onClick={()=>setActiveDialog('portal')}>{t('Expert Portal')}<ArrowRight size={16} aria-hidden="true"/></button>
        <div className={'header-tools '+portalStyles.tools}><ThemeToggle/><LanguageSwitcher/></div>
      </div>
    </div>
  </header>
    <EngagementDialog id={id+'-portal'} kind="portal" open={activeDialog==='portal'} onClose={()=>close('portal')} onBecomeExpert={()=>setActiveDialog('expert')}/>
    <EngagementDialog id={id+'-expert'} kind="expert" open={activeDialog==='expert'} onClose={()=>close('expert')} onSignIn={()=>setActiveDialog('portal')}/>
  </>;
}
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
