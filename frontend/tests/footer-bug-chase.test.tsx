import React from 'react';
import {renderToString} from 'react-dom/server';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,render} from '@testing-library/react';
import {FooterBugChase} from '../src/components/footer-bug-chase';

class ViewportObserver {
  static instances:ViewportObserver[]=[];
  readonly targets=new Set<Element>();
  active=true;
  readonly disconnect=vi.fn(()=>{this.active=false;this.targets.clear();});
  constructor(private readonly callback:IntersectionObserverCallback){ViewportObserver.instances.push(this);}
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
  reducedMotion=false;
  visibility='visible';
  motionListeners=new Set();
  ViewportObserver.instances=[];
  vi.stubGlobal('IntersectionObserver',ViewportObserver);
  vi.stubGlobal('matchMedia',()=>({
    get matches(){return reducedMotion;},
    addEventListener:(_type:string,listener:()=>void)=>motionListeners.add(listener),
    removeEventListener:(_type:string,listener:()=>void)=>motionListeners.delete(listener),
  }));
  vi.spyOn(document,'visibilityState','get').mockImplementation(()=>visibility);
  vi.spyOn(document,'hidden','get').mockImplementation(()=>visibility==='hidden');
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});

function scene(){
  const view=render(<FooterBugChase/>);
  return {...view,root:view.container.firstElementChild as HTMLElement};
}
function visible(root:HTMLElement,value:boolean){
  const observer=ViewportObserver.instances.find(instance=>instance.active&&instance.targets.has(root));
  if(!observer)throw new Error('Missing chase viewport observer');
  observer.intersect(root,value);
}
function changeMotion(value:boolean){
  act(()=>{reducedMotion=value;motionListeners.forEach(listener=>listener());});
}
function changeVisibility(value:DocumentVisibilityState){
  act(()=>{visibility=value;document.dispatchEvent(new Event('visibilitychange'));});
}

describe('decorative footer bug chase',()=>{
  it('renders a static, noninteractive SVG on the server without adding announcements or focus stops',()=>{
    const html=renderToString(<FooterBugChase/>);
    const container=document.createElement('div');
    container.innerHTML=html;
    const root=container.firstElementChild!;
    expect(root).toHaveAttribute('aria-hidden','true');
    expect(root).toHaveAttribute('data-running','false');
    expect(root.querySelector('svg')).toHaveAttribute('focusable','false');
    expect(root.querySelector('a,button,input,select,textarea,[tabindex],[role="status"],[role="alert"]')).toBeNull();
    expect(ViewportObserver.instances).toHaveLength(0);
    expect(motionListeners.size).toBe(0);
  });

  it('runs only when the footer scene enters the viewport and pauses again on exit',()=>{
    const {root}=scene();
    expect(root).toHaveAttribute('data-running','false');
    visible(root,true);
    expect(root).toHaveAttribute('data-running','true');
    visible(root,false);
    expect(root).toHaveAttribute('data-running','false');
    visible(root,true);
    expect(root).toHaveAttribute('data-running','true');
  });

  it('keeps the scene static when reduced motion is enabled before mounting',()=>{
    reducedMotion=true;
    const {root}=scene();
    ViewportObserver.instances.find(instance=>instance.targets.has(root))?.intersect(root,true);
    expect(root).toHaveAttribute('data-running','false');
  });

  it('respects live reduced-motion preferences and tab visibility without restarting offscreen motion',()=>{
    const {root}=scene();
    visible(root,true);
    changeMotion(true);
    expect(root).toHaveAttribute('data-running','false');
    changeMotion(false);
    expect(root).toHaveAttribute('data-running','true');
    changeVisibility('hidden');
    expect(root).toHaveAttribute('data-running','false');
    changeVisibility('visible');
    expect(root).toHaveAttribute('data-running','true');
    visible(root,false);
    changeVisibility('hidden');
    changeVisibility('visible');
    expect(root).toHaveAttribute('data-running','false');
  });

  it('retains reduced-motion and visibility safeguards when viewport observation is unavailable',()=>{
    vi.stubGlobal('IntersectionObserver',undefined);
    const {root}=scene();
    expect(root).toHaveAttribute('data-running','true');
    changeMotion(true);
    expect(root).toHaveAttribute('data-running','false');
    changeMotion(false);
    changeVisibility('hidden');
    expect(root).toHaveAttribute('data-running','false');
    expect(ViewportObserver.instances).toHaveLength(0);
  });

  it('disconnects viewport observation and removes preference and visibility listeners on unmount',()=>{
    const add=vi.spyOn(document,'addEventListener');
    const remove=vi.spyOn(document,'removeEventListener');
    const {root,unmount}=scene();
    visible(root,true);
    const observer=ViewportObserver.instances.find(instance=>instance.targets.has(root))!;
    const visibilityListener=add.mock.calls.find(([type])=>type==='visibilitychange')?.[1];
    expect(visibilityListener).toBeDefined();
    expect(motionListeners.size).toBe(1);
    unmount();
    expect(observer.disconnect).toHaveBeenCalled();
    expect(motionListeners.size).toBe(0);
    expect(remove.mock.calls.some(([type,listener])=>type==='visibilitychange'&&listener===visibilityListener)).toBe(true);
  });
});
