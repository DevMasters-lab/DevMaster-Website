'use client';

import {useEffect,useId} from 'react';
import {useFieldArray,useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {ArrowUpRight,LoaderCircle,LockKeyhole,Plus,Trash2} from 'lucide-react';
import {useLanguage,useText} from '@/i18n/provider';
import {companySchema} from '@/lib/validation';
import {useCompanyRequestSubmission} from '@/features/engagement/use-company-request-submission';
import {expertSpecializations} from '@/features/engagement/expert-specializations';
import {ErrorNotice,FormSuccess} from './form-feedback';

const collaborationTypes=[
  {value:'project-support',label:'Project support'},
  {value:'joint-proposal',label:'Joint proposal'},
  {value:'long-term-partnership',label:'Long-term partnership'},
] as const;
type CollaborationType=typeof collaborationTypes[number]['value'];
type PartnershipDetails={roles:{specialization:string;count:number;requirements:string}[];collaboration_type:CollaborationType;expected_start_on?:string};

export function serializeExpertPartnership(values:PartnershipDetails){
  const collaboration=collaborationTypes.find(option=>option.value===values.collaboration_type)!.label;
  const roles=values.roles.map((role,index)=>`${index+1}. ${role.specialization}\nCount: ${role.count}\nRequirements:\n${role.requirements}`).join('\n\n');
  return `Collaboration type: ${collaboration}\n\nSpecialists requested:\n${roles}`+
    (values.expected_start_on?`\n\nExpected start date: ${values.expected_start_on}`:'');
}

const specialistSchema=z.object({
  specialization:z.string().refine(value=>expertSpecializations.some(role=>role===value),'Choose a specialization.'),
  count:z.number({error:'Enter between 1 and 100 specialists.'}).int('Enter between 1 and 100 specialists.').min(1,'Enter between 1 and 100 specialists.').max(100,'Enter between 1 and 100 specialists.'),
  requirements:z.string().trim().min(20,'Tell us a little more (at least 20 characters).').max(20000,'The value is too long.'),
});
const partnershipSchema=z.object({
  submitted_company_name:companySchema.shape.submitted_company_name,
  submitted_contact_name:companySchema.shape.submitted_contact_name,
  submitted_email:companySchema.shape.submitted_email,
  submitted_phone:companySchema.shape.submitted_phone,
  roles:z.array(specialistSchema).min(1,'Choose a specialization.').max(10,'You can request up to 10 specialist roles.'),
  collaboration_type:z.enum(['project-support','joint-proposal','long-term-partnership'],{error:'Choose a collaboration type.'}),
  expected_start_on:z.string().refine(value=>!value||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value),'Enter a valid date.').optional(),
}).superRefine((values,context)=>{
  if(serializeExpertPartnership(values).length>20000)context.addIssue({code:'custom',path:['roles'],message:'The value is too long.'});
});
type PartnershipValues=z.infer<typeof partnershipSchema>;
type ContactField='submitted_company_name'|'submitted_contact_name'|'submitted_email'|'submitted_phone'|'expected_start_on';

export function ExpertPartnershipForm(){
  const t=useText();
  const {locale}=useLanguage();
  const id=useId();
  const {register,handleSubmit,control,formState:{errors,isSubmitting},setError:fieldError,trigger}=useForm<PartnershipValues>({
    resolver:zodResolver(partnershipSchema),
    defaultValues:{submitted_company_name:'',submitted_contact_name:'',submitted_email:'',submitted_phone:'',roles:[{specialization:'',count:1,requirements:''}],collaboration_type:'project-support',expected_start_on:''},
  });
  const {fields,append,remove}=useFieldArray({control,name:'roles'});
  const {result,error,submit:sendRequest,resetCommand}=useCompanyRequestSubmission((name,message)=>{
    if(['submitted_company_name','submitted_contact_name','submitted_email','submitted_phone','expected_start_on'].includes(name))fieldError(name as ContactField,{message});
    else if(name==='requirements')fieldError('roles',{message});
    else fieldError('root.server',{message});
  });
  useEffect(()=>{if(Object.keys(errors).length)void trigger();},[locale]);

  async function submit(values:PartnershipValues){
    await sendRequest({request_type:'HIRE_OUR_TEAM',title:'Expert collaboration request',
      submitted_company_name:values.submitted_company_name,submitted_contact_name:values.submitted_contact_name,
      submitted_email:values.submitted_email,submitted_phone:values.submitted_phone,
      requirements:serializeExpertPartnership(values),expected_start_on:values.expected_start_on,
    });
  }
  if(result)return <FormSuccess result={result}/>;

  function contact(name:ContactField,label:string,props:React.InputHTMLAttributes<HTMLInputElement>={}){
    const errorId=id+'-'+name+'-error';
    return <label className="field">{t(label)}<input {...register(name)} {...props} aria-invalid={!!errors[name]} aria-describedby={errors[name]?errorId:undefined}/>{errors[name]&&<span id={errorId} className="field-error">{t(errors[name]?.message||'')}</span>}</label>;
  }
  return <form className="form-panel bid-dialog-form partnership-dialog-form" aria-label={t('Expert partnership request')} noValidate onSubmit={handleSubmit(submit)} onChange={resetCommand}>
    <div className="request-fields">
      <p className="request-note">{t('Fields marked * are required. No account needed.')}</p>
      <ErrorNotice message={error}/>
      <fieldset className="request-group"><legend><span>01</span> {t('Organization & contact')}</legend><div className="form-grid">
        {contact('submitted_company_name','Company / organization *',{autoComplete:'organization',placeholder:t('Your organization')})}
        {contact('submitted_contact_name','Your name *',{autoComplete:'name',placeholder:t('Full name')})}
        {contact('submitted_email','Work email *',{type:'email',autoComplete:'email',placeholder:'you@company.com'})}
        {contact('submitted_phone','Phone number',{type:'tel',autoComplete:'tel',placeholder:'+855 …'})}
      </div></fieldset>
      <fieldset className="request-group"><legend><span>02</span> {t('Specialists you need')}</legend>
        <div className="specialist-list">{fields.map((role,index)=>{
          const rowErrors=errors.roles?.[index];
          const prefix=id+'-role-'+role.id;
          return <fieldset className="specialist-role" key={role.id}>
            <legend className="specialist-header"><span>{t('Specialist {number}',{number:index+1})}</span><button type="button" className="remove-role" aria-label={t('Remove role {number}',{number:index+1})} disabled={fields.length===1} onClick={()=>{remove(index);resetCommand();}}><Trash2 size={15} aria-hidden="true"/>{t('Remove')}</button></legend>
            <div className="form-grid specialist-fields">
              <label className="field">{t('Specialization *')}<select {...register(`roles.${index}.specialization`)} aria-invalid={!!rowErrors?.specialization} aria-describedby={rowErrors?.specialization?prefix+'-specialization-error':undefined}><option value="">{t('Select a specialization')}</option>{expertSpecializations.map(specialization=><option key={specialization} value={specialization}>{t(specialization)}</option>)}</select>{rowErrors?.specialization&&<span id={prefix+'-specialization-error'} className="field-error">{t(rowErrors.specialization.message||'')}</span>}</label>
              <label className="field">{t('Number of specialists *')}<input {...register(`roles.${index}.count`,{valueAsNumber:true})} type="number" min={1} max={100} step={1} inputMode="numeric" aria-invalid={!!rowErrors?.count} aria-describedby={rowErrors?.count?prefix+'-count-error':undefined}/>{rowErrors?.count&&<span id={prefix+'-count-error'} className="field-error">{t(rowErrors.count.message||'')}</span>}</label>
              <label className="field wide">{t('Requirements for this role *')}<textarea {...register(`roles.${index}.requirements`)} rows={3} maxLength={20000} placeholder={t('Describe the skills, responsibilities and experience you need.')} aria-invalid={!!rowErrors?.requirements} aria-describedby={rowErrors?.requirements?prefix+'-requirements-error':undefined}/>{rowErrors?.requirements&&<span id={prefix+'-requirements-error'} className="field-error">{t(rowErrors.requirements.message||'')}</span>}</label>
            </div>
          </fieldset>;
        })}</div>
        {(errors.roles?.root?.message||errors.roles?.message)&&<p className="field-error" role="alert">{t(errors.roles.root?.message||errors.roles.message||'')}</p>}
        <button type="button" className="add-role" disabled={fields.length>=10} onClick={()=>{append({specialization:'',count:1,requirements:''});resetCommand();}}><Plus size={16} aria-hidden="true"/>{t('Add another role')}</button>
        {fields.length>=10&&<small>{t('You can request up to 10 specialist roles.')}</small>}
      </fieldset>
      <fieldset className="request-group"><legend><span>03</span> {t('Collaboration details')}</legend><div className="form-grid">
        <label className="field">{t('Collaboration type *')}<select {...register('collaboration_type')} aria-invalid={!!errors.collaboration_type}>{collaborationTypes.map(option=><option key={option.value} value={option.value}>{t(option.label)}</option>)}</select>{errors.collaboration_type&&<span className="field-error">{t(errors.collaboration_type.message||'')}</span>}</label>
        {contact('expected_start_on','Expected start date',{type:'date'})}
      </div></fieldset>
    </div>
    <div className="form-bottom"><span><LockKeyhole size={12} style={{display:'inline',marginRight:5}} aria-hidden="true"/> {t('Secure submission · Reviewed by our team')}</span><button className="button button-purple" type="submit" disabled={isSubmitting}>{isSubmitting?<><LoaderCircle className="spin" size={16} aria-hidden="true"/>{t('Submitting…')}</>:<>{t('Send your')} {t('request')}<ArrowUpRight size={17} aria-hidden="true"/></>}</button></div>
  </form>;
}
