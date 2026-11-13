import {TechnologySkillsDirectory} from '@/components/technology-skills-directory';
import {technologySkillCategories,technologySkillSubcategories} from '@/data/technology-skills';
import {pageMetadata} from '@/i18n/server';

export async function generateMetadata(){return pageMetadata('/technology-skills');}

export default async function Page({searchParams}:{searchParams:Promise<{category?:string|string[];subcategory?:string|string[]}>}){
  const {category,subcategory}=await searchParams;
  const main=typeof category==='string'&&technologySkillCategories.some(item=>item.id===category)?category:'';
  const sub=typeof subcategory==='string'?technologySkillSubcategories.find(item=>item.id===subcategory&&(!main||item.categoryId===main)):undefined;
  const initialCategory=main||sub?.categoryId||'';
  const initialSubcategory=sub?.id||'';
  return <TechnologySkillsDirectory key={initialCategory+':'+initialSubcategory} initialCategory={initialCategory} initialSubcategory={initialSubcategory} fullPage/>;
}
