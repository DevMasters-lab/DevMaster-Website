import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {LocaleProvider} from '../src/i18n/provider';
import {CmsContent} from '../src/components/cms-content';
import {api} from '../src/lib/api';

vi.mock('@/lib/api',()=>({api:vi.fn()}));
beforeEach(()=>vi.clearAllMocks());
afterEach(cleanup);

function renderContent(slug:'home'|'privacy'|'terms'='home'){
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 render(<LocaleProvider initialLocale="en"><QueryClientProvider client={client}>
  <CmsContent slug={slug}><p>Built-in page content</p></CmsContent>
 </QueryClientProvider></LocaleProvider>);
 return client;
}

describe('optional CMS content',()=>{
 it('uses the successful optional lookup and keeps built-in content when no published page exists',async()=>{
  vi.mocked(api).mockResolvedValue({data:null});

  const client=renderContent();

  await waitFor(()=>expect(client.isFetching()).toBe(0));
  expect(api).toHaveBeenCalledWith('/pages/home?optional=1');
  expect(screen.getByText('Built-in page content')).toBeInTheDocument();
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
 });

 it('renders published CMS content and its existing reveal behavior instead of the built-in page',async()=>{
  vi.mocked(api).mockResolvedValue({data:{title:'Published title',body_markdown:'## CMS section\n\nPublished paragraph.'}});

  renderContent('privacy');

  expect(await screen.findByRole('heading',{name:'Published title'})).toHaveAttribute('data-reveal','up');
  expect(screen.getByRole('heading',{name:'CMS section'})).toHaveAttribute('data-reveal','up');
  expect(screen.getByText('Published paragraph.')).toHaveAttribute('data-reveal','up');
  expect(screen.queryByText('Built-in page content')).not.toBeInTheDocument();
  expect(api).toHaveBeenCalledWith('/pages/privacy?optional=1');
 });

 it('keeps built-in content available when the CMS service fails',async()=>{
  vi.mocked(api).mockRejectedValue(new Error('CMS unavailable'));

  const client=renderContent('terms');

  await waitFor(()=>expect(client.isFetching()).toBe(0));
  expect(screen.getByText('Built-in page content')).toBeInTheDocument();
  expect(api).toHaveBeenCalledOnce();
 });
});
