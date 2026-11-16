'use client';

import {useEffect,useId,useRef,useState,type DragEvent} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {ArrowUpRight,FileText,LoaderCircle,LockKeyhole,UploadCloud,X} from 'lucide-react';
import {useLanguage,useText} from '@/i18n/provider';
import {companySchema} from '@/lib/validation';
import {useCompanyRequestSubmission} from '@/features/engagement/use-company-request-submission';
import {ErrorNotice,FormSuccess} from './form-feedback';

const invitationTypes=['EOI','RFP','RFQ','Tender','Project invitation','Other'] as const;
type InvitationType=typeof invitationTypes[number];
const invitationLabels:Record<InvitationType,string>={EOI:'Expression of Interest (EOI)',RFP:'Request for Proposal (RFP)',RFQ:'Request for Quotation (RFQ)',Tender:'Tender','Project invitation':'Project invitation',Other:'Other'};
const maxDocumentBytes=10*1024*1024;
type InvitationDetails={invitation_type:InvitationType;document_link?:string;requirements:string};

function serializeInvitation(values:InvitationDetails){
  return `Invitation type: ${invitationLabels[values.invitation_type]}\n`+
    (values.document_link?`TOR / RFP document link: ${values.document_link}\n`:'')+
    `\nProject brief / requirements:\n${values.requirements}`;
}

function validDate(value:string){
  return !value||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value);
}

function validDocumentLink(value:string){
  if(!value)return true;
  try{const url=new URL(value);return /^https?:\/\//i.test(value)&&['http:','https:'].includes(url.protocol)&&Boolean(url.hostname);}catch{return false;}
}

const invitationSchema=z.object({
  submitted_company_name:z.string().trim().pipe(companySchema.shape.submitted_company_name),
  submitted_contact_name:z.string().trim().pipe(companySchema.shape.submitted_contact_name),
  submitted_email:z.string().trim().pipe(companySchema.shape.submitted_email),
  invitation_type:z.enum(invitationTypes,{error:'Choose an invitation type.'}),
  submission_deadline:z.string().refine(validDate,'Enter a valid date.').optional(),
  document_link:z.string().trim().max(2048,'The value is too long.').refine(validDocumentLink,'Enter a valid http:// or https:// URL.').optional(),
  requirements:z.string().trim().pipe(companySchema.shape.requirements),
}).superRefine((values,context)=>{
  if(serializeInvitation(values).length>20000)context.addIssue({code:'custom',path:['requirements'],message:'The value is too long.'});
});
type InvitationValues=z.infer<typeof invitationSchema>;
type TextField='submitted_company_name'|'submitted_contact_name'|'submitted_email'|'submission_deadline'|'document_link';

export function BidInvitationForm(){
  const t=useText();
  const {locale}=useLanguage();
  const id=useId();
  const inputRef=useRef<HTMLInputElement>(null);
  const browseRef=useRef<HTMLButtonElement>(null);
  const [document,setDocument]=useState<File|null>(null);
  const [fileError,setFileError]=useState('');
  const [dragging,setDragging]=useState(false);
  const {register,handleSubmit,formState:{errors,isSubmitting},setError:fieldError,trigger}=useForm<InvitationValues>({
    resolver:zodResolver(invitationSchema),
    defaultValues:{submitted_company_name:'',submitted_contact_name:'',submitted_email:'',submission_deadline:'',document_link:'',requirements:''},
  });
  const {result,error,submit:sendRequest,resetCommand}=useCompanyRequestSubmission((name,message)=>{
    const field=String(name);
    if(['submitted_company_name','submitted_contact_name','submitted_email','requirements'].includes(field))fieldError(field as TextField|'requirements',{message});
    else if(field==='response_due_at')fieldError('submission_deadline',{message});
    else if(field==='title'||field==='request_type')fieldError('invitation_type',{message});
    else if(/^attachments(?:\.|$)/.test(field))setFileError(message);
    else fieldError('root.server',{message});
  });
  useEffect(()=>{if(Object.keys(errors).length)void trigger();},[locale]);

  function clearDocument(){
    setDocument(null);setFileError('');resetCommand();
    if(inputRef.current)inputRef.current.value='';
  }

  function chooseFiles(files:readonly File[]){
    resetCommand();setDragging(false);
    let message='';
    const file=files[0];
    if(files.length!==1)message='Choose one PDF or DOCX document.';
    else if(file.size>maxDocumentBytes)message='Choose a document no larger than 10 MB.';
    else{
      const extension=file.name.split('.').pop()?.toLowerCase();
      const mime=extension==='pdf'?'application/pdf':extension==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':null;
      if(!mime||(file.type&&file.type!=='application/octet-stream'&&file.type.toLowerCase()!==mime))message='Choose a PDF or DOCX document.';
    }
    setFileError(message);setDocument(message?null:file);
    if(message&&inputRef.current)inputRef.current.value='';
  }

  function dropDocument(event:DragEvent<HTMLDivElement>){
    event.preventDefault();setDragging(false);
    const files=Array.from(event.dataTransfer.files);
    if(files.length)chooseFiles(files);
  }

  async function submit(values:InvitationValues){
    if(fileError){browseRef.current?.focus();return;}
    await sendRequest({
      request_type:'INVITE_US_TO_BID',
      submitted_company_name:values.submitted_company_name,
      submitted_contact_name:values.submitted_contact_name,
      submitted_email:values.submitted_email,
      title:Array.from(`${invitationLabels[values.invitation_type]} — ${values.submitted_company_name}`).slice(0,255).join(''),
      requirements:serializeInvitation(values),
      response_due_at:values.submission_deadline?`${values.submission_deadline}T23:59:59+07:00`:undefined,
    },document?[document]:[]);
  }
  if(result)return <FormSuccess result={result}/>;

  function field(name:TextField,label:string,props:React.InputHTMLAttributes<HTMLInputElement>={},wide=false){
    const errorId=id+'-'+name+'-error';
    return <label className={'field'+(wide?' wide':'')}>
      {t(label)}<input {...register(name)} {...props} aria-invalid={!!errors[name]} aria-describedby={errors[name]?errorId:undefined}/>
      {errors[name]&&<span id={errorId} className="field-error">{t(errors[name]?.message||'')}</span>}
      {name==='submission_deadline'&&<small>{t('End of day in Cambodia time (UTC+7).')}</small>}
    </label>;
  }

  return <form className="form-panel bid-dialog-form bid-invitation-form" aria-label={t('Project invitation')} noValidate onSubmit={handleSubmit(submit)} onChange={resetCommand}>
    <div className="request-fields">
      <p className="request-note">{t('Fields marked * are required. No account needed.')}</p>
      <ErrorNotice message={error}/>
      <fieldset className="request-group"><legend><span>01</span> {t('Organization & contact')}</legend><div className="form-grid">
        {field('submitted_company_name','Organization / company *',{autoComplete:'organization',maxLength:255,placeholder:t('Your organization')})}
        {field('submitted_contact_name','Contact person *',{autoComplete:'name',maxLength:200,placeholder:t('Full name')})}
        {field('submitted_email','Work email *',{type:'email',autoComplete:'email',maxLength:254,placeholder:'you@company.com'},true)}
      </div></fieldset>
      <fieldset className="request-group"><legend><span>02</span> {t('Project opportunity')}</legend><div className="form-grid">
        <div className="field wide">
          <label className="bid-upload-label" htmlFor={id+'-document'}>{t('TOR / RFP document (optional)')}</label>
          <div className={'bid-upload'+(dragging?' bid-upload-active':'')} onDragEnter={event=>{event.preventDefault();setDragging(true);}} onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';}} onDragLeave={event=>{if(!(event.relatedTarget instanceof Node)||!event.currentTarget.contains(event.relatedTarget))setDragging(false);}} onDrop={dropDocument}>
            <input ref={inputRef} id={id+'-document'} className="bid-upload-input" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-invalid={!!fileError} aria-describedby={id+'-document-help'+(fileError?' '+id+'-document-error':'')} onChange={event=>{const files=Array.from(event.target.files||[]);if(files.length)chooseFiles(files);}}/>
            <span className="bid-upload-icon" aria-hidden="true"><UploadCloud size={25}/></span>
            <div className="bid-upload-copy"><strong>{t('Upload your TOR or RFP')}</strong><span>{t('Drag and drop a file here, or browse.')}</span><small id={id+'-document-help'}>{t('PDF or DOCX · One file · Up to 10 MB.')}</small></div>
            <button ref={browseRef} type="button" className="bid-upload-browse" onClick={()=>inputRef.current?.click()}>{t('Browse files')}</button>
          </div>
          {(document||fileError)&&<div className="bid-upload-selected"><FileText size={17} aria-hidden="true"/><span role="status">{document?document.name:t('No document selected')}</span><button type="button" className="bid-upload-remove" aria-label={t(document?'Remove document':'Clear selection')} onClick={clearDocument}><X size={16} aria-hidden="true"/>{t(document?'Remove':'Clear selection')}</button></div>}
          {fileError&&<span id={id+'-document-error'} className="field-error" role="alert">{t(fileError)}</span>}
          <small>{t('Files remain private.')}</small>
        </div>
        <label className="field">{t('Invitation type *')}<select {...register('invitation_type')} aria-invalid={!!errors.invitation_type} aria-describedby={errors.invitation_type?id+'-type-error':undefined}><option value="">{t('Select invitation type')}</option>{invitationTypes.map(type=><option key={type} value={type}>{t(invitationLabels[type])}</option>)}</select>{errors.invitation_type&&<span id={id+'-type-error'} className="field-error">{t(errors.invitation_type.message||'')}</span>}</label>
        {field('submission_deadline','Submission deadline (optional)',{type:'date'})}
        {field('document_link','TOR / RFP document link (optional)',{type:'url',inputMode:'url',maxLength:2048,placeholder:'https://…'},true)}
        <label className="field wide">{t('Project brief / requirements *')}<textarea {...register('requirements')} rows={4} maxLength={20000} placeholder={t('Tell us about the scope, requirements and what you would like us to deliver.')} aria-invalid={!!errors.requirements} aria-describedby={errors.requirements?id+'-requirements-error':undefined}/>{errors.requirements&&<span id={id+'-requirements-error'} className="field-error">{t(errors.requirements.message||'')}</span>}</label>
      </div></fieldset>
    </div>
    <div className="form-bottom"><span><LockKeyhole size={12} style={{display:'inline',marginRight:5}} aria-hidden="true"/> {t('Secure submission · Reviewed by our team')}</span><button className="button button-purple" type="submit" disabled={isSubmitting}>{isSubmitting?<><LoaderCircle className="spin" size={16} aria-hidden="true"/>{t('Submitting…')}</>:<>{t('Send invitation')}<ArrowUpRight size={17} aria-hidden="true"/></>}</button></div>
  </form>;
}
