'use client';

import {useEffect,useState} from 'react';
import {Pause,Play} from 'lucide-react';
import {A11y,Autoplay,Mousewheel} from 'swiper/modules';
import {Swiper,SwiperSlide} from 'swiper/react';
import type {Swiper as SwiperInstance} from 'swiper';
import {useText} from '@/i18n/provider';
import 'swiper/css';
import 'swiper/css/a11y';

const logos = ['Nova','Vertex','Nexus','Orbit','Prism','Atlas','Pulse'];
const breakpoints = {
  400:{slidesPerView:3,spaceBetween:20},
  768:{slidesPerView:4,spaceBetween:30},
  1024:{slidesPerView:5,spaceBetween:40},
  1280:{slidesPerView:6,spaceBetween:50},
};

export function LogoCarousel(){
  const t=useText();
  const [swiper,setSwiper]=useState<SwiperInstance|null>(null);
  const [reducedMotion,setReducedMotion]=useState(true);
  const [paused,setPaused]=useState(false);
  const [focused,setFocused]=useState(false);
  const [hovered,setHovered]=useState(false);

  useEffect(()=>{
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change',update);
    return ()=>preference.removeEventListener('change',update);
  },[]);

  useEffect(()=>{
    if(!swiper||swiper.destroyed)return;
    if(reducedMotion||paused||focused||hovered){
      swiper.autoplay.stop();
      if(swiper.animating){
        const position=swiper.getTranslate();
        swiper.setTransition(0);
        swiper.setTranslate(position);
        swiper.transitionEnd();
      }
    }else swiper.autoplay.start();
    return ()=>{if(!swiper.destroyed)swiper.autoplay.stop();};
  },[swiper,reducedMotion,paused,focused,hovered]);

  return <section className="logo-section" aria-labelledby="logo-heading">
    <div className="section-wrap">
      <div className="logo-heading"><h2 id="logo-heading">{t('Our Clients')}</h2></div>
      <p id="logo-instructions" className="sr-only">{t('Drag or swipe to explore the logos. Use the arrow keys when focused.')}</p>
      <Swiper className="logo-carousel" modules={[A11y,Autoplay,Mousewheel]}
        onSwiper={setSwiper} slidesPerView={2} spaceBetween={16} breakpoints={breakpoints}
        loop speed={reducedMotion?0:3000} grabCursor
        autoplay={{delay:900,disableOnInteraction:false}}
        mousewheel={{forceToAxis:true,sensitivity:1}}
        a11y={{slideLabelMessage:'{{index}} / {{slidesLength}}'}}
        tabIndex={0} role="group" aria-label={t('Our Clients')} aria-describedby="logo-instructions"
        onFocusCapture={()=>setFocused(true)}
        onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}
        onPointerEnter={event=>{if(event.pointerType==='mouse')setHovered(true);}}
        onPointerLeave={event=>{if(event.pointerType==='mouse')setHovered(false);}}
        onKeyDown={event=>{
          if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
          event.preventDefault();
          if(event.key==='ArrowRight')swiper?.slideNext(reducedMotion?0:300);
          else swiper?.slidePrev(reducedMotion?0:300);
        }}>
        {logos.map(name=><SwiperSlide key={name}>
          <img className="sample-logo" src={'/sample-logos/'+name.toLowerCase()+'.svg'}
            alt={name} width={120} height={120} loading="lazy" draggable={false}/>
        </SwiperSlide>)}
      </Swiper>
      {!reducedMotion&&<div className="logo-controls"><button type="button" className="logo-motion-button"
        aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>
        {paused?<Play size={14} aria-hidden="true"/>:<Pause size={14} aria-hidden="true"/>}
        {t(paused?'Resume animation':'Pause animation')}
      </button></div>}
    </div>
  </section>;
}
