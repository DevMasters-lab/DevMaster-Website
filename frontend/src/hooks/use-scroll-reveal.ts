'use client';

import {useEffect,useRef} from 'react';

const targetSelector='[data-reveal]';
// Longer than the 720ms animation plus its maximum 360ms stagger.
const completionTimeout=1400;
const entryThreshold=.12;

/** Replay entrance animations when content leaves and returns to the viewport. */
export function useScrollReveal<T extends HTMLElement=HTMLDivElement>(){
  const ref=useRef<T>(null);

  useEffect(()=>{
    const root=ref.current;
    const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if(!root||!preference||preference.matches||typeof IntersectionObserver!=='function')return;

    const targets=new Set<HTMLElement>();
    const completions=new Map<HTMLElement,number>();
    const eligibility=new Map<HTMLElement,boolean>();
    let enabled=true;
    let entryObserver:IntersectionObserver|undefined;
    let exitObserver:IntersectionObserver|undefined;

    function canReveal(target:HTMLElement){
      return !target.closest('[inert],[aria-hidden="true"]');
    }

    function visiblyOverlaps(target:HTMLElement){
      const rect=target.getBoundingClientRect();
      if(rect.width<=0||rect.height<=0)return false;
      const width=Math.max(0,Math.min(rect.right,window.innerWidth)-Math.max(rect.left,0));
      const height=Math.max(0,Math.min(rect.bottom,window.innerHeight)-Math.max(rect.top,0));
      return width*height/(rect.width*rect.height)>=entryThreshold;
    }

    function cancelCompletion(target:HTMLElement){
      const timer=completions.get(target);
      if(timer!==undefined)window.clearTimeout(timer);
      completions.delete(target);
    }

    function showImmediately(target:HTMLElement){
      cancelCompletion(target);
      target.dataset.revealState='visible';
    }

    function reset(target:HTMLElement){
      cancelCompletion(target);
      target.dataset.revealState=enabled&&!target.contains(document.activeElement)?'pending':'visible';
    }

    function reveal(target:HTMLElement){
      if(target.dataset.revealState!=='pending'||!canReveal(target))return;
      if(target.contains(document.activeElement)){
        showImmediately(target);
        return;
      }
      target.dataset.revealState='revealed';
      // Content must become readable even if an animation is paused or its event is lost.
      completions.set(target,window.setTimeout(()=>{
        if(targets.has(target)&&target.dataset.revealState==='revealed')showImmediately(target);
      },completionTimeout));
    }

    try{
      entryObserver=new IntersectionObserver(entries=>{
        if(!enabled)return;
        for(const entry of entries){
          const target=entry.target as HTMLElement;
          if(entry.isIntersecting&&entry.intersectionRatio>=entryThreshold&&targets.has(target))reveal(target);
        }
      },{rootMargin:'0px',threshold:entryThreshold});
      // A wider exit area prevents entrance motion or hover from retriggering itself.
      exitObserver=new IntersectionObserver(entries=>{
        if(!enabled)return;
        for(const entry of entries){
          const target=entry.target as HTMLElement;
          if(!entry.isIntersecting&&targets.has(target))reset(target);
        }
      },{rootMargin:'48px',threshold:0});
    }catch{
      entryObserver?.disconnect();
      exitObserver?.disconnect();
      return;
    }
    const entry=entryObserver;
    const exit=exitObserver;

    function scan(){
      for(const target of targets){
        if(!root!.contains(target)){
          cancelCompletion(target);
          entry.unobserve(target);
          exit.unobserve(target);
          targets.delete(target);
          eligibility.delete(target);
          target.removeAttribute('data-reveal-state');
        }
      }
      for(const target of root!.querySelectorAll<HTMLElement>(targetSelector)){
        const eligible=canReveal(target);
        if(targets.has(target)){
          if(eligibility.get(target)!==eligible){
            eligibility.set(target,eligible);
            reset(target);
            if(enabled&&eligible&&visiblyOverlaps(target))reveal(target);
          }
          continue;
        }
        targets.add(target);
        eligibility.set(target,eligible);
        if(!enabled)continue;
        reset(target);
        try{
          entry.observe(target);
          exit.observe(target);
        }catch{
          showImmediately(target);
          entry.unobserve(target);
          exit.unobserve(target);
          continue;
        }
        // Refresh can restore a scroll position before observers deliver their first entries.
        if(eligible&&visiblyOverlaps(target))reveal(target);
      }
    }

    function revealFocused(event:FocusEvent){
      let target=event.target instanceof Element?event.target:null;
      while(target&&root!.contains(target)){
        if(target.matches(targetSelector))showImmediately(target as HTMLElement);
        target=target.parentElement;
      }
    }

    function finishAnimation(event:AnimationEvent){
      const target=event.target;
      if(target instanceof HTMLElement&&targets.has(target)&&target.dataset.revealState==='revealed')showImmediately(target);
    }

    function respectMotionPreference(){
      if(!preference!.matches)return;
      enabled=false;
      for(const target of targets)showImmediately(target);
      entry.disconnect();
      exit.disconnect();
    }

    scan();
    const mutations=typeof MutationObserver==='function'?new MutationObserver(scan):null;
    mutations?.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['inert','aria-hidden']});
    root.addEventListener('focusin',revealFocused);
    root.addEventListener('animationend',finishAnimation);
    preference.addEventListener('change',respectMotionPreference);

    return ()=>{
      enabled=false;
      entry.disconnect();
      exit.disconnect();
      mutations?.disconnect();
      root.removeEventListener('focusin',revealFocused);
      root.removeEventListener('animationend',finishAnimation);
      preference.removeEventListener('change',respectMotionPreference);
      for(const target of targets){
        cancelCompletion(target);
        target.removeAttribute('data-reveal-state');
      }
      targets.clear();
      eligibility.clear();
    };
  },[]);

  return ref;
}
