export const locales=['km','en'] as const;
export type Locale=typeof locales[number];
export const supported=(value:unknown):value is Locale=>value==='km'||value==='en';
export function stripLocale(path:string){return path.replace(/^\/(km|en)(?=\/|$)/,'')||'/';}
export function localePath(path:string,locale:Locale){if(!path.startsWith('/')||/^\/(api|admin|sanctum|livewire)(\/|$)/.test(path))return path;return '/'+locale+(stripLocale(path)==='/'?'':stripLocale(path));}
