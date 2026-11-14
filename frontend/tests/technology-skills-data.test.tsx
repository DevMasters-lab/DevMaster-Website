import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {Home} from '../src/components/public-home';
import {getSkillsForCategory,technologySkillCategories,technologySkills} from '../src/data/technology-skills';

vi.mock('@/components/cms-content',()=>({CmsContent:({children}:{children:React.ReactNode})=><>{children}</>}));
vi.mock('@/components/logo-carousel',()=>({LogoCarousel:()=> <div data-testid="clients-carousel"/>}));
vi.mock('@/components/technology-skills-showcase',()=>({TechnologySkillsShowcase:()=> <section data-testid="technology-skills-showcase"/>}));

beforeEach(()=>{window.history.replaceState(null,'','/en');});
afterEach(cleanup);

const normalizeName=(name:string)=>name.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();

describe('flat local technology skills data',()=>{
  it('preserves forty-six populated categories and 344 unique shared skill records',()=>{
    expect(technologySkillCategories).toHaveLength(46);
    expect(technologySkills).toHaveLength(344);
    const categoryIds=new Set(technologySkillCategories.map(category=>category.id));
    expect(categoryIds.size).toBe(technologySkillCategories.length);
    expect(new Set(technologySkillCategories.map(category=>normalizeName(category.name))).size).toBe(technologySkillCategories.length);
    expect(technologySkillCategories.map(category=>category.name)).toEqual(expect.arrayContaining(['Programming Languages','Frontend Development','Backend Development','Cloud Computing','GIS & Remote Sensing']));
    expect(technologySkillCategories.map(category=>category.name)).not.toContain('Software Development');
    expect(new Set(technologySkills.map(skill=>skill.id)).size).toBe(technologySkills.length);
    expect(new Set(technologySkills.map(skill=>normalizeName(skill.name))).size).toBe(technologySkills.length);
    for(const skill of technologySkills){
      expect(skill.categoryIds.length).toBeGreaterThan(0);
      expect(new Set(skill.categoryIds).size).toBe(skill.categoryIds.length);
      for(const categoryId of skill.categoryIds)expect(categoryIds.has(categoryId)).toBe(true);
    }
    for(const category of technologySkillCategories){
      const skills=getSkillsForCategory(category.id);
      expect(skills.length).toBeGreaterThan(0);
      expect(new Set(skills.map(skill=>skill.id)).size).toBe(skills.length);
      expect(skills.every(skill=>skill.categoryIds.includes(category.id))).toBe(true);
      expect(new Set(skills.map(skill=>skill.id))).toEqual(new Set(technologySkills.filter(skill=>skill.categoryIds.includes(category.id)).map(skill=>skill.id)));
    }
    const sharedPython=technologySkills.find(skill=>skill.name==='Python')!;
    expect(sharedPython.categoryIds.length).toBeGreaterThan(1);
    for(const categoryId of sharedPython.categoryIds)expect(getSkillsForCategory(categoryId).filter(skill=>skill.id===sharedPython.id)).toHaveLength(1);
    expect(getSkillsForCategory('frontend-development').map(skill=>skill.name)).toEqual(expect.arrayContaining(['React','Next.js']));
    expect(technologySkills.map(skill=>skill.name)).toEqual(expect.arrayContaining(['Python','PHP','Laravel','Next.js','React','PostgreSQL','Power BI','Cisco','MikroTik','Docker','AWS','QGIS','ArcGIS','Selenium','n8n']));
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
    expect(screen.queryByRole('link',{name:/Explore our services/})).not.toBeInTheDocument();
    expect(screen.getByRole('link',{name:/Build your team/})).toHaveAttribute('href','/en/hire-our-team');
    expect(container.querySelector('.services-section')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.service-card')).toHaveLength(0);
    const hero=container.querySelector('.hero');
    expect(hero).toBeInTheDocument();
    const showcase=screen.getByTestId('technology-skills-showcase');
    expect(hero!.nextElementSibling).toBe(showcase);
    expect(showcase.nextElementSibling).toBe(screen.getByTestId('clients-carousel'));
  });
});
