'use client';

import {useCallback,useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import {Atom,Box,ChevronDown,ChevronLeft,ChevronRight,Search,X} from 'lucide-react';
import {A11y,Autoplay,Mousewheel} from 'swiper/modules';
import {Swiper,SwiperSlide} from 'swiper/react';
import type {Swiper as SwiperInstance} from 'swiper';
import {useText} from '@/i18n/provider';
import {getSubcategoriesForCategory,technologySkillCategories,technologySkillSubcategories,type TechnologySkill} from '@/data/technology-skills';
import {getShowcaseSkills,getTechnologyTileAppearance} from '@/data/technology-skill-tiles';
import {carouselMotion} from '@/lib/carousel-motion';
import styles from './technology-skills-showcase.module.css';
import 'swiper/css';
import 'swiper/css/a11y';

const breakpoints={700:{slidesPerView:4,spaceBetween:14},1100:{slidesPerView:5,spaceBetween:14}};
const normalizeSearch=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('en').trim().replace(/\s+/g,' ');

export function TechnologySkillTile({skill}:{skill:TechnologySkill}){
  const appearance=getTechnologyTileAppearance(skill);
  const iconStyle={'--technology-color':appearance.color,'--technology-tint':appearance.tint} as CSSProperties;
  return <article className={styles.card} aria-label={skill.name}>
    <span className={styles.icon} style={iconStyle} aria-hidden="true">
      {skill.id==='react'?<Atom size={29} strokeWidth={1.6}/>:skill.id==='docker'?<Box size={27} strokeWidth={1.7}/>:appearance.label}
    </span>
    <h3 className={styles.name}>{skill.name}</h3>
  </article>;
}

function TechnologySkillsSlider({skills,id}:{skills:TechnologySkill[];id:string}){
  const t=useText();
  const columns:TechnologySkill[][]=[];
  for(let index=0;index<skills.length;index+=2)columns.push(skills.slice(index,index+2));
  const viewport=useRef<HTMLDivElement>(null);
  const [swiper,setSwiper]=useState<SwiperInstance|null>(null);
  const [reducedMotion,setReducedMotion]=useState(true);
  const [visible,setVisible]=useState(false);
  const [pageVisible,setPageVisible]=useState(false);
  const [keyboardFocused,setKeyboardFocused]=useState(false);
  const [navigation,setNavigation]=useState({locked:columns.length<=2,beginning:true,end:columns.length<=2});
  // Swiper needs more slides than the widest viewport to loop without blanks.
  const loop=columns.length>5;
  const autoplayAllowed=loop&&visible&&pageVisible&&!reducedMotion&&!keyboardFocused;
  const playbackPolicy=useRef(autoplayAllowed);
  playbackPolicy.current=autoplayAllowed;
  const stopMotion=useCallback((instance:SwiperInstance)=>{
    instance.autoplay.stop();
    if(instance.animating){
      const position=instance.getTranslate();
      instance.setTransition(0);
      instance.setTranslate(position);
      instance.transitionEnd();
    }
  },[]);
  const guardAutoplay=useCallback((instance:SwiperInstance)=>{
    // A queued Swiper animation frame may fire after autoplay.stop().
    if(!playbackPolicy.current)stopMotion(instance);
  },[stopMotion]);
  const updateNavigation=useCallback((instance:SwiperInstance)=>{
    setNavigation({locked:instance.isLocked,beginning:instance.isBeginning,end:instance.isEnd});
  },[]);
  const initialize=useCallback((instance:SwiperInstance)=>{
    instance.autoplay.stop();
    setSwiper(instance);
  },[]);

  useEffect(()=>{
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion=()=>setReducedMotion(preference.matches);
    const updateVisibility=()=>setPageVisible(!document.hidden);
    updateMotion();updateVisibility();
    preference.addEventListener('change',updateMotion);
    document.addEventListener('visibilitychange',updateVisibility);
    return ()=>{
      preference.removeEventListener('change',updateMotion);
      document.removeEventListener('visibilitychange',updateVisibility);
    };
  },[]);

  useEffect(()=>{
    if(typeof IntersectionObserver!=='function'){setVisible(true);return;}
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:0});
    if(viewport.current)observer.observe(viewport.current);
    return ()=>observer.disconnect();
  },[]);

  useEffect(()=>{
    if(!swiper||swiper.destroyed)return;
    if(autoplayAllowed){
      swiper.autoplay.start();
    }else{
      // Freeze at the current position instead of finishing a long transition.
      stopMotion(swiper);
    }
    return ()=>{if(!swiper.destroyed)swiper.autoplay.stop();};
  },[swiper,autoplayAllowed,stopMotion]);

  const previousDisabled=navigation.locked||(!loop&&navigation.beginning);
  const nextDisabled=navigation.locked||(!loop&&navigation.end);
  function move(direction:'previous'|'next'){
    if(direction==='previous'&&!previousDisabled)swiper?.slidePrev(reducedMotion?0:carouselMotion.interactionSpeed);
    if(direction==='next'&&!nextDisabled)swiper?.slideNext(reducedMotion?0:carouselMotion.interactionSpeed);
  }

  return <div ref={viewport} className={styles.slider} role="group" aria-label={t('Technology skills slider')}
    aria-describedby={id+'-instructions'} tabIndex={0} data-reveal="up"
    onFocusCapture={event=>setKeyboardFocused(event.target.matches(':focus-visible'))}
    onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setKeyboardFocused(false);}}
    onPointerDownCapture={()=>setKeyboardFocused(false)}
    onKeyDown={event=>{
      setKeyboardFocused(true);
      if(event.target!==event.currentTarget||!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();
      move(event.key==='ArrowRight'?'next':'previous');
    }}>
    <p id={id+'-instructions'} className="sr-only">{t('Drag or swipe to explore technologies. Use the arrow keys when focused.')}</p>
    <div className={styles.sliderViewport}>
      <button type="button" className={styles.arrow} aria-label={t('Previous technologies')} aria-controls={id+'-track'} disabled={previousDisabled} onClick={()=>move('previous')}><ChevronLeft size={20} aria-hidden="true"/></button>
      <Swiper id={id+'-track'} className={styles.track} data-rows={skills.length>1?2:1} modules={[A11y,Autoplay,Mousewheel]}
        onSwiper={initialize} onInit={updateNavigation} onSlideChange={updateNavigation}
        onAutoplay={guardAutoplay}
        onResize={updateNavigation} onBreakpoint={updateNavigation} onLock={updateNavigation} onUnlock={updateNavigation}
        slidesPerView={2} spaceBetween={12} breakpoints={breakpoints}
        loop={loop} loopPreventsSliding={false} speed={reducedMotion?0:carouselMotion.speed} grabCursor watchOverflow
        autoplay={{delay:carouselMotion.delay,reverseDirection:true,disableOnInteraction:false}}
        mousewheel={{forceToAxis:true,sensitivity:1}}
        a11y={{slideLabelMessage:'{{index}} / {{slidesLength}}'}}>
        {columns.map(column=><SwiperSlide key={column[0].id} className={styles.slide}>
          {column.map(skill=><TechnologySkillTile key={skill.id} skill={skill}/>)}
        </SwiperSlide>)}
      </Swiper>
      <button type="button" className={styles.arrow} aria-label={t('Next technologies')} aria-controls={id+'-track'} disabled={nextDisabled} onClick={()=>move('next')}><ChevronRight size={20} aria-hidden="true"/></button>
    </div>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{skills.length===1?t('1 skill'):t('{count} skills',{count:skills.length})}</p>
  </div>;
}

export function TechnologySkillsShowcase(){
  const t=useText();
  const id=useId();
  const searchRef=useRef<HTMLInputElement>(null);
  const [categoryId,setCategoryId]=useState('');
  const [subcategoryId,setSubcategoryId]=useState('');
  const [query,setQuery]=useState('');
  const needle=normalizeSearch(query);
  const subcategories=categoryId?getSubcategoriesForCategory(categoryId):technologySkillSubcategories;
  const skills=getShowcaseSkills(categoryId).filter(skill=>(!subcategoryId||skill.subcategoryIds.includes(subcategoryId))&&(!needle||normalizeSearch(skill.name).includes(needle)));
  const filtered=Boolean(categoryId||subcategoryId||needle);
  function selectCategory(value:string){setCategoryId(value);setSubcategoryId('');}
  function changeQuery(value:string){setQuery(value);}
  function selectSubcategory(value:string){setSubcategoryId(value);}
  function resetFilters(){setCategoryId('');setSubcategoryId('');setQuery('');searchRef.current?.focus();}

  return <section className={styles.section} aria-labelledby={id+'-heading'}>
    <div className="section-wrap">
      <div className={styles.heading}>
        <h2 id={id+'-heading'} data-reveal="up">{t('Technology Skills & Expertise')}</h2>
        <p data-reveal="up" data-reveal-delay="1">{t('Browse eight technology disciplines, then explore their specialisms and individual skills.')}</p>
      </div>
      <div className={styles.content}>
        <div className={styles.filters} data-reveal="up">
          <div className={styles.filterHeading}><p className={styles.filterLabel}>{t('Explore by category')}</p><span className={styles.total}>{skills.length===1?t('1 skill'):t('{count} skills',{count:skills.length})}</span></div>
          <div className={styles.filterList} role="group" aria-label={t('Technology categories')}>
            <button type="button" className={styles.filter} aria-pressed={!categoryId} aria-controls={id+'-skills'} onClick={()=>selectCategory('')}>{t('All categories')}</button>
            {technologySkillCategories.map(category=><button type="button" key={category.id} className={styles.filter} aria-pressed={categoryId===category.id} aria-controls={id+'-skills'} onClick={()=>selectCategory(category.id)}>{t(category.name)}</button>)}
          </div>
          <div className={styles.filterControls}>
            <label className={styles.filterField} htmlFor={id+'-search'}>{t('Search skills')}
              <span className={styles.searchField}><Search size={18} aria-hidden="true"/>
                <input ref={searchRef} id={id+'-search'} type="search" autoComplete="off" value={query} placeholder={t('Search a technology, tool or framework')} aria-controls={id+'-skills'} onChange={event=>changeQuery(event.target.value)}/>
                {query&&<button type="button" className={styles.clearSearch} aria-label={t('Clear search')} onClick={()=>{changeQuery('');searchRef.current?.focus();}}><X size={16} aria-hidden="true"/></button>}
              </span>
            </label>
            <label className={styles.filterField} htmlFor={id+'-subcategory'}>{t('Subcategory')}
              <span className={styles.selectField}><select id={id+'-subcategory'} value={subcategoryId} aria-controls={id+'-skills'} onChange={event=>selectSubcategory(event.target.value)}>
                <option value="">{t('All subcategories')}</option>
                {categoryId?subcategories.map(subcategory=><option key={subcategory.id} value={subcategory.id}>{t(subcategory.name)}</option>):technologySkillCategories.map(category=><optgroup key={category.id} label={t(category.name)}>
                  {subcategories.filter(subcategory=>subcategory.categoryId===category.id).map(subcategory=><option key={subcategory.id} value={subcategory.id}>{t(subcategory.name)}</option>)}
                </optgroup>)}
              </select><ChevronDown size={18} aria-hidden="true"/></span>
            </label>
            {filtered&&<button type="button" className={styles.reset} onClick={resetFilters}>{t('Reset filters')}</button>}
          </div>
        </div>
        <div id={id+'-skills'}>
          {skills.length?<TechnologySkillsSlider key={JSON.stringify([categoryId,subcategoryId,needle])} skills={skills} id={id+'-slider'}/>:<>
            <div className={styles.empty}><Search size={25} aria-hidden="true"/><h3>{t('No matching skills')}</h3><p>{t('Try another keyword or choose a different category.')}</p></div>
            <p className="sr-only" role="status">{t('{count} skills',{count:0})}</p>
          </>}
        </div>
      </div>
    </div>
  </section>;
}
