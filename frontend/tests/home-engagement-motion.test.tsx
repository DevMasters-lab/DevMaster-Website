import React from 'react';
import {renderToString} from 'react-dom/server';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,render} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {HomeEngagementActions} from '../src/components/home-engagement-actions';

class ViewportObserver{
  static instances:ViewportObserver[]=[];
  targets=new Set<Element>();
  active=true;
  readonly disconnect=vi.fn(()=>{this.active=false;this.targets.clear();});
  constructor(private callback:IntersectionObserverCallback){ViewportObserver.instances.push(this);}
  observe(target:Element){this.targets.add(target);}
  unobserve(target:Element){this.targets.delete(target);}
  intersect(target:Element,isIntersecting:boolean){
    if(!this.active||!this.targets.has(target))return;
    act(()=>this.callback([{target,isIntersecting,intersectionRatio:isIntersecting?1:0} as IntersectionObserverEntry],this as unknown as IntersectionObserver));
  }
}
let reducedMotion=false;
let visibility:DocumentVisibilityState='visible';
let motionListeners:Set<()=>void>;
beforeEach(()=>{
  window.history.replaceState(null,'','/en/home');
  reducedMotion=false;visibility='visible';motionListeners=new Set();ViewportObserver.instances=[];
  vi.stubGlobal('IntersectionObserver',ViewportObserver);
  vi.stubGlobal('matchMedia',()=>({
    get matches(){return reducedMotion;},
    addEventListener:(_event:string,listener:()=>void)=>motionListeners.add(listener),
    removeEventListener:(_event:string,listener:()=>void)=>motionListeners.delete(listener),
  }));
  vi.spyOn(document,'visibilityState','get').mockImplementation(()=>visibility);
  vi.spyOn(document,'hidden','get').mockImplementation(()=>visibility==='hidden');
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});

function Actions(){return <LocaleProvider initialLocale="en"><HomeEngagementActions/></LocaleProvider>;}
function renderActions(){const view=render(<Actions/>);return {...view,root:view.container.firstElementChild as HTMLElement};}
function intersect(root:HTMLElement,value:boolean){
  const observer=ViewportObserver.instances.find(instance=>instance.active&&instance.targets.has(root));
  if(!observer)throw new Error('Missing engagement viewport observer');
  observer.intersect(root,value);
}
function motion(value:boolean){act(()=>{reducedMotion=value;motionListeners.forEach(listener=>listener());});}
function pageVisibility(value:DocumentVisibilityState){act(()=>{visibility=value;document.dispatchEvent(new Event('visibilitychange'));});}

describe('homepage engagement motion policy',()=>{
  it('renders readable actions with motion inactive before hydration',()=>{
    const container=document.createElement('div');container.innerHTML=renderToString(<Actions/>);
    const root=container.firstElementChild!;
    expect(root).toHaveAttribute('data-running','false');
    expect(root).not.toHaveAttribute('aria-hidden','true');
    expect(root.querySelector('[inert]')).toBeNull();
    expect(root.querySelectorAll('a')).toHaveLength(0);
    const buttons=root.querySelectorAll('button[aria-haspopup="dialog"]');
    expect(buttons).toHaveLength(3);
    expect([...buttons].map(button=>button.textContent)).toEqual([expect.stringContaining('Invite Us to Bid'),expect.stringContaining('Partner With Our Experts'),expect.stringContaining('Become an Expert')]);
    expect(ViewportObserver.instances).toHaveLength(0);
    expect(motionListeners.size).toBe(0);
  });
  it('runs while the actions are onscreen and pauses when they leave the viewport',()=>{
    const {root}=renderActions();
    expect(root).toHaveAttribute('data-running','false');
    intersect(root,true);expect(root).toHaveAttribute('data-running','true');
    intersect(root,false);expect(root).toHaveAttribute('data-running','false');
    intersect(root,true);expect(root).toHaveAttribute('data-running','true');
  });
  it.each([
    {name:'a visible page',page:'visible' as const,reduced:false,running:'true'},
    {name:'a hidden page',page:'hidden' as const,reduced:false,running:'false'},
    {name:'a reduced-motion preference',page:'visible' as const,reduced:true,running:'false'},
  ])('uses initial visible bounds before the observer callback with $name',({page,reduced,running})=>{
    vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue(new DOMRect(40,60,300,300));
    visibility=page;reducedMotion=reduced;
    const {root}=renderActions();
    expect(root).toHaveAttribute('data-running',running);
    intersect(root,false);
    expect(root).toHaveAttribute('data-running','false');
  });
  it('respects initial and live reduced-motion preferences without starting offscreen',()=>{
    reducedMotion=true;
    const {root}=renderActions();
    intersect(root,true);expect(root).toHaveAttribute('data-running','false');
    motion(false);expect(root).toHaveAttribute('data-running','true');
    motion(true);expect(root).toHaveAttribute('data-running','false');
    intersect(root,false);motion(false);expect(root).toHaveAttribute('data-running','false');
    intersect(root,true);expect(root).toHaveAttribute('data-running','true');
  });
  it('pauses in a hidden tab and resumes only when the page and actions are visible',()=>{
    visibility='hidden';
    const {root}=renderActions();
    intersect(root,true);expect(root).toHaveAttribute('data-running','false');
    pageVisibility('visible');expect(root).toHaveAttribute('data-running','true');
    pageVisibility('hidden');expect(root).toHaveAttribute('data-running','false');
    intersect(root,false);pageVisibility('visible');expect(root).toHaveAttribute('data-running','false');
    intersect(root,true);expect(root).toHaveAttribute('data-running','true');
    motion(true);pageVisibility('hidden');pageVisibility('visible');expect(root).toHaveAttribute('data-running','false');
  });
  it('disconnects observation and removes preference and visibility listeners on unmount',()=>{
    const add=vi.spyOn(document,'addEventListener');
    const remove=vi.spyOn(document,'removeEventListener');
    const {root,unmount}=renderActions();
    intersect(root,true);
    const observer=ViewportObserver.instances.find(instance=>instance.targets.has(root))!;
    const visibilityListener=add.mock.calls.find(([type])=>type==='visibilitychange')?.[1];
    expect(visibilityListener).toBeDefined();expect(motionListeners.size).toBe(1);
    unmount();
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(motionListeners.size).toBe(0);
    expect(remove.mock.calls.some(([type,listener])=>type==='visibilitychange'&&listener===visibilityListener)).toBe(true);
  });
});
