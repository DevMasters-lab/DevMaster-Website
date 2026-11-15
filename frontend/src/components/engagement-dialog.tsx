'use client';

import {useEffect,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {Diamond,FilePenLine,Handshake,LoaderCircle,ShieldCheck,UserRoundPlus,X} from 'lucide-react';
import {useText} from '@/i18n/provider';
import styles from './engagement-dialog.module.css';

export type EngagementKind='bid'|'partner'|'expert';

const dialogContent={
  bid:{
    title:'Invite DevMasters to Bid',
    description:'Share your project brief, timeline and supporting documents.',
    eyebrow:'Project invitation',
    sideLabel:'Project opportunity',
    sideTitle:'Bring us into your next opportunity.',
    sideDescription:'From the first brief to project delivery, let’s explore how we can work together.',
    closeLabel:'Close project invitation',
    Icon:FilePenLine,
  },
  partner:{
    title:'Partner With Our Experts',
    description:'Tell us which specialists you need and how you would like to work together.',
    eyebrow:'Expert collaboration',
    sideLabel:'Technical partnership',
    sideTitle:'Great teams build together.',
    sideDescription:'Strengthen your team with the specialist expertise you need.',
    closeLabel:'Close expert partnership',
    Icon:Handshake,
  },
  expert:{
    title:'Become an Expert',
    description:'Apply to join the DevMasters expert network.',
    eyebrow:'Join our network',
    sideLabel:'Join our network',
    sideTitle:'Your next chapter starts here.',
    sideDescription:'Share your expertise and discover opportunities to work with DevMasters.',
    closeLabel:'Close expert application',
    Icon:UserRoundPlus,
  },
} as const;

function FormLoading(){
  const t=useText();
  return <div className={styles.loading} role="status"><LoaderCircle size={22} className="spin" aria-hidden="true"/>{t('Loading form…')}</div>;
}

const BidCompanyForm=dynamic(()=>import('./intake-form').then(module=>module.CompanyForm),{loading:FormLoading});
const PartnershipForm=dynamic(()=>import('./expert-partnership-form').then(module=>module.ExpertPartnershipForm),{loading:FormLoading});
const ExpertApplicationForm=dynamic(()=>import('./intake-form').then(module=>module.ApplicationForm),{loading:FormLoading});

export function EngagementDialog({id,kind,open,onClose}:{id:string;kind:EngagementKind;open:boolean;onClose:()=>void}){
  const t=useText();
  const content=dialogContent[kind];
  const Icon=content.Icon;
  const dialogRef=useRef<HTMLDialogElement>(null);
  const headingRef=useRef<HTMLHeadingElement>(null);
  const [visited,setVisited]=useState(false);
  const titleId=id+'-title';
  const descriptionId=id+'-description';

  useEffect(()=>{
    const dialog=dialogRef.current;
    if(!dialog)return;
    if(open){
      setVisited(true);
      if(!dialog.open){
        dialog.showModal();
        headingRef.current?.focus({preventScroll:true});
      }
    }else if(dialog.open)dialog.close();
  },[open]);

  useEffect(()=>{
    if(!open)return;
    const body=document.body;
    const overflow=body.style.overflow;
    const padding=body.style.paddingRight;
    const scrollbarWidth=Math.max(0,window.innerWidth-document.documentElement.clientWidth);
    const currentPadding=parseFloat(window.getComputedStyle(body).paddingRight)||0;
    body.style.overflow='hidden';
    if(scrollbarWidth)body.style.paddingRight=`${currentPadding+scrollbarWidth}px`;
    return()=>{body.style.overflow=overflow;body.style.paddingRight=padding;};
  },[open]);

  function close(){dialogRef.current?.close();}

  return <dialog ref={dialogRef} id={id} className={styles.dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
    onClose={onClose} onCancel={event=>{event.preventDefault();close();}}
    onClick={event=>{
      if(event.target!==event.currentTarget)return;
      const bounds=event.currentTarget.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)close();
    }}>
    <button type="button" className={styles.closeButton} onClick={close} aria-label={t(content.closeLabel)}><X size={20} aria-hidden="true"/></button>
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><span className={styles.brandIcon}><Diamond size={20} aria-hidden="true"/></span>{t('DevMasters / Connect')}</div>
        <div className={styles.sideArt} aria-hidden="true"><Icon size={66}/></div>
        <span className={styles.sideLabel}>{t(content.sideLabel)}</span>
        <h3 className={styles.sideTitle}>{t(content.sideTitle)}</h3>
        <p className={styles.sideDescription}>{t(content.sideDescription)}</p>
        <div className={styles.sideNote}><ShieldCheck size={17} aria-hidden="true"/><span>{t('Secure submission · Reviewed by our team')}</span></div>
      </aside>
      <div className={styles.content}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>{t(content.eyebrow)}</span>
          <h2 ref={headingRef} id={titleId} className={styles.title} tabIndex={-1}>{t(content.title)}</h2>
          <p id={descriptionId} className={styles.description}>{t(content.description)}</p>
        </header>
        <div className={styles.form}>{visited&&(kind==='bid'?<BidCompanyForm type="INVITE_US_TO_BID" variant="bid-dialog"/>:kind==='partner'?<PartnershipForm/>:<ExpertApplicationForm variant="dialog"/>)}</div>
      </div>
    </div>
  </dialog>;
}
