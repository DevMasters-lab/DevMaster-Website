import React from 'react';
import {renderToString} from 'react-dom/server';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,render,screen} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {SiteLoader} from '../src/components/site-loader';
import {siteLoaderInitScript,siteLoaderMaxDuration,siteLoaderMinDuration} from '../src/lib/site-loader';

const originalUrl=window.location.href;
let clockStart:number;

function navigation(type:string|undefined,legacyType=0){
  vi.stubGlobal('performance',{
    getEntriesByType:vi.fn(()=>type===undefined?[]:[{type}]),
    navigation:{type:legacyType},
    now:()=>Date.now()-clockStart,
  });
}

function initialize(){new Function(siteLoaderInitScript)();}
function ready(){window.dispatchEvent(new Event('devmasters:app-ready'));}
function loaded(){window.dispatchEvent(new Event('load'));}
function active(){return document.documentElement.hasAttribute('data-site-loading');}
function advance(milliseconds:number){act(()=>vi.advanceTimersByTime(milliseconds));}
function Loader({locale='en'}:{locale?:'en'|'km'}){
  return <LocaleProvider initialLocale={locale}><SiteLoader/></LocaleProvider>;
}

beforeEach(()=>{
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-13T08:00:00Z'));
  clockStart=Date.now();
  vi.spyOn(document,'readyState','get').mockReturnValue('loading');
  history.replaceState(null,'','/en/home');
  document.documentElement.removeAttribute('data-site-loading');
  navigation('navigate');
});

afterEach(()=>{
  cleanup();
  window.dispatchEvent(new PageTransitionEvent('pagehide'));
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('data-site-loading');
  history.replaceState(null,'',originalUrl);
});

describe('website loading lifecycle',()=>{
  it.each(['navigate','reload'])('starts on a hard %s without changing scroll or history',type=>{
    navigation(type);
    const scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
    const replace=vi.spyOn(history,'replaceState');
    const push=vi.spyOn(history,'pushState');
    const restoration=history.scrollRestoration;
    initialize();
    expect(active()).toBe(true);
    expect(scroll).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(history.scrollRestoration).toBe(restoration);
  });

  it.each(['app-first','load-first'])('waits for both readiness signals and the short minimum (%s)',order=>{
    initialize();
    if(order==='app-first')ready();else loaded();
    advance(siteLoaderMinDuration-1);
    expect(active()).toBe(true);
    if(order==='app-first')loaded();else ready();
    advance(0);
    expect(active()).toBe(true);
    advance(1);
    expect(active()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('finishes promptly when readiness arrives after the minimum duration',()=>{
    initialize();
    loaded();
    advance(siteLoaderMinDuration+100);
    expect(active()).toBe(true);
    ready();
    advance(0);
    expect(active()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('supports mounting after the document has already loaded and repeated React effects',()=>{
    vi.spyOn(document,'readyState','get').mockReturnValue('complete');
    initialize();
    render(<React.StrictMode><Loader/></React.StrictMode>);
    expect(active()).toBe(true);
    advance(siteLoaderMinDuration);
    expect(active()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    ready();
    loaded();
    expect(active()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('always releases the page when hydration or asset loading never completes',()=>{
    initialize();
    advance(siteLoaderMaxDuration-1);
    expect(active()).toBe(true);
    advance(1);
    expect(active()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    ready();
    loaded();
    advance(siteLoaderMaxDuration);
    expect(active()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['keydown','pointerdown'])('lets %s dismiss immediately without cancelling the user action',type=>{
    initialize();
    const event=new Event(type,{bubbles:true,cancelable:true});
    window.dispatchEvent(event);
    expect(active()).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    ready();
    loaded();
    advance(siteLoaderMinDuration);
    expect(active()).toBe(false);
  });

  it.each(['pagehide','pageshow'])('cleans up on %s and never replays from the back-forward cache',type=>{
    initialize();
    window.dispatchEvent(new PageTransitionEvent(type,{persisted:true}));
    expect(active()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
    ready();
    loaded();
    advance(siteLoaderMaxDuration);
    expect(active()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    {modern:'back_forward',legacy:0},
    {modern:undefined,legacy:2},
  ])('preserves Back/Forward navigation (modern=$modern, legacy=$legacy)',({modern,legacy})=>{
    navigation(modern,legacy);
    initialize();
    ready();
    loaded();
    expect(active()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('supports legacy refresh detection without modern navigation entries',()=>{
    navigation(undefined,1);
    initialize();
    expect(active()).toBe(true);
    loaded();
    ready();
    advance(siteLoaderMinDuration);
    expect(active()).toBe(false);
  });

  it.each(['/en/expert','/km/expert/profile'])('keeps the private portal free of the public loader at %s',path=>{
    history.replaceState(null,'',path);
    initialize();
    ready();
    loaded();
    expect(active()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('still loads the public expertise page despite its similar route name',()=>{
    history.replaceState(null,'','/en/expertise');
    initialize();
    expect(active()).toBe(true);
  });
});

describe('website loading content',()=>{
  it('renders the branded status as stable server HTML without activating or hiding the page',()=>{
    const html=renderToString(<Loader/>);
    expect(html).toContain('role="status"');
    expect(html).toContain('Loading DevMasters');
    expect(active()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('renders the localized Khmer loading message',()=>{
    render(<Loader locale="km"/>);
    const status=screen.getByRole('status');
    expect(status).toHaveTextContent('កំពុង');
    expect(status).toHaveTextContent('DevMasters');
    expect(status).not.toHaveTextContent('Loading DevMasters');
  });
});
