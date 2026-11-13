import {BrainCircuit,Cloud,Code2,Cpu,Database,Network,Palette,ShieldCheck,type LucideIcon} from 'lucide-react';

const icons:Record<string,LucideIcon>={
  'Software Development':Code2,
  'Data & Artificial Intelligence':BrainCircuit,
  'Networks & Infrastructure':Network,
  'Cybersecurity':ShieldCheck,
  'Cloud & DevOps':Cloud,
  'Database & Information Systems':Database,
  'Design & Digital Media':Palette,
  'Emerging & Specialized Technologies':Cpu,
};

export const getTechnologySkillIcon=(categoryName:string):LucideIcon=>icons[categoryName]||Code2;
