'use client';

import {ArrowRight,Asterisk,Sparkles} from 'lucide-react';
import {useEffect,useId,useRef,useState} from 'react';
import {useText} from '@/i18n/provider';
import {EngagementDialog,type EngagementKind} from './engagement-dialog';
import styles from './home-engagement-actions.module.css';

function EngagementArtwork({kind}:{kind:EngagementKind}){
  return <span className={styles.artwork} aria-hidden="true">
    <svg viewBox="0 0 120 100" fill="none" focusable="false">
      {kind==='bid'?<>
        <g className={styles.paper}>
          <rect x="27" y="10" width="56" height="77" rx="8" fill="#f8ffe8" stroke="#78954f" strokeWidth="2"/>
          <path d="M40 26H65" stroke="#a3b783" strokeWidth="5" strokeLinecap="round"/>
          <g stroke="#4c8569" strokeWidth="3.5" strokeLinecap="round">
            <path className={styles.writingLine} pathLength="1" d="M40 41H69"/>
            <path className={`${styles.writingLine} ${styles.lineTwo}`} pathLength="1" d="M40 52H67"/>
            <path className={`${styles.writingLine} ${styles.lineThree}`} pathLength="1" d="M40 63H59"/>
          </g>
        </g>
        <g className={styles.pen}>
          {/* The nib is the local origin, so its motion follows each written line. */}
          <g transform="rotate(28)">
            <path d="M-4-39H4V-10L0 0L-4-10Z" fill="#346756"/>
            <path d="M-4-39H4V-32H-4Z" fill="#f8ffe8"/>
            <path d="M-4-10H4L0 0Z" fill="#f1cf94"/>
            <path d="M-1.5-4H1.5L0 0Z" fill="#25463e"/>
          </g>
        </g>
      </>:kind==='partner'?<>
        <g className={styles.handshake} strokeLinejoin="round">
          <g className={styles.handLeft}>
            <path d="M22 47L39 37L55 43L48 64L33 61Z" fill="#e7b97e"/>
            <rect x="10" y="45" width="17" height="23" rx="4" fill="#659ec6"/>
            <path d="M27 44L35 48L28 66L21 63Z" fill="#3d6e91"/>
          </g>
          <g className={styles.handRight}>
            <path d="M96 46L79 37L64 43L72 64L88 60Z" fill="#f8ce97"/>
            <rect x="93" y="44" width="17" height="23" rx="4" fill="#8bb74c"/>
            <path d="M92 43L84 47L92 65L99 62Z" fill="#b8df64"/>
          </g>
          <g className={styles.handJoin}>
            <path d="M41 44L55 37L68 39L87 55L69 74C66 77 62 77 59 74L36 57Z" fill="#f8ce97" stroke="#9a6d46" strokeWidth="2.5"/>
            <path d="M55 37L43 48C40 51 44 56 48 54L58 48L75 62" fill="#e8b780" stroke="#9a6d46" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M47 61L60 72M55 57L68 68M63 53L76 64" stroke="#9a6d46" strokeWidth="2.5" strokeLinecap="round"/>
          </g>
        </g>
        <path className={styles.sparkle} d="M61 8L65 20L78 23L67 30L68 43L58 35L46 40L50 27L41 18L54 18Z" fill="#c9f36d"/>
      </>:<>
        <g className={styles.profile}>
          <circle cx="51" cy="28" r="14" fill="#c9f36d"/>
          <path d="M24 81V73C24 57 36 44 51 44C66 44 78 57 78 73V81Z" fill="#c9f36d"/>
        </g>
        <circle className={styles.badgeHalo} cx="84" cy="65" r="21" stroke="#c9f36d" strokeWidth="2"/>
        <g className={styles.badge}>
          <circle cx="84" cy="65" r="17" fill="#173b49" stroke="#c9f36d" strokeWidth="2.5"/>
          <path d="M84 56V74M75 65H93" stroke="#c9f36d" strokeWidth="3" strokeLinecap="round"/>
        </g>
        <path className={styles.sparkle} d="M18 15L21 22L28 25L21 28L18 35L15 28L8 25L15 22Z" fill="#b6dc6d"/>
      </>}
    </svg>
  </span>;
}

const engagements=[
  {kind:'bid',Icon:ArrowRight,title:'Invite Us to Bid',description:'Bring us your project. Let’s deliver it together.'},
  {kind:'partner',Icon:Sparkles,title:'Partner With Our Experts',description:'Find developers and specialists for your team.'},
  {kind:'expert',Icon:Asterisk,title:'Become an Expert',description:'Apply to join the DevMasters expert network.'},
] as const;

export function HomeEngagementActions(){
  const t=useText();
  const ref=useRef<HTMLDivElement>(null);
  const triggers=useRef<Partial<Record<EngagementKind,HTMLButtonElement|null>>>({});
  const dialogId=useId();
  const [activeDialog,setActiveDialog]=useState<EngagementKind|'portal'|null>(null);
  const [running,setRunning]=useState(false);
  function close(kind:EngagementKind|'portal'){
    if(activeDialog!==kind)return;
    setActiveDialog(current=>current===kind?null:current);
    triggers.current[kind==='portal'?'expert':kind]?.focus();
  }

  useEffect(()=>{
    const root=ref.current;
    if(!root)return;
    const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    // Start immediately after a refresh, before the observer's first delivery.
    const bounds=root.getBoundingClientRect();
    let inView=bounds.width>0&&bounds.height>0&&bounds.bottom>-80&&bounds.top<window.innerHeight+80&&bounds.right>-80&&bounds.left<window.innerWidth+80;
    const update=()=>setRunning(inView&&!preference?.matches&&document.visibilityState!=='hidden');
    let observer:IntersectionObserver|undefined;
    if(typeof IntersectionObserver==='function'){
      try{
        observer=new IntersectionObserver(entries=>{
          inView=entries.some(entry=>entry.target===root&&entry.isIntersecting);
          update();
        },{rootMargin:'80px',threshold:0});
        observer.observe(root);
      }catch{
        observer?.disconnect();
        inView=true;
      }
    }else inView=true;
    preference?.addEventListener('change',update);
    document.addEventListener('visibilitychange',update);
    update();
    return()=>{
      observer?.disconnect();
      preference?.removeEventListener('change',update);
      document.removeEventListener('visibilitychange',update);
    };
  },[]);

  return <><div ref={ref} className={styles.actions} data-running={running?'true':'false'}>
    {engagements.map(({kind,Icon,title,description},index)=>{
      const content=<>
        <span className={styles.leadingIcon}><Icon size={23} aria-hidden="true"/></span>
        <span className={styles.copy}>
          <span className={styles.title}>{t(title)}</span>
          <span className={styles.description}>{t(description)}</span>
        </span>
        <EngagementArtwork kind={kind}/>
      </>;
      return <div key={kind} className={styles.reveal} data-reveal={index%2===0?'left':'right'} data-reveal-delay={index*2}>
        <button ref={node=>{triggers.current[kind]=node;}} type="button" className={`${styles.card} ${styles[kind]}`} aria-haspopup="dialog" aria-controls={dialogId+'-'+kind} onClick={()=>setActiveDialog(kind)}>{content}</button>
      </div>;
    })}
  </div>{engagements.map(({kind})=>kind==='expert'
    ?<EngagementDialog key={kind} id={dialogId+'-'+kind} kind="expert" open={activeDialog==='expert'} onClose={()=>close('expert')} onSignIn={()=>setActiveDialog('portal')}/>
    :<EngagementDialog key={kind} id={dialogId+'-'+kind} kind={kind} open={activeDialog===kind} onClose={()=>close(kind)}/>) }
    <EngagementDialog id={dialogId+'-portal'} kind="portal" open={activeDialog==='portal'} onClose={()=>close('portal')} onBecomeExpert={()=>setActiveDialog('expert')}/>
  </>;
}
