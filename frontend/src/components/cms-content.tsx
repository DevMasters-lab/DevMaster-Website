'use client';
import {useText,useDate,useStatus,useLanguage} from '@/i18n/provider';
import {useQuery} from '@tanstack/react-query';
import Markdown from 'react-markdown';
import type {Root} from 'mdast';
import {api} from '@/lib/api';

// Animate top-level Markdown blocks without also animating nested list paragraphs.
function revealMarkdownBlocks(){
 return (tree:Root)=>{
  let index=0;
  for(const node of tree.children){
   if(!['heading','paragraph','list','blockquote','code','thematicBreak'].includes(node.type))continue;
   const properties=node.data?.hProperties as Record<string,unknown>|undefined;
   node.data={...node.data,hProperties:{...properties,'data-reveal':'up','data-reveal-delay':index++%4}};
  }
 };
}

export function CmsContent({slug,children}:{slug:string;children:React.ReactNode}){const t=useText();const q=useQuery({queryKey:['page',slug,useLanguage().locale],queryFn:()=>api<{data:{title:string;body_markdown:string}}>('/pages/'+slug),retry:false,staleTime:60000});if(['invite-us-to-bid','hire-our-team','be-our-team','contact'].includes(slug))return <><div className="prose">{q.data&&<><h2 data-reveal="up">{q.data.data.title}</h2><Markdown remarkPlugins={[revealMarkdownBlocks]}>{q.data.data.body_markdown}</Markdown></>}</div>{children}</>;if(q.data)return <><div className="prose"><h2 data-reveal="up">{q.data.data.title}</h2><Markdown remarkPlugins={[revealMarkdownBlocks]}>{q.data.data.body_markdown}</Markdown></div>{['invite-us-to-bid','hire-our-team','be-our-team','contact'].includes(slug)&&children}</>;return <>{children}</>;}

export function ServiceCatalogue({children}:{children:React.ReactNode}){const t=useText();
 const query=useQuery({queryKey:['public-services',useLanguage().locale],queryFn:()=>api<{data:{services:{id:string;name:string;description:string|null}[]}}>('/reference-data'),staleTime:60000});
 if(query.isPending)return <div className="skeleton" role="status" aria-label={t("Loading services")}/>;
 if(query.error)return <><div className="error-box" role="alert">{""}{t("The current service catalogue could not be loaded. Please try again.")}{""}</div>{children}</>;
 if(!query.data?.data.services.length)return <>{children}</>;
 return <div className="service-grid">{query.data.data.services.map((service,index)=><article className="service-card" key={service.id} data-reveal="up" data-reveal-delay={index%4}><div className="card-top"><span className="eyebrow">{""}{t("DEVMASTERS SERVICE")}{""}</span></div><h3>{service.name}</h3><p>{service.description}</p></article>)}</div>;
}
