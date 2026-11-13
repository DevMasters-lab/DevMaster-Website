'use client';
import {useText} from '@/i18n/provider';
import {LanguageSwitcher} from './LanguageSwitcher';
import {ThemeToggle} from './ThemeToggle';
import Link from '@/i18n/navigation';
import {usePathname} from '@/i18n/navigation';
import {ArrowUpRight} from 'lucide-react';
export function SiteHeader(){const t=useText();const path=usePathname();if((path==='/expert'||path.startsWith('/expert/')))return null;return <><div className="announcement"><span className="live-dot"/> {" "}{t("Independent minds. Shared ambition.")}{" "}<Link href="/be-our-team">{""}{t("Meet your next opportunity")}{" "}<ArrowUpRight size={12}/></Link></div><header className="site-header"><Link className="brand" href="/home" aria-label={t("DevMasters home")}><img src="/logo-light.png" alt={t("DevMasters")} width="216" height="74"/></Link><div className="header-actions"><Link className="portal-link" href="/login">{""}{t("Expert login")}{""}</Link><div className="header-tools"><LanguageSwitcher/><ThemeToggle/></div><Link href="/hire-our-team" className="button button-dark small">{""}{t("Let’s work together")}{" "}<ArrowUpRight size={15}/></Link></div></header></>;}
