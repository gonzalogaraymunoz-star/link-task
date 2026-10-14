import legacy from './legacy.js';
import {KANBAN_SCRIPT} from './kanban.js';
import {EXPERIENCE_CSS} from './experience-style.js';
import {EXPERIENCE_JS} from './experience-motion.js';
import {BRAND_CSS} from './link-brand.css.js';
import {BRAND_SCRIPT} from './link-brand.js';
import {RESPONSIVE_CSS} from './responsive.css.js';
import {MOBILE_SCRIPT} from './mobile.js';

const PREFIX='/_experience';
const KANBAN_PATH='/_kanban.js';
const RELEASE='2026-10-14-kanban-v1';

export function enhanceHtml(html){
 if(!html.includes('</head>')||!html.includes('</body>'))return html;
 const styles='<link rel="stylesheet" href="'+PREFIX+'.css?v='+RELEASE+'">';
 const motion='<script src="'+PREFIX+'.js?v='+RELEASE+'" defer></script>';
 const brandingScript='<script src="/_link-brand.js?v='+RELEASE+'" defer></script>';
 const responsiveScript='<script src="/_mobile.js?v='+RELEASE+'" defer></script>';
 const kanbanScript='<script src="'+KANBAN_PATH+'?v='+RELEASE+'" defer></script>';
 const earlyMode='<script>try{const stored=localStorage.getItem("linktask_brand_v1")==="1"?localStorage.getItem("linktask_visual_mode"):"day";document.documentElement.dataset.visual=stored==="night"?"night":"day";}catch(e){document.documentElement.dataset.visual="day"}</script>';
 const brandStyles='<link rel="stylesheet" href="/_link-brand.css?v='+RELEASE+'">';
 const responsiveStyles='<link rel="stylesheet" href="/_responsive.css?v='+RELEASE+'">';
 return html.replace('content="width=device-width,initial-scale=1"','content="width=device-width,initial-scale=1,viewport-fit=cover"')
  .replace('</head>',earlyMode+styles+brandStyles+responsiveStyles+'</head>')
  .replace('</body>',motion+brandingScript+responsiveScript+kanbanScript+'</body>');
}

export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname===KANBAN_PATH){return new Response(KANBAN_SCRIPT,{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'public, max-age=600'}});}
  if(request.method==='GET'&&url.pathname===PREFIX+'.css'){
   return new Response(EXPERIENCE_CSS,{headers:{'content-type':'text/css; charset=utf-8','cache-control':'public, max-age=600','x-content-type-options':'nosniff'}});
  }
  if(request.method==='GET'&&url.pathname==='/_link-brand.css'){
   return new Response(BRAND_CSS,{headers:{'content-type':'text/css; charset=utf-8','cache-control':'public, max-age=600','x-content-type-options':'nosniff'}});
  }
  if(request.method==='GET'&&url.pathname==='/_link-brand.js'){
   return new Response(BRAND_SCRIPT,{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'public, max-age=600','x-content-type-options':'nosniff'}});
  }
  if(request.method==='GET'&&url.pathname==='/_responsive.css'){
   return new Response(RESPONSIVE_CSS,{headers:{'content-type':'text/css; charset=utf-8','cache-control':'public, max-age=600','x-content-type-options':'nosniff'}});
  }
  if(request.method==='GET'&&url.pathname==='/_mobile.js'){
   return new Response(MOBILE_SCRIPT,{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'public, max-age=600','x-content-type-options':'nosniff'}});
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
