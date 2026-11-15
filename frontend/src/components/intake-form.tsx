'use client';
import {FileInput} from '@/components/FileInput';
import {useText,useDate,useStatus,useLanguage} from '@/i18n/provider';
import {useState,useRef,useEffect,useId} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {useQuery} from '@tanstack/react-query';
import {ArrowUpRight,CheckCircle2,LockKeyhole,LoaderCircle} from 'lucide-react';
import {api,ApiError} from '@/lib/api';
import {companySchema,applicationSchema,type CompanyValues,type ApplicationValues} from '@/lib/validation';
import {useCompanyRequestSubmission} from '@/hooks/use-company-request-submission';
import {expertSpecializations,expertExperienceRanges} from '@/data/expert-specializations';
type Reference={data:{consent:{version:string;text:string}}};
export function FormSuccess({result}:{result:{reference_no:string;message:string;message_code?:string}}){const t=useText();return <div className="success-box" role="status"><CheckCircle2 size={28}/><h2>{""}{t("Thank you. You’re on our radar.")}{""}</h2><p>{result.message_code==='REQUEST_RECEIVED'?t('Your request has been received. DevMasters will review it and follow up.'):result.message_code==='APPLICATION_RECEIVED'?t('Application received. Portal access becomes available after approval and account activation.'):result.message}</p><strong>{result.reference_no}</strong><p>{""}{t("Keep this reference for future correspondence. Attachments are held privately and checked before use.")}{""}</p></div>;}
export function ErrorNotice({message}:{message:string}){const t=useText();return message?<div role="alert" className="error-box">{t(message)}</div>:null;}
export function CompanyForm({type,contact=false,variant='default'}:{type:'INVITE_US_TO_BID'|'HIRE_OUR_TEAM';contact?:boolean;variant?:'default'|'bid-dialog'}){const t=useText();
 const [files,setFiles]=useState<File[]>([]);
 const {register,handleSubmit,formState:{errors,isSubmitting},setError:fieldError,trigger}=useForm<CompanyValues>({resolver:zodResolver(companySchema),defaultValues:{request_type:type}});
 const {result,error,submit:sendRequest,resetCommand}=useCompanyRequestSubmission((name,message)=>fieldError(name,{message}));
 const {locale}=useLanguage();useEffect(()=>{if(Object.keys(errors).length)void trigger();},[locale]);
 async function submit(values:CompanyValues){await sendRequest(values,files);}
 if(result)return <FormSuccess result={result}/>;
 const field=(name:keyof CompanyValues,label:string,props:React.InputHTMLAttributes<HTMLInputElement>={})=><label className="field" key={name}>{label}<input {...register(name)} {...props} aria-invalid={!!errors[name]}/>{errors[name]&&<span className="field-error">{t(errors[name]?.message||'')}</span>}</label>;
 const bidDialog=variant==='bid-dialog'&&type==='INVITE_US_TO_BID'&&!contact;
 const fields={
  company:field('submitted_company_name',t("Company / organization *"),{autoComplete:'organization',placeholder:t("Your organization")}),
  name:field('submitted_contact_name',t("Your name *"),{autoComplete:'name',placeholder:t("Full name")}),
  email:field('submitted_email',t("Work email *"),{type:'email',autoComplete:'email',placeholder:'you@company.com'}),
  phone:field('submitted_phone',t("Phone number"),{type:'tel',autoComplete:'tel',placeholder:'+855 …'}),
  title:field('title',type==='INVITE_US_TO_BID'?t("Opportunity title *"):t("Request title *"),{placeholder:t("A short description of your request")}),
  requirements:<label className="field wide">{contact?t("Your message *"):t("What do you need? *")}<textarea {...register('requirements')} rows={bidDialog?4:5} placeholder={t("Tell us about the scope, specialist skills, location and any important requirements.")} aria-invalid={!!errors.requirements}/>{errors.requirements&&<span className="field-error">{t(errors.requirements.message||'')}</span>}</label>,
  start:field('expected_start_on',t("Expected start date"),{type:'date'}),
  end:field('expected_end_on',t("Expected end date"),{type:'date'}),
  deadline:field('response_due_at',t("Response deadline"),{type:'datetime-local'}),
  documents:<label className="field wide">{t("Supporting documents")}<FileInput type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/><small>{t("PDF, DOCX, JPG or PNG · Up to 5 files · 10 MB each. Files remain private.")}</small></label>,
 };
 return <form data-reveal={bidDialog?undefined:'up'} className={'form-panel'+(bidDialog?' bid-dialog-form':'')} aria-label={bidDialog?t('Project invitation'):undefined} onSubmit={handleSubmit(submit)} noValidate onChange={resetCommand}>
  {!bidDialog&&<><h2>{contact?t("Let’s start a conversation"):type==='INVITE_US_TO_BID'?t("Tell us about the opportunity"):t("Tell us about your team needs")}</h2><p>{t("Fields marked * are required. No account needed.")}</p><ErrorNotice message={error}/></>}
  {!contact&&<input type="hidden" {...register('request_type')}/>}
  {bidDialog?<div className="request-fields">
   <p className="request-note">{t("Fields marked * are required. No account needed.")}</p>
   <ErrorNotice message={error}/>
   <fieldset className="request-group"><legend><span>01</span> {t('Organization & contact')}</legend><div className="form-grid">{fields.company}{fields.name}{fields.email}{fields.phone}</div></fieldset>
   <fieldset className="request-group"><legend><span>02</span> {t('Project opportunity')}</legend><div className="form-grid"><div className="field wide">{fields.title}</div>{fields.requirements}{fields.documents}{fields.start}{fields.end}<div className="field wide">{fields.deadline}</div></div></fieldset>
  </div>:<div className="form-grid">
   {contact&&<label className="field wide">{t("How can we help? *")}<select {...register('request_type')}><option value="HIRE_OUR_TEAM">{t("Discuss hiring expertise or technical services")}</option><option value="INVITE_US_TO_BID">{t("Discuss a bid or proposal partnership")}</option></select></label>}
   <div className="field wide">{fields.company}</div>{fields.name}{fields.email}{fields.phone}{fields.title}{fields.requirements}{fields.start}{fields.end}
   {type==='INVITE_US_TO_BID'&&<div className="field wide">{fields.deadline}</div>}{fields.documents}
  </div>}
  <div className="form-bottom"><span><LockKeyhole size={12} style={{display:'inline',marginRight:5}}/> {t("Secure submission · Reviewed by our team")}</span><button className="button button-purple" disabled={isSubmitting} type="submit">{isSubmitting?<><LoaderCircle className="spin" size={16}/> {t("Submitting…")}</>:<>{t("Send your")} {contact?t('message'):t('request')} <ArrowUpRight size={17}/></>}</button></div>
 </form>;
}
export function ApplicationForm({variant='default'}:{variant?:'default'|'dialog'}={}){
 const t=useText();
 const {locale}=useLanguage();
 const dialog=variant==='dialog';
 const id=useId();
 const portfolioRef=useRef<HTMLInputElement>(null);
 const [result,setResult]=useState<{reference_no:string;message:string;message_code?:string}|null>(null);
 const [error,setError]=useState('');
 const [cv,setCv]=useState<File|null>(null);
 const [specialization,setSpecialization]=useState('');
 const [experience,setExperience]=useState('');
 const [portfolio,setPortfolio]=useState('');
 const [portfolioError,setPortfolioError]=useState('');
 const key=useRef<string|null>(null);
 const ref=useQuery({queryKey:['reference',locale],queryFn:()=>api<Reference>('/reference-data')});
 const consentInfo=ref.data?.data?.consent;
 const consentReady=Boolean(consentInfo?.version?.trim()&&consentInfo?.text?.trim());
 const {register,handleSubmit,formState:{errors,isSubmitting},setError:fieldError,setValue,trigger}=useForm<ApplicationValues>({resolver:zodResolver(applicationSchema),defaultValues:{consent:false}});
 useEffect(()=>{if(Object.keys(errors).length)void trigger();},[locale]);
 async function submit(values:ApplicationValues){
  setError('');setPortfolioError('');
  let biography=values.biography;
  if(dialog){
   const url=portfolio.trim();
   let validUrl=true;
   if(url){try{const parsed=new URL(url);validUrl=/^https?:\/\//i.test(url)&&['http:','https:'].includes(parsed.protocol)&&Boolean(parsed.hostname);}catch{validUrl=false;}}
   if(!validUrl||url.length>2048){setPortfolioError(url.length>2048?'The value is too long.':'Enter a valid http:// or https:// URL.');portfolioRef.current?.focus();return;}
   const details=[experience?`Years of experience: ${experience}`:'',url?`Portfolio / LinkedIn: ${url}`:''].filter(Boolean);
   if(details.length)biography+='\n\nAdditional experience details:\n'+details.join('\n');
   if(biography.length>10000){fieldError('biography',{message:'The value is too long.'},{shouldFocus:true});return;}
  }
  if(!cv||cv.size>10*1024*1024){setError(t('Please attach a PDF or DOCX CV, 10 MB or smaller.'));return;}
  if(!consentReady){setError(t('Consent information could not be loaded. Please refresh.'));return;}
  const form=new FormData();
  Object.entries({...values,biography}).forEach(([name,value])=>form.append(name,typeof value==='boolean'?(value?'1':'0'):(value||'')));
  form.append('consent_version',consentInfo!.version);form.append('cv',cv);
  key.current??=crypto.randomUUID();
  try{
   const response=await api<{data:{reference_no:string;message:string;message_code?:string}}>('/expert-applications',{method:'POST',headers:{'Idempotency-Key':key.current},body:form});
   setResult(response.data);
  }catch(error){
   if(error instanceof ApiError){setError(error.message);Object.entries(error.errors).forEach(([name,messages])=>fieldError(name as keyof ApplicationValues,{message:messages[0]}));}
   else setError(t('Unable to submit. Please try again.'));
  }
 }
 if(result)return <FormSuccess result={result}/>;
 const field=(name:keyof ApplicationValues,label:string,props:React.InputHTMLAttributes<HTMLInputElement>={})=><label className="field" key={name}>{label}<input {...register(name)} {...props} aria-invalid={!!errors[name]} aria-describedby={errors[name]?id+'-'+name+'-error':undefined}/>{errors[name]&&<span id={id+'-'+name+'-error'} className="field-error">{t(errors[name]?.message||'')}</span>}</label>;
 const personalFields=<>
  {field('full_name',t('Full name *'),{autoComplete:'name'})}
  {field('contact_email',t('Email address *'),{type:'email',autoComplete:'email'})}
  {field('contact_phone',t('Phone number'),{type:'tel',autoComplete:'tel'})}
  {field('location_text',t('Location'),{placeholder:t('City, country')})}
 </>;
 const professionalField=dialog?<>
  <label className="field wide" htmlFor={id+'-specialization'}>{t('Primary specialization *')}<select id={id+'-specialization'} value={specialization} onChange={event=>{const value=event.target.value;setSpecialization(value);setValue('professional_title',value==='Other'?'':value,{shouldValidate:Boolean(errors.professional_title),shouldDirty:true});}} aria-invalid={!specialization&&!!errors.professional_title} aria-describedby={!specialization&&errors.professional_title?id+'-professional_title-error':undefined}>
   <option value="">{t('Select a specialization')}</option>
   {expertSpecializations.map(role=><option key={role} value={role}>{t(role)}</option>)}
  </select>{!specialization&&errors.professional_title&&<span id={id+'-professional_title-error'} className="field-error">{t(errors.professional_title.message||'')}</span>}</label>
  {specialization==='Other'&&<div className="field wide">{field('professional_title',t('Professional title *'),{placeholder:t('e.g. Senior Software Engineer')})}</div>}
 </>:<div className="field wide">{field('professional_title',t('Professional title *'),{placeholder:t('e.g. Senior Software Engineer')})}</div>;
 const optionalFields=dialog?<>
  <label className="field" htmlFor={id+'-experience'}>{t('Years of experience')}<select id={id+'-experience'} value={experience} onChange={event=>setExperience(event.target.value)}><option value="">{t('Select experience range')}</option>{expertExperienceRanges.map(range=><option key={range} value={range}>{t(range)}</option>)}</select></label>
  <label className="field" htmlFor={id+'-portfolio'}>{t('Portfolio or LinkedIn URL')}<input ref={portfolioRef} id={id+'-portfolio'} type="url" inputMode="url" autoComplete="url" placeholder="https://…" value={portfolio} onChange={event=>{setPortfolio(event.target.value);setPortfolioError('');}} aria-invalid={!!portfolioError} aria-describedby={portfolioError?id+'-portfolio-error':undefined}/>{portfolioError&&<span id={id+'-portfolio-error'} className="field-error">{t(portfolioError)}</span>}</label>
 </>:null;
 const experienceFields=<>
  {professionalField}{optionalFields}
  <label className="field wide">{t('Your experience & expertise *')}<textarea {...register('biography')} rows={dialog?4:5} placeholder={t('Tell us about your experience, key skills and the work you enjoy.')} aria-invalid={!!errors.biography} aria-describedby={errors.biography?id+'-biography-error':undefined}/>{errors.biography&&<span id={id+'-biography-error'} className="field-error">{t(errors.biography.message||'')}</span>}</label>
  <label className="field wide">{t('Your CV *')}<FileInput type="file" accept=".pdf,.docx" onChange={event=>setCv(event.target.files?.[0]||null)}/><small>{t('PDF or DOCX · Up to 10 MB · Privately stored and scanned.')}</small></label>
 </>;
 const consent=<>
  {ref.isPending?<p>{t('Loading consent information…')}</p>:ref.isError||!consentReady?<div className="error-box">{t('Unable to load consent information.')} <button type="button" onClick={()=>ref.refetch()}>{t('Try again')}</button></div>:<label className="check-field"><input type="checkbox" {...register('consent')} aria-invalid={!!errors.consent} aria-describedby={errors.consent?id+'-consent-error':undefined}/><span>{consentInfo!.text}<br/><small>{t('Development consent version:')} {consentInfo!.version}{t('. Final policy wording is awaiting approval.')}</small></span></label>}
  {errors.consent&&<span id={id+'-consent-error'} className="field-error">{t(errors.consent.message||'')}</span>}
 </>;
 return <form data-reveal={dialog?undefined:'up'} className={'form-panel'+(dialog?' bid-dialog-form application-dialog-form':'')} aria-label={dialog?t('Become an Expert'):undefined} noValidate onSubmit={handleSubmit(submit)} onChange={()=>{key.current=null;}}>
  {dialog?<div className="request-fields">
   <p className="application-intro">{t('Let’s understand your expertise. Fields marked * are required.')}</p>
   <ErrorNotice message={error}/>
   <fieldset className="request-group"><legend><span>01</span> {t('Personal information')}</legend><div className="form-grid">{personalFields}</div></fieldset>
   <fieldset className="request-group"><legend><span>02</span> {t('Expertise & experience')}</legend><div className="form-grid">{experienceFields}</div></fieldset>
   {consent}
  </div>:<>
   <h2>{t('Introduce yourself')}</h2><p>{t('Let’s understand your expertise. Fields marked * are required.')}</p><ErrorNotice message={error}/><div className="form-grid">{personalFields}{experienceFields}</div>{consent}
  </>}
  <div className="form-bottom"><span>{t('Application ≠ employment or an engagement offer.')}</span><button type="submit" className="button button-purple" disabled={isSubmitting||!consentReady}>{isSubmitting?t('Submitting…'):<>{t('Submit application')} <ArrowUpRight size={17} aria-hidden="true"/></>}</button></div>
 </form>;
}
