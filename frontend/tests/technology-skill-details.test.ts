import {describe,expect,it} from 'vitest';
import {getTechnologySkillDetails} from '../src/data/technology-skill-details';
import {technologySkills} from '../src/data/technology-skills';
import english from '../messages/en.json';
import khmer from '../messages/km.json';

const sourceKeys=new Map(Object.entries(english.ui).map(([key,value])=>[value,key]));

describe('technology skill detail coverage',()=>{
  it('provides a translated description and three useful applications for all 344 canonical skills',()=>{
    expect(technologySkills).toHaveLength(344);
    for(const skill of technologySkills){
      const details=getTechnologySkillDetails(skill);
      expect(details.description,skill.name).toContain('{technology}');
      expect(details.applications,skill.name).toHaveLength(3);
      expect(new Set(details.applications).size,skill.name).toBe(3);
      for(const source of [details.description,...details.applications]){
        const key=sourceKeys.get(source);
        expect(key,`${skill.name}: ${source}`).toBeDefined();
        const localized=(khmer.ui as Record<string,string>)[key!];
        expect(localized,skill.name).toBeTruthy();
        expect(localized,skill.name).not.toBe(source);
        expect(localized,skill.name).toMatch(/[\u1780-\u17ff]/);
        if(source===details.description)expect(localized,skill.name).toContain('{technology}');
      }
    }
  });

  it('uses relevant applications for development, support, security and geospatial skills',()=>{
    const applications=(id:string)=>getTechnologySkillDetails(technologySkills.find(skill=>skill.id===id)!).applications;
    expect(applications('react')).toContain('Accessible, interactive user interfaces');
    expect(applications('servicenow')).toContain('User support and incident resolution');
    expect(applications('qgis')).toContain('Mapping and geographic data management');
    expect(applications('metasploit')).toContain('Authorized application and network assessments');
  });
});
