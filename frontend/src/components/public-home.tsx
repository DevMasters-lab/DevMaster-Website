'use client';
import {useText,useDate,useStatus,useLanguage} from '@/i18n/provider';
import {CmsContent} from './cms-content';
import {LogoCarousel} from './logo-carousel';
import {TechnologySkillsShowcase} from './technology-skills-showcase';
import {HomeEngagementActions} from './home-engagement-actions';
import {Code2,Network,ShieldCheck,Database,MoveUpRight} from 'lucide-react';
import styles from './public-home.module.css';

export function Home(){const t=useText();
return <div className={styles.home}><CmsContent slug="home">
<section className="hero section-wrap"><div className="hero-copy"><h1 className="sr-only">{t("Work with DevMasters")}</h1><HomeEngagementActions/></div>
<div className="hero-visual" data-reveal="up" data-reveal-delay="2" aria-label={t("A connected network of software, security, network and data expertise")}><div className="visual-grid"/><span className="visual-label">{""}{t("THE DEVMASTERS NETWORK")}{""}</span><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="network-center"><span>{""}{t("dm")}{""}<span className="spark">✳</span></span><small>{""}{t("BETTER, TOGETHER.")}{""}</small></div><div className="expert-node node-code"><div className="node-icon"><Code2 size={23}/></div><div><strong>{""}{t("Build")}{""}</strong><small>{""}{t("Software & products")}{""}</small></div><span className="node-status"/></div><div className="expert-node node-shield"><div className="node-icon"><ShieldCheck size={22}/></div><div><strong>{""}{t("Protect")}{""}</strong><small>{""}{t("Cybersecurity")}{""}</small></div></div><div className="expert-node node-network"><div className="node-icon"><Network size={23}/></div><div><strong>{""}{t("Connect")}{""}</strong><small>{""}{t("Networks & systems")}{""}</small></div></div><div className="expert-node node-data"><div className="node-icon"><Database size={22}/></div><div><strong>{""}{t("Understand")}{""}</strong><small>{""}{t("Data & information")}{""}</small></div></div><div className="visual-bottom"><span><span className="live-dot"/> {" "}{t("EXPERTISE WITHOUT SILOS")}{""}</span><MoveUpRight size={18}/></div><div className="floating-dot dot-one"/><div className="floating-dot dot-two"/></div></section>
</CmsContent><TechnologySkillsShowcase/><LogoCarousel/></div>;}
