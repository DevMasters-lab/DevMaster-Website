'use client';

import {type FormEvent,useEffect,useId,useRef,useState} from 'react';
import {ArrowRight,Eye,EyeOff,Info,LockKeyhole} from 'lucide-react';
import {useText} from '@/i18n/provider';

type PreviewMode='sign-in'|'recovery';
type PreviewErrors={email?:string;password?:string};

export function ExpertPortalPreview({onBecomeExpert}:{onBecomeExpert:()=>void}){
  const t=useText();
  const id=useId();
  const emailRef=useRef<HTMLInputElement>(null);
  const passwordRef=useRef<HTMLInputElement>(null);
  const statusRef=useRef<HTMLDivElement>(null);
  const [mode,setMode]=useState<PreviewMode>('sign-in');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [remember,setRemember]=useState(false);
  const [errors,setErrors]=useState<PreviewErrors>({});
  const [status,setStatus]=useState('');
  const recovery=mode==='recovery';
  const emailErrorId=id+'-email-error';
  const passwordErrorId=id+'-password-error';
  const noticeId=id+'-notice';

  useEffect(()=>{
    if(status)statusRef.current?.scrollIntoView?.({block:'nearest',behavior:'auto'});
  },[status]);

  function changeMode(next:PreviewMode){
    setMode(next);setPassword('');setShowPassword(false);setRemember(false);setErrors({});setStatus('');
    emailRef.current?.focus();
  }

  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const next:PreviewErrors={};
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))next.email='Enter a valid email address.';
    if(!recovery&&!password.trim())next.password='Enter a sample password.';
    setErrors(next);setStatus('');
    if(next.email){emailRef.current?.focus();return;}
    if(next.password){passwordRef.current?.focus();return;}
    setPassword('');setShowPassword(false);
    setStatus(recovery?'This is a design preview. No recovery email was sent.':'This is a design preview. No sign-in request was sent.');
  }

  return <form className="form-panel portal-preview-form" aria-label={t(recovery?'Password recovery preview':'Expert Portal preview')} aria-describedby={noticeId} autoComplete="off" noValidate onSubmit={submit}>
    <div className="request-fields">
      <div id={noticeId} className="portal-preview-notice" role="note">
        <Info size={19} aria-hidden="true"/>
        <div><strong>{t('Design preview only')}</strong><p>{t('Please do not enter real credentials. This is a demo; no data is sent.')}</p></div>
      </div>
      <section className="portal-preview-welcome" aria-labelledby={id+'-welcome'}>
        <span className="portal-preview-emblem" aria-hidden="true"><LockKeyhole size={28}/></span>
        <h3 id={id+'-welcome'}>{t(recovery?'Password recovery preview':'Welcome back.')}</h3>
        <p>{t(recovery?'Enter a sample email to preview password recovery. No email will be sent.':'Use sample details to explore this sign-in preview.')}</p>
      </section>
      {status&&<div ref={statusRef} className="portal-preview-status" role="status" aria-live="polite">{t(status)}</div>}
      <div className="form-grid portal-preview-fields">
        <label className="field" htmlFor={id+'-email'}>{t('Email address')}
          <input ref={emailRef} id={id+'-email'} type="email" inputMode="email" autoComplete="off" placeholder="demo@example.com" maxLength={254} value={email} required aria-invalid={!!errors.email} aria-describedby={errors.email?emailErrorId:undefined} onChange={event=>{setEmail(event.target.value);setErrors(current=>({...current,email:undefined}));setStatus('');}}/>
          {errors.email&&<span id={emailErrorId} className="field-error" role="alert">{t(errors.email)}</span>}
        </label>
        {!recovery&&<div className="field portal-password-field">
          <label htmlFor={id+'-password'}>{t('Password')}</label>
          <div className="portal-password-input">
            <input ref={passwordRef} id={id+'-password'} type={showPassword?'text':'password'} autoComplete="off" placeholder={t('Sample password')} maxLength={128} value={password} required aria-invalid={!!errors.password} aria-describedby={errors.password?passwordErrorId:undefined} onChange={event=>{setPassword(event.target.value);setErrors(current=>({...current,password:undefined}));setStatus('');}}/>
            <button type="button" className="portal-password-toggle" aria-label={t(showPassword?'Hide password':'Show password')} title={t(showPassword?'Hide password':'Show password')} aria-pressed={showPassword} onClick={()=>setShowPassword(current=>!current)}>{showPassword?<EyeOff size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}</button>
          </div>
          {errors.password&&<span id={passwordErrorId} className="field-error" role="alert">{t(errors.password)}</span>}
        </div>}
      </div>
      <div className="portal-preview-options">
        {!recovery&&<label className="portal-preview-remember"><input type="checkbox" checked={remember} onChange={event=>setRemember(event.target.checked)}/><span>{t('Remember me')}</span></label>}
        <button type="button" className="portal-preview-forgot" onClick={()=>changeMode(recovery?'sign-in':'recovery')}>{t(recovery?'Back to sign in':'Forgot password?')}</button>
      </div>
    </div>
    <div className="form-bottom portal-preview-footer">
      <button type="submit" className="button button-purple portal-preview-submit">{t(recovery?'Preview recovery':'Sign in')}<ArrowRight size={18} aria-hidden="true"/></button>
      <div className="portal-preview-join"><span>{t('New to DevMasters?')}</span><button type="button" onClick={()=>{setPassword('');onBecomeExpert();}}>{t('Become an Expert')}</button></div>
    </div>
  </form>;
}
