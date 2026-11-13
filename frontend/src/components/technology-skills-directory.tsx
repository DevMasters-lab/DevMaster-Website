'use client';

import {useId,useRef,useState} from 'react';
import {ChevronDown,ChevronUp,Search,X} from 'lucide-react';
import {useText} from '@/i18n/provider';
import {getSkillsForCategory,getSubcategoriesForCategory,technologySkillCategories,technologySkillSubcategories,technologySkills,type TechnologySkill,type TechnologySkillSubcategory} from '@/data/technology-skills';
import {getTechnologySkillIcon} from './technology-skill-icons';
import styles from './technology-skills-directory.module.css';

const INITIAL_SKILLS=8;
const normalize=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('en').trim().replace(/\s+/g,' ');
type Props={initialCategory?:string;initialSubcategory?:string;fullPage?:boolean};

function SubcategoryCard({subcategory,skills,fullPage}:{subcategory:TechnologySkillSubcategory;skills:readonly TechnologySkill[];fullPage:boolean}){
  const t=useText();
  const [expanded,setExpanded]=useState(false);
  const id=useId();
  const Heading=fullPage?'h3':'h4';
  return <article className={styles.card} aria-labelledby={id+'-title'}>
    <div className={styles.cardHeading}><div>
      <Heading id={id+'-title'}>{t(subcategory.name)}</Heading>
      <p>{skills.length===1?t('1 skill'):t('{count} skills',{count:skills.length})}</p>
    </div></div>
    <ul id={id+'-skills'} className={styles.skills} aria-label={t('Skills in {category}',{category:t(subcategory.name)})}>
      {(expanded?skills:skills.slice(0,INITIAL_SKILLS)).map(skill=><li key={skill.id} className={styles.skill}>{skill.name}</li>)}
    </ul>
    {skills.length>INITIAL_SKILLS&&<button type="button" className={styles.expandSkills} aria-expanded={expanded} aria-controls={id+'-skills'} onClick={()=>setExpanded(value=>!value)}>
      {t(expanded?'View Less':'View More')}
      {expanded?<ChevronUp size={15} aria-hidden="true"/>:<ChevronDown size={15} aria-hidden="true"/>}
    </button>}
  </article>;
}

export function TechnologySkillsDirectory({initialCategory='',initialSubcategory='',fullPage=false}:Props={}){
  const t=useText();
  const id=useId();
  const searchRef=useRef<HTMLInputElement>(null);
  const initialMain=technologySkillCategories.some(category=>category.id===initialCategory)?initialCategory:'';
  const initialSub=technologySkillSubcategories.find(subcategory=>subcategory.id===initialSubcategory&&(!initialMain||subcategory.categoryId===initialMain));
  const [categoryId,setCategoryId]=useState(initialMain||initialSub?.categoryId||'');
  const [subcategoryId,setSubcategoryId]=useState(initialSub?.id||'');
  const [query,setQuery]=useState('');
  const Heading=fullPage?'h1':'h2';
  const MainHeading=fullPage?'h2':'h3';
  const needle=normalize(query);
  const availableSubcategories=categoryId?getSubcategoriesForCategory(categoryId):technologySkillSubcategories;
  const allowedSubcategories=availableSubcategories.filter(subcategory=>!subcategoryId||subcategory.id===subcategoryId);
  const allowedIds=new Set(allowedSubcategories.map(subcategory=>subcategory.id));
  const matching=technologySkills.filter(skill=>skill.subcategoryIds.some(subcategory=>allowedIds.has(subcategory))&&(!needle||normalize(skill.name).includes(needle)));
  const groups=technologySkillCategories.flatMap(category=>{
    if(categoryId&&category.id!==categoryId)return [];
    const subcategories=allowedSubcategories.filter(subcategory=>subcategory.categoryId===category.id).flatMap(subcategory=>{
      const skills=matching.filter(skill=>skill.subcategoryIds.includes(subcategory.id));
      return skills.length?[{subcategory,skills}]:[];
    });
    return subcategories.length?[{category,subcategories,skillCount:new Set(subcategories.flatMap(group=>group.skills.map(skill=>skill.id))).size}]:[];
  });
  const subcategoryCount=groups.reduce((total,group)=>total+group.subcategories.length,0);
  const filtered=Boolean(needle||categoryId||subcategoryId);

  function changeFilters(main:string,sub:string){
    setCategoryId(main);setSubcategoryId(sub);
    if(fullPage){
      const url=new URL(window.location.href);
      if(main)url.searchParams.set('category',main);else url.searchParams.delete('category');
      if(sub)url.searchParams.set('subcategory',sub);else url.searchParams.delete('subcategory');
      window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
    }
  }
  function reset(){setQuery('');changeFilters('','');searchRef.current?.focus();}

  return <section className={styles.section} aria-labelledby={id+'-title'}>
    <div className="section-wrap">
      <div className={styles.heading}>
        <div className="eyebrow">{t(fullPage?'TECHNOLOGY SKILLS':'02 / TECHNOLOGY SKILLS')}</div>
        <Heading id={id+'-title'}>{t(fullPage?'All Technology Skills':'Technology Skills & Expertise')}</Heading>
        <p>{t('Choose a main category and subcategory, or search all available technology skills.')}</p>
        <p className={styles.hierarchyGuide}>{t('Main Category → Subcategory → Individual Skills')}</p>
      </div>
      <div className={styles.toolbar}>
        <label className={styles.field} htmlFor={id+'-search'}>{t('Search skills')}<span className={styles.searchField}>
          <Search size={18} aria-hidden="true"/><input ref={searchRef} id={id+'-search'} type="search" autoComplete="off" value={query} placeholder={t('Search a technology, tool or framework')} onChange={event=>setQuery(event.target.value)}/>
          {query&&<button type="button" className={styles.clearSearch} aria-label={t('Clear search')} onClick={()=>{setQuery('');searchRef.current?.focus();}}><X size={16} aria-hidden="true"/></button>}
        </span></label>
        <label className={styles.field} htmlFor={id+'-category'}>{t('Main category')}<select id={id+'-category'} value={categoryId} onChange={event=>changeFilters(event.target.value,'')}>
          <option value="">{t('All main categories')}</option>
          {technologySkillCategories.map(category=><option key={category.id} value={category.id}>{t(category.name)} ({getSkillsForCategory(category.id).length})</option>)}
        </select></label>
        <label className={styles.field} htmlFor={id+'-subcategory'}>{t('Subcategory')}<select id={id+'-subcategory'} value={subcategoryId} onChange={event=>{const subcategory=technologySkillSubcategories.find(item=>item.id===event.target.value);changeFilters(subcategory?.categoryId||categoryId,subcategory?.id||'');}}>
          <option value="">{t('All subcategories')}</option>
          {availableSubcategories.map(subcategory=><option key={subcategory.id} value={subcategory.id}>{t(subcategory.name)}</option>)}
        </select></label>
      </div>
      <div className={styles.results}>
        <p role="status" aria-live="polite" aria-atomic="true">
          {matching.length===1?t('1 skill'):t('{count} skills',{count:matching.length})}
          <span aria-hidden="true"> · </span>{groups.length===1?t('1 category'):t('{count} categories',{count:groups.length})}
          <span aria-hidden="true"> · </span>{subcategoryCount===1?t('1 subcategory'):t('{count} subcategories',{count:subcategoryCount})}
        </p>
        {filtered&&<button type="button" className={styles.reset} onClick={reset}>{t('Reset filters')}</button>}
      </div>
      {groups.length?<div className={styles.mainGroups}>
        {groups.map(({category,subcategories,skillCount})=>{
          const Icon=getTechnologySkillIcon(category.name);
          return <section key={category.id} className={styles.mainGroup} aria-labelledby={id+'-'+category.id}>
            <div className={styles.mainGroupHeading}><span className={styles.categoryIcon}><Icon size={24} strokeWidth={1.6} aria-hidden="true"/></span><div>
              <MainHeading id={id+'-'+category.id}>{t(category.name)}</MainHeading>
              <p>{t(category.description)}</p>
              <p className={styles.mainMeta}>{subcategories.length===1?t('1 subcategory'):t('{count} subcategories',{count:subcategories.length})}<span aria-hidden="true"> · </span>{skillCount===1?t('1 skill'):t('{count} skills',{count:skillCount})}</p>
            </div></div>
            <div className={styles.grid} role="group" aria-label={t('Subcategories in {category}',{category:t(category.name)})}>
              {subcategories.map(({subcategory,skills})=><SubcategoryCard key={[subcategory.id,categoryId,subcategoryId,needle].join(':')} subcategory={subcategory} skills={skills} fullPage={fullPage}/>)}
            </div>
          </section>;
        })}
      </div>:<div className={styles.empty}>
        <Search size={27} strokeWidth={1.5} aria-hidden="true"/><MainHeading>{t('No matching skills')}</MainHeading><p>{t('Try another keyword or choose a different category.')}</p>
        <button type="button" className="button button-outline small" onClick={reset}>{t('Reset filters')}</button>
      </div>}
    </div>
  </section>;
}
