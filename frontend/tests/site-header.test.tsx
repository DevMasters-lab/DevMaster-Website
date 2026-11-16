import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {SiteHeader} from '../src/components/layout/site-shell';

afterEach(cleanup);
describe('public header actions',()=>{
  it.each(['en','km'] as const)('keeps the home link and tools with a same-page Expert Portal control in %s',locale=>{
    render(<LocaleProvider initialLocale={locale}><SiteHeader/></LocaleProvider>);
    const header=screen.getByRole('banner');
    const links=within(header).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href',`/${locale}/home`);
    expect(within(header).queryByRole('link',{name:/Let’s work together/})).not.toBeInTheDocument();
    expect(header.querySelector('a[href*="hire-our-team"]')).toBeNull();
    const buttons=within(header).getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(buttons.at(-1)).toBe(within(header).getByRole('button',{name:locale==='en'?'Language':'ភាសា'}));
    const portal=within(header).getByRole('button',{name:locale==='en'?'Expert Portal':'ផតថលអ្នកជំនាញ'});
    expect(portal).toHaveAttribute('type','button');expect(portal).toHaveAttribute('aria-haspopup','dialog');
  });
});
