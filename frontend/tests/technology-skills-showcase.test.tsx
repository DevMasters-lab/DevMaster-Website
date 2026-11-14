import React from 'react';
import {renderToString} from 'react-dom/server';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,createEvent,fireEvent,render,screen,within} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {TechnologySkillsShowcase} from '../src/components/technology-skills-showcase';
import {carouselMotion} from '../src/lib/carousel-motion';
import {getSkillsForCategory,getSkillsForSubcategory,technologySkillCategories,technologySkillSubcategories,technologySkills} from '../src/data/technology-skills';

type EngineCallback=(swiper:unknown)=>void;
type EngineProps={onSwiper?:EngineCallback;onInit?:EngineCallback;onSlideChange?:EngineCallback;onUpdate?:EngineCallback;onAutoplay?:EngineCallback;children:React.ReactNode;[key:string]:unknown};
// Model only the animation-engine boundary: gestures and slide geometry belong
// to Swiper; these checks cover our controls, motion policy, and skill filters.
const engine=vi.hoisted(()=>({
  destroyed:false,animating:false,activeIndex:0,realIndex:0,isBeginning:true,isEnd:false,isLocked:false,
  slides:[] as unknown[],params:{slidesPerView:5,slidesPerGroup:1},
  props:null as EngineProps|null,
  autoplay:{running:false,start:vi.fn(),stop:vi.fn()},
  slideNext:vi.fn(),slidePrev:vi.fn(),slideTo:vi.fn(),slideToLoop:vi.fn(),update:vi.fn(),
  getTranslate:vi.fn(),setTranslate:vi.fn(),setTransition:vi.fn(),transitionEnd:vi.fn(),
}));
function moveEngine(index:number){
  const total=engine.slides.length;
  engine.activeIndex=total?(index+total)%total:0;engine.realIndex=engine.activeIndex;
  engine.props?.onSlideChange?.(engine);
}
vi.mock('swiper/react',async()=>{
  const {Children,createElement,useEffect}=await import('react');
  return {
    Swiper:(props:EngineProps)=>{
      engine.props=props;
      const count=Children.count(props.children);
      useEffect(()=>{engine.slides=Array.from({length:count});engine.activeIndex=0;engine.realIndex=0;engine.isBeginning=true;engine.isEnd=count<=5;engine.isLocked=count<=5;props.onSwiper?.(engine);props.onInit?.(engine);},[]);
      useEffect(()=>{engine.slides=Array.from({length:count});engine.isLocked=count<=5;engine.props?.onUpdate?.(engine);},[count]);
      const forwarded=Object.fromEntries(Object.entries(props).filter(([key])=>key.startsWith('aria-')||['className','id','role','tabIndex','onKeyDown','onFocusCapture','onBlurCapture','onPointerEnter','onPointerLeave','onMouseEnter','onMouseLeave'].includes(key)));
      return createElement('div',forwarded,props.children);
    },
    SwiperSlide:({children,...props}:React.HTMLAttributes<HTMLDivElement>)=>createElement('div',{...Object.fromEntries(Object.entries(props).filter(([key])=>key.startsWith('aria-')||['className','role'].includes(key))),'data-testid':'technology-column'},children),
  };
});
class ViewportObserver{
  static instances:ViewportObserver[]=[];
  targets=new Set<Element>();
  constructor(private callback:IntersectionObserverCallback){ViewportObserver.instances.push(this);}
  observe(target:Element){this.targets.add(target);}
  unobserve(target:Element){this.targets.delete(target);}
  disconnect(){this.targets.clear();}
  intersect(visible:boolean){if(!this.targets.size)return;act(()=>this.callback([...this.targets].map(target=>({target,isIntersecting:visible,intersectionRatio:visible?1:0}) as IntersectionObserverEntry),this as unknown as IntersectionObserver));}
}
let reducedMotion=false;
let hidden=false;
let motionListeners:Set<()=>void>;
beforeEach(()=>{
  window.history.replaceState(null,'','/en/home');vi.clearAllMocks();
  reducedMotion=false;hidden=false;motionListeners=new Set();ViewportObserver.instances=[];
  engine.destroyed=false;engine.animating=false;engine.activeIndex=0;engine.realIndex=0;engine.isLocked=false;engine.slides=[];engine.props=null;engine.autoplay.running=false;
  engine.autoplay.start.mockImplementation(()=>{engine.autoplay.running=true;});
  engine.autoplay.stop.mockImplementation(()=>{engine.autoplay.running=false;});
  engine.slideNext.mockImplementation(()=>moveEngine(engine.activeIndex+1));
  engine.slidePrev.mockImplementation(()=>moveEngine(engine.activeIndex-1));
  engine.slideTo.mockImplementation((index:number)=>moveEngine(index));
  engine.slideToLoop.mockImplementation((index:number)=>moveEngine(index));
  engine.update.mockImplementation(()=>engine.props?.onUpdate?.(engine));
  engine.getTranslate.mockReturnValue(-42);engine.transitionEnd.mockImplementation(()=>{engine.animating=false;});
  vi.spyOn(document,'hidden','get').mockImplementation(()=>hidden);
  vi.spyOn(document,'visibilityState','get').mockImplementation(()=>hidden?'hidden':'visible');
  vi.stubGlobal('IntersectionObserver',ViewportObserver);
  vi.stubGlobal('matchMedia',()=>({get matches(){return reducedMotion;},addEventListener:(_event:string,listener:()=>void)=>motionListeners.add(listener),removeEventListener:(_event:string,listener:()=>void)=>motionListeners.delete(listener)}));
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
const featured=['React','Next.js','TypeScript','JavaScript','NestJS','Node.js','Laravel','Python','Flutter','PostgreSQL','AWS','Docker'];
function renderShowcase(locale:'en'|'km'='en'){
  const view=render(<LocaleProvider initialLocale={locale}><TechnologySkillsShowcase/><button type="button">Outside slider</button></LocaleProvider>);
  ViewportObserver.instances.forEach(observer=>observer.intersect(true));
  return view;
}
function technologyCards(){return screen.getAllByRole('article',{hidden:true});}
function technologyIds(){return technologyCards().map(card=>technologySkills.find(skill=>skill.name===card.querySelector('h3')?.textContent)?.id);}
function viewport(){return screen.getByRole('group',{name:'Technology skills slider'});}
function hover(element:HTMLElement,entering:boolean){const event=entering?createEvent.pointerOver(element):createEvent.pointerOut(element);Object.defineProperty(event,'pointerType',{value:'mouse'});fireEvent(element,event);}

describe('technology skills slider',()=>{
  it('offers every unique skill with reference technologies first and preserves noninteractive cards',()=>{
    renderShowcase();
    expect(technologyCards()).toHaveLength(technologySkills.length);
    expect(screen.getAllByRole('heading',{level:3,hidden:true}).slice(0,12).map(heading=>heading.textContent)).toEqual(featured);
    expect(new Set(technologyIds())).toEqual(new Set(technologySkills.map(skill=>skill.id)));
    const columns=screen.getAllByTestId('technology-column');
    expect(columns).toHaveLength(Math.ceil(technologySkills.length/2));
    expect(engine.slides).toHaveLength(columns.length);
    for(const column of columns)expect(column.querySelectorAll('article')).toHaveLength(2);
    expect([...columns[0].querySelectorAll('h3')].map(heading=>heading.textContent)).toEqual(featured.slice(0,2));
    expect([...columns[1].querySelectorAll('h3')].map(heading=>heading.textContent)).toEqual(featured.slice(2,4));
    for(const card of technologyCards()){expect(card).not.toHaveAttribute('tabindex');expect(card.querySelector('a,button,input,[tabindex]')).toBeNull();}
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryByText('View technology')).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:/Show (more|fewer) technologies/})).not.toBeInTheDocument();
    const filters=screen.getByRole('group',{name:'Technology categories'});
    expect(within(filters).getAllByRole('button')).toHaveLength(9);
    expect(within(filters).getByRole('button',{name:'All categories'})).toHaveAttribute('aria-pressed','true');
    expect(engine.props?.slidesPerView).toBe(2);
    expect(engine.props?.breakpoints).toEqual(expect.objectContaining({700:expect.objectContaining({slidesPerView:4}),1100:expect.objectContaining({slidesPerView:5})}));
    expect(engine.props?.loop).toBe(true);
    expect(engine.props?.loopPreventsSliding).toBe(false);
    expect(engine.props?.speed).toBe(carouselMotion.speed);
    expect(engine.props?.autoplay).toEqual(expect.objectContaining({delay:carouselMotion.delay,reverseDirection:true,disableOnInteraction:false}));
    expect(engine.props?.mousewheel).toEqual({forceToAxis:true,sensitivity:1});
    expect(engine.autoplay.running).toBe(true);
  });
  it('keeps an odd filtered result complete and unique with one card in the final column',()=>{
    renderShowcase();
    const subcategory=technologySkillSubcategories.find(item=>{
      const count=getSkillsForSubcategory(item.id).length;
      return count>2&&count%2===1;
    })!;
    fireEvent.change(screen.getByRole('combobox',{name:'Subcategory'}),{target:{value:subcategory.id}});
    const expected=getSkillsForSubcategory(subcategory.id);
    const ids=technologyIds();
    expect(ids).toHaveLength(expected.length);
    expect(new Set(ids)).toEqual(new Set(expected.map(skill=>skill.id)));
    const columns=screen.getAllByTestId('technology-column');
    expect(columns).toHaveLength(Math.ceil(expected.length/2));
    expect(engine.slides).toHaveLength(columns.length);
    for(const column of columns.slice(0,-1))expect(column.querySelectorAll('article')).toHaveLength(2);
    expect(columns.at(-1)?.querySelectorAll('article')).toHaveLength(1);
    expect(engine.props?.loop).toBe(columns.length>5);
  });
  it('keeps arrows and keyboard navigation working throughout the continuous loop',()=>{
    renderShowcase();const previous=screen.getByRole('button',{name:'Previous technologies'});const next=screen.getByRole('button',{name:'Next technologies'});
    const track=document.getElementById(previous.getAttribute('aria-controls')!);
    expect(track).not.toBeNull();
    expect(previous.nextElementSibling).toBe(track);
    expect(track?.nextElementSibling).toBe(next);
    expect(next).toHaveAttribute('aria-controls',track?.id);
    expect(previous).toBeEnabled();expect(next).toBeEnabled();fireEvent.click(next);expect(engine.slideNext).toHaveBeenCalled();fireEvent.click(previous);expect(engine.slidePrev).toHaveBeenCalled();
    const slider=viewport();expect(slider).toHaveAttribute('tabindex','0');
    fireEvent.keyDown(slider,{key:'ArrowRight'});expect(engine.slideNext).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(slider,{key:'ArrowLeft'});expect(engine.slidePrev).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(next,{key:'ArrowRight'});expect(engine.slideNext).toHaveBeenCalledTimes(2);
    expect(location.pathname).toBe('/en/home');
  });
  it('uses each category’s complete shared catalogue and restarts when filters change',()=>{
    renderShowcase();const filters=screen.getByRole('group',{name:'Technology categories'});
    for(const category of technologySkillCategories){
      fireEvent.click(screen.getByRole('button',{name:'Next technologies'}));const button=within(filters).getByRole('button',{name:category.name});act(()=>button.focus());fireEvent.click(button);
      expect(button).toHaveFocus();expect(button).toHaveAttribute('aria-pressed','true');expect(within(filters).getAllByRole('button').filter(item=>item.getAttribute('aria-pressed')==='true')).toHaveLength(1);
      expect(new Set(technologyIds())).toEqual(new Set(getSkillsForCategory(category.id).map(skill=>skill.id)));expect(engine.realIndex).toBe(0);
    }
    fireEvent.click(within(filters).getByRole('button',{name:'All categories'}));fireEvent.click(screen.getByRole('button',{name:'Next technologies'}));
    fireEvent.change(screen.getByRole('combobox',{name:'Subcategory'}),{target:{value:'frontend-development'}});
    expect(engine.realIndex).toBe(0);expect(new Set(technologyIds())).toEqual(new Set(getSkillsForSubcategory('frontend-development').map(skill=>skill.id)));
    fireEvent.click(screen.getByRole('button',{name:'Next technologies'}));fireEvent.change(screen.getByRole('searchbox',{name:'Search skills'}),{target:{value:'a'}});
    expect(engine.realIndex).toBe(0);expect(new Set(technologyIds())).toEqual(new Set(getSkillsForSubcategory('frontend-development').filter(skill=>skill.name.toLowerCase().includes('a')).map(skill=>skill.id)));
  });
  it('normalizes search, avoids duplicate shared skills, and stops navigation for one result',()=>{
    renderShowcase();const search=screen.getByRole('searchbox',{name:'Search skills'});fireEvent.change(search,{target:{value:'  ＮＥＸＴ．ｊｓ  '}});
    expect(technologyIds()).toEqual(['next-js']);expect(screen.getByRole('button',{name:'Previous technologies'})).toBeDisabled();expect(screen.getByRole('button',{name:'Next technologies'})).toBeDisabled();expect(engine.autoplay.running).toBe(false);
    fireEvent.change(search,{target:{value:'  NeTwOrK   SeCuRiTy  '}});expect(technologyIds()).toEqual(['network-security']);fireEvent.change(search,{target:{value:'C++'}});expect(technologyIds()).toEqual(['cpp']);
  });
  it('intersects category, subcategory and search while clearing stale subcategories',()=>{
    renderShowcase();const subcategory=screen.getByRole('combobox',{name:'Subcategory'});const search=screen.getByRole('searchbox',{name:'Search skills'});
    expect(within(subcategory).getAllByRole('option').length).toBeGreaterThan(40);fireEvent.click(screen.getByRole('button',{name:'Software Development'}));expect(within(subcategory).getAllByRole('option')).toHaveLength(8);
    fireEvent.change(subcategory,{target:{value:'frontend-development'}});fireEvent.change(search,{target:{value:'  ReAcT  '}});expect(technologyIds()).toEqual(['react']);
    fireEvent.click(screen.getByRole('button',{name:'Cloud & DevOps'}));expect(subcategory).toHaveValue('');expect(search).toHaveValue('  ReAcT  ');expect(within(subcategory).getByRole('option',{name:'Cloud Computing'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'No matching skills'})).toBeInTheDocument();expect(screen.queryAllByRole('article')).toHaveLength(0);
  });
  it('clears only search with focus retained and resets an empty result to every skill',()=>{
    renderShowcase();const search=screen.getByRole('searchbox',{name:'Search skills'});const subcategory=screen.getByRole('combobox',{name:'Subcategory'});
    fireEvent.click(screen.getByRole('button',{name:'Software Development'}));fireEvent.change(subcategory,{target:{value:'backend-development'}});fireEvent.change(search,{target:{value:'Laravel'}});expect(technologyIds()).toEqual(['laravel']);
    fireEvent.click(screen.getByRole('button',{name:'Clear search'}));expect(search).toHaveValue('');expect(search).toHaveFocus();expect(subcategory).toHaveValue('backend-development');expect(new Set(technologyIds())).toEqual(new Set(getSkillsForSubcategory('backend-development').map(skill=>skill.id)));
    fireEvent.change(search,{target:{value:'no-such-technology-xyz'}});expect(screen.getByRole('heading',{name:'No matching skills'})).toBeInTheDocument();expect(screen.getByText('Try another keyword or choose a different category.')).toBeInTheDocument();expect(screen.queryAllByRole('article')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button',{name:'Reset filters'}));expect(search).toHaveValue('');expect(search).toHaveFocus();expect(subcategory).toHaveValue('');expect(screen.getByRole('button',{name:'All categories'})).toHaveAttribute('aria-pressed','true');expect(new Set(technologyIds())).toEqual(new Set(technologySkills.map(skill=>skill.id)));expect(engine.realIndex).toBe(0);
  });
  it('renders all skill names on the server without interactive cards or a show-more toggle',()=>{
    const container=document.createElement('div');container.innerHTML=renderToString(<LocaleProvider initialLocale="en"><TechnologySkillsShowcase/></LocaleProvider>);
    expect(container.querySelectorAll('article')).toHaveLength(technologySkills.length);expect(container.querySelector('a')).toBeNull();expect(container.querySelector('article[tabindex],article [tabindex]')).toBeNull();expect(container.textContent).not.toContain('View technology');expect(container.textContent).not.toContain('Show more technologies');
  });
  it('translates Khmer controls while retaining canonical technology names',()=>{
    renderShowcase('km');expect(screen.getByRole('heading',{level:2,name:'ជំនាញ និងឯកទេសបច្ចេកវិទ្យា'})).toBeInTheDocument();const filters=screen.getByRole('group',{name:'ប្រភេទបច្ចេកវិទ្យា'});expect(within(filters).getByRole('button',{name:'ប្រភេទទាំងអស់'})).toHaveAttribute('aria-pressed','true');
    fireEvent.click(screen.getByRole('button',{name:'បច្ចេកវិទ្យាបន្ទាប់'}));expect(engine.slideNext).toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'បច្ចេកវិទ្យាមុន'}));expect(engine.slidePrev).toHaveBeenCalled();expect(screen.queryAllByRole('link')).toHaveLength(0);
    const search=screen.getByRole('searchbox',{name:'ស្វែងរកជំនាញ'});fireEvent.change(search,{target:{value:'  LaRaVeL  '}});expect(technologyCards()).toHaveLength(1);expect(screen.getByRole('article',{name:'Laravel'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'កំណត់តម្រងឡើងវិញ'}));expect(search).toHaveValue('');expect(search).toHaveFocus();
  });
  it('keeps moving on hover and pauses only for keyboard focus',()=>{
    renderShowcase();const slider=viewport();expect(engine.autoplay.running).toBe(true);hover(slider,true);expect(engine.autoplay.running).toBe(true);hover(slider,false);expect(engine.autoplay.running).toBe(true);
    act(()=>slider.focus());expect(engine.autoplay.running).toBe(false);act(()=>screen.getByRole('button',{name:'Outside slider'}).focus());expect(engine.autoplay.running).toBe(true);
  });
  it('keeps moving through pointer focus and resumes after pointer arrow interaction',()=>{
    renderShowcase();
    const slider=viewport();
    const next=screen.getByRole('button',{name:'Next technologies'});
    const nativeMatches=next.matches.bind(next);
    vi.spyOn(next,'matches').mockImplementation(selector=>selector===':focus-visible'?false:nativeMatches(selector));
    fireEvent.pointerDown(next);
    act(()=>next.focus());
    fireEvent.click(next);
    expect(engine.slideNext).toHaveBeenCalled();
    expect(engine.autoplay.running).toBe(true);
    act(()=>slider.focus());
    expect(engine.autoplay.running).toBe(false);
    fireEvent.pointerDown(next);
    fireEvent.click(next);
    expect(engine.slideNext).toHaveBeenCalledTimes(2);
    expect(engine.autoplay.running).toBe(true);
  });
  it('pauses while offscreen or hidden and resumes only when visible again',()=>{
    renderShowcase();ViewportObserver.instances.forEach(observer=>observer.intersect(false));expect(engine.autoplay.running).toBe(false);ViewportObserver.instances.forEach(observer=>observer.intersect(true));expect(engine.autoplay.running).toBe(true);
    act(()=>{hidden=true;document.dispatchEvent(new Event('visibilitychange'));});expect(engine.autoplay.running).toBe(false);act(()=>{hidden=false;document.dispatchEvent(new Event('visibilitychange'));});expect(engine.autoplay.running).toBe(true);
  });
  it('rejects a queued autoplay callback after the slider moves offscreen',()=>{
    renderShowcase();
    ViewportObserver.instances.forEach(observer=>observer.intersect(false));
    expect(engine.autoplay.running).toBe(false);
    engine.animating=true;engine.autoplay.running=true;
    act(()=>engine.props?.onAutoplay?.(engine));
    expect(engine.autoplay.running).toBe(false);
    expect(engine.setTransition).toHaveBeenCalledWith(0);
    expect(engine.setTranslate).toHaveBeenCalledWith(-42);
    expect(engine.transitionEnd).toHaveBeenCalled();
    expect(engine.animating).toBe(false);
  });
  it('respects live reduced-motion changes while leaving manual controls available',()=>{
    reducedMotion=true;renderShowcase();expect(engine.autoplay.running).toBe(false);fireEvent.click(screen.getByRole('button',{name:'Next technologies'}));expect(engine.slideNext).toHaveBeenCalledWith(0);
    const slider=viewport();act(()=>slider.focus());fireEvent.keyDown(slider,{key:'ArrowLeft'});expect(engine.slidePrev).toHaveBeenCalledWith(0);
    act(()=>screen.getByRole('button',{name:'Outside slider'}).focus());
    act(()=>{reducedMotion=false;motionListeners.forEach(listener=>listener());});expect(engine.autoplay.running).toBe(true);engine.animating=true;
    act(()=>{reducedMotion=true;motionListeners.forEach(listener=>listener());});expect(engine.autoplay.running).toBe(false);expect(engine.setTransition).toHaveBeenCalledWith(0);expect(engine.setTranslate).toHaveBeenCalledWith(-42);expect(engine.transitionEnd).toHaveBeenCalled();expect(engine.animating).toBe(false);
  });
});
