import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {ThemeToggle} from '../src/components/ThemeToggle';
import {themeInitScript,themeStorageKey} from '../src/lib/theme';

let systemDark=false;
let systemListeners:Set<()=>void>;
beforeEach(()=>{
 const saved=new Map<string,string>();
 vi.stubGlobal('localStorage',{
  getItem:(key:string)=>saved.get(key)??null,
  setItem:(key:string,value:string)=>{saved.set(key,value);},
 });
 document.documentElement.dataset.theme='light';
 document.documentElement.style.colorScheme='light';
 systemDark=false;
 systemListeners=new Set();
 vi.stubGlobal('matchMedia',vi.fn(()=>({
  get matches(){return systemDark;},
  addEventListener:(_event:string,listener:()=>void)=>systemListeners.add(listener),
  removeEventListener:(_event:string,listener:()=>void)=>systemListeners.delete(listener),
 })));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

function initializeTheme(){new Function(themeInitScript)();}
function renderToggle(){render(<LocaleProvider initialLocale="en"><ThemeToggle/></LocaleProvider>);}

describe('theme preference',()=>{
 it('switches between dark and light mode and saves each choice',async()=>{
  renderToggle();
  expect(screen.getByRole('button',{name:'Switch to dark mode'})).toHaveAttribute('aria-pressed','false');
  fireEvent.click(screen.getByRole('button',{name:'Switch to dark mode'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Switch to light mode'})).toHaveAttribute('aria-pressed','true'));
  expect(document.documentElement).toHaveAttribute('data-theme','dark');
  expect(document.documentElement.style.colorScheme).toBe('dark');
  expect(localStorage.getItem(themeStorageKey)).toBe('dark');
  fireEvent.click(screen.getByRole('button',{name:'Switch to light mode'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Switch to dark mode'})).toHaveAttribute('aria-pressed','false'));
  expect(document.documentElement).toHaveAttribute('data-theme','light');
  expect(document.documentElement.style.colorScheme).toBe('light');
  expect(localStorage.getItem(themeStorageKey)).toBe('light');
 });

 it.each([
  {saved:'light',osDark:true},
  {saved:'dark',osDark:false},
 ])('restores saved $saved mode before paint even when the system preference differs',({saved,osDark})=>{
  systemDark=osDark;
  localStorage.setItem(themeStorageKey,saved);
  initializeTheme();
  expect(document.documentElement).toHaveAttribute('data-theme',saved);
  expect(document.documentElement.style.colorScheme).toBe(saved);
 });

 it.each([true,false])('uses the system preference before paint when no theme is saved (dark=%s)',osDark=>{
  systemDark=osDark;
  initializeTheme();
  expect(document.documentElement).toHaveAttribute('data-theme',osDark?'dark':'light');
  expect(document.documentElement.style.colorScheme).toBe(osDark?'dark':'light');
  expect(localStorage.getItem(themeStorageKey)).toBeNull();
 });

 it('follows system changes until the user saves a theme choice',async()=>{
  renderToggle();
  systemDark=true;
  systemListeners.forEach(listener=>listener());
  await waitFor(()=>expect(screen.getByRole('button',{name:'Switch to light mode'})).toHaveAttribute('aria-pressed','true'));
  expect(localStorage.getItem(themeStorageKey)).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Switch to light mode'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Switch to dark mode'})).toHaveAttribute('aria-pressed','false'));
  expect(localStorage.getItem(themeStorageKey)).toBe('light');
  systemListeners.forEach(listener=>listener());
  expect(document.documentElement).toHaveAttribute('data-theme','light');
 });
});
