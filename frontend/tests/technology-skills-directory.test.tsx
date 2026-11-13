import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {LocaleProvider,useLanguage} from '../src/i18n/provider';
import {TechnologySkillsDirectory} from '../src/components/technology-skills-directory';
import {Home} from '../src/components/public-home';
import {getSkillsForCategory,getSkillsForSubcategory,getSubcategoriesForCategory,technologySkillCategories,technologySkillSubcategories,technologySkills} from '../src/data/technology-skills';

vi.mock('@/components/cms-content',()=>({CmsContent:({children}:{children:React.ReactNode})=><>{children}</>}));
vi.mock('@/components/logo-carousel',()=>({LogoCarousel:()=> <div data-testid="clients-carousel"/>}));
vi.mock('@/components/technology-skills-carousel',()=>({TechnologySkillsCarousel:()=> <section data-testid="technology-skills-carousel"/>}));

beforeEach(()=>{window.history.replaceState(null,'','/en');});
afterEach(cleanup);

function LanguageControl(){
  const {locale,change}=useLanguage();
  return <button onClick={()=>void change(locale==='en'?'km':'en',false)}>Switch language</button>;
}

function renderDirectory(locale:'en'|'km'='en'){
  return render(<LocaleProvider initialLocale={locale}><LanguageControl/><TechnologySkillsDirectory/></LocaleProvider>);
}

const mainNames=['Software Development','Data & Artificial Intelligence','Networks & Infrastructure','Cybersecurity','Cloud & DevOps','Database & Information Systems','Design & Digital Media','Emerging & Specialized Technologies'];

describe('hierarchical local technology skills data',()=>{
  it('contains eight main categories, forty-six populated subcategories, and unique shared skill records',()=>{
    expect(technologySkillCategories.map(category=>category.name)).toEqual(mainNames);
    expect(technologySkillSubcategories).toHaveLength(46);
    expect(technologySkills.length).toBeGreaterThanOrEqual(250);
    expect(technologySkills.length).toBeLessThanOrEqual(350);
    const categoryIds=new Set(technologySkillCategories.map(category=>category.id));
    const subcategoryIds=new Set(technologySkillSubcategories.map(subcategory=>subcategory.id));
    expect(categoryIds.size).toBe(8);
    expect(subcategoryIds.size).toBe(46);
    expect(new Set(technologySkills.map(skill=>skill.id)).size).toBe(technologySkills.length);
    expect(new Set(technologySkills.map(skill=>skill.name.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase())).size).toBe(technologySkills.length);
    for(const subcategory of technologySkillSubcategories){
      expect(categoryIds.has(subcategory.categoryId)).toBe(true);
      expect(getSkillsForSubcategory(subcategory.id).length).toBeGreaterThan(0);
    }
    for(const skill of technologySkills){
      expect(skill.subcategoryIds.length).toBeGreaterThan(0);
      expect(new Set(skill.subcategoryIds).size).toBe(skill.subcategoryIds.length);
      for(const subcategoryId of skill.subcategoryIds)expect(subcategoryIds.has(subcategoryId)).toBe(true);
    }
    for(const category of technologySkillCategories){
      expect(category.description.trim().length).toBeGreaterThan(0);
      expect(getSubcategoriesForCategory(category.id).length).toBeGreaterThan(0);
      const skills=getSkillsForCategory(category.id);
      expect(new Set(skills.map(skill=>skill.id)).size).toBe(skills.length);
    }
    expect(getSubcategoriesForCategory('software-development').map(subcategory=>subcategory.name)).toEqual(['Programming Languages','Frontend Development','Backend Development','Mobile Development','Desktop Development','API Development','Software Testing']);
    const expectedSubcategoryIds:Record<string,string[]>={
      'software-development':['programming-languages','frontend-development','backend-development','mobile-development','desktop-development','api-development','software-testing'],
      'data-ai':['data-analytics','data-science','data-engineering','machine-learning','generative-ai','business-intelligence'],
      'networks-infrastructure':['network-engineering','routing-switching','wireless-networking','server-administration','it-support'],
      'cybersecurity':['network-security','application-security','penetration-testing','security-operations','digital-forensics','risk-management'],
      'cloud-devops':['cloud-computing','containerization','ci-cd','infrastructure-as-code','monitoring'],
      'database-information-systems':['relational-databases','nosql-databases','database-administration','erp-crm','system-integration'],
      'design-digital-media':['ui-ux-design','graphic-design','product-design','animation','video-editing','3d-design'],
      'emerging-specialized-technologies':['gis-remote-sensing','iot','robotics','blockchain','automation','embedded-systems'],
    };
    for(const [categoryId,subcategoryIds] of Object.entries(expectedSubcategoryIds))expect(getSubcategoriesForCategory(categoryId).map(subcategory=>subcategory.id)).toEqual(subcategoryIds);
    expect(getSkillsForCategory('software-development').filter(skill=>skill.name==='Python')).toHaveLength(1);
    const sharedPython=technologySkills.find(skill=>skill.name==='Python')!;
    expect(sharedPython.subcategoryIds.length).toBeGreaterThan(1);
    for(const subcategoryId of sharedPython.subcategoryIds)expect(getSkillsForSubcategory(subcategoryId).filter(skill=>skill.id===sharedPython.id)).toHaveLength(1);
    expect(getSkillsForSubcategory('frontend-development').map(skill=>skill.name)).toEqual(expect.arrayContaining(['React','Next.js']));
    const names=technologySkills.map(skill=>skill.name);
    expect(names).toEqual(expect.arrayContaining(['Python','PHP','Laravel','Next.js','React','PostgreSQL','Power BI','Cisco','MikroTik','Docker','AWS','QGIS','ArcGIS','Selenium','n8n']));
    const cLanguages=technologySkills.filter(skill=>['C','C++','C#','Objective-C'].includes(skill.name));
    expect(cLanguages).toHaveLength(4);
    expect(new Set(cLanguages.map(skill=>skill.id)).size).toBe(4);
  });
});

describe('hierarchical technology skills directory',()=>{
  it('presents all main categories with nested subcategory headings and distinct skill totals',()=>{
    renderDirectory();
    expect(screen.getByRole('status')).toHaveTextContent(`${technologySkills.length} skills · 8 categories · 46 subcategories`);
    expect(screen.getAllByRole('article')).toHaveLength(46);
    for(const name of mainNames)expect(screen.getByRole('heading',{level:3,name})).toBeInTheDocument();
    const software=screen.getByRole('region',{name:'Software Development'});
    expect(within(software).getAllByRole('article')).toHaveLength(7);
    expect(within(software).getByRole('heading',{level:4,name:'Programming Languages'})).toBeInTheDocument();
  });

  it('expands and collapses individual skills without changing the subcategory count',()=>{
    renderDirectory();
    const card=screen.getByRole('article',{name:'Programming Languages'});
    const list=within(card).getByRole('list',{name:'Skills in Programming Languages'});
    const totalLabel=within(card).getByText(/^\d+ skills$/).textContent!;
    expect(within(list).getAllByRole('listitem')).toHaveLength(8);
    expect(within(list).queryByText('Go')).not.toBeInTheDocument();
    const button=within(card).getByRole('button',{name:'View More'});
    expect(button).toHaveAttribute('aria-controls',list.id);
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded','true');
    expect(within(list).getByText('Go')).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button',{name:'View Less'}));
    expect(within(list).getAllByRole('listitem')).toHaveLength(8);
    expect(within(card).getByText(totalLabel)).toBeInTheDocument();
  });

  it('limits subcategory choices to their main category and clears stale child selections',()=>{
    renderDirectory();
    const main=screen.getByRole('combobox',{name:'Main category'});
    const sub=screen.getByRole('combobox',{name:'Subcategory'});
    expect(within(sub).getAllByRole('option')).toHaveLength(47);
    const languages=screen.getByRole('article',{name:'Programming Languages'});
    fireEvent.click(within(languages).getByRole('button',{name:'View More'}));
    expect(within(languages).getByRole('button',{name:'View Less'})).toHaveAttribute('aria-expanded','true');
    fireEvent.change(main,{target:{value:'software-development'}});
    expect(within(screen.getByRole('article',{name:'Programming Languages'})).getByRole('button',{name:'View More'})).toHaveAttribute('aria-expanded','false');
    expect(within(sub).getAllByRole('option')).toHaveLength(8);
    expect(within(sub).getByRole('option',{name:'Frontend Development'})).toBeInTheDocument();
    expect(within(sub).queryByRole('option',{name:'Cloud Computing'})).not.toBeInTheDocument();
    fireEvent.change(sub,{target:{value:'frontend-development'}});
    expect(screen.getAllByRole('article')).toHaveLength(1);
    fireEvent.change(main,{target:{value:'cloud-devops'}});
    expect(sub).toHaveValue('');
    expect(within(sub).getByRole('option',{name:'Cloud Computing'})).toBeInTheDocument();
    expect(within(sub).queryByRole('option',{name:'Frontend Development'})).not.toBeInTheDocument();
  });

  it('selects the parent automatically when a subcategory is chosen from the global list',()=>{
    renderDirectory();
    fireEvent.change(screen.getByRole('combobox',{name:'Subcategory'}),{target:{value:'gis-remote-sensing'}});
    expect(screen.getByRole('combobox',{name:'Main category'})).toHaveValue('emerging-specialized-technologies');
    expect(screen.getByRole('combobox',{name:'Subcategory'})).toHaveValue('gis-remote-sensing');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article',{name:'GIS & Remote Sensing'})).toBeInTheDocument();
    expect(screen.getByText('QGIS')).toBeInTheDocument();
  });

  it('intersects normalized skill-name search with both hierarchy filters',()=>{
    renderDirectory();
    const search=screen.getByRole('searchbox',{name:'Search skills'});
    const main=screen.getByRole('combobox',{name:'Main category'});
    const sub=screen.getByRole('combobox',{name:'Subcategory'});
    fireEvent.change(main,{target:{value:'software-development'}});
    fireEvent.change(sub,{target:{value:'frontend-development'}});
    fireEvent.change(search,{target:{value:'   nExT.Js  '}});
    expect(screen.getByRole('status')).toHaveTextContent('1 skill · 1 category · 1 subcategory');
    expect(screen.getByRole('listitem')).toHaveTextContent('Next.js');
    fireEvent.change(sub,{target:{value:'backend-development'}});
    expect(screen.getByRole('heading',{name:'No matching skills'})).toBeInTheDocument();
    fireEvent.change(search,{target:{value:'LaRaVeL'}});
    expect(screen.getByRole('listitem')).toHaveTextContent('Laravel');
    expect(screen.getByRole('status')).toHaveTextContent('1 skill');
  });

  it('keeps new search results collapsed until visitors choose View More',()=>{
    renderDirectory();
    fireEvent.change(screen.getByRole('searchbox',{name:'Search skills'}),{target:{value:'e'}});
    const toggles=screen.getAllByRole('button',{name:'View More'});
    expect(toggles.length).toBeGreaterThan(0);
    for(const toggle of toggles)expect(toggle).toHaveAttribute('aria-expanded','false');
    for(const list of screen.getAllByRole('list'))expect(within(list).getAllByRole('listitem').length).toBeLessThanOrEqual(8);
    expect(screen.queryByRole('button',{name:'View Less'})).not.toBeInTheDocument();
  });

  it('counts shared skills once while showing each applicable subcategory and preserving punctuation',()=>{
    renderDirectory();
    fireEvent.change(screen.getByRole('searchbox',{name:'Search skills'}),{target:{value:'C++'}});
    expect(screen.getByRole('status')).toHaveTextContent('1 skill');
    const badges=screen.getAllByRole('listitem');
    expect(badges.length).toBeGreaterThan(1);
    expect(badges.every(item=>item.textContent==='C++')).toBe(true);
  });

  it('clears an empty search and both hierarchy filters on reset, retaining keyboard focus',()=>{
    renderDirectory();
    const search=screen.getByRole('searchbox',{name:'Search skills'});
    const main=screen.getByRole('combobox',{name:'Main category'});
    const sub=screen.getByRole('combobox',{name:'Subcategory'});
    fireEvent.change(main,{target:{value:'cloud-devops'}});
    fireEvent.change(sub,{target:{value:'containerization'}});
    fireEvent.change(search,{target:{value:'no-such-skill-xyz'}});
    expect(screen.getByRole('status')).toHaveTextContent('0 skills');
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByText('Try another keyword or choose a different category.')).toBeInTheDocument();
    const reset=screen.getAllByRole('button',{name:'Reset filters'})[0];
    act(()=>reset.focus());fireEvent.click(reset);
    expect(search).toHaveValue('');expect(search).toHaveFocus();
    expect(main).toHaveValue('');expect(sub).toHaveValue('');
    expect(screen.getAllByRole('article')).toHaveLength(46);
  });

  it('clears only the search while keeping the chosen main category and subcategory',()=>{
    renderDirectory();
    const main=screen.getByRole('combobox',{name:'Main category'});
    const sub=screen.getByRole('combobox',{name:'Subcategory'});
    fireEvent.change(main,{target:{value:'software-development'}});
    fireEvent.change(sub,{target:{value:'frontend-development'}});
    fireEvent.change(screen.getByRole('searchbox',{name:'Search skills'}),{target:{value:'React'}});
    const clear=screen.getByRole('button',{name:'Clear search'});
    act(()=>clear.focus());fireEvent.click(clear);
    const search=screen.getByRole('searchbox',{name:'Search skills'});
    expect(search).toHaveValue('');expect(search).toHaveFocus();
    expect(main).toHaveValue('software-development');expect(sub).toHaveValue('frontend-development');
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('switches between English and Khmer without losing search or hierarchy state',async()=>{
    renderDirectory();
    fireEvent.change(screen.getByRole('combobox',{name:'Main category'}),{target:{value:'software-development'}});
    fireEvent.change(screen.getByRole('combobox',{name:'Subcategory'}),{target:{value:'frontend-development'}});
    fireEvent.change(screen.getByRole('searchbox',{name:'Search skills'}),{target:{value:'React'}});
    fireEvent.click(screen.getByRole('button',{name:'Switch language'}));
    expect(await screen.findByRole('heading',{name:'ជំនាញ និងឯកទេសបច្ចេកវិទ្យា'})).toBeInTheDocument();
    expect(screen.getByRole('searchbox',{name:'ស្វែងរកជំនាញ'})).toHaveValue('React');
    expect(screen.getByRole('combobox',{name:'ប្រភេទចម្បង'})).toHaveValue('software-development');
    expect(screen.getByRole('combobox',{name:'ប្រភេទរង'})).toHaveValue('frontend-development');
    expect(screen.getByRole('heading',{name:'ការអភិវឌ្ឍផ្នែកខាងមុខ'})).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('React');
    fireEvent.click(screen.getByRole('button',{name:'Switch language'}));
    await waitFor(()=>expect(screen.getByRole('combobox',{name:'Subcategory'})).toHaveValue('frontend-development'));
  });

  it('omits the removed services section and places the skills carousel directly after the hero',()=>{
    const {container}=render(<LocaleProvider initialLocale="en"><Home/></LocaleProvider>);
    expect(screen.queryByRole('heading',{name:'Different disciplines. A shared standard.'})).not.toBeInTheDocument();
    expect(screen.queryByRole('link',{name:/Discover our services/})).not.toBeInTheDocument();
    expect(container.querySelector('.services-section')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.service-card')).toHaveLength(0);
    const hero=container.querySelector('.hero');
    expect(hero).toBeInTheDocument();
    const carousel=screen.getByTestId('technology-skills-carousel');
    expect(hero!.nextElementSibling).toBe(carousel);
    expect(carousel.nextElementSibling).toBe(screen.getByTestId('clients-carousel'));
  });
});
