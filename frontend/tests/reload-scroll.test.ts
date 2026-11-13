import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {reloadScrollInitScript} from '../src/lib/reload-scroll';

const originalHistory=window.history;
const originalRestoration=Object.getOwnPropertyDescriptor(originalHistory,'scrollRestoration');
const originalUrl=window.location.href;
let scrollTo:ReturnType<typeof vi.fn>;
let setRestoration:ReturnType<typeof vi.fn<(mode:ScrollRestoration)=>void>>;
let restorationMode:ScrollRestoration;

function navigation(type:string|undefined,legacyType=0){
 vi.stubGlobal('performance',{
  getEntriesByType:vi.fn(()=>type===undefined?[]:[{type}]),
  navigation:{type:legacyType},
 });
}

function initialize(){new Function(reloadScrollInitScript)();}
function shown(persisted=false){window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted}));}
function loaded(){document.dispatchEvent(new Event('DOMContentLoaded'));}

beforeEach(()=>{
 vi.useFakeTimers();
 vi.spyOn(document,'readyState','get').mockReturnValue('loading');
 scrollTo=vi.fn();
 vi.stubGlobal('scrollTo',scrollTo);
 restorationMode='auto';
 setRestoration=vi.fn((mode:ScrollRestoration)=>{restorationMode=mode;});
 Object.defineProperty(originalHistory,'scrollRestoration',{
  configurable:true,
  get:()=>restorationMode,
  set:setRestoration,
 });
 navigation('reload');
});

afterEach(()=>{
 // Also clean up an initializer when an assertion fails before pageshow.
 window.dispatchEvent(new PageTransitionEvent('pagehide'));
 vi.clearAllTimers();
 vi.useRealTimers();
 vi.restoreAllMocks();
 vi.unstubAllGlobals();
 if(originalRestoration)Object.defineProperty(originalHistory,'scrollRestoration',originalRestoration);
 else delete (originalHistory as Partial<History>).scrollRestoration;
 originalHistory.replaceState(null,'',originalUrl);
});

describe('reload scroll initialization',()=>{
 it('resets a reload immediately and keeps restoration manual through pageshow',()=>{
  initialize();
  expect(history.scrollRestoration).toBe('manual');
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({top:0,left:0,behavior:'instant'});

  loaded();
  loaded();
  expect(scrollTo).toHaveBeenCalledTimes(2);
  expect(history.scrollRestoration).toBe('manual');

  shown();
  expect(scrollTo).toHaveBeenCalledTimes(3);
  expect(history.scrollRestoration).toBe('manual');
  expect(vi.getTimerCount()).toBe(1);

  vi.runAllTimers();
  expect(scrollTo).toHaveBeenCalledTimes(4);
  expect(scrollTo.mock.calls.every(([options])=>
   options.top===0&&options.left===0&&options.behavior==='instant',
  )).toBe(true);
  expect(history.scrollRestoration).toBe('auto');
  expect(setRestoration.mock.calls.map(([mode])=>mode)).toEqual(['manual','auto']);
  expect(vi.getTimerCount()).toBe(0);
 });

 it.each(['navigate','back_forward'])('leaves modern %s navigation untouched even when legacy reports reload',type=>{
  navigation(type,1);
  initialize();
  loaded();
  shown();
  vi.runAllTimers();

  expect(scrollTo).not.toHaveBeenCalled();
  expect(setRestoration).not.toHaveBeenCalled();
  expect(history.scrollRestoration).toBe('auto');
  expect(vi.getTimerCount()).toBe(0);
 });

 it.each(['empty','unavailable'])('supports a legacy reload when modern navigation entries are %s',modern=>{
  if(modern==='empty')navigation(undefined,1);
  else vi.stubGlobal('performance',{navigation:{type:1}});

  initialize();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({top:0,left:0,behavior:'instant'});
  expect(history.scrollRestoration).toBe('manual');
  shown();
  vi.runAllTimers();
  expect(history.scrollRestoration).toBe('auto');
 });

 it.each([0,2])('leaves legacy navigation type %s untouched',type=>{
  navigation(undefined,type);
  initialize();
  loaded();
  shown();
  vi.runAllTimers();
  expect(scrollTo).not.toHaveBeenCalled();
  expect(setRestoration).not.toHaveBeenCalled();
 });

 it('restores an existing manual restoration preference',()=>{
  restorationMode='manual';
  initialize();
  shown();
  vi.runAllTimers();
  expect(history.scrollRestoration).toBe('manual');
  expect(setRestoration.mock.calls.map(([mode])=>mode)).toEqual(['manual','manual']);
 });

 it.each([false,true])('cleans up on pagehide with a queued reset=%s',queueReset=>{
  initialize();
  if(queueReset)shown();
  expect(vi.getTimerCount()).toBe(queueReset?1:0);
  const callsBeforeHide=scrollTo.mock.calls.length;

  window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
  expect(history.scrollRestoration).toBe('auto');
  expect(vi.getTimerCount()).toBe(0);
  loaded();
  shown(true);
  shown();
  vi.runAllTimers();
  expect(scrollTo).toHaveBeenCalledTimes(callsBeforeHide);
 });

 it('does not reset a persisted pageshow or leave reload listeners active',()=>{
  initialize();
  shown(true);
  expect(scrollTo).toHaveBeenCalledTimes(1);
  expect(history.scrollRestoration).toBe('auto');
  expect(vi.getTimerCount()).toBe(0);

  loaded();
  shown();
  vi.runAllTimers();
  expect(scrollTo).toHaveBeenCalledTimes(1);
 });

 it('does not replay after the reload finishes and the page returns from the back-forward cache',()=>{
  initialize();
  shown();
  vi.runAllTimers();
  const completedCalls=scrollTo.mock.calls.length;

  window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
  shown(true);
  loaded();
  vi.runAllTimers();
  expect(scrollTo).toHaveBeenCalledTimes(completedCalls);
  expect(history.scrollRestoration).toBe('auto');
  expect(vi.getTimerCount()).toBe(0);
 });

 it('keeps the existing hash and URL when resetting a reload',()=>{
  history.replaceState(null,'','#technology-skills');
  const href=location.href;
  initialize();
  loaded();
  shown();
  vi.runAllTimers();
  expect(location.href).toBe(href);
  expect(location.hash).toBe('#technology-skills');
  expect(scrollTo).toHaveBeenCalled();
 });

 it('preserves normal hash navigation without scrolling or changing restoration',()=>{
  history.replaceState(null,'','#technology-skills');
  navigation('navigate');
  initialize();
  loaded();
  shown();
  vi.runAllTimers();
  expect(location.hash).toBe('#technology-skills');
  expect(scrollTo).not.toHaveBeenCalled();
  expect(setRestoration).not.toHaveBeenCalled();
 });

 it('still resets reloads when the browser has no scrollRestoration support',()=>{
  vi.stubGlobal('history',{});
  initialize();
  loaded();
  shown();
  vi.runAllTimers();
  expect(scrollTo).toHaveBeenCalledTimes(4);
  expect(history).not.toHaveProperty('scrollRestoration');
  expect(setRestoration).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
 });

 it('finishes initialization when the document is already loaded',()=>{
  vi.spyOn(document,'readyState','get').mockReturnValue('complete');
  initialize();
  expect(scrollTo).toHaveBeenCalledWith({top:0,left:0,behavior:'instant'});
  expect(history.scrollRestoration).toBe('manual');
  expect(vi.getTimerCount()).toBe(1);

  vi.runAllTimers();
  expect(history.scrollRestoration).toBe('auto');
  const completedCalls=scrollTo.mock.calls.length;
  loaded();
  shown();
  vi.runAllTimers();
  expect(scrollTo).toHaveBeenCalledTimes(completedCalls);
  expect(vi.getTimerCount()).toBe(0);
 });
});
