import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {Home} from '../src/components/public-home';
import {getSkillsForCategory,getSkillsForSubcategory,getSubcategoriesForCategory,technologySkillCategories,technologySkillSubcategories,technologySkills} from '../src/data/technology-skills';

vi.mock('@/components/cms-content',()=>({CmsContent:({children}:{children:React.ReactNode})=><>{children}</>}));
vi.mock('@/components/logo-carousel',()=>({LogoCarousel:()=> <div data-testid="clients-carousel"/>}));
vi.mock('@/components/technology-skills-showcase',()=>({TechnologySkillsShowcase:()=> <section data-testid="technology-skills-showcase"/>}));

beforeEach(()=>{window.history.replaceState(null,'','/en');});
afterEach(cleanup);

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

describe('homepage technology skills placement',()=>{
  it('omits the removed services section and places the skills showcase directly after the hero',()=>{
    const {container}=render(<LocaleProvider initialLocale="en"><Home/></LocaleProvider>);
    expect(screen.queryByRole('heading',{name:'Different disciplines. A shared standard.'})).not.toBeInTheDocument();
    expect(screen.queryByRole('link',{name:/Discover our services/})).not.toBeInTheDocument();
    expect(container.querySelector('.services-section')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.service-card')).toHaveLength(0);
    const hero=container.querySelector('.hero');
    expect(hero).toBeInTheDocument();
    const showcase=screen.getByTestId('technology-skills-showcase');
    expect(hero!.nextElementSibling).toBe(showcase);
    expect(showcase.nextElementSibling).toBe(screen.getByTestId('clients-carousel'));
  });
});
