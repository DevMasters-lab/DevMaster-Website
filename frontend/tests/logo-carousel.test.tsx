import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,createEvent,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {LogoCarousel} from '../src/components/logo-carousel';

// Model the animation engine boundary; these tests exercise our interaction
// policy rather than Swiper's slide layout or gesture implementation.
const engine=vi.hoisted(()=>({
  destroyed:false,
  animating:false,
  autoplay:{running:false,start:vi.fn(),stop:vi.fn()},
  getTranslate:vi.fn(),
  setTranslate:vi.fn(),
  setTransition:vi.fn(),
  transitionEnd:vi.fn(),
  slideNext:vi.fn(),
  slidePrev:vi.fn(),
}));

vi.mock('swiper/react',async()=>{
  const {createElement,useEffect}=await import('react');
  return {
    Swiper:({onSwiper,children,...props}:React.HTMLAttributes<HTMLDivElement>&{
      onSwiper:(swiper:unknown)=>void;children:React.ReactNode;
    })=>{
      useEffect(()=>onSwiper(engine),[onSwiper]);
      const forwarded=Object.fromEntries(Object.entries(props).filter(([key])=>
        key.startsWith('aria-')||key.startsWith('on')||['className','role','tabIndex'].includes(key)));
      return createElement('div',forwarded,children);
    },
    SwiperSlide:({children}:{children:React.ReactNode})=>createElement('div',null,children),
  };
});

let reducedMotion=false;
let motionListeners:Set<()=>void>;

beforeEach(()=>{
  vi.clearAllMocks();
  reducedMotion=false;
  motionListeners=new Set();
  engine.destroyed=false;
  engine.animating=false;
  engine.autoplay.running=false;
  engine.autoplay.start.mockImplementation(()=>{engine.autoplay.running=true;});
  engine.autoplay.stop.mockImplementation(()=>{engine.autoplay.running=false;});
  engine.getTranslate.mockReturnValue(-42);
  engine.transitionEnd.mockImplementation(()=>{engine.animating=false;});
  vi.stubGlobal('matchMedia',vi.fn(()=>({
    get matches(){return reducedMotion;},
    addEventListener:(_event:string,listener:()=>void)=>motionListeners.add(listener),
    removeEventListener:(_event:string,listener:()=>void)=>motionListeners.delete(listener),
  })));
});

afterEach(()=>{cleanup();vi.unstubAllGlobals();});

function renderCarousel(){
  render(<LocaleProvider initialLocale="en"><LogoCarousel/><button type="button">Outside carousel</button></LocaleProvider>);
  return screen.getByRole('group',{name:'Our Clients'});
}

function moveMouse(viewport:HTMLElement,entering:boolean){
  const event=entering?createEvent.pointerOver(viewport):createEvent.pointerOut(viewport);
  // JSDOM does not provide PointerEvent, so preserve the device type explicitly.
  Object.defineProperty(event,'pointerType',{value:'mouse'});
  fireEvent(viewport,event);
}

describe('logo carousel interaction policy',()=>{
  it('keeps reduced-motion users in control with manual arrow navigation',()=>{
    reducedMotion=true;
    const viewport=renderCarousel();
    expect(engine.autoplay.running).toBe(false);
    expect(screen.queryByRole('button',{name:'Pause animation'})).not.toBeInTheDocument();
    fireEvent.keyDown(viewport,{key:'ArrowRight'});
    expect(engine.slideNext).toHaveBeenCalledWith(0);
    fireEvent.keyDown(viewport,{key:'ArrowLeft'});
    expect(engine.slidePrev).toHaveBeenCalledWith(0);
  });

  it('finishes an active transition when reduced motion is enabled',async()=>{
    renderCarousel();
    await waitFor(()=>expect(engine.autoplay.running).toBe(true));
    engine.animating=true;
    act(()=>{reducedMotion=true;motionListeners.forEach(listener=>listener());});
    expect(engine.autoplay.running).toBe(false);
    expect(engine.setTranslate).toHaveBeenCalledWith(-42);
    expect(engine.setTransition).toHaveBeenCalledWith(0);
    expect(engine.transitionEnd).toHaveBeenCalled();
    expect(engine.animating).toBe(false);
  });

  it('lets the focused animation button pause and resume playback',async()=>{
    renderCarousel();
    const control=await screen.findByRole('button',{name:'Pause animation'});
    act(()=>control.focus());
    fireEvent.click(control);
    expect(engine.autoplay.running).toBe(false);
    expect(control).toHaveAttribute('aria-pressed','true');
    expect(control).toHaveAccessibleName('Resume animation');
    fireEvent.click(control);
    expect(control).toHaveFocus();
    expect(control).toHaveAttribute('aria-pressed','false');
    expect(engine.autoplay.running).toBe(true);
  });

  it('keeps hover paused when the user toggles the animation preference',async()=>{
    const viewport=renderCarousel();
    const control=await screen.findByRole('button',{name:'Pause animation'});
    moveMouse(viewport,true);
    expect(engine.autoplay.running).toBe(false);
    fireEvent.click(control);
    fireEvent.click(control);
    expect(control).toHaveAttribute('aria-pressed','false');
    expect(engine.autoplay.running).toBe(false);
    moveMouse(viewport,false);
    expect(engine.autoplay.running).toBe(true);
  });

  it('pauses while the viewport has keyboard focus and resumes when focus leaves',async()=>{
    const viewport=renderCarousel();
    await waitFor(()=>expect(engine.autoplay.running).toBe(true));
    act(()=>viewport.focus());
    expect(engine.autoplay.running).toBe(false);
    fireEvent.keyDown(viewport,{key:'ArrowRight'});
    expect(engine.slideNext).toHaveBeenCalledWith(300);
    act(()=>screen.getByRole('button',{name:'Outside carousel'}).focus());
    expect(engine.autoplay.running).toBe(true);
  });
});
