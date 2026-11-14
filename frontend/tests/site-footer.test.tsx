import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,render,screen,within} from '@testing-library/react';
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
function observer(){
  const instance=ViewportObserver.instances.findLast(value=>value.active);
  if(!instance)throw new Error('Missing chase observer');
  return instance;
}

describe('chase footer copyright bar',()=>{
  it('keeps the copyright and policy links accessible below the decorative chase',()=>{
    render(<Footer/>);
    const footer=screen.getByRole('contentinfo');
    expect(footer).not.toHaveAttribute('aria-hidden','true');
    const copyright=within(footer).getByText(/©/);
    expect(copyright).toHaveTextContent(String(new Date().getFullYear()));
    expect(copyright).toHaveTextContent('DevMasters. Built around people.');
    expect(within(footer).getByRole('link',{name:'Privacy policy'})).toHaveAttribute('href','/en/privacy');
    expect(within(footer).getByRole('link',{name:'Terms & conditions'})).toHaveAttribute('href','/en/terms');
    expect(within(footer).getAllByRole('link')).toHaveLength(2);
    const logo=within(footer).getByRole('img',{name:'DevMasters'});
    expect(logo).toHaveAttribute('src','/logo-light.png');
    expect(logo).toHaveAttribute('alt','DevMasters');
    expect(logo).toHaveAttribute('width','216');
    expect(logo).toHaveAttribute('height','74');
    expect(footer).not.toHaveTextContent(/DM\s*✳/);
    expect(footer).not.toHaveTextContent('GOOD WORK STARTS WITH A CONVERSATION');
    expect(footer.querySelector('button,h1,h2,h3')).toBeNull();
    expect(footer.querySelector('svg')).toBeInTheDocument();
    const chase=footer.querySelector('[data-running]')!;
    expect(chase).toHaveAttribute('aria-hidden','true');
    observer().intersect(chase,true);
    expect(chase).toHaveAttribute('data-running','true');
  });

  it('keeps the illustration still for reduced-motion users',()=>{
    reducedMotion=true;
    const {container}=render(<Footer/>);
    const chase=container.querySelector('[data-running]')!;
    observer().intersect(chase,true);
    expect(chase).toHaveAttribute('data-running','false');
    expect(screen.getByRole('link',{name:'Privacy policy'})).toHaveAttribute('href','/en/privacy');
  });

  it('localizes the copyright and policy links on Khmer pages while keeping the chase decorative',()=>{
    route.path='/km/home';
    render(<Footer locale="km"/>);
    const footer=screen.getByRole('contentinfo');
    const copyright=within(footer).getByText(/©/);
    expect(copyright).toHaveTextContent(String(new Date().getFullYear()));
    expect(copyright).toHaveTextContent('DevMasters។ បង្កើតឡើងដោយផ្តោតលើមនុស្ស។');
    expect(within(footer).getByRole('link',{name:'គោលការណ៍ឯកជនភាព'})).toHaveAttribute('href','/km/privacy');
    expect(within(footer).getByRole('link',{name:'លក្ខខណ្ឌប្រើប្រាស់'})).toHaveAttribute('href','/km/terms');
    expect(within(footer).getAllByRole('link')).toHaveLength(2);
    expect(footer.querySelector('[data-running]')).toHaveAttribute('aria-hidden','true');
    expect(footer.querySelector('svg')).toBeInTheDocument();
  });
});
