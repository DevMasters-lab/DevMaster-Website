import React from 'react';
import {renderToString} from 'react-dom/server';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {PageContent} from '../src/components/page-content';
import {HomeEngagementActions} from '../src/components/home-engagement-actions';

const route=vi.hoisted(()=>({path:'/en/home'}));
vi.mock('next/navigation',()=>({usePathname:()=>route.path}));

class ViewportObserver {
  static instances:ViewportObserver[]=[];
  readonly targets=new Set<Element>();
  active=true;
  constructor(private readonly callback:IntersectionObserverCallback,readonly options?:IntersectionObserverInit){
    ViewportObserver.instances.push(this);
  }
  observe(target:Element){this.targets.add(target);}
  unobserve(target:Element){this.targets.delete(target);}
  disconnect(){this.active=false;this.targets.clear();}
  intersect(target:Element,isIntersecting:boolean){
    if(!this.active||!this.targets.has(target))return;
    act(()=>this.callback([{
      target,isIntersecting,intersectionRatio:isIntersecting?1:0,
    } as IntersectionObserverEntry],this as unknown as IntersectionObserver));
  }
}

beforeEach(()=>{
  route.path='/en/home';
  ViewportObserver.instances=[];
  vi.stubGlobal('IntersectionObserver',ViewportObserver);
  vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

function Content({title='Technology expertise'}:{title?:string}){
  return <LocaleProvider initialLocale="en"><PageContent>
    <h1 data-reveal="up">{title}</h1>
    <article data-reveal="up"><h2>Software Development</h2><a href="/en/privacy">Privacy policy</a></article>
  </PageContent></LocaleProvider>;
}

function observer(role:'entry'|'exit'){
  const margin=role==='entry'?'0px':'48px';
  const instance=ViewportObserver.instances.findLast(value=>value.active&&value.options?.rootMargin===margin);
  if(!instance)throw new Error('Missing page '+role+' observer');
  return instance;
}

describe('public page scroll animation',()=>{
  it('keeps server content readable inside the existing main landmark',()=>{
    const html=renderToString(<Content/>);
    expect(html).toContain('<main');
    expect(html).toContain('id="main"');
    expect(html).toContain('Technology expertise');
    expect(html).toContain('Privacy policy');
    expect(html).not.toContain('data-reveal-state');
    expect(ViewportObserver.instances).toHaveLength(0);
  });

  it('replays headings and cards after leaving and re-entering the viewport',()=>{
    render(<Content/>);
    expect(screen.getByRole('main')).toHaveAttribute('id','main');
    for(const target of [screen.getByRole('heading',{level:1}),screen.getByRole('article')]){
      observer('entry').intersect(target,true);
      expect(target).toHaveAttribute('data-reveal-state','revealed');
      fireEvent.animationEnd(target);
      expect(target).toHaveAttribute('data-reveal-state','visible');
      observer('exit').intersect(target,false);
      observer('entry').intersect(target,true);
      expect(target).toHaveAttribute('data-reveal-state','revealed');
    }
  });

  it('reveals the real engagement cards independently, replays them, and preserves focused content',()=>{
    render(<LocaleProvider initialLocale="en"><PageContent><HomeEngagementActions/></PageContent></LocaleProvider>);
    const controls=[screen.getByRole('button',{name:/Invite Us to Bid/}),screen.getByRole('button',{name:/Partner With Our Experts/}),screen.getByRole('button',{name:/Become an Expert/})];
    const cards=controls.map(control=>control.parentElement!);
    expect(new Set(cards).size).toBe(3);
    expect(cards.map(card=>card.getAttribute('data-reveal'))).toEqual(['left','right','left']);
    expect(cards.map(card=>card.getAttribute('data-reveal-delay'))).toEqual(['0','2','4']);
    for(const card of cards){
      expect(observer('entry').targets.has(card)).toBe(true);
      expect(observer('exit').targets.has(card)).toBe(true);
      expect(card).toHaveAttribute('data-reveal-state','pending');
    }
    expect(observer('entry').targets.size).toBe(3);
    observer('entry').intersect(cards[0],true);
    expect(cards[0]).toHaveAttribute('data-reveal-state','revealed');
    expect(cards[1]).toHaveAttribute('data-reveal-state','pending');
    expect(cards[2]).toHaveAttribute('data-reveal-state','pending');
    fireEvent.animationEnd(controls[0]);
    expect(cards[0]).toHaveAttribute('data-reveal-state','revealed');
    fireEvent.animationEnd(cards[0]);
    expect(cards[0]).toHaveAttribute('data-reveal-state','visible');
    for(let pass=0;pass<2;pass++){
      for(const card of cards){
        observer('exit').intersect(card,false);
        expect(card).toHaveAttribute('data-reveal-state','pending');
        observer('entry').intersect(card,true);
        expect(card).toHaveAttribute('data-reveal-state','revealed');
        fireEvent.animationEnd(card);
        expect(card).toHaveAttribute('data-reveal-state','visible');
        observer('exit').intersect(card,false);
      }
    }
    act(()=>controls[1].focus());
    expect(cards[1]).toHaveAttribute('data-reveal-state','visible');
    observer('entry').intersect(cards[1],true);
    observer('exit').intersect(cards[1],false);
    expect(cards[1]).toHaveAttribute('data-reveal-state','visible');
    expect(cards[0]).toHaveAttribute('data-reveal-state','pending');
    expect(cards[2]).toHaveAttribute('data-reveal-state','pending');
  });

  it('cleans up the previous page and enhances same-shaped content on a new path',()=>{
    const view=render(<Content title="Privacy policy"/>);
    const firstHeading=screen.getByRole('heading',{level:1});
    const firstObserver=observer('entry');
    firstObserver.intersect(firstHeading,true);

    route.path='/en/terms';
    view.rerender(<Content title="Terms and conditions"/>);
    const nextHeading=screen.getByRole('heading',{level:1});
    expect(firstObserver.active).toBe(false);
    expect(firstHeading).not.toHaveAttribute('data-reveal-state');
    expect(nextHeading).not.toBe(firstHeading);
    expect(nextHeading).toHaveTextContent('Terms and conditions');
    expect(observer('entry')).not.toBe(firstObserver);
    observer('entry').intersect(nextHeading,true);
    expect(nextHeading).toHaveAttribute('data-reveal-state','revealed');
  });
});
