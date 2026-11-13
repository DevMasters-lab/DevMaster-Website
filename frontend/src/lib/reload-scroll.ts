// Run before hydration so a refresh cannot restore the previous scroll position.
// Other navigation keeps the browser's normal scroll and anchor behavior.
export const reloadScrollInitScript=`(()=>{
  const navigation=typeof performance.getEntriesByType==='function'?performance.getEntriesByType('navigation')[0]:undefined;
  const reload=navigation?navigation.type==='reload':performance.navigation?.type===1;
  if(!reload)return;

  const supported='scrollRestoration' in history;
  const previous=history.scrollRestoration;
  let timer;
  const top=()=>window.scrollTo({top:0,left:0,behavior:'instant'});
  function cleanup(){
    if(timer!==undefined)window.clearTimeout(timer);
    document.removeEventListener('DOMContentLoaded',top);
    window.removeEventListener('pageshow',shown);
    window.removeEventListener('pagehide',cleanup);
    if(supported)history.scrollRestoration=previous;
  }
  function shown(event){
    if(event?.persisted){cleanup();return;}
    top();
    // Keep manual mode until the browser finishes its restoration task.
    timer=window.setTimeout(()=>{top();cleanup();},0);
  }

  if(supported)history.scrollRestoration='manual';
  window.addEventListener('pagehide',cleanup,{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',top,{once:true});
  if(document.readyState==='complete')shown();
  else window.addEventListener('pageshow',shown,{once:true});
  top();
})()`;
