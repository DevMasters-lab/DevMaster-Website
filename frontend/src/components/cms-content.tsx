'use client';
import {useLanguage} from '@/i18n/provider';
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

export function CmsContent({slug,children}:{slug:'home'|'privacy'|'terms';children:React.ReactNode}){
 const query=useQuery({queryKey:['page',slug,useLanguage().locale],queryFn:()=>api<{data:{title:string;body_markdown:string}}>('/pages/'+slug),retry:false,staleTime:60000});
 if(query.data)return <div className="prose"><h2 data-reveal="up">{query.data.data.title}</h2><Markdown remarkPlugins={[revealMarkdownBlocks]}>{query.data.data.body_markdown}</Markdown></div>;
 return <>{children}</>;
}
