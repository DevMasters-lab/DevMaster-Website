import React from 'react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {LocaleProvider,useText,useStatus,useDate} from '../src/i18n/provider';
import {LanguageSwitcher} from '../src/components/LanguageSwitcher';
import {NativeValidation} from '../src/i18n/NativeValidation';
import {CompanyForm} from '../src/components/intake-form';
import {localePath,stripLocale,supported} from '../src/i18n/config';
import {api} from '../src/lib/api';
vi.mock('@/lib/api',()=>({api:vi.fn().mockResolvedValue({data:{locale:'km'}}),ApiError:class extends Error{}}));
afterEach(cleanup);
beforeEach(()=>{document.cookie='devmasters_locale=;max-age=0;path=/';window.history.replaceState(null,'','/en/hire-our-team?source=qa#brief');vi.clearAllMocks();});
function Sample(){const t=useText();const status=useStatus();const date=useDate();return <><LanguageSwitcher/><p>{t('Full name')}</p><p data-testid="status" data-code="ISSUED">{status('ISSUED')}</p><p data-testid="date">{date('2026-11-02')}</p><p>{t('Missing catalogue message.')}</p></>;}
describe('Khmer and English localization',()=>{
 it('switches labels immediately and preserves page query, hash and form/file values',async()=>{
  render(<LocaleProvider initialLocale="en"><LanguageSwitcher/><CompanyForm type="HIRE_OUR_TEAM"/></LocaleProvider>);
  const name=screen.getByLabelText('Your name *');fireEvent.change(name,{target:{value:'Original user name'}});
  const fileInput=document.querySelector('input[type=file]') as HTMLInputElement;const file=new File(['private bytes'],'unchanged.pdf',{type:'application/pdf'});fireEvent.change(fileInput,{target:{files:[file]}});
  fireEvent.change(screen.getByRole('combobox',{name:'Language'}),{target:{value:'km'}});
  await waitFor(()=>expect(screen.getByLabelText('ឈ្មោះរបស់អ្នក *')).toHaveValue('Original user name'));
  expect(fileInput.files?.[0]).toBe(file);expect(window.location.pathname).toBe('/km/hire-our-team');expect(window.location.search).toBe('?source=qa');expect(window.location.hash).toBe('#brief');expect(document.cookie).toContain('devmasters_locale=km');
  await waitFor(()=>expect(api).toHaveBeenCalledWith('/locale',expect.objectContaining({method:'POST',body:'{"locale":"km"}'})));
 });
 it('localizes validation for the selected language without clearing existing values',async()=>{
  render(<LocaleProvider initialLocale="km"><CompanyForm type="HIRE_OUR_TEAM"/></LocaleProvider>);
  fireEvent.click(screen.getByRole('button',{name:/ផ្ញើ/}));expect(await screen.findByText('សូមបញ្ចូលឈ្មោះក្រុមហ៊ុនរបស់អ្នក។')).toBeInTheDocument();expect(api).not.toHaveBeenCalled();
 });
 it('localizes dates and displayed status labels while retaining machine codes and missing-message fallback',()=>{
  render(<LocaleProvider initialLocale="km"><Sample/></LocaleProvider>);
  expect(screen.getByText('ឈ្មោះពេញ')).toBeInTheDocument();expect(screen.getByTestId('status')).toHaveTextContent('បានចេញផ្សាយ');expect(screen.getByTestId('status')).toHaveAttribute('data-code','ISSUED');expect(screen.getByTestId('date').textContent).toContain('វិច្ឆិកា');expect(screen.getByText('Missing catalogue message.')).toBeInTheDocument();
 });
 it('restores English translations when the selected language changes back',async()=>{
  render(<LocaleProvider initialLocale="km"><Sample/></LocaleProvider>);
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'en'}});await waitFor(()=>expect(screen.getByText('Full name')).toBeInTheDocument());expect(screen.getByTestId('status')).toHaveTextContent('Issued');expect(document.documentElement.lang).toBe('en');
 });
 it('localizes native browser validity and clears it after correction without losing input',async()=>{
  render(<LocaleProvider initialLocale="km"><NativeValidation/><LanguageSwitcher/><form><input aria-label="Test required email" type="email" required/></form></LocaleProvider>);
  const input=screen.getByLabelText('Test required email') as HTMLInputElement;
  expect(input.checkValidity()).toBe(false);expect(input.validationMessage).toBe('សូមបំពេញព័ត៌មាននេះ។');
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'en'}});
  await waitFor(()=>expect(input.validationMessage).toBe('This field is required.'));
  fireEvent.input(input,{target:{value:'preserved@example.test'}});expect(input.checkValidity()).toBe(true);expect(input).toHaveValue('preserved@example.test');
 });
 it('keeps backend/admin routes and exact supported locale identifiers intact',()=>{
  expect(localePath('/admin/login','km')).toBe('/admin/login');expect(localePath('/api/v1/reference-data','en')).toBe('/api/v1/reference-data');expect(localePath('/km/expert/offers','en')).toBe('/en/expert/offers');expect(stripLocale('/km/contact')).toBe('/contact');expect(supported('fr')).toBe(false);
 });
});
