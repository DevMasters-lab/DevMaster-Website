import React from 'react';
import {renderToString} from 'react-dom/server';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,createEvent,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {TechnologySkillsShowcase} from '../src/components/technology-skills-showcase';
import {carouselMotion} from '../src/lib/carousel-motion';
import {getSkillsForCategory,technologySkillCategories,technologySkills} from '../src/data/technology-skills';
import {getTechnologySkillDetails} from '../src/data/technology-skill-details';
import english from '../messages/en.json';
import khmer from '../messages/km.json';

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
const dialogPrototype=HTMLDialogElement.prototype;
const originalShowModal=Object.getOwnPropertyDescriptor(dialogPrototype,'showModal');
const originalClose=Object.getOwnPropertyDescriptor(dialogPrototype,'close');
let originalBodyStyle:string|null;
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
  originalBodyStyle=document.body.getAttribute('style');
  Object.defineProperty(dialogPrototype,'showModal',{configurable:true,writable:true,value:vi.fn(function(this:HTMLDialogElement){
    if(this.open)return;
    this.setAttribute('open','');
    this.querySelector<HTMLElement>('[autofocus],button,a[href]')?.focus();
  })});
  Object.defineProperty(dialogPrototype,'close',{configurable:true,writable:true,value:vi.fn(function(this:HTMLDialogElement){
    if(!this.open)return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  })});
});
afterEach(()=>{
  cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();
  if(originalShowModal)Object.defineProperty(dialogPrototype,'showModal',originalShowModal);else Reflect.deleteProperty(dialogPrototype,'showModal');
  if(originalClose)Object.defineProperty(dialogPrototype,'close',originalClose);else Reflect.deleteProperty(dialogPrototype,'close');
  if(originalBodyStyle===null)document.body.removeAttribute('style');else document.body.setAttribute('style',originalBodyStyle);
});
const featured=['React','Next.js','TypeScript','JavaScript','NestJS','Node.js','Laravel','Python','Flutter','PostgreSQL','AWS','Docker'];
function renderShowcase(locale:'en'|'km'='en'){
  const view=render(<LocaleProvider initialLocale={locale}><TechnologySkillsShowcase/><button type="button">Outside slider</button></LocaleProvider>);
  ViewportObserver.instances.forEach(observer=>observer.intersect(true));
  return view;
}
function technologyCards(){return screen.getAllByRole('article',{hidden:true});}
function technologyIds(){return technologyCards().map(card=>technologySkills.find(skill=>skill.name===card.querySelector('h3')?.textContent)?.id);}
function viewport(){return screen.getByRole('group',{name:'Technology skills slider'});}
function expandCategories(){const more=screen.queryByRole('button',{name:/^Show more categories/});if(more)fireEvent.click(more);}
function hover(element:HTMLElement,entering:boolean){const event=entering?createEvent.pointerOver(element):createEvent.pointerOut(element);Object.defineProperty(event,'pointerType',{value:'mouse'});fireEvent(element,event);}
function translated(locale:'en'|'km',source:string,values:Record<string,string>={}){
  const key=Object.entries(english.ui).findLast(([,value])=>value===source)?.[0];
  const dictionary=(locale==='en'?english:khmer).ui as Record<string,string>;
  const template=key?dictionary[key]:source;
  return template.replace(/\{(\w+)\}/g,(match,name:string)=>values[name]??match);
}

describe('technology skills slider',()=>{
  it('offers every unique skill with reference technologies first and accessible detail buttons',()=>{
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
    const dialogIds=new Set<string>();
    for(const card of technologyCards()){
      expect(card).not.toHaveAttribute('tabindex');
      const name=card.querySelector('h3')!.textContent!;
      const button=within(card).getByRole('button',{name:`View ${name} details`});
      expect(button).toHaveAttribute('type','button');
      expect(button).toHaveAttribute('aria-haspopup','dialog');
      dialogIds.add(button.getAttribute('aria-controls')!);
    }
    expect(dialogIds.size).toBe(1);
    expect(document.getElementById([...dialogIds][0])?.tagName).toBe('DIALOG');
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.getAllByText('View Technology')).toHaveLength(technologySkills.length);
    expect(screen.queryByRole('button',{name:/Show (more|fewer) technologies/})).not.toBeInTheDocument();
    const filters=screen.getByRole('group',{name:'Technology categories'});
    expect(within(filters).getAllByRole('button').map(button=>button.textContent)).toEqual(['All categories',...technologySkillCategories.slice(0,8).map(category=>category.name)]);
    expect(screen.queryByRole('combobox',{name:'Subcategory'})).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
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
  it('expands and collapses categories with a persistent keyboard-accessible toggle',()=>{
    renderShowcase();
    const filters=screen.getByRole('group',{name:'Technology categories'});
    const toggle=screen.getByRole('button',{name:/^Show more categories/});
    expect(toggle).toHaveAttribute('type','button');
    expect(toggle).toHaveAttribute('aria-expanded','false');
    expect(toggle).toHaveAttribute('aria-controls',filters.id);
    expect(within(filters).getAllByRole('button')).toHaveLength(9);
    fireEvent.click(screen.getByRole('button',{name:'Next technologies'}));
    const position=engine.realIndex;
    act(()=>toggle.focus());
    // Native button keyboard activation dispatches a click with detail zero.
    fireEvent.click(toggle,{detail:0});
    expect(screen.getByRole('button',{name:/^Show fewer categories/})).toBe(toggle);
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-expanded','true');
    expect(within(filters).getAllByRole('button').map(button=>button.textContent)).toEqual(['All categories',...technologySkillCategories.map(category=>category.name)]);
    expect(engine.realIndex).toBe(position);
    fireEvent.click(toggle,{detail:0});
    expect(screen.getByRole('button',{name:/^Show more categories/})).toBe(toggle);
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-expanded','false');
    expect(within(filters).getAllByRole('button')).toHaveLength(9);
    expect(engine.realIndex).toBe(position);
  });
  it('keeps a selected late category and its skills when the category list folds',()=>{
    renderShowcase();expandCategories();
    const filters=screen.getByRole('group',{name:'Technology categories'});
    const category=technologySkillCategories.at(-1)!;
    const selected=within(filters).getByRole('button',{name:category.name});
    fireEvent.click(selected);
    const expected=getSkillsForCategory(category.id);
    fireEvent.click(screen.getByRole('button',{name:/^Show fewer categories/}));
    expect(within(filters).getAllByRole('button')).toHaveLength(9);
    expect(within(filters).getByRole('button',{name:category.name})).toBe(selected);
    expect(selected).toHaveAttribute('aria-pressed','true');
    expect(within(filters).getAllByRole('button').map(button=>button.textContent)).toEqual(['All categories',...technologySkillCategories.slice(0,7).map(item=>item.name),category.name]);
    expect(new Set(technologyIds())).toEqual(new Set(expected.map(skill=>skill.id)));
    fireEvent.click(screen.getByRole('button',{name:'Reset filters'}));
    expect(within(filters).getByRole('button',{name:'All categories'})).toHaveFocus();
    expect(screen.getByRole('button',{name:/^Show more categories/})).toHaveAttribute('aria-expanded','false');
    expect(within(filters).queryByRole('button',{name:category.name})).not.toBeInTheDocument();
    expect(new Set(technologyIds())).toEqual(new Set(technologySkills.map(skill=>skill.id)));
  });
  it('shows all 344 skills in a static grid and returns to the running slider with the same toggle',()=>{
    renderShowcase();
    const toggle=screen.getByRole('button',{name:/^Show all skills/});
    const target=document.getElementById(toggle.getAttribute('aria-controls')!);
    expect(target).not.toBeNull();
    expect(toggle).toHaveAttribute('type','button');
    expect(toggle).toHaveAttribute('aria-expanded','false');
    act(()=>toggle.focus());
    fireEvent.click(toggle,{detail:0});
    expect(screen.getByRole('button',{name:/^Show fewer skills/})).toBe(toggle);
    expect(toggle).toHaveFocus();expect(toggle).toHaveAttribute('aria-expanded','true');
    expect(screen.queryByRole('group',{name:'Technology skills slider'})).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('technology-column')).toHaveLength(0);
    expect(target?.querySelectorAll('article')).toHaveLength(technologySkills.length);
    expect(new Set(technologyIds())).toEqual(new Set(technologySkills.map(skill=>skill.id)));
    expect(engine.autoplay.running).toBe(false);
    fireEvent.click(toggle,{detail:0});
    expect(screen.getByRole('button',{name:/^Show all skills/})).toBe(toggle);
    expect(toggle).toHaveFocus();expect(toggle).toHaveAttribute('aria-expanded','false');
    expect(viewport()).toBeInTheDocument();
    expect(engine.realIndex).toBe(0);
    ViewportObserver.instances.forEach(observer=>observer.intersect(true));
    expect(engine.autoplay.running).toBe(true);
    expect(location.pathname).toBe('/en/home');
  });
  it('limits the expanded grid to its category and keeps category disclosure independent',()=>{
    renderShowcase();expandCategories();
    fireEvent.click(screen.getByRole('button',{name:'Backend Development'}));
    fireEvent.click(screen.getByRole('button',{name:/^Show all skills/}));
    const expected=getSkillsForCategory('backend-development');
    expect(technologyIds()).toHaveLength(expected.length);
    expect(new Set(technologyIds())).toEqual(new Set(expected.map(skill=>skill.id)));
    expect(screen.queryAllByTestId('technology-column')).toHaveLength(0);
    expect(screen.getByRole('button',{name:'Backend Development'})).toHaveAttribute('aria-pressed','true');
    fireEvent.click(screen.getByRole('button',{name:/^Show fewer categories/}));
    expect(screen.getByRole('button',{name:/^Show fewer skills/})).toHaveAttribute('aria-expanded','true');
    expect(screen.queryAllByTestId('technology-column')).toHaveLength(0);
    expect(new Set(technologyIds())).toEqual(new Set(expected.map(skill=>skill.id)));
    expandCategories();
    expect(screen.getByRole('button',{name:/^Show fewer skills/})).toHaveAttribute('aria-expanded','true');
    expect(screen.getByRole('button',{name:/^Show fewer categories/})).toHaveAttribute('aria-expanded','true');
  });
  it('resets the expanded skill grid on category changes and reset without collapsing categories prematurely',()=>{
    renderShowcase();expandCategories();
    fireEvent.click(screen.getByRole('button',{name:/^Show all skills/}));
    fireEvent.click(screen.getByRole('button',{name:'Frontend Development'}));
    expect(viewport()).toBeInTheDocument();
    expect(screen.getByRole('button',{name:/^Show all skills/})).toHaveAttribute('aria-expanded','false');
    expect(screen.getByRole('button',{name:/^Show fewer categories/})).toHaveAttribute('aria-expanded','true');
    expect(new Set(technologyIds())).toEqual(new Set(getSkillsForCategory('frontend-development').map(skill=>skill.id)));
    fireEvent.click(screen.getByRole('button',{name:/^Show all skills/}));
    fireEvent.click(screen.getByRole('button',{name:'Reset filters'}));
    expect(viewport()).toBeInTheDocument();
    expect(screen.getByRole('button',{name:/^Show all skills/})).toHaveAttribute('aria-expanded','false');
    expect(screen.getByRole('button',{name:/^Show more categories/})).toHaveAttribute('aria-expanded','false');
    expect(screen.getByRole('button',{name:'All categories'})).toHaveFocus();
    expect(new Set(technologyIds())).toEqual(new Set(technologySkills.map(skill=>skill.id)));
  });
  it('keeps an odd filtered result complete and unique with one card in the final column',()=>{
    renderShowcase();expandCategories();
    const category=technologySkillCategories.find(item=>{
      const count=getSkillsForCategory(item.id).length;
      return count>2&&count%2===1;
    })!;
    fireEvent.click(screen.getByRole('button',{name:category.name}));
    const expected=getSkillsForCategory(category.id);
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
  it('shows complete category results and restarts when the category changes',()=>{
    renderShowcase();expandCategories();
    const filters=screen.getByRole('group',{name:'Technology categories'});
    const representatives=['programming-languages','frontend-development','cloud-computing','network-security','gis-remote-sensing','graphic-design'];
    for(const id of representatives){
      fireEvent.click(screen.getByRole('button',{name:'Next technologies'}));
      const category=technologySkillCategories.find(item=>item.id===id)!;
      const button=within(filters).getByRole('button',{name:category.name});
      act(()=>button.focus());fireEvent.click(button);
      expect(button).toHaveFocus();expect(button).toHaveAttribute('aria-pressed','true');
      expect(within(filters).getAllByRole('button').filter(item=>item.getAttribute('aria-pressed')==='true')).toHaveLength(1);
      expect(new Set(technologyIds())).toEqual(new Set(getSkillsForCategory(id).map(skill=>skill.id)));
      expect(engine.realIndex).toBe(0);
    }
    fireEvent.click(within(filters).getByRole('button',{name:'All categories'}));
    expect(engine.realIndex).toBe(0);
    expect(new Set(technologyIds())).toEqual(new Set(technologySkills.map(skill=>skill.id)));
  });
  it('disables autoplay and navigation when a category fits the desktop viewport',()=>{
    renderShowcase();expandCategories();
    const category=technologySkillCategories.find(item=>getSkillsForCategory(item.id).length<=10)!;
    fireEvent.click(screen.getByRole('button',{name:category.name}));
    const expected=getSkillsForCategory(category.id);
    expect(new Set(technologyIds())).toEqual(new Set(expected.map(skill=>skill.id)));
    expect(screen.getByRole('button',{name:'Previous technologies'})).toBeDisabled();
    expect(screen.getByRole('button',{name:'Next technologies'})).toBeDisabled();
    expect(engine.props?.loop).toBe(false);
    expect(engine.autoplay.running).toBe(false);
    fireEvent.click(screen.getByRole('button',{name:/^Show all skills/}));
    expect(screen.queryAllByTestId('technology-column')).toHaveLength(0);
    expect(new Set(technologyIds())).toEqual(new Set(expected.map(skill=>skill.id)));
  });
  it('renders every skill and its detail button on the server without opening a dialog',()=>{
    const container=document.createElement('div');container.innerHTML=renderToString(<LocaleProvider initialLocale="en"><TechnologySkillsShowcase/></LocaleProvider>);
    expect(container.querySelectorAll('article')).toHaveLength(technologySkills.length);expect(container.querySelector('a')).toBeNull();expect(container.querySelector('article[tabindex],article [tabindex]')).toBeNull();expect(container.querySelectorAll('article button[aria-haspopup="dialog"]')).toHaveLength(technologySkills.length);expect(container.querySelector('dialog[open]')).toBeNull();expect(container.textContent).not.toContain('Show more technologies');
  });
  it('translates Khmer controls while retaining canonical technology names',()=>{
    renderShowcase('km');expect(screen.getByRole('heading',{level:2,name:'ជំនាញ និងឯកទេសបច្ចេកវិទ្យា'})).toBeInTheDocument();const filters=screen.getByRole('group',{name:'ប្រភេទបច្ចេកវិទ្យា'});expect(within(filters).getByRole('button',{name:'ប្រភេទទាំងអស់'})).toHaveAttribute('aria-pressed','true');
    const more=screen.getByRole('button',{name:/^បង្ហាញប្រភេទបន្ថែម/});
    fireEvent.click(more);expect(within(filters).getAllByRole('button')).toHaveLength(47);
    const fewer=screen.getByRole('button',{name:/^បង្ហាញប្រភេទតិចជាងមុន/});
    expect(fewer).toBe(more);expect(fewer).toHaveAttribute('aria-expanded','true');
    fireEvent.click(fewer);expect(within(filters).getAllByRole('button')).toHaveLength(9);
    const allSkills=screen.getByRole('button',{name:/^បង្ហាញជំនាញទាំងអស់/});
    fireEvent.click(allSkills);
    const fewerSkills=screen.getByRole('button',{name:/^បង្ហាញជំនាញតិចជាងមុន/});
    expect(fewerSkills).toBe(allSkills);expect(fewerSkills).toHaveAttribute('aria-expanded','true');
    expect(screen.queryAllByTestId('technology-column')).toHaveLength(0);
    fireEvent.click(fewerSkills);
    expect(allSkills).toHaveAttribute('aria-expanded','false');
    fireEvent.click(screen.getByRole('button',{name:'បច្ចេកវិទ្យាបន្ទាប់'}));expect(engine.slideNext).toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'បច្ចេកវិទ្យាមុន'}));expect(engine.slidePrev).toHaveBeenCalled();expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    fireEvent.click(within(filters).getByRole('button',{name:'ការអភិវឌ្ឍផ្នែកខាងមុខ'}));
    expect(new Set(technologyIds())).toEqual(new Set(getSkillsForCategory('frontend-development').map(skill=>skill.id)));
    fireEvent.click(screen.getByRole('button',{name:'កំណត់តម្រងឡើងវិញ'}));
    expect(within(filters).getByRole('button',{name:'ប្រភេទទាំងអស់'})).toHaveFocus();
    expect(new Set(technologyIds())).toEqual(new Set(technologySkills.map(skill=>skill.id)));
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

describe('technology skill details drawer',()=>{
  it.each(['en','km'] as const)('opens localized details from a skill tile in %s without navigating',locale=>{
    renderShowcase(locale);
    const href=location.href;
    const skill=technologySkills.find(item=>item.id==='javascript')!;
    const details=getTechnologySkillDetails(skill);
    const trigger=screen.getByRole('button',{name:translated(locale,'View {technology} details',{technology:skill.name})});
    expect(engine.autoplay.running).toBe(true);
    fireEvent.click(trigger,{detail:0});
    const dialog=screen.getByRole('dialog',{name:skill.name});
    expect(dialog.id).toBe(trigger.getAttribute('aria-controls'));
    expect(within(dialog).getByRole('heading',{level:2,name:skill.name})).toHaveFocus();
    expect(dialog).toHaveAccessibleDescription(translated(locale,details.description,{technology:skill.name}));
    expect(within(dialog).getByRole('heading',{name:translated(locale,'Where it can be applied')})).toBeInTheDocument();
    expect(within(dialog).getByRole('heading',{name:translated(locale,'Related categories')})).toBeInTheDocument();
    for(const application of details.applications)expect(within(dialog).getByText(translated(locale,application))).toBeInTheDocument();
    for(const categoryId of skill.categoryIds){
      const category=technologySkillCategories.find(item=>item.id===categoryId)!;
      expect(within(dialog).getByText(translated(locale,category.name))).toBeInTheDocument();
    }
    expect(within(dialog).getByRole('button',{name:translated(locale,'Partner with our specialists')})).toHaveAttribute('aria-haspopup','dialog');
    expect(engine.autoplay.running).toBe(false);
    engine.animating=true;engine.autoplay.running=true;
    act(()=>engine.props?.onAutoplay?.(engine));
    expect(engine.autoplay.running).toBe(false);
    expect(engine.animating).toBe(false);
    const close=within(dialog).getByRole('button',{name:translated(locale,'Close technology details')});
    const partner=within(dialog).getByRole('button',{name:translated(locale,'Partner with our specialists')});
    act(()=>partner.focus());
    const forward=createEvent.keyDown(partner,{key:'Tab',bubbles:true,cancelable:true});
    fireEvent(partner,forward);
    expect(forward.defaultPrevented).toBe(true);
    expect(close).toHaveFocus();
    const backward=createEvent.keyDown(close,{key:'Tab',shiftKey:true,bubbles:true,cancelable:true});
    fireEvent(close,backward);
    expect(backward.defaultPrevented).toBe(true);
    expect(partner).toHaveFocus();
    fireEvent.click(close);
    expect(dialog).not.toHaveAttribute('open');
    expect(trigger).toHaveFocus();
    act(()=>screen.getByRole('button',{name:'Outside slider'}).focus());
    expect(engine.autoplay.running).toBe(true);
    expect(location.href).toBe(href);
  });

  it.each(['close','cancel','backdrop'] as const)('dismisses through %s and restores the tile focus and existing scroll styles',method=>{
    document.body.style.overflow='auto';document.body.style.paddingRight='9px';
    vi.spyOn(document.documentElement,'clientWidth','get').mockReturnValue(window.innerWidth-16);
    renderShowcase();
    const trigger=screen.getByRole('button',{name:'View React details'});
    fireEvent.click(trigger);
    const dialog=screen.getByRole('dialog',{name:'React'});
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.paddingRight).toBe('25px');
    if(method==='close')fireEvent.click(within(dialog).getByRole('button',{name:'Close technology details'}));
    else if(method==='cancel'){
      const cancel=new Event('cancel',{cancelable:true});
      fireEvent(dialog,cancel);
      expect(cancel.defaultPrevented).toBe(true);
    }else{
      vi.spyOn(dialog,'getBoundingClientRect').mockReturnValue(new DOMRect(600,0,424,768));
      fireEvent.click(within(dialog).getByRole('heading',{name:'React'}));
      fireEvent.click(dialog,{clientX:700,clientY:100});
      expect(dialog).toHaveAttribute('open');
      fireEvent.click(dialog,{clientX:200,clientY:100});
    }
    expect(dialog).not.toHaveAttribute('open');
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.paddingRight).toBe('9px');
  });

  it('opens a skill from the expanded grid and hands off to the existing partnership form',async()=>{
    document.body.style.overflow='auto';document.body.style.paddingRight='7px';
    vi.spyOn(document.documentElement,'clientWidth','get').mockReturnValue(window.innerWidth-16);
    renderShowcase();
    fireEvent.click(screen.getByRole('button',{name:/^Show all skills/}));
    const trigger=screen.getByRole('button',{name:'View ServiceNow details'});
    fireEvent.click(trigger);
    const drawer=screen.getByRole('dialog',{name:'ServiceNow'});
    expect(within(drawer).getByText('User support and incident resolution')).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button',{name:'Partner with our specialists'}));
    const partner=await screen.findByRole('dialog',{name:'Partner With Our Experts'});
    expect(drawer).not.toHaveAttribute('open');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await within(partner).findByLabelText('Company / organization *');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.paddingRight).toBe('23px');
    fireEvent.click(within(partner).getByRole('button',{name:'Close expert partnership'}));
    await waitFor(()=>expect(partner).not.toHaveAttribute('open'));
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.paddingRight).toBe('7px');
    expect(screen.getByRole('button',{name:/^Show fewer skills/})).toHaveAttribute('aria-expanded','true');
    expect(location.pathname).toBe('/en/home');
  });
});
