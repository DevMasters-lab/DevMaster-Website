'use client';

import {useRef,useState} from 'react';
import {useText} from '@/i18n/provider';
import {api,ApiError} from '@/lib/api';
import type {CompanyValues} from '@/lib/validation';

export type CompanyRequestResult={reference_no:string;message:string;message_code?:string};

export function useCompanyRequestSubmission(onFieldError:(name:keyof CompanyValues,message:string)=>void){
  const t=useText();
  const [result,setResult]=useState<CompanyRequestResult|null>(null);
  const [error,setError]=useState('');
  const commandKey=useRef<string|null>(null);

  function resetCommand(){commandKey.current=null;}
  async function submit(values:CompanyValues,files:readonly File[]=[]){
    setError('');
    if(files.length>5||files.some(file=>file.size>10*1024*1024)){
      setError(t('Upload up to five files, each 10 MB or smaller.'));
      return;
    }
    const form=new FormData();
    Object.entries(values).forEach(([name,value])=>{
      if(value)form.append(name,name==='response_due_at'?new Date(value).toISOString():value);
    });
    files.forEach(file=>form.append('attachments[]',file));
    commandKey.current??=crypto.randomUUID();
    try{
      const response=await api<{data:CompanyRequestResult}>('/company-requests',{
        method:'POST',headers:{'Idempotency-Key':commandKey.current},body:form,
      });
      setResult(response.data);
    }catch(error){
      if(error instanceof ApiError){
        setError(error.message);
        Object.entries(error.errors).forEach(([name,messages])=>onFieldError(name as keyof CompanyValues,messages[0]));
      }else setError(t('Unable to submit. Please try again.'));
    }
  }
  return {result,error,submit,resetCommand};
}
