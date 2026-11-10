'use client';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import {useLanguage} from '@/i18n/provider';
import {useEffect,useState} from 'react';
export function Providers({children}:{children:React.ReactNode}){const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:1,refetchOnWindowFocus:false}}}));const {locale}=useLanguage();useEffect(()=>{void client.invalidateQueries({predicate:query=>query.queryKey[0]!=='me'});},[locale,client]);return <QueryClientProvider client={client}>{children}</QueryClientProvider>;}
