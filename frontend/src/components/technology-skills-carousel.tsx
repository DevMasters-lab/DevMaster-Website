'use client';

import {useCallback,useEffect,useId,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight} from 'lucide-react';
import {A11y,Autoplay} from 'swiper/modules';
import {Swiper,SwiperSlide} from 'swiper/react';
import type {Swiper as SwiperInstance} from 'swiper';
import Link from '@/i18n/navigation';
import {useText} from '@/i18n/provider';
import {technologySkillCategories,getSkillsForCategory,getSubcategoriesForCategory} from '@/data/technology-skills';
import {getTechnologySkillIcon} from './technology-skill-icons';
import styles from './technology-skills-carousel.module.css';
import 'swiper/css';
import 'swiper/css/a11y';

const breakpoints={
  700:{slidesPerView:2,slidesPerGroup:2,spaceBetween:18},
  1100:{slidesPerView:4,slidesPerGroup:4,spaceBetween:18},
};
const categories=technologySkillCategories.map(category=>({
  ...category,
  skills:getSkillsForCategory(category.id),
  subcategories:getSubcategoriesForCategory(category.id),
}));
type Position={ready:boolean;activeIndex:number;perView:number;page:number;pages:number};

export function TechnologySkillsCarousel(){
  const t=useText();
  const id=useId();
  const [swiper,setSwiper]=useState<SwiperInstance|null>(null);
  const [reducedMotion,setReducedMotion]=useState(true);
  const [position,setPosition]=useState<Position>({ready:false,activeIndex:0,perView:1,page:0,pages:1});
  const sync=useCallback((instance:SwiperInstance)=>{
    if(instance.destroyed)return;
    const perView=typeof instance.params.slidesPerView==='number'?instance.params.slidesPerView:1;
    const next={ready:true,activeIndex:instance.activeIndex,perView,page:instance.snapIndex||0,pages:Math.max(1,instance.snapGrid.length)};
    setPosition(previous=>Object.keys(next).every(key=>previous[key as keyof Position]===next[key as keyof Position])?previous:next);
  },[]);

  useEffect(()=>{
    const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if(!preference)return;
    const update=()=>setReducedMotion(preference.matches);
    update();preference.addEventListener('change',update);
    return ()=>preference.removeEventListener('change',update);
  },[]);

  useEffect(()=>{
    if(!swiper||swiper.destroyed)return;
    if(reducedMotion){
      swiper.autoplay.stop();
      if(swiper.animating){
        const current=swiper.getTranslate();
        swiper.setTransition(0);
        swiper.setTranslate(current);
        swiper.transitionEnd();
      }
    }else swiper.autoplay.start();
    return ()=>{
      if(!swiper.destroyed)swiper.autoplay.stop();
    };
  },[reducedMotion,swiper]);

  function goToPage(page:number){swiper?.slideTo(page*position.perView,reducedMotion?0:320);}

  return <section className={styles.section} aria-labelledby={id+'-heading'}>
    <div className="section-wrap"><div className={styles.heading}>
      <h2 id={id+'-heading'} data-reveal="up">{t('Technology Skills & Expertise')}</h2>
      <p data-reveal="up" data-reveal-delay="1">{t('Browse eight technology disciplines, then explore their specialisms and individual skills.')}</p>
    </div></div>
    <div className={styles.band}><div className="section-wrap">
      <p id={id+'-instructions'} className="sr-only">{t('Use the arrow keys to browse technology categories.')}</p>
      <Swiper id={id+'-carousel'} className={styles.carousel} modules={[A11y,Autoplay]}
        onSwiper={instance=>{setSwiper(instance);sync(instance);}}
        onSlideChange={sync} onSnapIndexChange={sync} onSlidesUpdated={sync} onResize={sync} onBreakpoint={sync}
        slidesPerView={1} slidesPerGroup={1} spaceBetween={18} breakpoints={breakpoints}
        speed={reducedMotion?0:320} grabCursor watchOverflow
        rewind autoplay={{delay:5000,disableOnInteraction:false}}
        a11y={{slideLabelMessage:'{{index}} / {{slidesLength}}',scrollOnFocus:false,wrapperLiveRegion:false}}
        role="group" tabIndex={0} aria-label={t('Technology skills carousel')} aria-describedby={id+'-instructions'}
        onKeyDown={event=>{
          if(event.target!==event.currentTarget)return;
          if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
          event.preventDefault();
          if(event.key==='ArrowLeft')swiper?.slidePrev(reducedMotion?0:320);
          else if(event.key==='ArrowRight')swiper?.slideNext(reducedMotion?0:320);
          else goToPage(event.key==='Home'?0:position.pages-1);
        }}>
        {categories.map((category,index)=>{
          const Icon=getTechnologySkillIcon(category.name);
          const visible=index>=position.activeIndex&&index<position.activeIndex+position.perView;
          return <SwiperSlide key={category.id} className={styles.slide} inert={!visible} aria-hidden={!visible}>
            <article className={styles.card} aria-labelledby={id+'-'+category.id} data-reveal="down" data-reveal-delay={index%4}>
              <span className={styles.icon}><Icon size={25} strokeWidth={1.6} aria-hidden="true"/></span>
              <h3 id={id+'-'+category.id} className={styles.title}>{t(category.name)}</h3>
              <p className={styles.description}>{t(category.description)}</p>
              <p className={styles.count}>{category.subcategories.length===1?t('1 subcategory'):t('{count} subcategories',{count:category.subcategories.length})}<span aria-hidden="true"> · </span>{category.skills.length===1?t('1 skill'):t('{count} skills',{count:category.skills.length})}</p>
              <ul className={styles.skills} aria-label={t('Skills in {category}',{category:t(category.name)})}>
                {category.skills.slice(0,5).map(skill=><li key={skill.id}>{skill.name}</li>)}
              </ul>
              <Link href={'/technology-skills?category='+category.id} className={styles.explore}>
                {t('Explore Skills')}<ArrowUpRight size={17} aria-hidden="true"/>
              </Link>
            </article>
          </SwiperSlide>;
        })}
      </Swiper>
      <div className={styles.controls} data-reveal="up">
        <button type="button" className={styles.arrow} aria-label={t('Previous skill categories')}
          aria-controls={id+'-carousel'} disabled={!position.ready||position.page===0}
          onClick={()=>swiper?.slidePrev(reducedMotion?0:320)}><ArrowLeft size={19} aria-hidden="true"/></button>
        <div className={styles.dots} role="group" aria-label={t('Skill category pages')}>
          {position.ready&&Array.from({length:position.pages},(_,page)=><button key={page} type="button"
            className={styles.dot} aria-label={t('Go to skills page {page}',{page:page+1})}
            aria-controls={id+'-carousel'} aria-current={position.page===page?'page':undefined} onClick={()=>goToPage(page)}><span/></button>)}
        </div>
        <button type="button" className={styles.arrow} aria-label={t('Next skill categories')}
          aria-controls={id+'-carousel'} disabled={!position.ready||position.page>=position.pages-1}
          onClick={()=>swiper?.slideNext(reducedMotion?0:320)}><ArrowRight size={19} aria-hidden="true"/></button>
      </div>
      <p className="sr-only" role="status" aria-live={reducedMotion?'polite':'off'}>{position.ready?t('Skills page {page} of {pages}',{page:position.page+1,pages:position.pages}):''}</p>
      <div className={styles.viewAll} data-reveal="up"><Link href="/technology-skills" className="button button-purple">{t('View All Skills')}<ArrowUpRight size={18} aria-hidden="true"/></Link></div>
    </div></div>
  </section>;
}
