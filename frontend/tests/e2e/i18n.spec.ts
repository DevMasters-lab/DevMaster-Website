import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
const fixture=()=>JSON.parse(readFileSync('../.runtime/e2e.json','utf8'));
const pages=['home','privacy','terms'];
async function changeLanguage(page:import('@playwright/test').Page,locale:'km'|'en'){
 if(await page.locator('html').getAttribute('lang')!==locale)await page.locator('.language-trigger').click();
 await expect(page.getByRole('menu')).toHaveCount(0);
 await expect(page.locator('html')).toHaveAttribute('lang',locale);
 await expect.poll(async()=>{const response=await page.request.get('/api/v1/locale');return (await response.json()).data.locale;}).toBe(locale);
}
function totp(secret:string){let value=0,bits=0;const bytes:number[]=[];for(const letter of secret){value=(value<<5)|'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(letter);bits+=5;if(bits>=8){bits-=8;bytes.push((value>>>bits)&255);}}const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const digest=createHmac('sha1',Buffer.from(bytes)).update(counter).digest();return String((digest.readUInt32BE(digest[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
test('both public languages, SEO, Khmer fonts and state-preserving popup language switcher',async({page})=>{
 test.setTimeout(120000);await page.goto('/');await expect(page).toHaveURL(/\/km\/home$/);await expect(page.locator('html')).toHaveAttribute('lang','km');
 for(const locale of ['km','en']){for(const slug of pages){await page.goto('/'+locale+'/'+slug);await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('html')).toHaveAttribute('lang',locale);if(locale==='km')expect(await page.locator('h1').innerText()).toMatch(/[\u1780-\u17ff]/);}}
 const missing=await page.goto('/km/missing-localized-page');expect(missing?.status()).toBe(404);expect(await page.locator('h1').innerText()).toMatch(/[\u1780-\u17ff]/);
 await page.setViewportSize({width:390,height:844});await page.goto('/en/home?source=qa#brief');
 await page.getByRole('button',{name:/Invite Us to Bid/}).click();
 const dialog=page.getByRole('dialog',{name:'Invite DevMasters to Bid'});
 await dialog.getByLabel('Contact person *').fill('Original input — ខ្មែរ');const file=page.locator('dialog[open] input[type=file]');await file.setInputFiles({name:'original-name.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%%EOF')});
 await page.evaluate(()=>{document.body.dataset.switchProbe='retained';});
 await dialog.getByRole('button',{name:'Close project invitation'}).click();await changeLanguage(page,'km');
 await page.getByRole('button',{name:/អញ្ជើញយើងចូលរួមដេញថ្លៃ/}).click();
 const khmerDialog=page.getByRole('dialog',{name:'អញ្ជើញ DevMasters ចូលរួមដេញថ្លៃ'});
 await expect(khmerDialog.getByLabel('អ្នកទំនាក់ទំនង *')).toHaveValue('Original input — ខ្មែរ');expect(await file.evaluate((element:HTMLInputElement)=>element.files?.[0].name)).toBe('original-name.pdf');expect(await page.locator('body').getAttribute('data-switch-probe')).toBe('retained');await expect(page).toHaveURL(/\/km\/home\?source=qa#brief$/);
 await khmerDialog.getByRole('button',{name:'បិទការអញ្ជើញចូលរួមគម្រោង'}).click();await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','km');await expect(page.locator('link[rel=alternate][hreflang=en]')).toHaveAttribute('href',/\/en\/home$/);await expect(page.locator('html')).toHaveAttribute('dir','ltr');
 const fonts=await page.evaluate(async()=>{await document.fonts.load('400 16px "Noto Sans Khmer"','ភាសាខ្មែរ');return document.fonts.check('400 16px "Noto Sans Khmer"','ភាសាខ្មែរ');});expect(fonts).toBe(true);await expect(page.locator('.language-trigger')).toBeVisible();expect(await page.locator('body').evaluate(element=>element.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'../.runtime/khmer-public-mobile.png',fullPage:true});
});
test('Filament switches resource and role-form translations without losing pending inputs',async({page,context})=>{
 test.setTimeout(150000);await context.addCookies([{name:'devmasters_locale',value:'en',url:'http://localhost:3000'}]);const data=fixture();await page.goto('/admin/login');await page.getByLabel('Email address').fill(data.i18n_admin_email);await page.locator('input[type=password]').fill(data.i18n_admin_password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('textbox',{name:'Enter the 6-digit code from the authenticator app'})).toBeVisible();const code=totp(data.i18n_totp_secret);for(let index=0;index<6;index++)await page.locator('input.fi-one-time-code-input-digit').nth(index).fill(code[index]);await expect(page).toHaveURL(/\/admin$/);
 await page.locator('.fi-topbar .admin-language-toggle').click();await expect(page.locator('html')).toHaveAttribute('lang','km');await expect(page.getByRole('link',{name:'សំណើក្រុមហ៊ុន',exact:true})).toBeVisible();
 const resources=['users','roles','company-requests','documents','document-versions','notification-templates','public-pages','system-settings'];
 for(const resource of resources){await page.goto('/admin/'+resource);await expect(page.locator('h1')).toBeVisible();expect(await page.locator('h1').innerText()).toMatch(/[\u1780-\u17ff]/);}
 await page.screenshot({path:'../.runtime/khmer-admin.png',fullPage:true});
 await page.goto('/admin/roles');
 await page.getByRole('link',{name:'បង្កើតតួនាទីផ្ទាល់ខ្លួន',exact:true}).click();
 await expect(page).toHaveURL(/\/admin\/roles\/create$/);
 await page.getByRole('textbox',{name:/ឈ្មោះ/}).fill('Original unsaved role');
 await page.locator('.fi-topbar .admin-language-toggle').click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.getByRole('textbox',{name:'Name',exact:true})).toHaveValue('Original unsaved role');
 await expect(page.locator('h1')).toContainText('Role');
 await expect(page.locator('.fi-topbar .admin-language-toggle')).toHaveAttribute('aria-label','Switch to Khmer');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(page).toHaveURL(/\/admin\/roles$/);
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.screenshot({path:'../.runtime/bilingual-admin.png',fullPage:true});
});
