import React from 'react';
import {renderToString} from 'react-dom/server';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {PageContent} from '../src/components/page-content';

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
    <article data-reveal="up"><h2>Software Development</h2><a href="/en/technology-skills">Explore skills</a></article>
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
    expect(html).toContain('Explore skills');
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

  it('cleans up the previous page and enhances same-shaped content on a new path',()=>{
    const view=render(<Content title="Our services"/>);
    const firstHeading=screen.getByRole('heading',{level:1});
    const firstObserver=observer('entry');
    firstObserver.intersect(firstHeading,true);

    route.path='/en/expertise';
    view.rerender(<Content title="Our expertise"/>);
    const nextHeading=screen.getByRole('heading',{level:1});
    expect(firstObserver.active).toBe(false);
    expect(firstHeading).not.toHaveAttribute('data-reveal-state');
    expect(nextHeading).not.toBe(firstHeading);
    expect(nextHeading).toHaveTextContent('Our expertise');
    expect(observer('entry')).not.toBe(firstObserver);
    observer('entry').intersect(nextHeading,true);
    expect(nextHeading).toHaveAttribute('data-reveal-state','revealed');
  });

  it('leaves private portal content unenhanced and reconnects on public routes',()=>{
    route.path='/en/expert/profile';
    const view=render(<Content/>);
    expect(screen.getByRole('main')).toHaveAttribute('id','main');
    expect(screen.getByRole('heading',{level:1})).not.toHaveAttribute('data-reveal-state');
    expect(ViewportObserver.instances).toHaveLength(0);

    route.path='/en/home';
    view.rerender(<Content/>);
    const publicObserver=observer('entry');
    const publicHeading=screen.getByRole('heading',{level:1});
    publicObserver.intersect(publicHeading,true);
    expect(publicHeading).toHaveAttribute('data-reveal-state','revealed');

    route.path='/en/expert';
    view.rerender(<Content/>);
    expect(publicObserver.active).toBe(false);
    expect(screen.getByRole('heading',{level:1})).not.toHaveAttribute('data-reveal-state');
    expect(ViewportObserver.instances.filter(value=>value.active)).toHaveLength(0);

    route.path='/en/technology-skills';
    view.rerender(<Content/>);
    expect(observer('entry')).not.toBe(publicObserver);
    observer('entry').intersect(screen.getByRole('article'),true);
    expect(screen.getByRole('article')).toHaveAttribute('data-reveal-state','revealed');
  });
});
