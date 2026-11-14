'use client';

import {useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import {ArrowDown,ArrowUp,Atom,Box,ChevronDown,Search,X} from 'lucide-react';
import {useText} from '@/i18n/provider';
import {getSubcategoriesForCategory,technologySkillCategories,technologySkillSubcategories,type TechnologySkill} from '@/data/technology-skills';
import {getShowcaseSkills,getTechnologyTileAppearance} from '@/data/technology-skill-tiles';
import styles from './technology-skills-showcase.module.css';

const PREVIEW_COUNT=12;
const normalizeSearch=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('en').trim().replace(/\s+/g,' ');

export function TechnologySkillTile({skill}:{skill:TechnologySkill}){
  const appearance=getTechnologyTileAppearance(skill);
  const iconStyle={'--technology-color':appearance.color,'--technology-tint':appearance.tint} as CSSProperties;
  return <article className={styles.card} aria-label={skill.name}>
    <span className={styles.icon} style={iconStyle} aria-hidden="true">
      {skill.id==='react'?<Atom size={29} strokeWidth={1.6}/>:skill.id==='docker'?<Box size={27} strokeWidth={1.7}/>:appearance.label}
    </span>
    <h3 className={styles.name}>{skill.name}</h3>
  </article>;
}

export function TechnologySkillsShowcase(){
  const t=useText();
  const id=useId();
  const sectionRef=useRef<HTMLElement>(null);
  const searchRef=useRef<HTMLInputElement>(null);
  const collapseRequested=useRef(false);
  const [categoryId,setCategoryId]=useState('');
  const [subcategoryId,setSubcategoryId]=useState('');
  const [query,setQuery]=useState('');
  const [expanded,setExpanded]=useState(false);
  const needle=normalizeSearch(query);
  const subcategories=categoryId?getSubcategoriesForCategory(categoryId):technologySkillSubcategories;
  const skills=getShowcaseSkills(categoryId).filter(skill=>(!subcategoryId||skill.subcategoryIds.includes(subcategoryId))&&(!needle||normalizeSearch(skill.name).includes(needle)));
  const visible=expanded?skills:skills.slice(0,PREVIEW_COUNT);
  const filtered=Boolean(categoryId||subcategoryId||needle);
  function selectCategory(value:string){setCategoryId(value);setSubcategoryId('');setExpanded(false);}
  function changeQuery(value:string){setQuery(value);setExpanded(false);}
  function selectSubcategory(value:string){setSubcategoryId(value);setExpanded(false);}
  function resetFilters(){setCategoryId('');setSubcategoryId('');setQuery('');setExpanded(false);searchRef.current?.focus();}
  function toggleExpanded(){
    collapseRequested.current=expanded;
    setExpanded(previous=>!previous);
  }
  useEffect(()=>{
    if(!expanded&&collapseRequested.current){
      collapseRequested.current=false;
      sectionRef.current?.scrollIntoView?.({block:'start',behavior:'instant'});
    }
  },[expanded]);

  return <section ref={sectionRef} className={styles.section} aria-labelledby={id+'-heading'}>
    <div className="section-wrap">
      <div className={styles.heading}>
        <h2 id={id+'-heading'} data-reveal="up">{t('Technology Skills & Expertise')}</h2>
        <p data-reveal="up" data-reveal-delay="1">{t('Browse eight technology disciplines, then explore their specialisms and individual skills.')}</p>
      </div>
      <div className={styles.content}>
        <div className={styles.filters} data-reveal="up">
          <div className={styles.filterHeading}><p className={styles.filterLabel}>{t('Explore by category')}</p><span className={styles.total}>{t('{count} skills',{count:skills.length})}</span></div>
          <div className={styles.filterList} role="group" aria-label={t('Technology categories')}>
            <button type="button" className={styles.filter} aria-pressed={!categoryId} aria-controls={id+'-skills'} onClick={()=>selectCategory('')}>{t('All categories')}</button>
            {technologySkillCategories.map(category=><button type="button" key={category.id} className={styles.filter} aria-pressed={categoryId===category.id} aria-controls={id+'-skills'} onClick={()=>selectCategory(category.id)}>{t(category.name)}</button>)}
          </div>
          <div className={styles.filterControls}>
            <label className={styles.filterField} htmlFor={id+'-search'}>{t('Search skills')}
              <span className={styles.searchField}><Search size={18} aria-hidden="true"/>
                <input ref={searchRef} id={id+'-search'} type="search" autoComplete="off" value={query} placeholder={t('Search a technology, tool or framework')} aria-controls={id+'-skills'} onChange={event=>changeQuery(event.target.value)}/>
                {query&&<button type="button" className={styles.clearSearch} aria-label={t('Clear search')} onClick={()=>{changeQuery('');searchRef.current?.focus();}}><X size={16} aria-hidden="true"/></button>}
              </span>
            </label>
            <label className={styles.filterField} htmlFor={id+'-subcategory'}>{t('Subcategory')}
              <span className={styles.selectField}><select id={id+'-subcategory'} value={subcategoryId} aria-controls={id+'-skills'} onChange={event=>selectSubcategory(event.target.value)}>
                <option value="">{t('All subcategories')}</option>
                {categoryId?subcategories.map(subcategory=><option key={subcategory.id} value={subcategory.id}>{t(subcategory.name)}</option>):technologySkillCategories.map(category=><optgroup key={category.id} label={t(category.name)}>
                  {subcategories.filter(subcategory=>subcategory.categoryId===category.id).map(subcategory=><option key={subcategory.id} value={subcategory.id}>{t(subcategory.name)}</option>)}
                </optgroup>)}
              </select><ChevronDown size={18} aria-hidden="true"/></span>
            </label>
            {filtered&&<button type="button" className={styles.reset} onClick={resetFilters}>{t('Reset filters')}</button>}
          </div>
        </div>
        <ul className={styles.grid} id={id+'-skills'}>
          {visible.map((skill,index)=><li key={categoryId+':'+skill.id} data-reveal="up" data-reveal-delay={index%4}><TechnologySkillTile skill={skill}/></li>)}
        </ul>
        {!skills.length&&<div className={styles.empty}><Search size={25} aria-hidden="true"/><h3>{t('No matching skills')}</h3><p>{t('Try another keyword or choose a different category.')}</p></div>}
        <p className={styles.status} role="status" aria-live="polite" aria-atomic="true">{t('{shown} of {total} skills',{shown:visible.length,total:skills.length})}</p>
        {skills.length>PREVIEW_COUNT&&<button type="button" className={styles.more} aria-expanded={expanded} aria-controls={id+'-skills'} onClick={toggleExpanded}>
          {t(expanded?'Show fewer technologies':'Show more technologies')}
          {!expanded&&<span aria-hidden="true">(+{skills.length-PREVIEW_COUNT})</span>}
          {expanded?<ArrowUp size={16} aria-hidden="true"/>:<ArrowDown size={16} aria-hidden="true"/>}
        </button>}
      </div>
    </div>
  </section>;
}
