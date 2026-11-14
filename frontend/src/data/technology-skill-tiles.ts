import {getSkillsForCategory,technologySkills,type TechnologySkill} from './technology-skills';

// Presentation references canonical skills; no duplicate skill records are created.
const featuredIds=['react','next-js','typescript','javascript','nestjs','node-js','laravel','python','flutter','postgresql','aws','docker'];
const preferredIds=[...featuredIds,'figma','power-bi','tensorflow','pytorch','pandas','numpy','tableau','apache-spark','apache-kafka','cisco','mikrotik','juniper-networks','tcp-ip','wireshark','linux','windows-server','ubiquiti','network-security','nmap','metasploit','burp-suite','owasp-top-10','splunk','microsoft-sentinel','microsoft-azure','google-cloud','kubernetes','terraform','ansible','jenkins','github-actions','prometheus','grafana','mysql','mongodb','redis','sqlite','microsoft-sql-server','oracle-database','sap-s-4hana','odoo','salesforce','adobe-photoshop','adobe-illustrator','adobe-xd','blender','adobe-after-effects','adobe-premiere-pro','qgis','arcgis','n8n','arduino','raspberry-pi','ros-2','ethereum','solidity'];
const priority=new Map(preferredIds.map((id,index)=>[id,index]));

export function getShowcaseSkills(categoryId=''):TechnologySkill[]{
  return [...(categoryId?getSkillsForCategory(categoryId):technologySkills)].sort((a,b)=>(priority.get(a.id)??Number.MAX_SAFE_INTEGER)-(priority.get(b.id)??Number.MAX_SAFE_INTEGER));
}

type Appearance={label:string;color:string;tint:string};
const appearances:Record<string,Appearance>={
  'react':{label:'',color:'#169abd',tint:'#def7fc'},
  'next-js':{label:'N',color:'#242b35',tint:'#e9edf2'},
  'typescript':{label:'TS',color:'#3178c6',tint:'#e4efff'},
  'javascript':{label:'JS',color:'#a47a00',tint:'#fff2c6'},
  'nestjs':{label:'N',color:'#d83d65',tint:'#ffe6ee'},
  'node-js':{label:'node',color:'#528f36',tint:'#e8f5df'},
  'laravel':{label:'L',color:'#e66750',tint:'#ffebe5'},
  'python':{label:'Py',color:'#377bae',tint:'#e5efff'},
  'flutter':{label:'F',color:'#0789bd',tint:'#e0f5ff'},
  'postgresql':{label:'Pg',color:'#32668e',tint:'#e3edfc'},
  'aws':{label:'aws',color:'#a76b09',tint:'#fff2db'},
  'docker':{label:'',color:'#228bbd',tint:'#e4f0ff'},
};
const tones=[{color:'#7450bb',tint:'#f0e9fc'},{color:'#277b86',tint:'#e3f5f5'},{color:'#3971ad',tint:'#e7f0ff'},{color:'#a87220',tint:'#fff2d8'}];

export function getTechnologyTileAppearance(skill:TechnologySkill):Appearance{
  if(appearances[skill.id])return appearances[skill.id];
  const words=skill.name.split(/[\s.-]+/).filter(Boolean);
  const label=words.length>1?words.slice(0,2).map(word=>word[0]).join('').toUpperCase():skill.name.slice(0,2);
  const tone=tones[[...skill.id].reduce((sum,char)=>sum+char.charCodeAt(0),0)%tones.length];
  return {label,...tone};
}
