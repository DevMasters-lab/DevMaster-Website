'use client';

import type {ReactNode} from 'react';
import {usePathname} from '@/i18n/navigation';
import {useScrollReveal} from '@/hooks/use-scroll-reveal';
import revealStyles from './scroll-reveal.module.css';

export function PageContent({children}:{children:ReactNode}){
  const path=usePathname();
  return <AnimatedPage key={path}>{children}</AnimatedPage>;
}

function AnimatedPage({children}:{children:ReactNode}){
  const ref=useScrollReveal<HTMLElement>();
  return <main id="main" ref={ref} className={revealStyles.scope}>{children}</main>;
}
