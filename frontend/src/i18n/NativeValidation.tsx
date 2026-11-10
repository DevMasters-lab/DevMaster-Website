'use client';
import {useEffect} from 'react';
import {useLanguage,useText} from './provider';
type Control=HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
function isControl(target:EventTarget|null):target is Control{return target instanceof HTMLInputElement||target instanceof HTMLSelectElement||target instanceof HTMLTextAreaElement;}
/** Native constraints still run; only their browser-dependent human message changes. */
export function NativeValidation(){
 const {locale}=useLanguage();const t=useText();
 useEffect(()=>{
  const localize=(control:Control)=>{
   control.setCustomValidity('');const state=control.validity;
   if(state.valid){delete control.dataset.localizedValidity;return;}
   const source=state.valueMissing?'This field is required.':state.typeMismatch&&control instanceof HTMLInputElement&&control.type==='email'?'Enter a valid email address.':'Please check the length or format of this value.';
   control.setCustomValidity(t(source));control.dataset.localizedValidity='true';
  };
  const invalid=(event:Event)=>{if(isControl(event.target))localize(event.target);};
  const clear=(event:Event)=>{if(isControl(event.target)&&event.target.dataset.localizedValidity){event.target.setCustomValidity('');delete event.target.dataset.localizedValidity;}};
  document.querySelectorAll<Control>('[data-localized-validity]').forEach(localize);
  document.addEventListener('invalid',invalid,true);document.addEventListener('input',clear,true);document.addEventListener('change',clear,true);
  return()=>{document.removeEventListener('invalid',invalid,true);document.removeEventListener('input',clear,true);document.removeEventListener('change',clear,true);};
 },[locale]);
 return null;
}
