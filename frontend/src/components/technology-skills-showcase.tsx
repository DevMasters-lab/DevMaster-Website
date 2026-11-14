'use client';

import {useCallback,useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import {ArrowDown,ArrowUp,Atom,Box,ChevronLeft,ChevronRight,Search,X} from 'lucide-react';
import {A11y,Autoplay,Mousewheel} from 'swiper/modules';
import {Swiper,SwiperSlide} from 'swiper/react';
import type {Swiper as SwiperInstance} from 'swiper';
import {useText} from '@/i18n/provider';
import {technologySkillCategories,type TechnologySkill} from '@/data/technology-skills';
import {getShowcaseSkills,getTechnologyTileAppearance} from '@/data/technology-skill-tiles';
import {carouselMotion} from '@/lib/carousel-motion';
import styles from './technology-skills-showcase.module.css';
import 'swiper/css';
import 'swiper/css/a11y';

const breakpoints={700:{slidesPerView:4,spaceBetween:14},1100:{slidesPerView:5,spaceBetween:14}};
const CATEGORY_PREVIEW_COUNT=8;
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
  const categoryToggleRef=useRef<HTMLButtonElement>(null);
  const skillsToggleRef=useRef<HTMLButtonElement>(null);
  const collapseRequested=useRef(false);
  const skillsCollapseRequested=useRef(false);
  const [categoryId,setCategoryId]=useState('');
  const [categoriesExpanded,setCategoriesExpanded]=useState(false);
  const [skillsExpanded,setSkillsExpanded]=useState(false);
  const [query,setQuery]=useState('');
  const initialCategories=technologySkillCategories.slice(0,CATEGORY_PREVIEW_COUNT);
  const selectedCategory=technologySkillCategories.find(category=>category.id===categoryId);
  const previewCategories=selectedCategory&&!initialCategories.some(category=>category.id===categoryId)
    ?[...initialCategories.slice(0,CATEGORY_PREVIEW_COUNT-1),selectedCategory]:initialCategories;
  const visibleCategories=categoriesExpanded?technologySkillCategories:previewCategories;
  const hiddenCategoryCount=technologySkillCategories.length-previewCategories.length;
  const needle=normalizeSearch(query);
  const skills=getShowcaseSkills(categoryId).filter(skill=>!needle||normalizeSearch(skill.name).includes(needle));
  const filtered=Boolean(categoryId||needle);
  function selectCategory(value:string){setCategoryId(value);setSkillsExpanded(false);skillsCollapseRequested.current=false;}
  function changeQuery(value:string){setQuery(value);setSkillsExpanded(false);skillsCollapseRequested.current=false;}
  function resetFilters(){setCategoryId('');setQuery('');setCategoriesExpanded(false);setSkillsExpanded(false);collapseRequested.current=false;skillsCollapseRequested.current=false;searchRef.current?.focus();}
  function toggleCategories(){collapseRequested.current=categoriesExpanded;setCategoriesExpanded(previous=>!previous);}
  function toggleSkills(){skillsCollapseRequested.current=skillsExpanded;setSkillsExpanded(previous=>!previous);}
  useEffect(()=>{
    if(!categoriesExpanded&&collapseRequested.current){
      collapseRequested.current=false;
      categoryToggleRef.current?.scrollIntoView?.({block:'nearest',behavior:'instant'});
    }
  },[categoriesExpanded]);
  useEffect(()=>{
    if(!skillsExpanded&&skillsCollapseRequested.current){
      skillsCollapseRequested.current=false;
      skillsToggleRef.current?.scrollIntoView?.({block:'nearest',behavior:'instant'});
    }
  },[skillsExpanded]);

  return <section className={styles.section} aria-labelledby={id+'-heading'}>
    <div className="section-wrap">
      <div className={styles.heading}>
        <h2 id={id+'-heading'} data-reveal="up">{t('Technology Skills & Expertise')}</h2>
        <p data-reveal="up" data-reveal-delay="1">{t('Browse technology categories and search the skills that match your interests.')}</p>
      </div>
      <div className={styles.content}>
        <div className={styles.filters} data-reveal="up">
          <div className={styles.filterHeading}><p className={styles.filterLabel}>{t('Explore by category')}</p><span className={styles.total}>{skills.length===1?t('1 skill'):t('{count} skills',{count:skills.length})}</span></div>
          <div id={id+'-categories'} className={styles.filterList} role="group" aria-label={t('Technology categories')}>
            <button type="button" className={styles.filter} aria-pressed={!categoryId} aria-controls={id+'-skills'} onClick={()=>selectCategory('')}>{t('All categories')}</button>
            {visibleCategories.map(category=><button type="button" key={category.id} className={styles.filter} aria-pressed={categoryId===category.id} aria-controls={id+'-skills'} onClick={()=>selectCategory(category.id)}>{t(category.name)}</button>)}
          </div>
          {hiddenCategoryCount>0&&<button ref={categoryToggleRef} type="button" className={styles.categoryToggle} aria-expanded={categoriesExpanded} aria-controls={id+'-categories'} onClick={toggleCategories}>
            {t(categoriesExpanded?'Show fewer categories':'Show more categories')}
            {!categoriesExpanded&&<span aria-hidden="true">(+{hiddenCategoryCount})</span>}
            {categoriesExpanded?<ArrowUp size={16} aria-hidden="true"/>:<ArrowDown size={16} aria-hidden="true"/>}
          </button>}
          <div className={styles.filterControls}>
            <label className={styles.filterField} htmlFor={id+'-search'}>{t('Search skills')}
              <span className={styles.searchField}><Search size={18} aria-hidden="true"/>
                <input ref={searchRef} id={id+'-search'} type="search" autoComplete="off" value={query} placeholder={t('Search a technology, tool or framework')} aria-controls={id+'-skills'} onChange={event=>changeQuery(event.target.value)}/>
                {query&&<button type="button" className={styles.clearSearch} aria-label={t('Clear search')} onClick={()=>{changeQuery('');searchRef.current?.focus();}}><X size={16} aria-hidden="true"/></button>}
              </span>
            </label>
            {filtered&&<button type="button" className={styles.reset} onClick={resetFilters}>{t('Reset filters')}</button>}
          </div>
        </div>
        <div id={id+'-skills'}>
          {skills.length?(skillsExpanded?<>
            <ul className={styles.skillsGrid} aria-labelledby={id+'-heading'}>
              {skills.map((skill,index)=><li key={skill.id} data-reveal="up" data-reveal-delay={index%4}><TechnologySkillTile skill={skill}/></li>)}
            </ul>
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{skills.length===1?t('1 skill'):t('{count} skills',{count:skills.length})}</p>
          </>:<TechnologySkillsSlider key={JSON.stringify([categoryId,needle])} skills={skills} id={id+'-slider'}/>):<>
            <div className={styles.empty}><Search size={25} aria-hidden="true"/><h3>{t('No matching skills')}</h3><p>{t('Try another keyword or choose a different category.')}</p></div>
            <p className="sr-only" role="status">{t('{count} skills',{count:0})}</p>
          </>}
        </div>
        {skills.length>0&&<button ref={skillsToggleRef} type="button" className={styles.categoryToggle} aria-expanded={skillsExpanded} aria-controls={id+'-skills'} onClick={toggleSkills}>
          {t(skillsExpanded?'Show fewer skills':'Show all skills')}
          {skillsExpanded?<ArrowUp size={16} aria-hidden="true"/>:<ArrowDown size={16} aria-hidden="true"/>}
        </button>}
      </div>
    </div>
  </section>;
}
