import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,createEvent,fireEvent,render,screen,within} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {TechnologySkillsCarousel} from '../src/components/technology-skills-carousel';
import {technologySkillCategories,getSkillsForCategory} from '../src/data/technology-skills';

// Layout belongs to Swiper. Model its position/events so our controls,
// accessibility policy and destinations run through the real component.
const harness=vi.hoisted(()=>({
  callbacks:{} as Record<string,unknown>,
  engine:{
    destroyed:false,animating:false,params:{slidesPerView:4},activeIndex:0,snapIndex:0,snapGrid:[0,1],
    autoplay:{running:false,start:vi.fn(),stop:vi.fn()},
    slidePrev:vi.fn(),slideNext:vi.fn(),slideTo:vi.fn(),getTranslate:vi.fn(),setTranslate:vi.fn(),setTransition:vi.fn(),transitionEnd:vi.fn(),
  },
}));

vi.mock('swiper/react',async()=>{
  const {createElement,useEffect}=await import('react');
  return {
    Swiper:({onSwiper,children,...props}:React.HTMLAttributes<HTMLDivElement>&{onSwiper:(instance:unknown)=>void;children:React.ReactNode})=>{
      harness.callbacks=props;
      useEffect(()=>onSwiper(harness.engine),[]);
      const forwarded=Object.fromEntries(Object.entries(props).filter(([key])=>key.startsWith('aria-')||['id','className','role','tabIndex','onKeyDown','onFocusCapture','onBlurCapture','onPointerEnter','onPointerLeave'].includes(key)));
      return createElement('div',forwarded,children);
    },
    SwiperSlide:({children,...props}:React.HTMLAttributes<HTMLDivElement>&{inert?:boolean;children:React.ReactNode})=>createElement('div',{'data-testid':'skill-slide',...props},children),
  };
});

let reducedMotion=false;
let motionListeners:Set<()=>void>;
beforeEach(()=>{
  vi.clearAllMocks();
  reducedMotion=false;
  motionListeners=new Set();
  Object.assign(harness.engine,{destroyed:false,animating:false,params:{slidesPerView:4},activeIndex:0,snapIndex:0,snapGrid:[0,1]});
  harness.engine.autoplay.running=false;
  harness.engine.autoplay.start.mockImplementation(()=>{harness.engine.autoplay.running=true;});
  harness.engine.autoplay.stop.mockImplementation(()=>{harness.engine.autoplay.running=false;});
  harness.engine.getTranslate.mockReturnValue(-42);
  harness.engine.transitionEnd.mockImplementation(()=>{harness.engine.animating=false;});
  vi.stubGlobal('matchMedia',vi.fn(()=>({
    get matches(){return reducedMotion;},
    addEventListener:(_event:string,listener:()=>void)=>motionListeners.add(listener),
    removeEventListener:(_event:string,listener:()=>void)=>motionListeners.delete(listener),
  })));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

function renderCarousel(locale:'en'|'km'='en'){
  render(<LocaleProvider initialLocale={locale}><TechnologySkillsCarousel/></LocaleProvider>);
  return screen.getByRole('group',{name:locale==='en'?'Technology skills carousel':'ផ្ទាំងរំកិលជំនាញបច្ចេកវិទ្យា'});
}

function position(values:Partial<typeof harness.engine>,event='onSlideChange'){
  act(()=>{Object.assign(harness.engine,values);(harness.callbacks[event] as (instance:unknown)=>void)(harness.engine);});
}

function moveMouse(viewport:HTMLElement,entering:boolean){
  const event=entering?createEvent.pointerOver(viewport):createEvent.pointerOut(viewport);
  Object.defineProperty(event,'pointerType',{value:'mouse'});
  fireEvent(viewport,event);
}

describe('technology skills carousel',()=>{
  it('shows category summaries with five examples and localized destinations',()=>{
    renderCarousel();
    const cards=screen.getAllByRole('article');
    expect(cards).toHaveLength(4);
    const category=technologySkillCategories[0];
    expect(within(cards[0]).getByRole('heading',{name:category.name})).toBeInTheDocument();
    expect(within(cards[0]).getByText(category.description)).toBeInTheDocument();
    expect(within(cards[0]).getAllByRole('listitem')).toHaveLength(5);
    expect(cards[0]).toHaveTextContent(`7 subcategories · ${getSkillsForCategory(category.id).length} skills`);
    expect(within(cards[0]).getByRole('link',{name:'Explore Skills'})).toHaveAttribute('href',`/en/technology-skills?category=${category.id}`);
    expect(screen.getByRole('link',{name:'View All Skills'})).toHaveAttribute('href','/en/technology-skills');
    expect(screen.queryByRole('button',{name:/Pause animation|Resume animation/})).not.toBeInTheDocument();
    const slides=screen.getAllByTestId('skill-slide');
    expect(slides).toHaveLength(8);
    technologySkillCategories.forEach((item,index)=>expect(slides[index].querySelector('a')).toHaveAttribute('href',`/en/technology-skills?category=${item.id}`));
    expect(slides[0]).not.toHaveAttribute('inert');
    expect(slides[4]).toHaveAttribute('inert');
    expect(slides[4]).toHaveAttribute('aria-hidden','true');
  });

  it('navigates through arrows and dots and disables controls at the edges',()=>{
    renderCarousel();
    const previous=screen.getByRole('button',{name:'Previous skill categories'});
    const next=screen.getByRole('button',{name:'Next skill categories'});
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
    const pages=screen.getByRole('group',{name:'Skill category pages'});
    expect(within(pages).getAllByRole('button')).toHaveLength(2);
    expect(within(pages).getByRole('button',{name:'Go to skills page 1'})).toHaveAttribute('aria-current','page');
    fireEvent.click(next);
    expect(harness.engine.slideNext).toHaveBeenCalledWith(320);
    fireEvent.click(within(pages).getByRole('button',{name:'Go to skills page 2'}));
    expect(harness.engine.slideTo).toHaveBeenCalledWith(4,320);
    position({activeIndex:4,snapIndex:1});
    expect(previous).toBeEnabled();
    expect(within(pages).getByRole('button',{name:'Go to skills page 2'})).toHaveAttribute('aria-current','page');
    expect(screen.getByRole('status')).toHaveTextContent('Skills page 2 of 2');
    expect(next).toBeDisabled();
    expect(screen.getAllByRole('link',{name:'Explore Skills'})).toHaveLength(4);
    fireEvent.click(previous);
    expect(harness.engine.slidePrev).toHaveBeenCalledWith(320);
    position({activeIndex:0,snapIndex:0});
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
  });

  it('updates pagination and accessible links when tablet and mobile layouts change',()=>{
    renderCarousel();
    expect(harness.callbacks.slidesPerView).toBe(1);
    expect(Object.values(harness.callbacks.breakpoints as Record<string,unknown>)).toEqual(expect.arrayContaining([
      expect.objectContaining({slidesPerView:2,slidesPerGroup:2}),
      expect.objectContaining({slidesPerView:4,slidesPerGroup:4}),
    ]));
    position({params:{slidesPerView:2},activeIndex:2,snapIndex:1,snapGrid:Array.from({length:4},(_,index)=>index)},'onBreakpoint');
    expect(screen.getAllByRole('link',{name:'Explore Skills'})).toHaveLength(2);
    expect(within(screen.getByRole('group',{name:'Skill category pages'})).getAllByRole('button')).toHaveLength(4);
    position({params:{slidesPerView:1},activeIndex:3,snapIndex:3,snapGrid:Array.from({length:8},(_,index)=>index)},'onResize');
    expect(screen.getAllByRole('link',{name:'Explore Skills'})).toHaveLength(1);
    expect(within(screen.getByRole('group',{name:'Skill category pages'})).getAllByRole('button')).toHaveLength(8);
    fireEvent.click(screen.getByRole('button',{name:'Go to skills page 5'}));
    expect(harness.engine.slideTo).toHaveBeenCalledWith(4,320);
  });

  it('supports viewport arrow/Home/End keys without intercepting focused links',()=>{
    const viewport=renderCarousel();
    fireEvent.keyDown(viewport,{key:'ArrowRight'});
    expect(harness.engine.slideNext).toHaveBeenCalledWith(320);
    fireEvent.keyDown(viewport,{key:'ArrowLeft'});
    expect(harness.engine.slidePrev).toHaveBeenCalledWith(320);
    fireEvent.keyDown(viewport,{key:'End'});
    expect(harness.engine.slideTo).toHaveBeenCalledWith(4,320);
    fireEvent.keyDown(viewport,{key:'Home'});
    expect(harness.engine.slideTo).toHaveBeenCalledWith(0,320);
    harness.engine.slideNext.mockClear();
    fireEvent.keyDown(screen.getAllByRole('link',{name:'Explore Skills'})[0],{key:'ArrowRight'});
    expect(harness.engine.slideNext).not.toHaveBeenCalled();
  });

  it('removes transition motion and releases active animation when reduced motion is enabled',()=>{
    renderCarousel();
    expect(harness.engine.autoplay.running).toBe(true);
    harness.engine.animating=true;
    act(()=>{reducedMotion=true;motionListeners.forEach(listener=>listener());});
    expect(harness.engine.autoplay.running).toBe(false);
    expect(harness.engine.setTransition).toHaveBeenCalledWith(0);
    expect(harness.engine.transitionEnd).toHaveBeenCalled();
    expect(harness.engine.animating).toBe(false);
    fireEvent.click(screen.getByRole('button',{name:'Next skill categories'}));
    expect(harness.engine.slideNext).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByRole('button',{name:'Go to skills page 2'}));
    expect(harness.engine.slideTo).toHaveBeenCalledWith(4,0);
  });

  it('uses Khmer labels, category descriptions and Khmer page destinations',()=>{
    renderCarousel('km');
    expect(screen.getByRole('heading',{name:'ជំនាញ និងឯកទេសបច្ចេកវិទ្យា'})).toBeInTheDocument();
    expect(screen.getAllByRole('link',{name:'ស្វែងយល់ពីជំនាញ'})[0]).toHaveAttribute('href','/km/technology-skills?category=software-development');
    expect(screen.getByRole('link',{name:'មើលជំនាញទាំងអស់'})).toHaveAttribute('href','/km/technology-skills');
    expect(screen.getByRole('button',{name:'ប្រភេទជំនាញបន្ទាប់'})).toBeEnabled();
    const first=screen.getAllByRole('article')[0];
    expect(within(first).queryByText(technologySkillCategories[0].description)).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:/ផ្អាកចលនា|បន្តចលនា/})).not.toBeInTheDocument();
  });

  it('starts automatic playback with a readable delay and returns to the first page at the end',()=>{
    renderCarousel();
    expect(harness.callbacks.autoplay).toEqual(expect.objectContaining({delay:5000,disableOnInteraction:false}));
    expect(harness.callbacks.rewind).toBe(true);
    expect(harness.callbacks.loop).not.toBe(true);
    expect(harness.engine.autoplay.running).toBe(true);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live','off');
  });

  it('continues automatic playback while the pointer is over a card',()=>{
    const viewport=renderCarousel();
    moveMouse(viewport,true);
    expect(harness.engine.autoplay.running).toBe(true);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live','off');
    moveMouse(viewport,false);
    expect(harness.engine.autoplay.running).toBe(true);
  });

  it('keeps automatic playback running through focused links and manual navigation',()=>{
    const viewport=renderCarousel();
    const link=screen.getAllByRole('link',{name:'Explore Skills'})[0];
    act(()=>viewport.focus());
    expect(harness.engine.autoplay.running).toBe(true);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live','off');
    fireEvent.keyDown(viewport,{key:'ArrowRight'});
    expect(harness.engine.slideNext).toHaveBeenCalledWith(320);
    act(()=>link.focus());
    expect(harness.engine.autoplay.running).toBe(true);
    act(()=>screen.getByRole('button',{name:'Next skill categories'}).focus());
    expect(harness.engine.autoplay.running).toBe(true);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live','off');
    fireEvent.click(screen.getByRole('button',{name:'Next skill categories'}));
    expect(harness.engine.slideNext).toHaveBeenCalledWith(320);
    expect(harness.engine.autoplay.running).toBe(true);
    act(()=>screen.getByRole('link',{name:'View All Skills'}).focus());
    expect(harness.engine.autoplay.running).toBe(true);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live','off');
  });

  it('does not start autoplay for reduced-motion users while retaining arrows and dots',()=>{
    reducedMotion=true;
    renderCarousel();
    expect(harness.engine.autoplay.running).toBe(false);
    expect(screen.queryByRole('button',{name:'Pause animation'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Next skill categories'}));
    expect(harness.engine.slideNext).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByRole('button',{name:'Go to skills page 2'}));
    expect(harness.engine.slideTo).toHaveBeenCalledWith(4,0);
  });
});
