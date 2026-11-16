'use client';

import {useEffect,useRef,type CSSProperties} from 'react';
import {ArrowRight,Atom,Box,X} from 'lucide-react';
import {useText} from '@/i18n/provider';
import {technologySkillCategories,type TechnologySkill} from '@/data/technology-skills';
import {getTechnologySkillDetails} from '@/data/technology-skill-details';
import {getTechnologyTileAppearance} from '@/data/technology-skill-tiles';
import styles from './technology-skill-drawer.module.css';

type SkillDrawerProps={id:string;skill:TechnologySkill|null;open:boolean;onClose:()=>void;onPartner:()=>void};

export function TechnologySkillDrawer({id,skill,open,onClose,onPartner}:SkillDrawerProps){
  const t=useText();
  const dialogRef=useRef<HTMLDialogElement>(null);
  const headingRef=useRef<HTMLHeadingElement>(null);
  const partnerRequested=useRef(false);

  useEffect(()=>{
    const dialog=dialogRef.current;
    if(!dialog)return;
    if(open&&skill){
      partnerRequested.current=false;
      dialog.scrollTop=0;
      if(!dialog.open)dialog.showModal();
      headingRef.current?.focus({preventScroll:true});
    }else if(dialog.open)dialog.close();
  },[open,skill]);

  useEffect(()=>{
    if(!open)return;
    const body=document.body;
    const overflow=body.style.overflow;
    const padding=body.style.paddingRight;
    const scrollbarWidth=Math.max(0,window.innerWidth-document.documentElement.clientWidth);
    const currentPadding=parseFloat(getComputedStyle(body).paddingRight)||0;
    body.style.overflow='hidden';
    if(scrollbarWidth)body.style.paddingRight=`${currentPadding+scrollbarWidth}px`;
    return()=>{body.style.overflow=overflow;body.style.paddingRight=padding;};
  },[open]);

  const appearance=skill?getTechnologyTileAppearance(skill):null;
  const details=skill?getTechnologySkillDetails(skill):null;
  const iconStyle=appearance?{'--technology-color':appearance.color,'--technology-tint':appearance.tint} as CSSProperties:undefined;
  const categories=skill?technologySkillCategories.filter(category=>skill.categoryIds.includes(category.id)):[];
  function close(){dialogRef.current?.close();}

  return <dialog ref={dialogRef} id={id} className={styles.drawer} aria-labelledby={id+'-title'} aria-describedby={id+'-description'}
    onClose={()=>{if(partnerRequested.current){partnerRequested.current=false;onPartner();}else onClose();}}
    onCancel={event=>{event.preventDefault();close();}}
    onKeyDown={event=>{
      if(event.key!=='Tab')return;
      const buttons=event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      const first=buttons[0];
      const last=buttons[buttons.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }}
    onClick={event=>{
      if(event.target!==event.currentTarget)return;
      const bounds=event.currentTarget.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)close();
    }}>
    <div className={styles.layout}>
      <div className={styles.topbar}>
        <span>{t('Technology / Expertise')}</span>
        <button type="button" className={styles.close} aria-label={t('Close technology details')} onClick={close}><X size={22} aria-hidden="true"/></button>
      </div>
      {skill&&details&&<>
        <div className={styles.content}>
          <span className={styles.icon} style={iconStyle} aria-hidden="true">
            {skill.id==='react'?<Atom size={37} strokeWidth={1.6}/>:skill.id==='docker'?<Box size={35} strokeWidth={1.7}/>:appearance?.label}
          </span>
          <span className={styles.eyebrow}>{t('Technology expertise')}</span>
          <h2 ref={headingRef} id={id+'-title'} className={styles.title} tabIndex={-1}>{skill.name}</h2>
          <p id={id+'-description'} className={styles.description}>{t(details.description,{technology:skill.name})}</p>
          <div className={styles.applications}>
            <h3>{t('Where it can be applied')}</h3>
            <ul>{details.applications.map(application=><li key={application}>{t(application)}</li>)}</ul>
          </div>
          <div className={styles.categories}>
            <h3>{t('Related categories')}</h3>
            <ul>{categories.map(category=><li key={category.id}>{t(category.name)}</li>)}</ul>
          </div>
          <div className={styles.note}>{t('Tell us about your project and the specialist skills you need. Our team will review your request and follow up.')}</div>
        </div>
        <div className={styles.footer}>
          <button type="button" className={styles.partner} aria-haspopup="dialog" onClick={()=>{partnerRequested.current=true;close();}}>{t('Partner with our specialists')}<ArrowRight size={20} aria-hidden="true"/></button>
        </div>
      </>}
    </div>
  </dialog>;
}
