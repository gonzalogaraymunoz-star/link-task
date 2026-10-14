import legacy from './legacy.js';
import {EXPERIENCE_CSS} from './experience-style.js';
import {EXPERIENCE_JS} from './experience-motion.js';

const PREFIX='/_experience';
const RELEASE='2026-10-14-b';

export function enhanceHtml(html){
 if(!html.includes('</head>')||!html.includes('</body>'))return html;
 const styles='<link rel="stylesheet" href="'+PREFIX+'.css?v='+RELEASE+'">';
 const motion='<script src="'+PREFIX+'.js?v='+RELEASE+'" defer></script>';
 return html.replace('</head>',styles+'</head>').replace('</body>',motion+'</body>');
}

export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname===PREFIX+'.css'){
   return new Response(EXPERIENCE_CSS,{headers:{'content-type':'text/css; charset=utf-8','cache-control':'public, max-age=600','x-content-type-options':'nosniff'}});
  }
  if(request.method==='GET'&&url.pathname===PREFIX+'.js'){
   return new Response(EXPERIENCE_JS,{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'public, max-age=600','x-content-type-options':'nosniff'}});
  }
  const response=await legacy.fetch(request,env,ctx);
  if(request.method!=='GET'||url.pathname!=='/'||!response.headers.get('content-type')?.includes('text/html'))return response;
  const html=enhanceHtml(await response.text());
  const headers=new Headers(response.headers);headers.delete('content-length');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
 }
};
