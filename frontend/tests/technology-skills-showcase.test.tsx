import React from 'react';
import {renderToString} from 'react-dom/server';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {LocaleProvider} from '../src/i18n/provider';
import {TechnologySkillsShowcase} from '../src/components/technology-skills-showcase';
import {getSkillsForCategory,getSkillsForSubcategory,technologySkillCategories,technologySkills} from '../src/data/technology-skills';

const originalScroll=HTMLElement.prototype.scrollIntoView;
const scrollIntoView=vi.fn();
beforeEach(()=>{
  window.history.replaceState(null,'','/en/home');
  scrollIntoView.mockClear();
  Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,value:scrollIntoView});
});
afterEach(()=>{
  cleanup();
  if(originalScroll)Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,value:originalScroll});
  else Reflect.deleteProperty(HTMLElement.prototype,'scrollIntoView');
});

const featured=['React','Next.js','TypeScript','JavaScript','NestJS','Node.js','Laravel','Python','Flutter','PostgreSQL','AWS','Docker'];
function renderShowcase(locale:'en'|'km'='en'){
  return render(<LocaleProvider initialLocale={locale}><TechnologySkillsShowcase/></LocaleProvider>);
}
function technologyCards(){return screen.getAllByRole('article');}
function technologyIds(){
  return technologyCards().map(card=>{
    const name=within(card).getByRole('heading',{level:3}).textContent;
    return technologySkills.find(skill=>skill.name===name)?.id;
  });
}

describe('compact technology skills showcase',()=>{
  it('shows the twelve reference technologies as unique, noninteractive tiles',()=>{
    renderShowcase();
    expect(screen.getByRole('heading',{level:2,name:'Technology Skills & Expertise'})).toBeInTheDocument();
    expect(technologyCards()).toHaveLength(12);
    expect(screen.getAllByRole('heading',{level:3}).map(heading=>heading.textContent)).toEqual(featured);
    for(const name of featured){
      const card=screen.getByRole('article',{name});
      expect(within(card).getByRole('heading',{level:3,name})).toBeInTheDocument();
      expect(card).not.toHaveAttribute('tabindex');
      expect(card.querySelector('a,button,input,[tabindex]')).toBeNull();
    }
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryByText('View technology')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^View technology:/)).not.toBeInTheDocument();
    expect(new Set(technologyIds()).size).toBe(12);
    expect(screen.getByRole('status')).toHaveTextContent(`12 of ${technologySkills.length} skills`);
    expect(screen.queryByRole('link',{name:'View All Skills'})).not.toBeInTheDocument();
    const filters=screen.getByRole('group',{name:'Technology categories'});
    expect(within(filters).getAllByRole('button')).toHaveLength(9);
    expect(within(filters).getByRole('button',{name:'All categories'})).toHaveAttribute('aria-pressed','true');
    expect(screen.queryByRole('button',{name:'Next skill categories'})).not.toBeInTheDocument();
  });

  it('filters all eight main categories using the shared catalogue without leaking other technologies',()=>{
    renderShowcase();
    const filters=screen.getByRole('group',{name:'Technology categories'});
    for(const category of technologySkillCategories){
      const button=within(filters).getByRole('button',{name:category.name});
      act(()=>button.focus());
      fireEvent.click(button);
      expect(button).toHaveFocus();
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type','button');
      expect(button).toHaveAttribute('aria-pressed','true');
      expect(within(filters).getAllByRole('button').filter(item=>item.getAttribute('aria-pressed')==='true')).toHaveLength(1);
      const allowed=getSkillsForCategory(category.id);
      const ids=technologyIds();
      expect(ids).toHaveLength(Math.min(12,allowed.length));
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every(id=>allowed.some(skill=>skill.id===id))).toBe(true);
      expect(screen.getByRole('status')).toHaveTextContent(`${ids.length} of ${allowed.length} skills`);
    }
  });

  it('expands all technologies, then collapses and reopens them with an accessible persistent toggle',()=>{
    renderShowcase();
    const first=technologyIds();
    const toggle=screen.getByRole('button',{name:'Show more technologies'});
    expect(toggle).toHaveAttribute('aria-expanded','false');
    expect(toggle).toHaveAttribute('aria-controls',screen.getByRole('list').id);
    expect(scrollIntoView).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    const expanded=technologyIds();
    expect(expanded).toHaveLength(technologySkills.length);
    expect(expanded.slice(0,12)).toEqual(first);
    expect(new Set(expanded)).toEqual(new Set(technologySkills.map(skill=>skill.id)));
    expect(screen.getByRole('status')).toHaveTextContent(`${technologySkills.length} of ${technologySkills.length} skills`);
    expect(screen.getByRole('button',{name:'Show fewer technologies'})).toBe(toggle);
    expect(toggle).toHaveAttribute('aria-expanded','true');
    expect(scrollIntoView).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    expect(technologyIds()).toEqual(first);
    expect(screen.getByRole('status')).toHaveTextContent(`12 of ${technologySkills.length} skills`);
    expect(screen.getByRole('button',{name:'Show more technologies'})).toBe(toggle);
    expect(toggle).toHaveAttribute('aria-expanded','false');
    expect(scrollIntoView).toHaveBeenCalledWith({block:'start',behavior:'instant'});
    fireEvent.click(toggle);
    expect(technologyIds()).toHaveLength(technologySkills.length);
    expect(toggle).toHaveAttribute('aria-expanded','true');
  });

  it('expands only the selected category and resets to twelve cards when a filter changes',()=>{
    renderShowcase();
    fireEvent.click(screen.getByRole('button',{name:'Cybersecurity'}));
    const expected=getSkillsForCategory('cybersecurity').map(skill=>skill.id);
    fireEvent.click(screen.getByRole('button',{name:'Show more technologies'}));
    expect(screen.queryByRole('button',{name:'Show more technologies'})).not.toBeInTheDocument();
    const expanded=technologyIds();
    expect(expanded).toHaveLength(expected.length);
    expect(new Set(expanded)).toEqual(new Set(expected));
    expect(screen.getByRole('status')).toHaveTextContent(`${expected.length} of ${expected.length} skills`);
    expect(screen.getByRole('button',{name:'Show fewer technologies'})).toHaveAttribute('aria-expanded','true');
    fireEvent.click(screen.getByRole('button',{name:'Cloud & DevOps'}));
    expect(technologyIds()).toHaveLength(12);
    expect(screen.getByRole('button',{name:'Show more technologies'})).toHaveAttribute('aria-expanded','false');
    expect(screen.queryByRole('button',{name:'Show fewer technologies'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Show more technologies'}));
    expect(technologyIds()).toHaveLength(getSkillsForCategory('cloud-devops').length);
    fireEvent.click(screen.getByRole('button',{name:'All categories'}));
    expect(screen.getAllByRole('heading',{level:3}).map(heading=>heading.textContent)).toEqual(featured);
    expect(screen.getByRole('button',{name:'Show more technologies'})).toHaveAttribute('aria-expanded','false');
    expect(screen.getByRole('status')).toHaveTextContent(`12 of ${technologySkills.length} skills`);
  });

  it('normalizes technology-name searches without duplicating shared skills',()=>{
    renderShowcase();
    const search=screen.getByRole('searchbox',{name:'Search skills'});
    fireEvent.change(search,{target:{value:'  ＮＥＸＴ．ｊｓ  '}});
    expect(technologyIds()).toEqual(['next-js']);
    expect(screen.getByRole('status')).toHaveTextContent('1 of 1 skills');
    fireEvent.change(search,{target:{value:'  NeTwOrK   SeCuRiTy  '}});
    expect(technologyIds()).toEqual(['network-security']);
    fireEvent.change(search,{target:{value:'C++'}});
    expect(technologyIds()).toEqual(['cpp']);
    expect(screen.queryByRole('button',{name:'Show more technologies'})).not.toBeInTheDocument();
  });

  it('intersects main category, subcategory and search while clearing a stale subcategory on main changes',()=>{
    renderShowcase();
    const subcategory=screen.getByRole('combobox',{name:'Subcategory'});
    const search=screen.getByRole('searchbox',{name:'Search skills'});
    expect(within(subcategory).getAllByRole('option').length).toBeGreaterThan(40);
    fireEvent.click(screen.getByRole('button',{name:'Software Development'}));
    expect(within(subcategory).getAllByRole('option')).toHaveLength(8);
    expect(within(subcategory).queryByRole('option',{name:'Cloud Computing'})).not.toBeInTheDocument();
    fireEvent.change(subcategory,{target:{value:'frontend-development'}});
    fireEvent.change(search,{target:{value:'  ReAcT  '}});
    expect(technologyIds()).toEqual(['react']);
    expect(screen.queryByRole('article',{name:'React Native'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Cloud & DevOps'}));
    expect(subcategory).toHaveValue('');
    expect(search).toHaveValue('  ReAcT  ');
    expect(within(subcategory).getByRole('option',{name:'Cloud Computing'})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:'No matching skills'})).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('expands every matching skill and collapses the preview when search or subcategory changes',()=>{
    renderShowcase();
    const search=screen.getByRole('searchbox',{name:'Search skills'});
    fireEvent.change(search,{target:{value:'e'}});
    const expected=technologySkills.filter(skill=>skill.name.toLowerCase().includes('e'));
    expect(expected.length).toBeGreaterThan(12);
    fireEvent.click(screen.getByRole('button',{name:'Show more technologies'}));
    expect(new Set(technologyIds())).toEqual(new Set(expected.map(skill=>skill.id)));
    expect(screen.getByRole('status')).toHaveTextContent(`${expected.length} of ${expected.length} skills`);
    fireEvent.change(search,{target:{value:'a'}});
    expect(technologyIds()).toHaveLength(12);
    expect(screen.getByRole('button',{name:'Show more technologies'})).toHaveAttribute('aria-expanded','false');
    fireEvent.click(screen.getByRole('button',{name:'Show more technologies'}));
    fireEvent.change(screen.getByRole('combobox',{name:'Subcategory'}),{target:{value:'frontend-development'}});
    const frontend=getSkillsForSubcategory('frontend-development').filter(skill=>skill.name.toLowerCase().includes('a'));
    expect(technologyIds()).toHaveLength(Math.min(12,frontend.length));
    expect(technologyIds().every(id=>frontend.some(skill=>skill.id===id))).toBe(true);
    expect(screen.queryByRole('button',{name:'Show fewer technologies'})).not.toBeInTheDocument();
    if(frontend.length>12)expect(screen.getByRole('button',{name:'Show more technologies'})).toHaveAttribute('aria-expanded','false');
    expect(screen.getByRole('status')).toHaveTextContent(`${Math.min(12,frontend.length)} of ${frontend.length} skills`);
  });

  it('clears only the search with focus retained, then resets an empty result and all filters',()=>{
    renderShowcase();
    const search=screen.getByRole('searchbox',{name:'Search skills'});
    const subcategory=screen.getByRole('combobox',{name:'Subcategory'});
    fireEvent.click(screen.getByRole('button',{name:'Software Development'}));
    fireEvent.change(subcategory,{target:{value:'backend-development'}});
    fireEvent.change(search,{target:{value:'Laravel'}});
    expect(technologyIds()).toEqual(['laravel']);
    const clear=screen.getByRole('button',{name:'Clear search'});
    act(()=>clear.focus());
    fireEvent.click(clear);
    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
    expect(subcategory).toHaveValue('backend-development');
    expect(screen.getByRole('button',{name:'Software Development'})).toHaveAttribute('aria-pressed','true');
    const backend=getSkillsForSubcategory('backend-development');
    expect(screen.getByRole('status')).toHaveTextContent(`12 of ${backend.length} skills`);
    fireEvent.change(search,{target:{value:'no-such-technology-xyz'}});
    expect(screen.getByRole('status')).toHaveTextContent('0 of 0 skills');
    expect(screen.getByRole('heading',{name:'No matching skills'})).toBeInTheDocument();
    expect(screen.getByText('Try another keyword or choose a different category.')).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.queryByRole('button',{name:'Show more technologies'})).not.toBeInTheDocument();
    const resets=screen.getAllByRole('button',{name:'Reset filters'});
    expect(resets).toHaveLength(1);
    fireEvent.click(resets[0]);
    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
    expect(subcategory).toHaveValue('');
    expect(screen.getByRole('button',{name:'All categories'})).toHaveAttribute('aria-pressed','true');
    expect(screen.getAllByRole('heading',{level:3}).map(heading=>heading.textContent)).toEqual(featured);
    expect(screen.getByRole('status')).toHaveTextContent(`12 of ${technologySkills.length} skills`);
    expect(screen.getByRole('button',{name:'Show more technologies'})).toHaveAttribute('aria-expanded','false');
  });

  it('renders the complete initial preview on the server without needing carousel layout or autoplay',()=>{
    const html=renderToString(<LocaleProvider initialLocale="en"><TechnologySkillsShowcase/></LocaleProvider>);
    const container=document.createElement('div');
    container.innerHTML=html;
    expect(container.querySelectorAll('article')).toHaveLength(12);
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('article[tabindex],article [tabindex]')).toBeNull();
    expect(container.textContent).not.toContain('View technology');
    expect(container.querySelector('[class*="swiper"]')).toBeNull();
    expect(container.querySelector('[inert]')).toBeNull();
    expect(container.textContent).toContain('12 of '+technologySkills.length+' skills');
  });

  it('uses Khmer controls while retaining canonical names and noninteractive technology tiles',()=>{
    renderShowcase('km');
    expect(screen.getByRole('heading',{level:2,name:'ជំនាញ និងឯកទេសបច្ចេកវិទ្យា'})).toBeInTheDocument();
    const filters=screen.getByRole('group',{name:'ប្រភេទបច្ចេកវិទ្យា'});
    expect(within(filters).getByRole('button',{name:'ប្រភេទទាំងអស់'})).toHaveAttribute('aria-pressed','true');
    const react=screen.getByRole('article',{name:'React'});
    expect(within(react).getByRole('heading',{name:'React'})).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryByText('ស្វែងយល់ពីបច្ចេកវិទ្យា')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^ស្វែងយល់ពីបច្ចេកវិទ្យា៖/)).not.toBeInTheDocument();
    for(const card of technologyCards()){
      expect(card).not.toHaveAttribute('tabindex');
      expect(card.querySelector('a,button,input,[tabindex]')).toBeNull();
    }
    expect(screen.queryByRole('link',{name:'មើលជំនាញទាំងអស់'})).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(`12 ក្នុងចំណោម ${technologySkills.length} ជំនាញ`);
    fireEvent.click(screen.getByRole('button',{name:'បង្ហាញបច្ចេកវិទ្យាបន្ថែម'}));
    expect(technologyCards()).toHaveLength(technologySkills.length);
    expect(screen.getByRole('status')).toHaveTextContent(`${technologySkills.length} ក្នុងចំណោម ${technologySkills.length} ជំនាញ`);
    const less=screen.getByRole('button',{name:'បង្ហាញបច្ចេកវិទ្យាតិចជាងមុន'});
    expect(less).toHaveAttribute('aria-expanded','true');
    fireEvent.click(less);
    expect(technologyCards()).toHaveLength(12);
    expect(screen.getByRole('button',{name:'បង្ហាញបច្ចេកវិទ្យាបន្ថែម'})).toHaveAttribute('aria-expanded','false');
    const search=screen.getByRole('searchbox',{name:'ស្វែងរកជំនាញ'});
    expect(screen.getByRole('combobox',{name:'ប្រភេទរង'})).toHaveValue('');
    fireEvent.change(search,{target:{value:'  LaRaVeL  '}});
    expect(screen.getByRole('article',{name:'Laravel'})).toBeInTheDocument();
    expect(technologyCards()).toHaveLength(1);
    expect(screen.getByRole('button',{name:'សម្អាតការស្វែងរក'})).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 ក្នុងចំណោម 1 ជំនាញ');
    fireEvent.click(screen.getByRole('button',{name:'កំណត់តម្រងឡើងវិញ'}));
    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
  });
});
