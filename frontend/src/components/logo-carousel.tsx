'use client';

import {useEffect,useState} from 'react';
import {A11y,Autoplay,Mousewheel} from 'swiper/modules';
import {Swiper,SwiperSlide} from 'swiper/react';
import type {Swiper as SwiperInstance} from 'swiper';
import {useText} from '@/i18n/provider';
import {carouselMotion} from '@/lib/carousel-motion';
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
    if(reducedMotion||focused||hovered){
      swiper.autoplay.stop();
      if(swiper.animating){
        const position=swiper.getTranslate();
        swiper.setTransition(0);
        swiper.setTranslate(position);
        swiper.transitionEnd();
      }
    }else swiper.autoplay.start();
    return ()=>{if(!swiper.destroyed)swiper.autoplay.stop();};
  },[swiper,reducedMotion,focused,hovered]);

  return <section className="logo-section" aria-labelledby="logo-heading">
    <div className="section-wrap">
      <div className="logo-heading"><h2 id="logo-heading" data-reveal="up">{t('Our Clients')}</h2></div>
      <p id="logo-instructions" className="sr-only">{t('Drag or swipe to explore the logos. Use the arrow keys when focused.')}</p>
      <Swiper className="logo-carousel" data-reveal="up" data-reveal-delay="1" modules={[A11y,Autoplay,Mousewheel]}
        onSwiper={setSwiper} slidesPerView={2} spaceBetween={16} breakpoints={breakpoints}
        loop speed={reducedMotion?0:carouselMotion.speed} grabCursor
        autoplay={{delay:carouselMotion.delay,disableOnInteraction:false}}
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
          if(event.key==='ArrowRight')swiper?.slideNext(reducedMotion?0:carouselMotion.interactionSpeed);
          else swiper?.slidePrev(reducedMotion?0:carouselMotion.interactionSpeed);
        }}>
        {logos.map(name=><SwiperSlide key={name}>
          <img className="sample-logo" src={'/sample-logos/'+name.toLowerCase()+'.svg'}
            alt={name} width={120} height={120} loading="lazy" draggable={false}/>
        </SwiperSlide>)}
      </Swiper>
    </div>
  </section>;
}
