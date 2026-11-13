import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {SiteFooter} from '../src/components/site-shell';

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
    act(()=>this.callback([{target,isIntersecting,intersectionRatio:isIntersecting?1:0} as IntersectionObserverEntry],this as unknown as IntersectionObserver));
  }
}

let reducedMotion=false;
beforeEach(()=>{
  route.path='/en/home';
  reducedMotion=false;
  ViewportObserver.instances=[];
  vi.stubGlobal('IntersectionObserver',ViewportObserver);
  vi.stubGlobal('matchMedia',()=>({
    matches:reducedMotion,
    addEventListener:vi.fn(),
    removeEventListener:vi.fn(),
  }));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

function Footer({locale='en'}:{locale?:'en'|'km'}){
  return <LocaleProvider initialLocale={locale}><SiteFooter/></LocaleProvider>;
}
function observer(role:'entry'|'exit'){
  const margin=role==='entry'?'0px':'48px';
  const instance=ViewportObserver.instances.findLast(value=>value.active&&value.options?.rootMargin===margin);
  if(!instance)throw new Error('Missing footer '+role+' observer');
  return instance;
}

describe('footer scroll animation',()=>{
  it('replays the footer heading when it leaves and re-enters the screen',()=>{
    render(<Footer/>);
    const heading=screen.getByRole('heading',{level:2});
    expect(heading).toHaveTextContent('Let’s make');
    expect(heading).toHaveTextContent('what’s next.');
    expect(screen.getByRole('link',{name:'Start a conversation'})).toHaveAttribute('href','/en/contact');

    observer('entry').intersect(heading,true);
    expect(heading).toHaveAttribute('data-reveal-state','revealed');
    fireEvent.animationEnd(heading);
    expect(heading).toHaveAttribute('data-reveal-state','visible');
    observer('exit').intersect(heading,false);
    observer('entry').intersect(heading,true);
    expect(heading).toHaveAttribute('data-reveal-state','revealed');
  });

  it('attaches fresh observers when returning from the private portal',()=>{
    route.path='/en/expert';
    const view=render(<Footer/>);
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(ViewportObserver.instances).toHaveLength(0);

    route.path='/en/home';
    view.rerender(<Footer/>);
    const firstHeading=screen.getByRole('heading',{level:2});
    const firstObserver=observer('entry');
    firstObserver.intersect(firstHeading,true);
    expect(firstHeading).toHaveAttribute('data-reveal-state','revealed');

    route.path='/en/expert/profile';
    view.rerender(<Footer/>);
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(firstObserver.active).toBe(false);

    route.path='/en/services';
    view.rerender(<Footer/>);
    const newHeading=screen.getByRole('heading',{level:2});
    expect(newHeading).not.toBe(firstHeading);
    expect(observer('entry')).not.toBe(firstObserver);
    observer('entry').intersect(newHeading,true);
    expect(newHeading).toHaveAttribute('data-reveal-state','revealed');
  });

  it('keeps the footer readable without animation for reduced-motion users',()=>{
    reducedMotion=true;
    render(<Footer/>);
    expect(screen.getByRole('heading',{level:2})).not.toHaveAttribute('data-reveal-state');
    expect(screen.getByRole('link',{name:'Privacy policy'})).toHaveAttribute('href','/en/privacy');
    expect(ViewportObserver.instances).toHaveLength(0);
  });

  it('preserves Khmer text and locale links while revealing the footer',()=>{
    route.path='/km/home';
    render(<Footer locale="km"/>);
    const heading=screen.getByRole('heading',{level:2});
    expect(heading).toHaveTextContent('រួមគ្នាបង្កើត');
    expect(heading).toHaveTextContent('អ្វីដែលថ្មីនៅថ្ងៃបន្ទាប់។');
    expect(screen.getByRole('link',{name:'ចាប់ផ្តើមការពិភាក្សា'})).toHaveAttribute('href','/km/contact');
    observer('entry').intersect(heading,true);
    expect(heading).toHaveAttribute('data-reveal-state','revealed');
    fireEvent.animationEnd(heading);
    expect(heading).toHaveAttribute('data-reveal-state','visible');
  });
});
