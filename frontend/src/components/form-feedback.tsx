'use client';

import {CheckCircle2} from 'lucide-react';
import {useText} from '@/i18n/provider';

export function FormSuccess({result}:{result:{reference_no:string;message:string;message_code?:string}}){const t=useText();return <div className="success-box" role="status"><CheckCircle2 size={28}/><h2>{""}{t("Thank you. You’re on our radar.")}{""}</h2><p>{result.message_code==='REQUEST_RECEIVED'?t('Your request has been received. DevMasters will review it and follow up.'):result.message_code==='APPLICATION_RECEIVED'?t('Application received. Portal access becomes available after approval and account activation.'):result.message}</p><strong>{result.reference_no}</strong><p>{""}{t("Keep this reference for future correspondence. Attachments are held privately and checked before use.")}{""}</p></div>;}
export function ErrorNotice({message}:{message:string}){const t=useText();return message?<div role="alert" className="error-box">{t(message)}</div>:null;}
