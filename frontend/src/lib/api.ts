import english from '../../messages/en.json';
import khmer from '../../messages/km.json';
export class ApiError extends Error { constructor(message:string,public status:number,public errors:Record<string,string[]>={},public code=''){super(message);{Object.defineProperty(this,'message',{get:()=>{const locale=typeof document!=='undefined'&&document.cookie.includes('devmasters_locale=km')?'km':'en';const catalogue=locale==='km'?khmer:english;const source=Object.entries(english.ui).find(([,value])=>value===message)?.[0];return (catalogue.api as Record<string,string>)[code]||(source?(catalogue.ui as Record<string,string>)[source]:message);}});}} }
let csrfPromise:Promise<void>|null=null;
export async function csrf():Promise<void>{
 if(!csrfPromise)csrfPromise=fetch('/sanctum/csrf-cookie',{credentials:'include',headers:{Accept:'application/json'}}).then(r=>{if(!r.ok)throw new ApiError('Unable to establish a secure session.',r.status);}).finally(()=>{csrfPromise=null;});return csrfPromise;
}
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
 const method=(options.method||'GET').toUpperCase();const headers=new Headers(options.headers);headers.set('Accept','application/json');const locale=document.cookie.split('; ').find(value=>value.startsWith('devmasters_locale='))?.split('=')[1];if(locale==='km'||locale==='en')headers.set('X-Locale',locale);
 if(method!=='GET'){await csrf();const token=document.cookie.split('; ').find(c=>c.startsWith('XSRF-TOKEN='))?.split('=').slice(1).join('=');if(token)headers.set('X-XSRF-TOKEN',decodeURIComponent(token));if(options.body&&!(options.body instanceof FormData))headers.set('Content-Type','application/json');}
 let r:Response;try{r=await fetch(`/api/v1${path}`,{...options,headers,credentials:'include',cache:'no-store'});}catch{throw new ApiError('Cannot connect to DevMasters. Please try again shortly.',0);}
 const body=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new ApiError(body?.message||'The request could not be completed.',r.status,body?.errors||{},body?.code||'');if((path==='/auth/login'||path==='/auth/me')&&body?.data?.preferred_locale){window.dispatchEvent(new CustomEvent('devmasters:preferred-locale',{detail:body.data.preferred_locale}));}return body as T;
}
export const commandHeaders=(key=crypto.randomUUID())=>({'Idempotency-Key':key});
