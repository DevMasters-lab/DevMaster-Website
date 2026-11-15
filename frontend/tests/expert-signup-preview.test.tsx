import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {HomeEngagementActions} from '../src/components/home-engagement-actions';
import {api} from '../src/lib/api';

vi.mock('@/lib/api',async importOriginal=>({...await importOriginal<typeof import('../src/lib/api')>(),api:vi.fn()}));
const prototype=HTMLDialogElement.prototype;
const originalShowModal=Object.getOwnPropertyDescriptor(prototype,'showModal');
const originalClose=Object.getOwnPropertyDescriptor(prototype,'close');
let originalBodyStyle:string|null;
beforeEach(()=>{
  window.history.replaceState(null,'','/en/home?source=preview#expert');document.cookie='devmasters_locale=en;path=/';
  originalBodyStyle=document.body.getAttribute('style');vi.mocked(api).mockReset();
  vi.mocked(api).mockRejectedValue(new Error('Unexpected signup API request'));
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Unexpected signup network request')));
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{});
  Object.defineProperty(prototype,'showModal',{configurable:true,writable:true,value:vi.fn(function(this:HTMLDialogElement){if(this.open)return;this.setAttribute('open','');this.querySelector<HTMLElement>('button,input')?.focus();})});
  Object.defineProperty(prototype,'close',{configurable:true,writable:true,value:vi.fn(function(this:HTMLDialogElement){if(!this.open)return;this.removeAttribute('open');this.dispatchEvent(new Event('close'));})});
});
afterEach(()=>{
  cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();
  if(originalShowModal)Object.defineProperty(prototype,'showModal',originalShowModal);else Reflect.deleteProperty(prototype,'showModal');
  if(originalClose)Object.defineProperty(prototype,'close',originalClose);else Reflect.deleteProperty(prototype,'close');
  if(originalBodyStyle===null)document.body.removeAttribute('style');else document.body.setAttribute('style',originalBodyStyle);
});
function noTransmission(){expect(api).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();expect(Storage.prototype.setItem).not.toHaveBeenCalled();}
function field(dialog:HTMLElement,label:string){return within(dialog).getByLabelText(label,{exact:false});}
function renderHome(locale:'en'|'km'='en'){
  window.history.replaceState(null,'',`/${locale}/home?source=preview#expert`);
  return render(<LocaleProvider initialLocale={locale}><HomeEngagementActions/></LocaleProvider>);
}
const labels={
  en:{title:'Become an Expert',name:'Full name *',email:'Email address *',specialization:'Primary specialization *',experience:'Years of experience *',portfolio:'Portfolio or LinkedIn URL (optional)',skills:'Skills & expertise *',password:'Create password *',confirmation:'Confirm password *',submit:'Preview Expert Sign Up'},
  km:{title:'ចូលរួមជាអ្នកជំនាញ',name:'ឈ្មោះពេញ *',email:'អាសយដ្ឋានអ៊ីមែល *',specialization:'ជំនាញឯកទេសចម្បង *',experience:'ចំនួនឆ្នាំនៃបទពិសោធន៍ *',portfolio:'តំណ Portfolio ឬ LinkedIn (មិនចាំបាច់)',skills:'ជំនាញ និងសមត្ថភាពឯកទេស *',password:'បង្កើតពាក្យសម្ងាត់ *',confirmation:'បញ្ជាក់ពាក្យសម្ងាត់ *',submit:'មើលគំរូចុះឈ្មោះអ្នកជំនាញ'},
};
async function openSignup(locale:'en'|'km'='en'){
  const trigger=screen.getByRole('button',{name:new RegExp(labels[locale].title)});act(()=>trigger.focus());fireEvent.click(trigger);
  const dialog=await screen.findByRole('dialog',{name:labels[locale].title});await within(dialog).findByLabelText(labels[locale].name);
  return {trigger,dialog};
}
function fillValid(dialog:HTMLElement){
  for(const [label,value] of [['Full name *','Preview Expert'],['Email address *','preview@example.test'],['Portfolio or LinkedIn URL (optional)','https://portfolio.example.test/preview'],['Skills & expertise *','React, Next.js and accessible interface engineering.'],['Create password *','sample-password-123'],['Confirm password *','sample-password-123']])fireEvent.change(field(dialog,label),{target:{value}});
  fireEvent.change(field(dialog,'Primary specialization *'),{target:{value:'Frontend Engineer'}});
  fireEvent.change(field(dialog,'Years of experience *'),{target:{value:'3–5 years'}});
}

describe('Become an Expert signup preview',()=>{
  it.each(['en','km'] as const)('shows the requested local-only fields in %s on the same homepage URL',async locale=>{
    renderHome(locale);const href=location.href;const {dialog}=await openSignup(locale);const copy=labels[locale];
    for(const label of [copy.name,copy.email,copy.specialization,copy.experience,copy.portfolio,copy.skills,copy.password,copy.confirmation])expect(field(dialog,label)).toBeInTheDocument();
    expect(within(dialog).getByRole('button',{name:copy.submit})).toBeInTheDocument();
    expect(field(dialog,copy.password)).toHaveAttribute('type','password');expect(field(dialog,copy.confirmation)).toHaveAttribute('type','password');
    expect(dialog.querySelector('input[type=file],input[type=checkbox]')).toBeNull();
    expect(location.href).toBe(href);noTransmission();
  });
  it('validates required fields, email, URL and matching sample passwords before reporting a preview',async()=>{
    renderHome();const {dialog}=await openSignup();const submit=within(dialog).getByRole('button',{name:'Preview Expert Sign Up'});
    fireEvent.click(submit);
    expect(await within(dialog).findByText('Enter your full name.')).toBeInTheDocument();
    for(const label of ['Full name *','Email address *','Primary specialization *','Years of experience *','Skills & expertise *','Create password *','Confirm password *'])expect(field(dialog,label)).toHaveAttribute('aria-invalid','true');
    fillValid(dialog);
    fireEvent.change(field(dialog,'Email address *'),{target:{value:'not-an-email'}});
    fireEvent.click(submit);expect(await within(dialog).findByText('Enter a valid email address.')).toBeInTheDocument();
    fireEvent.change(field(dialog,'Email address *'),{target:{value:'preview@example.test'}});
    fireEvent.change(field(dialog,'Portfolio or LinkedIn URL (optional)'),{target:{value:'javascript:alert(1)'}});
    fireEvent.click(submit);expect(await within(dialog).findByText('Enter a valid http:// or https:// URL.')).toBeInTheDocument();
    fireEvent.change(field(dialog,'Portfolio or LinkedIn URL (optional)'),{target:{value:''}});
    fireEvent.change(field(dialog,'Create password *'),{target:{value:'short'}});fireEvent.change(field(dialog,'Confirm password *'),{target:{value:'short'}});
    fireEvent.click(submit);expect(await within(dialog).findByText('Use at least 8 characters.')).toBeInTheDocument();
    fireEvent.change(field(dialog,'Create password *'),{target:{value:'sample-password-123'}});fireEvent.change(field(dialog,'Confirm password *'),{target:{value:'different-sample'}});
    fireEvent.click(submit);expect(await within(dialog).findByText('Passwords do not match.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('status')).not.toBeInTheDocument();noTransmission();
  });
  it('toggles both passwords and clears them after a valid preview without creating an account',async()=>{
    renderHome();const {dialog}=await openSignup();fillValid(dialog);
    const password=field(dialog,'Create password *');const confirmation=field(dialog,'Confirm password *');
    fireEvent.click(within(dialog).getByRole('button',{name:'Show password'}));expect(password).toHaveAttribute('type','text');
    fireEvent.click(within(dialog).getByRole('button',{name:'Show password confirmation'}));expect(confirmation).toHaveAttribute('type','text');
    fireEvent.click(within(dialog).getByRole('button',{name:'Preview Expert Sign Up'}));
    expect(await within(dialog).findByRole('status')).toHaveTextContent('This is a design preview. No application was submitted and no account was created.');
    expect(password).toHaveValue('');expect(confirmation).toHaveValue('');expect(password).toHaveAttribute('type','password');expect(confirmation).toHaveAttribute('type','password');
    expect(field(dialog,'Full name *')).toHaveValue('Preview Expert');noTransmission();
  });
  it('clears preview values when closed and keeps native Escape focus return',async()=>{
    renderHome();const {trigger,dialog}=await openSignup();fillValid(dialog);
    const cancel=new Event('cancel',{cancelable:true});fireEvent(dialog,cancel);
    expect(cancel.defaultPrevented).toBe(true);expect(dialog).not.toHaveAttribute('open');expect(trigger).toHaveFocus();expect(dialog.querySelector('input')).toBeNull();
    await openSignup();
    for(const label of ['Full name *','Email address *','Portfolio or LinkedIn URL (optional)','Skills & expertise *','Create password *','Confirm password *'])expect(field(dialog,label)).toHaveValue('');
    noTransmission();
  });
  it('switches Sign in to Portal and back without URL changes, credential retention or stale-close focus theft',async()=>{
    renderHome();const href=location.href;const {dialog}=await openSignup();fillValid(dialog);
    fireEvent.click(within(dialog).getByRole('button',{name:'Sign in'}));
    const portal=await screen.findByRole('dialog',{name:'Expert Portal'});await within(portal).findByLabelText('Email address');
    expect(dialog).not.toHaveAttribute('open');expect(dialog.querySelector('input')).toBeNull();
    const heading=within(portal).getByRole('heading',{name:'Expert Portal'});act(()=>heading.focus());fireEvent(dialog,new Event('close'));
    expect(portal).toHaveAttribute('open');expect(heading).toHaveFocus();
    fireEvent.click(within(portal).getByRole('button',{name:'Become an Expert'}));await within(dialog).findByLabelText('Full name *');
    expect(portal).not.toHaveAttribute('open');expect(field(dialog,'Create password *')).toHaveValue('');expect(field(dialog,'Full name *')).toHaveValue('');
    expect(location.href).toBe(href);noTransmission();
  });
});
