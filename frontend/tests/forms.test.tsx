import React from 'react';
import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {CompanyForm} from '../src/components/intake-form';
import {companySchema,applicationSchema} from '../src/lib/validation';
vi.mock('@/lib/api',async()=>{const actual=await vi.importActual<typeof import('../src/lib/api')>('../src/lib/api');return {...actual,api:vi.fn()};});
describe('public submission forms',()=>{
 it('shows validation without pretending a request was sent',async()=>{render(<LocaleProvider initialLocale="en"><CompanyForm type="HIRE_OUR_TEAM"/></LocaleProvider>);fireEvent.click(screen.getByRole('button',{name:/send your request/i}));expect(await screen.findByText('Enter your company name.')).toBeInTheDocument();expect(screen.queryByText(/DM-RQ/)).not.toBeInTheDocument();});
 it('rejects reversed date intervals',()=>{const r=companySchema.safeParse({request_type:'HIRE_OUR_TEAM',submitted_company_name:'Company',submitted_contact_name:'Contact',submitted_email:'person@example.com',title:'New project',requirements:'A requirement long enough to validate.',expected_start_on:'2026-12-10',expected_end_on:'2026-12-01'});expect(r.success).toBe(false);});
 it('requires explicit expert consent',()=>{const r=applicationSchema.safeParse({full_name:'Applicant',contact_email:'a@example.com',professional_title:'Engineer',biography:'A detailed professional biography.',consent:false});expect(r.success).toBe(false);});
});
