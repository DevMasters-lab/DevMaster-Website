// @vitest-environment node
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import Page,{generateMetadata} from '../src/app/[slug]/page';

const server=vi.hoisted(()=>{
  const missing=new Error('NEXT_NOT_FOUND');
  return {missing,notFound:vi.fn(()=>{throw missing;}),metadata:vi.fn(async()=>({title:'Existing public page'}))};
});
vi.mock('next/navigation',()=>({notFound:server.notFound}));
vi.mock('next-intl/server',()=>({getLocale:vi.fn(async()=>'en')}));
vi.mock('@/i18n/server',()=>({pageMetadata:server.metadata}));
vi.mock('@/components/public-home',()=>({Home:()=>null}));
vi.mock('@/components/public-page',()=>({PublicPage:()=>null}));

beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('fetch',vi.fn());});
afterEach(()=>vi.unstubAllGlobals());
const removed=['hire-our-team','expertise','invite-us-to-bid','be-our-team','contact','login','forgot-password','reset-password','custom-cms-page','services','technology-skills','expert','application-corrections'];

describe('public frontend page allowlist',()=>{
  it.each(removed)('rejects /%s before any CMS request',async slug=>{
    await expect(Page({params:Promise.resolve({slug})})).rejects.toBe(server.missing);
    expect(server.notFound).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
    expect(server.metadata).not.toHaveBeenCalled();
  });
  it.each(removed)('rejects /%s metadata before creating canonical URLs or looking up CMS content',async slug=>{
    await expect(generateMetadata({params:Promise.resolve({slug})})).rejects.toBe(server.missing);
    expect(server.notFound).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
    expect(server.metadata).not.toHaveBeenCalled();
  });
  it.each(['home','privacy','terms'])('keeps /%s and its metadata available',async slug=>{
    const page=await Page({params:Promise.resolve({slug})});
    expect(page.props).toEqual(slug==='home'?{}:{slug});
    expect(await generateMetadata({params:Promise.resolve({slug})})).toEqual({title:'Existing public page'});
    expect(server.metadata).toHaveBeenCalledWith('/'+slug);
    expect(server.notFound).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
