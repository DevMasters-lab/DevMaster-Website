export const siteLoaderMinDuration=350;
export const siteLoaderMaxDuration=2500;

// Start before paint. This independent watchdog also releases the page if
// hydration or an asset fails; the loader never waits for backend requests.
export const siteLoaderInitScript=`(()=>{
  const navigation=typeof performance.getEntriesByType==='function'?performance.getEntriesByType('navigation')[0]:undefined;
  const historyVisit=navigation?navigation.type==='back_forward':performance.navigation?.type===2;
  if(historyVisit)return;

  const root=document.documentElement;
  const started=performance.now();
  let appReady=false;
  let loaded=document.readyState==='complete';
  let finished=false;
  let readyTimer;
  let watchdog;

  function finish(){
    if(finished)return;
    finished=true;
    root.removeAttribute('data-site-loading');
    window.clearTimeout(readyTimer);
    window.clearTimeout(watchdog);
    window.removeEventListener('devmasters:app-ready',ready);
    window.removeEventListener('load',load);
    window.removeEventListener('pagehide',finish);
    window.removeEventListener('pageshow',shown);
    window.removeEventListener('pointerdown',finish,true);
    window.removeEventListener('keydown',finish,true);
  }
  function releaseWhenReady(){
    if(finished||!appReady||!loaded||readyTimer!==undefined)return;
    readyTimer=window.setTimeout(finish,Math.max(0,${siteLoaderMinDuration}-(performance.now()-started)));
  }
  function ready(){appReady=true;releaseWhenReady();}
  function load(){loaded=true;releaseWhenReady();}
  function shown(event){if(event.persisted)finish();}

  root.setAttribute('data-site-loading','');
  window.addEventListener('devmasters:app-ready',ready);
  window.addEventListener('load',load,{once:true});
  window.addEventListener('pagehide',finish,{once:true});
  window.addEventListener('pageshow',shown);
  window.addEventListener('pointerdown',finish,{capture:true,once:true});
  window.addEventListener('keydown',finish,{capture:true,once:true});
  watchdog=window.setTimeout(finish,${siteLoaderMaxDuration});
})()`;
