import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {SiteHeader} from '../src/components/site-shell';
import {api} from '../src/lib/api';

vi.mock('@/lib/api',async importOriginal=>({...await importOriginal<typeof import('../src/lib/api')>(),api:vi.fn()}));
const prototype=HTMLDialogElement.prototype;
const originalShowModal=Object.getOwnPropertyDescriptor(prototype,'showModal');
const originalClose=Object.getOwnPropertyDescriptor(prototype,'close');
let originalBodyStyle:string|null;
beforeEach(()=>{
  originalBodyStyle=document.body.getAttribute('style');vi.mocked(api).mockReset();
  vi.mocked(api).mockRejectedValue(new Error('Unexpected preview API request'));
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Unexpected preview network request')));
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{});
  Object.defineProperty(prototype,'showModal',{configurable:true,writable:true,value:vi.fn(function(this:HTMLDialogElement){if(this.open)return;this.setAttribute('open','');this.querySelector<HTMLElement>('[autofocus],button,input')?.focus();})});
  Object.defineProperty(prototype,'close',{configurable:true,writable:true,value:vi.fn(function(this:HTMLDialogElement){if(!this.open)return;this.removeAttribute('open');this.dispatchEvent(new Event('close'));})});
});
afterEach(()=>{
  cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();
  if(originalShowModal)Object.defineProperty(prototype,'showModal',originalShowModal);else Reflect.deleteProperty(prototype,'showModal');
  if(originalClose)Object.defineProperty(prototype,'close',originalClose);else Reflect.deleteProperty(prototype,'close');
  if(originalBodyStyle===null)document.body.removeAttribute('style');else document.body.setAttribute('style',originalBodyStyle);
});
function renderHeader(locale:'en'|'km'='en'){
  window.history.replaceState(null,'',`/${locale}/home?source=header#portal`);document.cookie=`devmasters_locale=${locale};path=/`;
  return render(<LocaleProvider initialLocale={locale}><SiteHeader/></LocaleProvider>);
}
function expectNoTransmission(){expect(api).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();expect(Storage.prototype.setItem).not.toHaveBeenCalled();}

const labels={
  en:{portal:'Expert Portal',close:'Close Expert Portal preview',email:'Email address',password:'Password'},
  km:{portal:'ផតថលអ្នកជំនាញ',close:'បិទការមើលគំរូផតថលអ្នកជំនាញ',email:'អាសយដ្ឋានអ៊ីមែល',password:'ពាក្យសម្ងាត់'},
};
async function openPreview(locale:'en'|'km'='en'){
  const trigger=within(screen.getByRole('banner')).getByRole('button',{name:labels[locale].portal});
  act(()=>trigger.focus());fireEvent.click(trigger);
  const dialog=await screen.findByRole('dialog',{name:labels[locale].portal});
  await within(dialog).findByLabelText(labels[locale].email);
  return {trigger,dialog};
}

describe('header Expert Portal design preview',()=>{
  it.each(['en','km'] as const)('opens the localized preview on the same URL and closes with native Escape in %s',async locale=>{
    renderHeader(locale);const href=location.href;
    const {trigger,dialog}=await openPreview(locale);
    expect(trigger).toHaveAttribute('aria-haspopup','dialog');expect(trigger).toHaveAttribute('aria-controls',dialog.id);
    expect(within(dialog).getByLabelText(labels[locale].password)).toHaveAttribute('type','password');
    expect(dialog.contains(document.activeElement)).toBe(true);
    const cancel=new Event('cancel',{cancelable:true});fireEvent(dialog,cancel);
    expect(cancel.defaultPrevented).toBe(true);expect(dialog).not.toHaveAttribute('open');expect(trigger).toHaveFocus();
    expect(location.href).toBe(href);expectNoTransmission();
  });
  it('validates sample details, toggles password visibility and reports that no sign-in request was sent',async()=>{
    renderHeader();const {dialog}=await openPreview();
    expect(within(dialog).getByRole('note')).toHaveTextContent('Please do not enter real credentials. This is a demo; no data is sent.');
    const signIn=within(dialog).getByRole('button',{name:'Sign in'});
    fireEvent.click(signIn);
    expect(await within(dialog).findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a sample password.')).toBeInTheDocument();
    const email=within(dialog).getByLabelText(/^Email address/);
    const password=within(dialog).getByLabelText('Password');
    expect(email).toHaveFocus();
    fireEvent.change(email,{target:{value:'preview@example.test'}});
    fireEvent.click(signIn);expect(password).toHaveFocus();
    fireEvent.change(password,{target:{value:'sample-preview-only'}});
    const show=within(dialog).getByRole('button',{name:'Show password'});
    fireEvent.click(show);expect(password).toHaveAttribute('type','text');expect(password).toHaveValue('sample-preview-only');
    expect(show).toHaveAttribute('aria-pressed','true');
    fireEvent.click(within(dialog).getByRole('button',{name:'Hide password'}));expect(password).toHaveAttribute('type','password');
    fireEvent.click(within(dialog).getByRole('checkbox',{name:'Remember me'}));
    fireEvent.click(signIn);
    expect(await within(dialog).findByRole('status')).toHaveTextContent('This is a design preview. No sign-in request was sent.');
    expect(password).toHaveValue('');expect(password).toHaveAttribute('type','password');
    expectNoTransmission();
  });
  it('previews recovery locally and returns to sign-in without sending an email',async()=>{
    renderHeader();const {dialog}=await openPreview();const href=location.href;
    fireEvent.change(within(dialog).getByLabelText('Password'),{target:{value:'sample-preview-only'}});
    fireEvent.click(within(dialog).getByRole('button',{name:'Forgot password?'}));
    expect(within(dialog).queryByLabelText('Password')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button',{name:'Preview recovery'}));
    expect(await within(dialog).findByText('Enter a valid email address.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/^Email address/),{target:{value:'recovery-preview@example.test'}});
    fireEvent.click(within(dialog).getByRole('button',{name:'Preview recovery'}));
    expect(await within(dialog).findByRole('status')).toHaveTextContent('This is a design preview. No recovery email was sent.');
    fireEvent.click(within(dialog).getByRole('button',{name:'Back to sign in'}));
    expect(within(dialog).getByLabelText('Password')).toHaveValue('');
    expect(within(dialog).getByRole('button',{name:'Sign in'})).toBeInTheDocument();
    expect(location.href).toBe(href);expectNoTransmission();
  });
  it('clears all sample credentials and remember state when closed and reopened',async()=>{
    renderHeader();const {trigger,dialog}=await openPreview();
    fireEvent.change(within(dialog).getByLabelText(/^Email address/),{target:{value:'discarded-preview@example.test'}});
    fireEvent.change(within(dialog).getByLabelText('Password'),{target:{value:'sample-preview-only'}});
    fireEvent.click(within(dialog).getByRole('checkbox',{name:'Remember me'}));
    fireEvent.click(within(dialog).getByRole('button',{name:'Show password'}));
    fireEvent.click(within(dialog).getByRole('button',{name:'Close Expert Portal preview'}));
    expect(trigger).toHaveFocus();
    expect(dialog.querySelector('input[type=email]')).toBeNull();
    await openPreview();
    expect(within(dialog).getByLabelText(/^Email address/)).toHaveValue('');
    expect(within(dialog).getByLabelText('Password')).toHaveValue('');
    expect(within(dialog).getByLabelText('Password')).toHaveAttribute('type','password');
    expect(within(dialog).getByRole('checkbox',{name:'Remember me'})).not.toBeChecked();
    expectNoTransmission();
  });
  it('hands Become an Expert to the signup preview without sending sample credentials',async()=>{
    renderHeader();const {trigger,dialog}=await openPreview();const href=location.href;
    fireEvent.change(within(dialog).getByLabelText('Password'),{target:{value:'sample-preview-only'}});
    fireEvent.click(within(dialog).getByRole('button',{name:'Become an Expert'}));
    const application=await screen.findByRole('dialog',{name:'Become an Expert'});
    await within(application).findByLabelText('Full name *');
    expect(application.querySelector('input[type=file]')).toBeNull();
    expect(dialog).not.toHaveAttribute('open');expect(dialog.querySelector('input')).toBeNull();
    expect(application).toHaveAttribute('open');expect(location.href).toBe(href);
    const heading=within(application).getByRole('heading',{name:'Become an Expert'});
    act(()=>heading.focus());fireEvent(dialog,new Event('close'));
    expect(application).toHaveAttribute('open');expect(heading).toHaveFocus();
    expect(api).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();expect(Storage.prototype.setItem).not.toHaveBeenCalled();
    fireEvent.click(within(application).getByRole('button',{name:'Close expert application'}));expect(trigger).toHaveFocus();
  });
});
