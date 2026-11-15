import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {HomeEngagementActions} from '../src/components/home-engagement-actions';
import {api,ApiError} from '../src/lib/api';

vi.mock('@/lib/api',async importOriginal=>{
  const actual=await importOriginal<typeof import('../src/lib/api')>();
  return {...actual,api:vi.fn()};
});
const dialogPrototype=HTMLDialogElement.prototype;
const originalShowModal=Object.getOwnPropertyDescriptor(dialogPrototype,'showModal');
const originalClose=Object.getOwnPropertyDescriptor(dialogPrototype,'close');
let originalBodyStyle:string|null;
let showModal:ReturnType<typeof vi.fn>;
const idempotencyKey='11111111-1111-4111-8111-111111111111';

beforeEach(()=>{
  window.history.replaceState(null,'','/en/home?source=hero#start');
  document.cookie='devmasters_locale=en;path=/';
  originalBodyStyle=document.body.getAttribute('style');
  document.body.style.removeProperty('overflow');document.body.style.removeProperty('padding-right');
  vi.mocked(api).mockReset();
  vi.spyOn(crypto,'randomUUID').mockReturnValue(idempotencyKey);
  vi.spyOn(document.documentElement,'clientWidth','get').mockReturnValue(window.innerWidth-16);
  // Supply native dialog lifecycle events that JSDOM does not implement.
  showModal=vi.fn(function(this:HTMLDialogElement){
    if(this.open)return;
    this.setAttribute('open','');
    this.querySelector<HTMLElement>('[autofocus],button,a[href]')?.focus();
  });
  Object.defineProperty(dialogPrototype,'showModal',{configurable:true,writable:true,value:showModal});
  Object.defineProperty(dialogPrototype,'close',{configurable:true,writable:true,value:vi.fn(function(this:HTMLDialogElement){
    if(!this.open)return;
    this.removeAttribute('open');this.dispatchEvent(new Event('close'));
  })});
});
afterEach(()=>{
  cleanup();vi.restoreAllMocks();
  if(originalShowModal)Object.defineProperty(dialogPrototype,'showModal',originalShowModal);
  else Reflect.deleteProperty(dialogPrototype,'showModal');
  if(originalClose)Object.defineProperty(dialogPrototype,'close',originalClose);
  else Reflect.deleteProperty(dialogPrototype,'close');
  if(originalBodyStyle===null)document.body.removeAttribute('style');
  else document.body.setAttribute('style',originalBodyStyle);
});

const copy={
  en:{invite:/Invite Us to Bid/,title:'Invite DevMasters to Bid',description:'Share your EOI, RFP or project invitation details below.',close:'Close project invitation',organization:'Organization & contact',opportunity:'Project opportunity',company:'Organization / company *',contact:'Contact person *',email:'Work email *',type:'Invitation type *',brief:'Project brief / requirements *',partner:/Partner With Our Experts/,expert:/Become an Expert/},
  km:{invite:/អញ្ជើញយើងចូលរួមដេញថ្លៃ/,title:'អញ្ជើញ DevMasters ចូលរួមដេញថ្លៃ',description:'ចែករំលែកព័ត៌មានលម្អិតអំពី EOI, RFP ឬការអញ្ជើញចូលរួមគម្រោងរបស់អ្នកនៅខាងក្រោម។',close:'បិទការអញ្ជើញចូលរួមគម្រោង',organization:'អង្គភាព និងព័ត៌មានទំនាក់ទំនង',opportunity:'ឱកាសចូលរួមគម្រោង',company:'អង្គភាព / ក្រុមហ៊ុន *',contact:'អ្នកទំនាក់ទំនង *',email:'អ៊ីមែលការងារ *',type:'ប្រភេទការអញ្ជើញ *',brief:'សេចក្តីសង្ខេបគម្រោង / តម្រូវការ *',partner:/សហការជាមួយអ្នកជំនាញរបស់យើង/,expert:/ចូលរួមជាអ្នកជំនាញ/},
};
function renderActions(locale:'en'|'km'='en'){
  window.history.replaceState(null,'',`/${locale}/home?source=hero#start`);
  return render(<LocaleProvider initialLocale={locale}><HomeEngagementActions/></LocaleProvider>);
}
async function openDialog(locale:'en'|'km'='en'){
  const trigger=screen.getByRole('button',{name:copy[locale].invite});
  act(()=>trigger.focus());fireEvent.click(trigger);
  const dialog=await screen.findByRole('dialog',{name:copy[locale].title});
  await within(dialog).findByLabelText(copy[locale].company);
  return {trigger,dialog};
}
function fillRequired(dialog:HTMLElement,type='RFP'){
  const values={submitted_company_name:'Acme Digital',submitted_contact_name:'Sok Dara',submitted_email:'team@example.test',requirements:'We need technical specialists to deliver a secure public service platform.'};
  for(const [label,value] of [['Organization / company *',values.submitted_company_name],['Contact person *',values.submitted_contact_name],['Work email *',values.submitted_email],['Project brief / requirements *',values.requirements]])fireEvent.change(within(dialog).getByLabelText(label,{exact:false}),{target:{value}});
  fireEvent.change(within(dialog).getByRole('combobox',{name:/^Invitation type/}),{target:{value:type}});
  return values;
}
function uploadInput(dialog:HTMLElement){return within(dialog).getByLabelText('TOR / RFP document (optional)') as HTMLInputElement;}

describe('homepage bid invitation dialog',()=>{
  it.each(['en','km'] as const)('opens the existing invitation form in %s without navigation or an API request',async locale=>{
    renderActions(locale);const href=location.href;
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(copy[locale].company)).not.toBeInTheDocument();
    const {trigger,dialog}=await openDialog(locale);
    expect(location.href).toBe(href);
    expect(trigger).toHaveAttribute('type','button');expect(trigger).toHaveAttribute('aria-haspopup','dialog');
    expect(trigger).toHaveAttribute('aria-controls',dialog.id);
    expect(dialog).toHaveAccessibleDescription(copy[locale].description);
    expect(within(dialog).getByRole('group',{name:new RegExp(copy[locale].organization)})).toBeInTheDocument();
    expect(within(dialog).getByRole('group',{name:new RegExp(copy[locale].opportunity)})).toBeInTheDocument();
    for(const label of [copy[locale].contact,copy[locale].email,copy[locale].brief])expect(within(dialog).getByLabelText(label)).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox',{name:copy[locale].type})).toHaveValue('');
    expect([...within(dialog).getByRole('combobox',{name:copy[locale].type}).querySelectorAll('option')].map(option=>option.value)).toEqual(['','EOI','RFP','RFQ','Tender','Project invitation','Other']);
    expect(dialog.querySelector('input[name=title],input[name=submitted_phone],input[name=expected_start_on],input[name=expected_end_on]')).toBeNull();
    expect(within(dialog).getByRole('heading',{name:copy[locale].title})).toHaveFocus();
    const close=within(dialog).getByRole('button',{name:copy[locale].close});
    expect(close).toBeEnabled();expect(close.tabIndex).toBe(0);
    expect(screen.getByRole('button',{name:copy[locale].partner})).toHaveAttribute('aria-haspopup','dialog');
    expect(screen.getByRole('button',{name:copy[locale].expert})).toHaveAttribute('aria-haspopup','dialog');
    expect(api).not.toHaveBeenCalled();
  });
  it('preserves the draft and attachment across closing and reopening and restores focus and scroll styles',async()=>{
    document.body.style.overflow='auto';document.body.style.paddingRight='9px';
    const view=renderActions();const {trigger,dialog}=await openDialog();
    const company=within(dialog).getByLabelText('Organization / company *');
    const brief=within(dialog).getByLabelText('Project brief / requirements *');
    fireEvent.change(company,{target:{value:'Draft organization'}});fireEvent.change(brief,{target:{value:'Unsubmitted project draft that must survive closing.'}});
    fireEvent.change(within(dialog).getByRole('combobox',{name:'Invitation type *'}),{target:{value:'Tender'}});
    const file=new File(['private draft'],'brief.pdf',{type:'application/pdf'});
    const upload=uploadInput(dialog);
    fireEvent.change(upload,{target:{files:[file]}});
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(within(dialog).getByRole('button',{name:'Close project invitation'}));
    await waitFor(()=>expect(dialog).not.toHaveAttribute('open'));
    expect(trigger).toHaveFocus();expect(document.body.style.overflow).toBe('auto');expect(document.body.style.paddingRight).toBe('9px');
    fireEvent.click(trigger);
    await waitFor(()=>expect(dialog).toHaveAttribute('open'));
    expect(company).toHaveValue('Draft organization');expect(brief).toHaveValue('Unsubmitted project draft that must survive closing.');expect(within(dialog).getByRole('combobox',{name:'Invitation type *'})).toHaveValue('Tender');expect(upload.files?.[0]).toBe(file);
    expect(showModal).toHaveBeenCalledTimes(2);expect(api).not.toHaveBeenCalled();
    view.unmount();expect(document.body.style.overflow).toBe('auto');expect(document.body.style.paddingRight).toBe('9px');
  });
  it('dismisses on Escape or an outside backdrop click and returns focus without leaving the homepage',async()=>{
    renderActions();const href=location.href;const {trigger,dialog}=await openDialog();
    const cancel=new Event('cancel',{cancelable:true});fireEvent(dialog,cancel);
    expect(cancel.defaultPrevented).toBe(true);expect(dialog).not.toHaveAttribute('open');expect(trigger).toHaveFocus();
    fireEvent.click(trigger);await waitFor(()=>expect(dialog).toHaveAttribute('open'));
    vi.spyOn(dialog,'getBoundingClientRect').mockReturnValue(new DOMRect(100,100,500,400));
    fireEvent.click(within(dialog).getByRole('heading',{name:'Invite DevMasters to Bid'}));
    fireEvent.click(dialog,{clientX:300,clientY:300});expect(dialog).toHaveAttribute('open');
    fireEvent.click(dialog,{clientX:20,clientY:20});expect(dialog).not.toHaveAttribute('open');expect(trigger).toHaveFocus();
    expect(location.href).toBe(href);expect(api).not.toHaveBeenCalled();
  });
  it('keeps invalid submissions in the dialog and displays the existing field validation',async()=>{
    renderActions();const {dialog}=await openDialog();
    fireEvent.click(within(dialog).getByRole('button',{name:'Send invitation'}));
    expect(await within(dialog).findByText('Enter your company name.')).toBeInTheDocument();
    expect(dialog).toHaveAttribute('open');expect(within(dialog).getByLabelText(/^Organization \/ company \*/)).toHaveAttribute('aria-invalid','true');
    expect(await within(dialog).findByText('Choose an invitation type.')).toBeInTheDocument();
    fillRequired(dialog);
    fireEvent.change(within(dialog).getByLabelText('TOR / RFP document link (optional)'),{target:{value:'javascript:alert(1)'}});
    fireEvent.click(within(dialog).getByRole('button',{name:'Send invitation'}));
    expect(await within(dialog).findByText('Enter a valid http:// or https:// URL.')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
  it('submits the existing INVITE payload and attachment through the mocked API and shows success in place',async()=>{
    vi.mocked(api).mockResolvedValueOnce({data:{reference_no:'DM-RQ-POPUP-001',message:'Received.',message_code:'REQUEST_RECEIVED'}});
    renderActions();const href=location.href;const {dialog}=await openDialog();const required=fillRequired(dialog);
    fireEvent.change(within(dialog).getByLabelText(/^Submission deadline/),{target:{value:'2027-02-15'}});
    fireEvent.change(within(dialog).getByLabelText('TOR / RFP document link (optional)'),{target:{value:'https://documents.example.test/rfp'}});
    const file=new File(['private project brief'],'proposal.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    fireEvent.drop(uploadInput(dialog).parentElement!,{dataTransfer:{files:[file]}});
    expect(api).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button',{name:'Send invitation'}));
    await within(dialog).findByText('DM-RQ-POPUP-001');
    const success=within(dialog).getByRole('status');expect(success).toHaveTextContent('Your request has been received. DevMasters will review it and follow up.');
    expect(api).toHaveBeenCalledOnce();
    const [path,options]=vi.mocked(api).mock.calls[0];expect(path).toBe('/company-requests');expect(options?.method).toBe('POST');
    expect(new Headers(options?.headers).get('Idempotency-Key')).toBe(idempotencyKey);
    const payload=options?.body as FormData;expect(payload).toBeInstanceOf(FormData);
    const fields=Object.fromEntries([...payload.entries()].filter(([key])=>key!=='attachments[]'));
    expect(fields).toEqual({request_type:'INVITE_US_TO_BID',submitted_company_name:required.submitted_company_name,submitted_contact_name:required.submitted_contact_name,submitted_email:required.submitted_email,title:'Request for Proposal (RFP) — Acme Digital',requirements:'Invitation type: Request for Proposal (RFP)\nTOR / RFP document link: https://documents.example.test/rfp\n\nProject brief / requirements:\n'+required.requirements,response_due_at:'2027-02-15T16:59:59.000Z'});
    const attachments=payload.getAll('attachments[]') as File[];expect(attachments).toHaveLength(1);expect(attachments[0].name).toBe('proposal.docx');expect(attachments[0].size).toBe(file.size);
    expect(dialog).toHaveAttribute('open');expect(location.href).toBe(href);
  });
  it('submits required invitation details without optional uploads, links or dates',async()=>{
    vi.mocked(api).mockResolvedValueOnce({data:{reference_no:'DM-RQ-MINIMAL-001',message:'Received.',message_code:'REQUEST_RECEIVED'}});
    renderActions();const {dialog}=await openDialog();const required=fillRequired(dialog,'EOI');
    fireEvent.click(within(dialog).getByRole('button',{name:'Send invitation'}));
    await within(dialog).findByText('DM-RQ-MINIMAL-001');
    const payload=vi.mocked(api).mock.calls[0][1]?.body as FormData;
    expect(Object.fromEntries(payload.entries())).toEqual({request_type:'INVITE_US_TO_BID',submitted_company_name:required.submitted_company_name,submitted_contact_name:required.submitted_contact_name,submitted_email:required.submitted_email,title:'Expression of Interest (EOI) — Acme Digital',requirements:'Invitation type: Expression of Interest (EOI)\n\nProject brief / requirements:\n'+required.requirements});
  });
  it('supports Browse and rejects invalid dropped documents without a premature request',async()=>{
    renderActions();const {dialog}=await openDialog();fillRequired(dialog);
    const upload=uploadInput(dialog);const dropZone=upload.parentElement!;
    const click=vi.spyOn(upload,'click');fireEvent.click(within(dropZone).getByRole('button',{name:'Browse files'}));expect(click).toHaveBeenCalledOnce();
    const pdf=new File(['%PDF-1.4'],'brief.pdf',{type:'application/pdf'});
    const invalid=[
      {files:[new File(['legacy document'],'brief.doc',{type:'application/msword'})],message:'Choose a PDF or DOCX document.'},
      {files:[pdf,pdf],message:'Choose one PDF or DOCX document.'},
      {files:[new File([new Uint8Array(10*1024*1024+1)],'large.pdf',{type:'application/pdf'})],message:'Choose a document no larger than 10 MB.'},
    ];
    for(const candidate of invalid){
      fireEvent.drop(dropZone,{dataTransfer:{files:candidate.files}});
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(candidate.message);
      await act(async()=>{fireEvent.click(within(dialog).getByRole('button',{name:'Send invitation'}));});
      expect(api).not.toHaveBeenCalled();
      fireEvent.click(within(dialog).getByRole('button',{name:'Clear selection'}));
      expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
    }
    fireEvent.change(upload,{target:{files:[pdf]}});
    expect(within(dialog).getByRole('status')).toHaveTextContent('brief.pdf');
    fireEvent.click(within(dialog).getByRole('button',{name:'Remove document'}));
    expect(within(dialog).queryByRole('status')).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
  it('keeps the draft open when the existing API returns field errors',async()=>{
    vi.mocked(api).mockRejectedValueOnce(new ApiError('Please check your request.',422,{submitted_email:['This email address is unavailable.']}));
    renderActions();const {dialog}=await openDialog();fillRequired(dialog);
    fireEvent.click(within(dialog).getByRole('button',{name:'Send invitation'}));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Please check your request.');
    expect(within(dialog).getByText('This email address is unavailable.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Work email \*/)).toHaveValue('team@example.test');
    expect(dialog).toHaveAttribute('open');
  });
});
