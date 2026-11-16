'use client';

import {useEffect} from 'react';
import {useText} from '@/i18n/provider';
import styles from './site-loader.module.css';

export function SiteLoader(){
  const t=useText();
  useEffect(()=>{window.dispatchEvent(new Event('devmasters:app-ready'));},[]);

  return <div className={styles.screen} role="status" aria-live="polite" aria-atomic="true">
    <div className={styles.content}>
      <div className={styles.wordmark} aria-hidden="true"><span>Dev<span className={styles.accent}>Masters</span></span><span className={styles.spark}>✳</span></div>
      <div className={styles.track} aria-hidden="true"/>
      <p className={styles.label}>{t('Loading DevMasters…')}</p>
    </div>
  </div>;
}
