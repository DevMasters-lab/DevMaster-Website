import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import Page,{generateMetadata} from '../src/app/technology-skills/page';
import {pageMetadata} from '../src/i18n/server';
import {technologySkillCategories,technologySkillSubcategories,technologySkills} from '../src/data/technology-skills';

vi.mock('@/i18n/server',()=>({pageMetadata:vi.fn(async(path:string)=>({title:'All Technology Skills',path}))}));
beforeEach(()=>window.history.replaceState(null,'','/en/technology-skills'));
afterEach(()=>{cleanup();vi.clearAllMocks();});

type Query={category?:string|string[];subcategory?:string|string[]};
async function renderPage(query:Query={},locale:'en'|'km'='en'){
  const page=await Page({searchParams:Promise.resolve(query)});
  render(<LocaleProvider initialLocale={locale}>{page}</LocaleProvider>);
}

describe('all hierarchical technology skills page',()=>{
  it('shows the full hierarchy with collapsed skill previews by default',async()=>{
    await renderPage();
    expect(screen.getByRole('heading',{level:1,name:'All Technology Skills'})).toBeInTheDocument();
    expect(screen.getAllByRole('heading',{level:2})).toHaveLength(technologySkillCategories.length);
    expect(screen.getAllByRole('heading',{level:3})).toHaveLength(technologySkillSubcategories.length);
    expect(screen.getAllByRole('article')).toHaveLength(46);
    expect(screen.getByRole('status')).toHaveTextContent(`${technologySkills.length} skills · 8 categories · 46 subcategories`);
    for(const list of screen.getAllByRole('list'))expect(within(list).getAllByRole('listitem').length).toBeLessThanOrEqual(8);
    const toggles=screen.getAllByRole('button',{name:'View More'});
    for(const toggle of toggles)expect(toggle).toHaveAttribute('aria-expanded','false');
    expect(screen.queryByRole('button',{name:'View Less'})).not.toBeInTheDocument();
    const languages=screen.getByRole('article',{name:'Programming Languages'});
    expect(within(languages).queryByText('Go')).not.toBeInTheDocument();
    fireEvent.click(within(languages).getByRole('button',{name:'View More'}));
    expect(within(languages).getByText('Go')).toBeInTheDocument();
    for(const toggle of screen.getAllByRole('button',{name:'View More'}))expect(toggle).toHaveAttribute('aria-expanded','false');
    fireEvent.click(within(languages).getByRole('button',{name:'View Less'}));
    expect(within(languages).queryByText('Go')).not.toBeInTheDocument();
    expect(within(languages).getByRole('button',{name:'View More'})).toHaveAttribute('aria-expanded','false');
  });

  it('opens matching hierarchy links and synchronizes both filters without losing unrelated query or hash values',async()=>{
    window.history.replaceState(null,'','/en/technology-skills?category=cloud-devops&subcategory=cloud-computing&source=homepage#catalogue');
    await renderPage({category:'cloud-devops',subcategory:'cloud-computing'});
    const main=screen.getByRole('combobox',{name:'Main category'});
    const sub=screen.getByRole('combobox',{name:'Subcategory'});
    expect(main).toHaveValue('cloud-devops');expect(sub).toHaveValue('cloud-computing');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    const cloud=screen.getByRole('article',{name:'Cloud Computing'});
    expect(within(cloud).getAllByRole('listitem')).toHaveLength(8);
    expect(within(cloud).getByRole('button',{name:'View More'})).toHaveAttribute('aria-expanded','false');
    fireEvent.change(sub,{target:{value:'containerization'}});
    expect(new URLSearchParams(window.location.search).get('subcategory')).toBe('containerization');
    fireEvent.change(main,{target:{value:'emerging-specialized-technologies'}});
    expect(new URLSearchParams(window.location.search).get('category')).toBe('emerging-specialized-technologies');
    expect(new URLSearchParams(window.location.search).has('subcategory')).toBe(false);
    expect(sub).toHaveValue('');
    fireEvent.change(sub,{target:{value:'gis-remote-sensing'}});
    expect(new URLSearchParams(window.location.search).get('subcategory')).toBe('gis-remote-sensing');
    expect(new URLSearchParams(window.location.search).get('source')).toBe('homepage');
    expect(window.location.hash).toBe('#catalogue');
    fireEvent.click(screen.getByRole('button',{name:'Reset filters'}));
    expect(new URLSearchParams(window.location.search).has('category')).toBe(false);
    expect(new URLSearchParams(window.location.search).has('subcategory')).toBe(false);
    expect(new URLSearchParams(window.location.search).get('source')).toBe('homepage');
    expect(window.location.hash).toBe('#catalogue');
    expect(screen.getAllByRole('article')).toHaveLength(46);
    expect(screen.getByRole('searchbox',{name:'Search skills'})).toHaveFocus();
  });

  it('infers the parent from a subcategory-only query',async()=>{
    await renderPage({subcategory:'gis-remote-sensing'});
    expect(screen.getByRole('combobox',{name:'Main category'})).toHaveValue('emerging-specialized-technologies');
    expect(screen.getByRole('combobox',{name:'Subcategory'})).toHaveValue('gis-remote-sensing');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('QGIS')).toBeInTheDocument();
  });

  it('ignores a conflicting subcategory while keeping a valid main category',async()=>{
    await renderPage({category:'software-development',subcategory:'cloud-computing'});
    expect(screen.getByRole('combobox',{name:'Main category'})).toHaveValue('software-development');
    expect(screen.getByRole('combobox',{name:'Subcategory'})).toHaveValue('');
    expect(screen.getAllByRole('article')).toHaveLength(7);
    expect(screen.queryByRole('article',{name:'Cloud Computing'})).not.toBeInTheDocument();
  });

  it.each([
    {category:'unknown-category'},
    {category:['software-development','cloud-devops']},
    {subcategory:'unknown-subcategory'},
    {subcategory:['frontend-development','backend-development']},
  ])('handles unsupported query values safely: %j',async(query)=>{
    await renderPage(query);
    expect(screen.getByRole('combobox',{name:'Main category'})).toHaveValue('');
    expect(screen.getByRole('combobox',{name:'Subcategory'})).toHaveValue('');
    expect(screen.getAllByRole('article')).toHaveLength(46);
  });

  it('offers translated hierarchy filters and working skill search in Khmer',async()=>{
    await renderPage({category:'software-development',subcategory:'backend-development'},'km');
    expect(screen.getByRole('heading',{level:1,name:'ជំនាញបច្ចេកវិទ្យាទាំងអស់'})).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox',{name:'ស្វែងរកជំនាញ'}),{target:{value:'  LaRaVeL  '}});
    expect(screen.getByRole('listitem')).toHaveTextContent('Laravel');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('combobox',{name:'ប្រភេទចម្បង'})).toHaveValue('software-development');
    expect(screen.getByRole('combobox',{name:'ប្រភេទរង'})).toHaveValue('backend-development');
  });

  it('offers a translated View More toggle without opening Khmer skill lists automatically',async()=>{
    await renderPage({category:'software-development',subcategory:'programming-languages'},'km');
    const more=screen.getByRole('button',{name:'មើលបន្ថែម'});
    expect(more).toHaveAttribute('aria-expanded','false');
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    fireEvent.click(more);
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(8);
    fireEvent.click(screen.getByRole('button',{name:'បង្ហាញតិច'}));
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getByRole('button',{name:'មើលបន្ថែម'})).toHaveAttribute('aria-expanded','false');
  });

  it('uses dedicated localized metadata instead of looking up a CMS page',async()=>{
    await generateMetadata();
    expect(pageMetadata).toHaveBeenCalledWith('/technology-skills');
  });
});
