import React from 'react';
import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {SiteHeader} from '../src/components/site-shell';

afterEach(cleanup);
describe('public header after retiring the hire page',()=>{
  it.each(['en','km'] as const)('keeps the home link and tools without the work-together CTA in %s',locale=>{
    render(<LocaleProvider initialLocale={locale}><SiteHeader/></LocaleProvider>);
    const header=screen.getByRole('banner');
    const links=within(header).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href',`/${locale}/home`);
    expect(within(header).queryByRole('link',{name:/Let’s work together/})).not.toBeInTheDocument();
    expect(header.querySelector('a[href*="hire-our-team"]')).toBeNull();
    expect(within(header).getAllByRole('button')).toHaveLength(2);
  });
});
