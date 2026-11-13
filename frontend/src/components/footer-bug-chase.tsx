'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {CodingBug} from './footer-coding-bug';
import styles from './footer-bug-chase.module.css';
import {FooterAnimationJoint as Joint} from './footer-animation-joint';

/** Decorative vector animation; it never receives focus or intercepts a link. */
export function FooterBugChase(){
  const ref=useRef<HTMLDivElement>(null);
  const [running,setRunning]=useState(false);
  const hoodieId='chase-hoodie-'+useId().replaceAll(':','');

  useEffect(()=>{
    const root=ref.current;
    if(!root)return;
    const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let inView=false;
    const update=()=>setRunning(inView&&!preference?.matches&&document.visibilityState!=='hidden');
    let observer:IntersectionObserver|undefined;
    if(typeof IntersectionObserver==='function'){
      try{
        observer=new IntersectionObserver(entries=>{
          inView=entries.some(entry=>entry.target===root&&entry.isIntersecting);
          update();
        },{rootMargin:'80px',threshold:0});
        observer.observe(root);
      }catch{inView=true;}
    }else inView=true;
    preference?.addEventListener('change',update);
    document.addEventListener('visibilitychange',update);
    update();
    return ()=>{
      observer?.disconnect();
      preference?.removeEventListener('change',update);
      document.removeEventListener('visibilitychange',update);
    };
  },[]);

  return <div ref={ref} className={styles.scene} data-running={running?'true':'false'} aria-hidden="true">
    <svg viewBox="0 0 640 260" fill="none" focusable="false" preserveAspectRatio="xMidYMax meet" strokeLinecap="round" strokeLinejoin="round">
      <defs><linearGradient id={hoodieId} x1="143" y1="104" x2="194" y2="172" gradientUnits="userSpaceOnUse"><stop stopColor="#b995ff"/><stop offset="1" stopColor="#8050dd"/></linearGradient></defs>

      {/* Programming symbols float alongside the characters across the footer. */}
      <g className={styles.symbolOne} stroke="#bca5ef" strokeWidth="3"><path d="m74 79-12 11 12 11m30-22 12 11-12 11m-10-28-9 34"/></g>
      <g className={styles.symbolTwo} stroke="#87cee9" strokeWidth="3"><path d="M373 42c-8 0-10 4-10 10v5c0 5-3 8-7 8 4 0 7 3 7 8v5c0 6 2 10 10 10m22-46c8 0 10 4 10 10v5c0 5 3 8 7 8-4 0-7 3-7 8v5c0 6-2 10-10 10"/></g>
      <g className={styles.symbolThree} stroke="#c6b4f4" strokeWidth="2.5"><rect x="540" y="107" width="42" height="31" rx="7"/><path d="m549 116 6 6-6 6m13 0h10"/></g>
      <g>
        <Joint x={170} y={235} className={styles.runnerShadow}><ellipse cx="170" cy="235" rx="43" ry="6" fill="#160c2c" fillOpacity=".3"/></Joint>
        <g className={styles.speedLines} stroke="#b6a1db" strokeWidth="3" opacity=".45"><path d="M70 153h35m-48 17h47m-31 18h23"/></g>
        <Joint x={100} y={233} className={styles.dustOne} fill="#bdabe6" opacity=".35"><circle cx="115" cy="229" r="6"/><circle cx="106" cy="232" r="4"/></Joint>
        <Joint x={100} y={233} className={styles.dustTwo} fill="#bdabe6" opacity=".26"><circle cx="94" cy="231" r="5"/><circle cx="85" cy="234" r="3"/></Joint>
        <Joint x={100} y={233} className={styles.dustThree} fill="#bdabe6" opacity=".2"><circle cx="70" cy="233" r="4"/></Joint>

        <Joint x={175} y={222} className={styles.runnerJump}>
          <g className={styles.runnerBounce}>
            {/* Each thigh and bent knee moves independently of the torso. */}
            <Joint x={157} y={170} className={styles.legBack} stroke="#302448" strokeWidth="15">
              <path d="m157 170-15 25"/>
              <Joint x={142} y={195} className={styles.kneeBack}><path d="m142 195 12 23"/><path d="M150 214q7-5 12 1l16 5q7 3 3 8h-29q-8-3-2-14Z" fill="#afa2df" strokeWidth="2.5"/><path d="M152 226h28" stroke="#74d2ed" strokeWidth="3"/></Joint>
            </Joint>
            <Joint x={149} y={115} className={styles.armBack}>
              <path d="m149 115-22 23 15 15" stroke="#8050d8" strokeWidth="16"/>
              <path d="m137 150 7 5" stroke="#cbb4ff" strokeWidth="10"/>
              <path d="M144 150q8-1 10 6t-8 8q-9-2-10-8Z" fill="#ffd0b5" stroke="#49305b" strokeWidth="2"/>
            </Joint>
            {/* Coding backpack and its tiny circuit/chevron badge. */}
            <path d="M143 102q-18-4-24 11l-6 38q-1 13 15 14l20-5 8-49Z" fill="#503b82" stroke="#302448" strokeWidth="2.5"/>
            <path d="M122 116q9-6 19-1l-6 34q-7 5-17 0" fill="#665098"/>
            <path d="m126 127-5 4 4 4m10-8 4 4-5 4" stroke="#80dcf4" strokeWidth="2.5"/>
            <path d="m139 106 11 8-5 43" stroke="#ac93df" strokeWidth="4"/>

            <Joint x={176} y={171} className={styles.legFront} stroke="#382b58" strokeWidth="16">
              <path d="m176 171 12 25"/>
              <Joint x={188} y={196} className={styles.kneeFront}><path d="m188 196-9 21"/><path d="M174 215q6-5 12 0l17 5q7 2 4 8h-31q-7-3-2-13Z" fill="#e6deff" strokeWidth="2.5"/><path d="M176 226h30" stroke="#63cde8" strokeWidth="3"/><path d="m187 217 5 3" stroke="#8a72b7" strokeWidth="2"/></Joint>
            </Joint>

            <path d="M148 152h39l2 24q-18 7-44-2Z" fill="#393052" stroke="#302448" strokeWidth="2.5"/>
            <path d="M150 104q18-14 37-2 12 8 11 33l-2 28q-24 13-53 0l-4-29q-1-22 11-30Z" fill={'url(#'+hoodieId+')'} stroke="#4e3480" strokeWidth="2.5"/>
            <path d="M149 142q21 8 39-1l-3 16q-15 5-31-1Z" fill="#7246c4" fillOpacity=".5"/>
            <path d="m156 145 7 6m20-6-6 6" stroke="#c4a6fc" strokeWidth="2"/>
            <path d="M153 102q-12-8-10-20 3-13 17-13l28 9q15 11 6 26-16 15-41-2Z" fill="#8c62dc" stroke="#563588" strokeWidth="2.5"/>
            <path d="m171 107-1 16m13-16 1 14" stroke="#e4d5ff" strokeWidth="2"/>
            <circle cx="170" cy="124" r="2" fill="#e4d5ff"/><circle cx="184" cy="122" r="2" fill="#e4d5ff"/>

            {/* Oversized glasses, headphones, hair and changing expression. */}
            <Joint x={181} y={100} className={styles.headNod}>
              <path d="M158 58q-3-18 19-22 27-4 32 21l-5 30-45-4Z" fill="#292039"/>
              <path d="M160 63q7-17 28-10 22 3 23 22l-4 15q-7 19-29 14-23-4-24-22Z" fill="#ffd4b9" stroke="#49305b" strokeWidth="2.5"/>
              <ellipse cx="157" cy="79" rx="7" ry="9" fill="#f5b89e"/>
              <path d="M159 64q3-18 18-20 17-4 29 11-9 6-19 0-10 9-28 9Z" fill="#302442"/>
              <Joint x={182} y={46} className={styles.hair}><path d="M166 45q-3-12 8-16-3 8 5 8 8-14 22-9-8 4-6 11 15-5 20 6-15-3-19 6Z" fill="#302442"/></Joint>
              <path d="M151 70q-3-38 30-38 33-1 36 37" stroke="#302448" strokeWidth="9"/>
              <path d="M151 67q1-30 30-30 27 0 33 28" stroke="#c1a5f7" strokeWidth="4"/>
              <rect x="148" y="65" width="12" height="27" rx="6" fill="#6dcfe9" stroke="#4e3980" strokeWidth="2.5"/>
              <rect x="209" y="65" width="10" height="25" rx="5" fill="#9d84d8" stroke="#4e3980" strokeWidth="2.5"/>
              <g fill="#fff" fillOpacity=".85"><ellipse cx="174" cy="75" rx="9" ry="8"/><ellipse cx="196" cy="75" rx="9" ry="8"/></g>
              <Joint x={188} y={75} className={styles.eyes} fill="#35264b"><ellipse cx="177" cy="75" rx="3" ry="4"/><ellipse cx="199" cy="75" rx="3" ry="4"/></Joint>
              <g stroke="#443457" strokeWidth="2.6"><rect x="163" y="65" width="21" height="20" rx="8"/><rect x="186" y="65" width="22" height="20" rx="8"/><path d="M184 72h2m-27-2 4 2"/></g>
              <path d="m205 78 5 7-7 2" stroke="#e5a084" strokeWidth="2"/>
              <ellipse cx="184" cy="90" rx="5" ry="3" fill="#f5a9ac" fillOpacity=".7"/>
              <path className={styles.smile} d="M190 91q7 8 13-1" stroke="#8c4958" strokeWidth="2.5"/>
              <ellipse className={styles.oops} cx="198" cy="94" rx="4" ry="5" fill="#8c4958"/>
            </Joint>

            <Joint x={189} y={119} className={styles.armNet}>
              <path d="m189 119 20 20 22-17" stroke="#4e3480" strokeWidth="19"/>
              <path d="m189 118 20 20 21-17" stroke="#ad83ee" strokeWidth="14"/>
              <path d="m226 122 6 7" stroke="#dfcdff" strokeWidth="10"/>
              <path d="m236 121 61-50" stroke="#684b76" strokeWidth="6"/>
              <path d="m239 118 58-47" stroke="#d6ab80" strokeWidth="3"/>
              <path d="M231 118q6-8 12-2l3 5q-2 9-10 7-7-1-5-10Z" fill="#ffd4b9" stroke="#49305b" strokeWidth="2"/>
              <path d="M299 49q34-17 47 5l-16 49q-8 17-24 4l-21-36Z" fill="#ded5ff" fillOpacity=".12" stroke="#cab9f5" strokeWidth="1.5"/>
              <g stroke="#e6dcff" strokeOpacity=".48" strokeWidth="1"><path d="m292 58 39 38m-33-44 38 29m-26-31 29 17m-48 6 49-10m-44 23 40-12m-33 23 29-12"/></g>
              <ellipse cx="315" cy="58" rx="29" ry="20" transform="rotate(-25 315 58)" stroke="#8875bc" strokeWidth="6"/>
              <ellipse cx="315" cy="57" rx="29" ry="20" transform="rotate(-25 315 57)" stroke="#d5c7ff" strokeWidth="3"/>
            </Joint>
          </g>
        </Joint>
        <CodingBug/>
      </g>
    </svg>
  </div>;
}
