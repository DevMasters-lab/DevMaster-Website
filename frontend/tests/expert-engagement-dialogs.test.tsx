import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {LocaleProvider} from '../src/i18n/provider';
import {HomeEngagementActions} from '../src/components/home-engagement-actions';
import {api} from '../src/lib/api';
import {ApplicationForm} from '../src/components/intake-form';

vi.mock('@/lib/api',async importOriginal=>{
  const actual=await importOriginal<typeof import('../src/lib/api')>();
  return {...actual,api:vi.fn()};
});
const prototype=HTMLDialogElement.prototype;
const originalShowModal=Object.getOwnPropertyDescriptor(prototype,'showModal');
const originalClose=Object.getOwnPropertyDescriptor(prototype,'close');
const consent={data:{consent:{version:'2026-11',text:'I consent to this expert application and its review.'}}};
let clients:QueryClient[];
let originalBodyStyle:string|null;
let postResult:unknown;

beforeEach(()=>{
  clients=[];postResult=null;vi.mocked(api).mockReset();
  window.history.replaceState(null,'','/en/home?source=cards#connect');document.cookie='devmasters_locale=en;path=/';
  originalBodyStyle=document.body.getAttribute('style');
  window.history.replaceState(null,'','/en/home?source=cards#connect');
  document.cookie='devmasters_locale=en;path=/';
  vi.spyOn(document.documentElement,'clientWidth','get').mockReturnValue(window.innerWidth-16);
  vi.mocked(api).mockImplementation(async <T,>(path:string)=>{
    if(path==='/reference-data')return consent as T;
    if(postResult&&(path==='/company-requests'||path==='/expert-applications'))return postResult as T;
    throw new Error(`Unexpected mocked API request: ${path}`);
  });
  Object.defineProperty(prototype,'showModal',{configurable:true,writable:true,value:vi.fn(function(this:HTMLDialogElement){
    if(this.open)return;this.setAttribute('open','');
    this.querySelector<HTMLElement>('[autofocus],button,a[href]')?.focus();
  })});
  Object.defineProperty(prototype,'close',{configurable:true,writable:true,value:vi.fn(function(this:HTMLDialogElement){
    if(!this.open)return;this.removeAttribute('open');this.dispatchEvent(new Event('close'));
  })});
});
afterEach(()=>{
  cleanup();clients.forEach(client=>client.clear());vi.restoreAllMocks();
  if(originalShowModal)Object.defineProperty(prototype,'showModal',originalShowModal);else Reflect.deleteProperty(prototype,'showModal');
  if(originalClose)Object.defineProperty(prototype,'close',originalClose);else Reflect.deleteProperty(prototype,'close');
  if(originalBodyStyle===null)document.body.removeAttribute('style');else document.body.setAttribute('style',originalBodyStyle);
});
function renderActions(locale:'en'|'km'='en'){
  window.history.replaceState(null,'',`/${locale}/home?source=cards#connect`);
  document.cookie=`devmasters_locale=${locale};path=/`;
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});clients.push(client);
  return render(<LocaleProvider initialLocale={locale}><QueryClientProvider client={client}><HomeEngagementActions/></QueryClientProvider></LocaleProvider>);
}

function renderApplication(){
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});clients.push(client);
  render(<LocaleProvider initialLocale="en"><QueryClientProvider client={client}><section aria-label="Existing expert application"><ApplicationForm variant="dialog"/></section></QueryClientProvider></LocaleProvider>);
  return {form:screen.getByRole('region',{name:'Existing expert application'})};
}

const labels={
  en:{partner:'Partner With Our Experts',expert:'Become an Expert',partnerClose:'Close expert partnership',expertClose:'Close expert application',company:'Company / organization *',name:'Full name *'},
  km:{partner:'សហការជាមួយអ្នកជំនាញរបស់យើង',expert:'ចូលរួមជាអ្នកជំនាញ',partnerClose:'បិទការសហការជាមួយអ្នកជំនាញ',expertClose:'បិទទម្រង់ដាក់ពាក្យជាអ្នកជំនាញ',company:'ក្រុមហ៊ុន / អង្គភាព *',name:'ឈ្មោះពេញ *'},
};
async function openDialog(kind:'partner'|'expert',locale:'en'|'km'='en'){
  const trigger=screen.getByRole('button',{name:new RegExp(labels[locale][kind])});
  act(()=>trigger.focus());fireEvent.click(trigger);
  const dialog=await screen.findByRole('dialog',{name:labels[locale][kind]});
  await within(dialog).findByLabelText(kind==='partner'?labels[locale].company:labels[locale].name);

  return {trigger,dialog};
}
function closeDialog(dialog:HTMLElement,kind:'partner'|'expert',locale:'en'|'km'='en'){
  fireEvent.click(within(dialog).getByRole('button',{name:labels[locale][kind==='partner'?'partnerClose':'expertClose']}));
}
function roles(dialog:HTMLElement){return within(dialog).getAllByRole('group',{name:/^Specialist \d/});}
function fillContact(dialog:HTMLElement){
  const fields={submitted_company_name:'Collaboration Studio',submitted_contact_name:'Sok Dara',submitted_email:'projects@example.test',submitted_phone:'+85512345678'};
  for(const [label,value] of [['Company / organization *',fields.submitted_company_name],['Your name *',fields.submitted_contact_name],['Work email *',fields.submitted_email],['Phone number',fields.submitted_phone]])fireEvent.change(within(dialog).getByLabelText(label,{exact:false}),{target:{value}});
  return fields;
}
function fillRole(row:HTMLElement,specialization:string,count:number,requirements:string){
  fireEvent.change(within(row).getByRole('combobox',{name:/^Specialization/}),{target:{value:specialization}});
  fireEvent.change(within(row).getByRole('spinbutton',{name:/^Number of specialists/}),{target:{value:String(count)}});
  fireEvent.change(within(row).getByRole('textbox',{name:/^Requirements for this role/}),{target:{value:requirements}});
}

describe('expert engagement dialogs',()=>{
  it.each(['en','km'] as const)('opens both localized expert dialogs without changing the homepage URL in %s',async locale=>{
    renderActions(locale);const href=location.href;
    const partnership=await openDialog('partner',locale);
    expect(location.href).toBe(href);
    expect(partnership.dialog).toHaveAttribute('id',partnership.trigger.getAttribute('aria-controls'));
    expect(partnership.trigger).toHaveAttribute('aria-haspopup','dialog');
    expect(within(partnership.dialog).getByRole('heading',{name:labels[locale].partner})).toHaveFocus();
    expect(api).not.toHaveBeenCalled();
    closeDialog(partnership.dialog,'partner',locale);
    expect(partnership.trigger).toHaveFocus();expect(partnership.dialog).not.toHaveAttribute('open');
    const application=await openDialog('expert',locale);
    expect(location.href).toBe(href);
    expect(application.dialog).toHaveAttribute('id',application.trigger.getAttribute('aria-controls'));
    expect(within(application.dialog).getByRole('heading',{name:labels[locale].expert})).toHaveFocus();
    expect(api).not.toHaveBeenCalled();
    closeDialog(application.dialog,'expert',locale);
    expect(application.trigger).toHaveFocus();expect(application.dialog).not.toHaveAttribute('open');
  });
  it('validates specialist rows and preserves the remaining row when another role is removed',async()=>{
    renderActions();const {dialog}=await openDialog('partner');
    expect(roles(dialog)).toHaveLength(1);
    expect(within(dialog).getByRole('button',{name:'Remove role 1'})).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button',{name:'Send your request'}));
    expect(await within(dialog).findByText('Choose a specialization.')).toBeInTheDocument();
    expect(dialog).toHaveAttribute('open');expect(api).not.toHaveBeenCalled();
    fillContact(dialog);
    fillRole(roles(dialog)[0],'Frontend Engineer',0,'Build accessible, responsive user interfaces.');
    fireEvent.click(within(dialog).getByRole('button',{name:'Send your request'}));
    expect(await within(dialog).findByText('Enter between 1 and 100 specialists.')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button',{name:'Add another role'}));
    expect(roles(dialog)).toHaveLength(2);
    fillRole(roles(dialog)[1],'Backend Engineer',3,'Build secure service integrations and reliable APIs.');
    fireEvent.click(within(dialog).getByRole('button',{name:'Remove role 1'}));
    expect(roles(dialog)).toHaveLength(1);
    const remaining=roles(dialog)[0];
    expect(within(remaining).getByRole('combobox',{name:/^Specialization/})).toHaveValue('Backend Engineer');
    expect(within(remaining).getByRole('spinbutton',{name:/^Number of specialists/})).toHaveValue(3);
    expect(within(remaining).getByRole('textbox',{name:/^Requirements for this role/})).toHaveValue('Build secure service integrations and reliable APIs.');
    expect(within(dialog).getByRole('button',{name:'Remove role 1'})).toBeDisabled();
  });
  it('submits both specialist requests and collaboration details through the existing mocked HIRE API',async()=>{
    postResult={data:{reference_no:'DM-RQ-EXPERTS-001',message:'Received.',message_code:'REQUEST_RECEIVED'}};
    renderActions();const href=location.href;const {dialog}=await openDialog('partner');const contact=fillContact(dialog);
    fillRole(roles(dialog)[0],'Frontend Engineer',2,'  Build accessible, responsive user interfaces.  ');
    fireEvent.click(within(dialog).getByRole('button',{name:'Add another role'}));
    fillRole(roles(dialog)[1],'Cybersecurity Specialist',1,'Review application security and harden the deployment.');
    fireEvent.change(within(dialog).getByRole('combobox',{name:'Collaboration type *'}),{target:{value:'joint-proposal'}});
    fireEvent.change(within(dialog).getByLabelText('Expected start date'),{target:{value:'2027-02-01'}});
    fireEvent.click(within(dialog).getByRole('button',{name:'Send your request'}));
    expect(await within(dialog).findByRole('status')).toHaveTextContent('DM-RQ-EXPERTS-001');
    expect(api).toHaveBeenCalledOnce();
    const [path,options]=vi.mocked(api).mock.calls[0];
    expect(path).toBe('/company-requests');expect(options?.method).toBe('POST');
    expect(new Headers(options?.headers).get('Idempotency-Key')).toBeTruthy();
    const payload=options?.body as FormData;
    expect(Object.fromEntries(payload.entries())).toEqual({request_type:'HIRE_OUR_TEAM',title:'Expert collaboration request',...contact,expected_start_on:'2027-02-01',requirements:'Collaboration type: Joint proposal\n\nSpecialists requested:\n1. Frontend Engineer\nCount: 2\nRequirements:\nBuild accessible, responsive user interfaces.\n\n2. Cybersecurity Specialist\nCount: 1\nRequirements:\nReview application security and harden the deployment.\n\nExpected start date: 2027-02-01'});
    expect(dialog).toHaveAttribute('open');expect(location.href).toBe(href);
  });
  it('blocks malformed consent and restores the real checkbox after a successful retry',async()=>{
    vi.mocked(api).mockResolvedValueOnce({data:{consent:{version:'',text:''}}});
    const {form}=renderApplication();
    await within(form).findByText(/Unable to load consent information/);
    const name=within(form).getByLabelText('Full name *');
    fireEvent.change(name,{target:{value:'Preserved retry draft'}});
    expect(within(form).queryByRole('checkbox')).not.toBeInTheDocument();
    const submit=within(form).getByRole('button',{name:'Submit application'});
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(vi.mocked(api).mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(0);
    fireEvent.click(within(form).getByRole('button',{name:'Try again'}));
    expect(await within(form).findByRole('checkbox')).toHaveAccessibleName(new RegExp(consent.data.consent.text));
    expect(submit).toBeEnabled();
    expect(form).toHaveTextContent(consent.data.consent.version);
    expect(name).toHaveValue('Preserved retry draft');
    expect(vi.mocked(api).mock.calls.filter(([path])=>path==='/reference-data')).toHaveLength(2);
    expect(vi.mocked(api).mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(0);
  });
  it('requires a CV and consent, then preserves optional expert details in the existing application payload',async()=>{
    const {form}=renderApplication();const href=location.href;
    fireEvent.change(within(form).getByLabelText('Full name *'),{target:{value:'Sok Expert'}});
    fireEvent.change(within(form).getByLabelText('Email address *'),{target:{value:'expert@example.test'}});
    fireEvent.change(within(form).getByRole('combobox',{name:'Primary specialization *'}),{target:{value:'Other'}});
    fireEvent.change(within(form).getByLabelText('Professional title *'),{target:{value:'GIS automation specialist'}});
    const biography='I build reliable integrations and accessible digital services.';
    fireEvent.change(within(form).getByLabelText('Your experience & expertise *'),{target:{value:biography}});
    const consentInput=await within(form).findByRole('checkbox');
    fireEvent.click(consentInput);
    fireEvent.click(within(form).getByRole('button',{name:'Submit application'}));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Please attach a PDF or DOCX CV, 10 MB or smaller.');
    expect(vi.mocked(api).mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(0);
    const cv=new File(['%PDF-1.4\nprivate CV'],'expert-cv.pdf',{type:'application/pdf'});
    fireEvent.change(within(form).getByLabelText(/^Your CV \*/,{selector:'input'}),{target:{files:[cv]}});
    fireEvent.click(consentInput);
    fireEvent.click(within(form).getByRole('button',{name:'Submit application'}));
    expect(await within(form).findByText('Please confirm your consent to apply.')).toBeInTheDocument();
    expect(vi.mocked(api).mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(0);
    fireEvent.change(within(form).getByRole('combobox',{name:'Years of experience'}),{target:{value:'3–5 years'}});
    fireEvent.change(within(form).getByLabelText('Portfolio or LinkedIn URL'),{target:{value:'https://portfolio.example.test/sok'}});
    fireEvent.click(consentInput);
    postResult={data:{reference_no:'DM-EX-POPUP-001',message:'Received.',message_code:'APPLICATION_RECEIVED'}};
    fireEvent.click(within(form).getByRole('button',{name:'Submit application'}));
    expect(await within(form).findByRole('status')).toHaveTextContent('DM-EX-POPUP-001');
    const posts=vi.mocked(api).mock.calls.filter(([,options])=>options?.method==='POST');
    expect(posts).toHaveLength(1);expect(posts[0][0]).toBe('/expert-applications');
    const payload=posts[0][1]?.body as FormData;
    expect(Object.fromEntries([...payload.entries()].filter(([key])=>key!=='cv'))).toEqual({full_name:'Sok Expert',contact_email:'expert@example.test',contact_phone:'',location_text:'',professional_title:'GIS automation specialist',biography:biography+'\n\nAdditional experience details:\nYears of experience: 3–5 years\nPortfolio / LinkedIn: https://portfolio.example.test/sok',consent:'1',consent_version:consent.data.consent.version});
    const uploaded=payload.get('cv') as File;expect(uploaded.name).toBe('expert-cv.pdf');expect(uploaded.size).toBe(cv.size);
    expect(form).toBeInTheDocument();expect(location.href).toBe(href);
  });
  it('keeps bid and partnership drafts while clearing the closed signup preview',async()=>{
    document.body.style.overflow='auto';
    renderActions();const href=location.href;
    const partnership=await openDialog('partner');
    fireEvent.change(within(partnership.dialog).getByLabelText('Company / organization *'),{target:{value:'Partnership Draft'}});
    fillRole(roles(partnership.dialog)[0],'Network Engineer',2,'Design and maintain reliable network connectivity.');
    closeDialog(partnership.dialog,'partner');expect(partnership.trigger).toHaveFocus();
    const application=await openDialog('expert');
    fireEvent.change(within(application.dialog).getByLabelText('Full name *'),{target:{value:'Expert Draft'}});
    closeDialog(application.dialog,'expert');expect(application.trigger).toHaveFocus();
    const bidTrigger=screen.getByRole('button',{name:/Invite Us to Bid/});
    fireEvent.click(bidTrigger);const bid=await screen.findByRole('dialog',{name:'Invite DevMasters to Bid'});
    fireEvent.change(await within(bid).findByLabelText('Organization / company *'),{target:{value:'Bid Draft'}});
    fireEvent.change(within(bid).getByLabelText('Project brief / requirements *'),{target:{value:'Bid draft requirements remain independent of the other dialogs.'}});
    fireEvent.click(within(bid).getByRole('button',{name:'Close project invitation'}));expect(bidTrigger).toHaveFocus();
    await openDialog('partner');
    expect(within(partnership.dialog).getByLabelText('Company / organization *')).toHaveValue('Partnership Draft');
    expect(within(roles(partnership.dialog)[0]).getByRole('combobox',{name:/^Specialization/})).toHaveValue('Network Engineer');
    closeDialog(partnership.dialog,'partner');
    await openDialog('expert');
    expect(within(application.dialog).getByLabelText('Full name *')).toHaveValue('');
    closeDialog(application.dialog,'expert');
    fireEvent.click(bidTrigger);await waitFor(()=>expect(bid).toHaveAttribute('open'));
    expect(within(bid).getByLabelText('Organization / company *')).toHaveValue('Bid Draft');
    expect(within(bid).getByLabelText('Project brief / requirements *')).toHaveValue('Bid draft requirements remain independent of the other dialogs.');
    fireEvent.click(within(bid).getByRole('button',{name:'Close project invitation'}));
    expect(document.body.style.overflow).toBe('auto');expect(location.href).toBe(href);
    expect(vi.mocked(api).mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(0);
  });

});
