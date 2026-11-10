'use client';
import {useEffect,useRef} from 'react';

export function Modal({children,labelledBy,onDismiss,busy=false}:{children:React.ReactNode;labelledBy:string;onDismiss:()=>void;busy?:boolean}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const element=dialog.current;if(!element)return;const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';element.showModal();return()=>{element.close();document.body.style.overflow=overflow;previous?.focus();};},[]);
 return <dialog className="modal native-modal" ref={dialog} aria-labelledby={labelledBy} onCancel={event=>{event.preventDefault();if(!busy)onDismiss();}}>{children}</dialog>;
}
