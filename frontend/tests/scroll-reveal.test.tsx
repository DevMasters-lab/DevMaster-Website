import React from 'react';
import {renderToString} from 'react-dom/server';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {useScrollReveal} from '../src/hooks/use-scroll-reveal';

// Model viewport notifications, including whether a target remains observed,
// without depending on layout geometry in JSDOM.
class IntersectionHarness {
  static instances:IntersectionHarness[]=[];
  readonly targets=new Set<Element>();
  active=true;
  readonly observe=vi.fn((target:Element)=>{this.targets.add(target);});
  readonly unobserve=vi.fn((target:Element)=>{this.targets.delete(target);});
  readonly disconnect=vi.fn(()=>{this.active=false;this.targets.clear();});
  constructor(private readonly callback:IntersectionObserverCallback,readonly options?:IntersectionObserverInit){
    IntersectionHarness.instances.push(this);
  }
  intersect(target:Element,isIntersecting=true,edge:'above'|'below'='below'){
    if(!this.active||!this.targets.has(target))return;
    const top=edge==='above'?-200:1200;
    const entry={target,isIntersecting,boundingClientRect:{top,bottom:top+100},rootBounds:{top:0,bottom:900}};
    act(()=>this.callback([entry as IntersectionObserverEntry],this as unknown as IntersectionObserver));
  }
}

let reducedMotion=false;
let motionListeners:Set<(event:MediaQueryListEvent)=>void>;

beforeEach(()=>{
  IntersectionHarness.instances=[];
  reducedMotion=false;
  motionListeners=new Set();
  vi.stubGlobal('IntersectionObserver',IntersectionHarness);
  vi.stubGlobal('matchMedia',vi.fn(()=>({
    get matches(){return reducedMotion;},
    addEventListener:(_type:string,listener:(event:MediaQueryListEvent)=>void)=>motionListeners.add(listener),
    removeEventListener:(_type:string,listener:(event:MediaQueryListEvent)=>void)=>motionListeners.delete(listener),
  })));
});

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();vi.unstubAllGlobals();});

function RevealContent({extra=false,showGroup=true,focusCard=false,cardInert=false,cardHidden=false}:{extra?:boolean;showGroup?:boolean;focusCard?:boolean;cardInert?:boolean;cardHidden?:boolean}){
  const ref=useScrollReveal<HTMLDivElement>();
  return <div ref={ref}>
    <h2 data-reveal data-testid="heading">Technology expertise</h2>
    {showGroup&&<section data-reveal data-testid="group" inert={cardInert} aria-hidden={cardHidden||undefined}>
      <article data-reveal data-testid="card"><button type="button" autoFocus={focusCard}>Explore skills</button></article>
    </section>}
    {extra&&<p data-reveal data-testid="extra">Additional expertise</p>}
  </div>;
}

function observerFor(role:'entry'|'exit'){
  const margin=role==='entry'?'0px':'48px';
  const observer=IntersectionHarness.instances.findLast(instance=>instance.active&&instance.options?.rootMargin===margin);
  if(!observer)throw new Error('Missing '+role+' observer');
  return observer;
}

function changeMotion(reduced:boolean){
  act(()=>{
    reducedMotion=reduced;
    const event={matches:reduced} as MediaQueryListEvent;
    motionListeners.forEach(listener=>listener(event));
  });
}

describe('scroll reveal progressive enhancement',()=>{
  it('renders readable server HTML before browser enhancement runs',()=>{
    const html=renderToString(<RevealContent/>);
    expect(html).toContain('Technology expertise');
    expect(html).not.toContain('data-reveal-state');
    expect(IntersectionHarness.instances).toHaveLength(0);
  });

  it('reveals entering content immediately without relying on animation frames',()=>{
    vi.stubGlobal('requestAnimationFrame',undefined);
    render(<RevealContent/>);
    const heading=screen.getByTestId('heading');
    expect(heading).toHaveAttribute('data-reveal-state','pending');
    observerFor('entry').intersect(heading,false);
    expect(heading).toHaveAttribute('data-reveal-state','pending');
    observerFor('entry').intersect(heading);
    expect(heading).toHaveAttribute('data-reveal-state','revealed');
    expect(screen.getByTestId('card')).toHaveAttribute('data-reveal-state','pending');
  });

  it('starts an initially visible target on mount and fresh remount without waiting for observer delivery',()=>{
    const getRect=HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
      return this.dataset.testid==='heading'?new DOMRect(0,100,320,100):getRect.call(this);
    });
    const first=render(<RevealContent/>);
    expect(screen.getByTestId('heading')).toHaveAttribute('data-reveal-state','revealed');
    first.unmount();
    render(<RevealContent/>);
    expect(screen.getByTestId('heading')).toHaveAttribute('data-reveal-state','revealed');
  });

  it.each(['inert','aria-hidden'] as const)('waits for observer entry when an initially overlapping target has an %s ancestor',kind=>{
    const getRect=HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
      return this.dataset.testid==='card'?new DOMRect(0,100,320,100):getRect.call(this);
    });
    render(<RevealContent cardInert={kind==='inert'} cardHidden={kind==='aria-hidden'}/>);
    expect(screen.getByTestId('card')).toHaveAttribute('data-reveal-state','pending');
    expect(observerFor('entry').targets.has(screen.getByTestId('card'))).toBe(true);
  });

  it.each(['above','below'] as const)('replays after repeated exits %s the viewport',edge=>{
    render(<RevealContent/>);
    const heading=screen.getByTestId('heading');
    for(let cycle=0;cycle<3;cycle++){
      observerFor('entry').intersect(heading);
      expect(heading).toHaveAttribute('data-reveal-state','revealed');
      fireEvent.animationEnd(heading);
      expect(heading).toHaveAttribute('data-reveal-state','visible');
      observerFor('exit').intersect(heading,false,edge);
      expect(heading).toHaveAttribute('data-reveal-state','pending');
    }
    observerFor('entry').intersect(heading);
    expect(heading).toHaveAttribute('data-reveal-state','revealed');
  });

  it('does not flicker when crossing the entry threshold while still inside the exit buffer',()=>{
    render(<RevealContent/>);
    const heading=screen.getByTestId('heading');
    observerFor('entry').intersect(heading);
    observerFor('entry').intersect(heading,false);
    observerFor('exit').intersect(heading,true);
    expect(heading).toHaveAttribute('data-reveal-state','revealed');
    fireEvent.animationEnd(heading);
    observerFor('entry').intersect(heading,false);
    expect(heading).toHaveAttribute('data-reveal-state','visible');
  });

  it.each([false,true])('can replay after a fresh mount with StrictMode=%s',strict=>{
    const content=()=>strict?<React.StrictMode><RevealContent/></React.StrictMode>:<RevealContent/>;
    const first=render(content());
    const firstHeading=screen.getByTestId('heading');
    observerFor('entry').intersect(firstHeading);
    expect(firstHeading).toHaveAttribute('data-reveal-state','revealed');
    first.unmount();
    expect(firstHeading).not.toHaveAttribute('data-reveal-state');

    render(content());
    const freshHeading=screen.getByTestId('heading');
    expect(freshHeading).toHaveAttribute('data-reveal-state','pending');
    observerFor('entry').intersect(freshHeading);
    expect(freshHeading).toHaveAttribute('data-reveal-state','revealed');
  });

  it('leaves content visible when IntersectionObserver is unavailable',()=>{
    vi.stubGlobal('IntersectionObserver',undefined);
    render(<RevealContent/>);
    for(const id of ['heading','group','card'])expect(screen.getByTestId(id)).not.toHaveAttribute('data-reveal-state');
  });

  it('leaves content visible when the browser cannot initialize an observer',()=>{
    vi.stubGlobal('IntersectionObserver',class {
      constructor(){throw new Error('Observer unavailable');}
    });
    render(<RevealContent/>);
    for(const id of ['heading','group','card'])expect(screen.getByTestId(id)).not.toHaveAttribute('data-reveal-state');
  });

  it('cleans up a partially initialized observer pair when the exit observer fails',()=>{
    vi.stubGlobal('IntersectionObserver',class extends IntersectionHarness {
      constructor(callback:IntersectionObserverCallback,options?:IntersectionObserverInit){
        if(options?.rootMargin==='48px')throw new Error('Exit observer unavailable');
        super(callback,options);
      }
    });
    render(<RevealContent/>);
    for(const id of ['heading','group','card'])expect(screen.getByTestId(id)).not.toHaveAttribute('data-reveal-state');
    for(const observer of IntersectionHarness.instances)expect(observer.disconnect).toHaveBeenCalled();
  });

  it('shows a target when observation fails without preventing other targets from revealing',()=>{
    vi.stubGlobal('IntersectionObserver',class extends IntersectionHarness {
      constructor(callback:IntersectionObserverCallback,options?:IntersectionObserverInit){
        super(callback,options);
        this.observe.mockImplementation(target=>{
          if((target as HTMLElement).dataset.testid==='card')throw new Error('Target could not be observed');
          this.targets.add(target);
        });
      }
    });
    render(<RevealContent/>);
    expect(screen.getByTestId('card')).toHaveAttribute('data-reveal-state','visible');
    const heading=screen.getByTestId('heading');
    observerFor('entry').intersect(heading);
    expect(heading).toHaveAttribute('data-reveal-state','revealed');
  });

  it('does not hide or observe content when reduced motion is already enabled',()=>{
    reducedMotion=true;
    render(<RevealContent/>);
    expect(IntersectionHarness.instances).toHaveLength(0);
    for(const id of ['heading','group','card'])expect(screen.getByTestId(id)).not.toHaveAttribute('data-reveal-state');
  });

  it('shows all content and cancels completion timers when reduced motion turns on',async()=>{
    vi.useFakeTimers();
    const {rerender}=render(<RevealContent/>);
    observerFor('entry').intersect(screen.getByTestId('heading'));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    changeMotion(true);
    for(const id of ['heading','group','card'])expect(screen.getByTestId(id)).toHaveAttribute('data-reveal-state','visible');
    expect(vi.getTimerCount()).toBe(0);
    for(const observer of IntersectionHarness.instances)expect(observer.disconnect).toHaveBeenCalled();

    changeMotion(false);
    await act(async()=>{rerender(<RevealContent extra/>);});
    expect([undefined,'visible']).toContain(screen.getByTestId('extra').dataset.revealState);
    expect(IntersectionHarness.instances.every(observer=>!observer.active)).toBe(true);
    act(()=>vi.advanceTimersByTime(1400));
    expect(screen.getByTestId('heading')).toHaveAttribute('data-reveal-state','visible');
  });

  it('cancels active animations and keeps focused cards and ancestors visible on exit',()=>{
    vi.useFakeTimers();
    render(<RevealContent/>);
    const schedule=vi.spyOn(window,'setTimeout');
    const cancel=vi.spyOn(window,'clearTimeout');
    const group=screen.getByTestId('group');
    const card=screen.getByTestId('card');
    observerFor('entry').intersect(group);
    observerFor('entry').intersect(card);
    const completionTimers=schedule.mock.results.map(result=>result.value);
    act(()=>screen.getByRole('button',{name:'Explore skills'}).focus());
    expect(group).toHaveAttribute('data-reveal-state','visible');
    expect(card).toHaveAttribute('data-reveal-state','visible');
    // Focusing also schedules JSDOM's selectionchange notification; verify the
    // actual completion timers were cancelled instead of counting all timers.
    expect(completionTimers).toHaveLength(2);
    for(const timer of completionTimers)expect(cancel).toHaveBeenCalledWith(timer);
    observerFor('exit').intersect(group,false);
    observerFor('exit').intersect(card,false);
    act(()=>vi.advanceTimersByTime(1400));
    expect(group).toHaveAttribute('data-reveal-state','visible');
    expect(card).toHaveAttribute('data-reveal-state','visible');
    expect(screen.getByTestId('heading')).toHaveAttribute('data-reveal-state','pending');
  });

  it('keeps already focused content and its ancestors visible during observer setup',()=>{
    render(<RevealContent focusCard/>);
    expect(screen.getByRole('button',{name:'Explore skills'})).toHaveFocus();
    for(const id of ['group','card']){
      const target=screen.getByTestId(id);
      expect([undefined,'visible']).toContain(target.dataset.revealState);
      observerFor('exit').intersect(target,false);
      expect([undefined,'visible']).toContain(target.dataset.revealState);
    }
    expect(screen.getByTestId('heading')).toHaveAttribute('data-reveal-state','pending');
  });

  it('observes inserted targets and unregisters removed targets regardless of their reveal state',async()=>{
    const {rerender}=render(<RevealContent/>);
    const group=screen.getByTestId('group');
    const card=screen.getByTestId('card');
    observerFor('entry').intersect(group);
    rerender(<RevealContent extra showGroup={false}/>);
    const extra=screen.getByTestId('extra');
    await waitFor(()=>{
      expect(extra).toHaveAttribute('data-reveal-state','pending');
      for(const role of ['entry','exit'] as const){
        const observer=observerFor(role);
        expect(observer.targets.has(extra)).toBe(true);
        expect(observer.targets.has(group)).toBe(false);
        expect(observer.targets.has(card)).toBe(false);
      }
      expect(group).not.toHaveAttribute('data-reveal-state');
      expect(card).not.toHaveAttribute('data-reveal-state');
    });
    observerFor('entry').intersect(extra);
    expect(extra).toHaveAttribute('data-reveal-state','revealed');
  });

  it.each(['pending','revealed'] as const)('can replay the same %s target after removal and reinsertion',async(state)=>{
    render(<RevealContent/>);
    const group=screen.getByTestId('group');
    const card=screen.getByTestId('card');
    if(state==='revealed')observerFor('entry').intersect(card);
    card.remove();
    await waitFor(()=>expect(card).not.toHaveAttribute('data-reveal-state'));
    group.append(card);
    await waitFor(()=>{
      expect(card).toHaveAttribute('data-reveal-state','pending');
      expect(observerFor('entry').targets.has(card)).toBe(true);
      expect(observerFor('exit').targets.has(card)).toBe(true);
    });
    observerFor('entry').intersect(card);
    expect(card).toHaveAttribute('data-reveal-state','revealed');
  });

  it.each(['missing','paused'] as const)('finishes a %s CSS animation within the bounded fallback time',mode=>{
    vi.useFakeTimers();
    render(<RevealContent/>);
    const heading=screen.getByTestId('heading');
    if(mode==='paused')heading.style.animationPlayState='paused';
    observerFor('entry').intersect(heading);
    expect(heading).toHaveAttribute('data-reveal-state','revealed');
    act(()=>vi.advanceTimersByTime(1400));
    expect(heading).toHaveAttribute('data-reveal-state','visible');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('completes early on its own animationend while ignoring animation events from descendants',()=>{
    vi.useFakeTimers();
    render(<RevealContent/>);
    const group=screen.getByTestId('group');
    observerFor('entry').intersect(group);
    fireEvent.animationEnd(screen.getByRole('button',{name:'Explore skills'}));
    expect(group).toHaveAttribute('data-reveal-state','revealed');
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    fireEvent.animationEnd(group);
    expect(group).toHaveAttribute('data-reveal-state','visible');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels completion when a target exits so an old timer cannot overwrite the reset state',()=>{
    vi.useFakeTimers();
    render(<RevealContent/>);
    const heading=screen.getByTestId('heading');
    observerFor('entry').intersect(heading);
    observerFor('exit').intersect(heading,false);
    expect(vi.getTimerCount()).toBe(0);
    act(()=>vi.advanceTimersByTime(1400));
    expect(heading).toHaveAttribute('data-reveal-state','pending');
    observerFor('entry').intersect(heading);
    expect(heading).toHaveAttribute('data-reveal-state','revealed');
  });

  it('cancels a removed target’s completion timer',async()=>{
    vi.useFakeTimers();
    render(<RevealContent/>);
    const card=screen.getByTestId('card');
    observerFor('entry').intersect(card);
    await act(async()=>{card.remove();});
    expect(vi.getTimerCount()).toBe(0);
    expect(card).not.toHaveAttribute('data-reveal-state');
    act(()=>vi.advanceTimersByTime(1400));
    expect(card).not.toHaveAttribute('data-reveal-state');
  });

  it('cancels completion timers and disconnects observers and listeners on unmount',async()=>{
    vi.useFakeTimers();
    const {unmount}=render(<RevealContent/>);
    const targets=['heading','group','card'].map(id=>screen.getByTestId(id));
    const container=targets[0].parentElement!;
    observerFor('entry').intersect(targets[0]);
    expect(motionListeners.size).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    for(const observer of IntersectionHarness.instances)expect(observer.disconnect).toHaveBeenCalled();
    expect(motionListeners.size).toBe(0);
    act(()=>vi.advanceTimersByTime(1400));
    for(const target of targets)expect(target).not.toHaveAttribute('data-reveal-state');

    const lateTarget=document.createElement('p');
    lateTarget.setAttribute('data-reveal','');
    await act(async()=>{container.append(lateTarget);});
    for(const observer of IntersectionHarness.instances)expect(observer.observe).not.toHaveBeenCalledWith(lateTarget);
    expect(lateTarget).not.toHaveAttribute('data-reveal-state');
  });
});
