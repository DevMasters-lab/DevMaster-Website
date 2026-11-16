'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {ArrowRight,Eye,EyeOff,Info,UserRoundPlus} from 'lucide-react';
import {useLanguage,useText} from '@/i18n/provider';
import {applicationSchema} from '@/lib/validation';
import {expertExperienceRanges,expertSpecializations} from '@/features/engagement/expert-specializations';

function validPortfolio(value:string){
  if(!value)return true;
  try{const url=new URL(value);return /^https?:\/\//i.test(value)&&['http:','https:'].includes(url.protocol)&&Boolean(url.hostname);}catch{return false;}
}

const signupPreviewSchema=z.object({
  full_name:z.string().trim().pipe(applicationSchema.shape.full_name),
  email:z.string().trim().pipe(applicationSchema.shape.contact_email),
  specialization:z.enum(expertSpecializations,{error:'Choose a specialization.'}),
  experience:z.enum(expertExperienceRanges,{error:'Choose your years of experience.'}),
  portfolio:z.string().trim().max(2048,'The value is too long.').refine(validPortfolio,'Enter a valid http:// or https:// URL.').optional(),
  expertise:z.string().trim().pipe(applicationSchema.shape.biography),
  password:z.string().min(8,'Use at least 8 characters.'),
  confirmation:z.string().min(1,'Confirm your sample password.'),
}).refine(values=>values.password===values.confirmation,{path:['confirmation'],message:'Passwords do not match.'});
type SignupPreviewValues=z.infer<typeof signupPreviewSchema>;

export function ExpertSignupPreview({onSignIn}:{onSignIn:()=>void}){
  const t=useText();
  const {locale}=useLanguage();
  const id=useId();
  const statusRef=useRef<HTMLDivElement>(null);
  const [showPassword,setShowPassword]=useState(false);
  const [showConfirmation,setShowConfirmation]=useState(false);
  const [status,setStatus]=useState('');
  const {register,handleSubmit,resetField,formState:{errors},trigger}=useForm<SignupPreviewValues>({
    resolver:zodResolver(signupPreviewSchema),
    defaultValues:{full_name:'',email:'',portfolio:'',expertise:'',password:'',confirmation:''},
  });
  useEffect(()=>{if(Object.keys(errors).length)void trigger();},[locale]);
  useEffect(()=>{if(status)statusRef.current?.scrollIntoView?.({block:'nearest',behavior:'auto'});},[status]);

  function clearPasswords(){
    resetField('password',{defaultValue:''});resetField('confirmation',{defaultValue:''});
    setShowPassword(false);setShowConfirmation(false);
  }

  function submit(){
    clearPasswords();
    setStatus('This is a design preview. No application was submitted and no account was created.');
  }

  function message(name:keyof SignupPreviewValues){
    return errors[name]&&<span id={id+'-'+name+'-error'} className="field-error" role="alert">{t(errors[name]?.message||'')}</span>;
  }

  function passwordField(name:'password'|'confirmation',label:string,visible:boolean,toggle:()=>void){
    const showLabel=name==='password'?'Show password':'Show password confirmation';
    const hideLabel=name==='password'?'Hide password':'Hide password confirmation';
    return <div className="field expert-password-field">
      <label htmlFor={id+'-'+name}>{t(label)}</label>
      <div className="expert-password-input">
        <input id={id+'-'+name} {...register(name)} type={visible?'text':'password'} autoComplete="off" maxLength={128} placeholder={t(name==='password'?'At least 8 characters':'Sample password')} required aria-invalid={!!errors[name]} aria-describedby={errors[name]?id+'-'+name+'-error':undefined}/>
        <button type="button" className="expert-password-toggle" aria-label={t(visible?hideLabel:showLabel)} title={t(visible?hideLabel:showLabel)} aria-pressed={visible} onClick={toggle}>{visible?<EyeOff size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}</button>
      </div>
      {message(name)}
    </div>;
  }

  return <form className="form-panel expert-signup-preview-form" aria-label={t('Expert sign-up preview')} aria-describedby={id+'-notice'} autoComplete="off" noValidate onSubmit={event=>{event.preventDefault();void handleSubmit(submit)(event);}} onChange={()=>setStatus('')}>
    <div className="request-fields">
      <div className="expert-signup-welcome expert-signup-banner"><span className="expert-signup-icon" aria-hidden="true"><UserRoundPlus size={26}/></span><p>{t('Create your expert profile and join the DevMasters network.')}</p></div>
      {status&&<div ref={statusRef} className="expert-signup-status" role="status" aria-live="polite">{t(status)}</div>}
      <div className="form-grid expert-signup-fields">
        <label className="field">{t('Full name *')}<input {...register('full_name')} autoComplete="name" maxLength={200} placeholder={t('Full name')} required aria-invalid={!!errors.full_name} aria-describedby={errors.full_name?id+'-full_name-error':undefined}/>{message('full_name')}</label>
        <label className="field">{t('Email address *')}<input {...register('email')} type="email" inputMode="email" autoComplete="off" maxLength={254} placeholder="you@example.com" required aria-invalid={!!errors.email} aria-describedby={errors.email?id+'-email-error':undefined}/>{message('email')}</label>
        <label className="field">{t('Primary specialization *')}<select {...register('specialization')} required aria-invalid={!!errors.specialization} aria-describedby={errors.specialization?id+'-specialization-error':undefined}><option value="">{t('Select a specialization')}</option>{expertSpecializations.map(role=><option key={role} value={role}>{t(role)}</option>)}</select>{message('specialization')}</label>
        <label className="field">{t('Years of experience *')}<select {...register('experience')} required aria-invalid={!!errors.experience} aria-describedby={errors.experience?id+'-experience-error':undefined}><option value="">{t('Select experience range')}</option>{expertExperienceRanges.map(range=><option key={range} value={range}>{t(range)}</option>)}</select>{message('experience')}</label>
        <label className="field wide">{t('Portfolio or LinkedIn URL (optional)')}<input {...register('portfolio')} type="url" inputMode="url" autoComplete="off" maxLength={2048} placeholder="https://…" aria-invalid={!!errors.portfolio} aria-describedby={errors.portfolio?id+'-portfolio-error':undefined}/>{message('portfolio')}</label>
        <label className="field wide">{t('Skills & expertise *')}<textarea {...register('expertise')} rows={4} maxLength={10000} placeholder={t('Describe your technical skills, experience and areas of expertise.')} required aria-invalid={!!errors.expertise} aria-describedby={errors.expertise?id+'-expertise-error':undefined}/>{message('expertise')}</label>
        {passwordField('password','Create password *',showPassword,()=>setShowPassword(current=>!current))}
        {passwordField('confirmation','Confirm password *',showConfirmation,()=>setShowConfirmation(current=>!current))}
      </div>
    </div>
    <div className="form-bottom expert-signup-footer">
      <button type="submit" className="button button-purple expert-signup-submit">{t('Preview Expert Sign Up')}<ArrowRight size={18} aria-hidden="true"/></button>
      <div className="expert-signup-signin"><span>{t('Already an expert?')}</span><button type="button" onClick={()=>{clearPasswords();onSignIn();}}>{t('Sign in')}</button></div>
      <div id={id+'-notice'} className="expert-signup-notice" role="note"><Info size={17} aria-hidden="true"/><span>{t('Preview only. No account will be created. Please do not enter a real password.')}</span></div>
    </div>
  </form>;
}
