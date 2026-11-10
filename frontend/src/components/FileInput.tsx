'use client';
import {useEffect,useRef,useState,type InputHTMLAttributes} from 'react';
import {useText} from '@/i18n/provider';
/** Keep the native file input and FormData semantics, with translated visible text. */
export function FileInput(props:InputHTMLAttributes<HTMLInputElement>){
 const t=useText();const input=useRef<HTMLInputElement>(null);const [names,setNames]=useState<string[]>([]);
 useEffect(()=>{const form=input.current?.form;const reset=()=>setNames([]);form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[]);
 return <span className="localized-file"><span className="localized-file-button" aria-hidden="true">{t(props.multiple?'Choose files':'Choose file')}</span><span className="localized-file-names" aria-hidden="true">{names.length?names.join(', '):t('No file selected')}</span><input {...props} ref={input} type="file" onChange={event=>{setNames(Array.from(event.target.files||[]).map(file=>file.name));props.onChange?.(event);}}/></span>;
}
