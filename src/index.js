
import {OAuthProvider, AuthorizationError, insufficientScope} from '@cloudflare/workers-oauth-provider';
import {APP,SUPA,HOST,RESOURCE,READ,WRITE,TOOLS,getUser,runTool} from './core.js';
import {consentScript} from './consent.js';

const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}
});
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const securityHeaders={
 'cache-control':'no-store','referrer-policy':'no-referrer','x-frame-options':'DENY',
 'x-content-type-options':'nosniff',
 'content-security-policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self' "+SUPA+"; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
};

function consentPage(details,handle,env){
 const scopes=details.scope.map(scope=>
  '<label><input type="checkbox" name="scope" value="'+escapeHtml(scope)+'" checked> '+escapeHtml(scope)+'</label>'
 ).join('');
 return [
  '<!doctype html><html lang="es"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Conectar LINK TASK</title>',
  '<style>body{font:15px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f7f8f5;color:#20382c;margin:0;padding:24px}main{max-width:490px;margin:6vh auto}header{font-size:12px;letter-spacing:.18em;font-weight:700;margin-bottom:30px}section{background:white;border-radius:24px;border:1px solid #e2e8e1;padding:28px}h1{font-size:38px;letter-spacing:-.05em;font-weight:500;margin:0 0 10px}p{color:#62776b;line-height:1.55}p.small{font-size:12px}label{display:block;border-top:1px solid #ebf0eb;padding:10px}input:not([type=checkbox]){display:block;width:100%;box-sizing:border-box;border:1px solid #d4dfd5;border-radius:12px;padding:13px;margin:10px 0;font:inherit}.actions{display:flex;gap:10px;margin-top:16px}button{border:1px solid #d4dfd5;background:white;color:#20382c;padding:12px 17px;border-radius:12px;cursor:pointer;font:inherit}.primary{background:#20382c;color:white}#message{color:#a14e3e;min-height:18px;font-size:13px}</style>',
  '</head><body><main><header>LINK / TASK · CONEXIÓN SEGURA</header><section><h1>Conectar tu asistente</h1>',
  '<p><strong>'+escapeHtml(details.clientName)+'</strong> solicita autorización para trabajar en tu LINK TASK.</p>',
  '<p class="small">Destino de la autorización: '+escapeHtml(details.redirectHost)+(details.redirectIsLoopback?' (aplicación local)':'')+'</p>',
  scopes,
  '<p class="small">El asistente solo podrá operar las herramientas concedidas. No puede leer el historial privado de ChatGPT por su cuenta.</p>',
  '<form id="oauth-consent"><input type="hidden" name="handle" value="'+escapeHtml(handle)+'">',
  '<input type="email" id="email" autocomplete="username" placeholder="Tu correo de LINK TASK" required>',
  '<input type="password" id="password" autocomplete="current-password" placeholder="Contraseña de LINK TASK" required>',
  '<div class="actions"><button type="button" class="primary" id="approve">Ingresar y autorizar</button>',
  '<button type="button" id="deny">Cancelar</button></div><p id="message" role="status"></p></form>',
  '</section><p class="small">Introduce tus credenciales solamente en este dominio de LINK TASK. No las envíes por el chat.</p></main>',
  '<div hidden id="supabase-config" data-url="'+escapeHtml(SUPA)+'" data-key="'+escapeHtml(env.SUPABASE_PUBLISHABLE_KEY)+'"></div>',
  '<script src="/consent.js" defer></script></body></html>'
 ].join('');
}

function redirectJson(headers,redirect){
 const h=new Headers(headers);
 h.set('content-type','application/json; charset=utf-8');
 h.set('cache-control','no-store');
 h.delete('location');
 return new Response(JSON.stringify({redirect}),{status:200,headers:h});
}

async function handleAuthorize(request,env){
 const oauth=env.OAUTH_PROVIDER;
 if(request.method==='GET'){
  const parsed=await oauth.parseAuthRequest(request);
  const details=await oauth.describeConsent(parsed);
  const consent=await oauth.beginConsent(parsed);
  const headers=new Headers(consent.headers);
  Object.entries(securityHeaders).forEach(([k,v])=>headers.set(k,v));
  headers.set('content-type','text/html; charset=utf-8');
  return new Response(consentPage(details,consent.handle,env),{headers});
 }
 if(request.method==='POST'){
  // Only JavaScript running on this Worker origin can approve a login.
  if(request.headers.get('origin')!==HOST)return json({error:'origin_not_allowed'},403);
  const body=await request.json().catch(()=>null);
  if(!body||typeof body.handle!=='string')return json({error:'invalid_request'},400);
  if(body.decision!=='approve'){
   const denied=await oauth.denyConsent(request,body.handle);
   return redirectJson(denied.headers,denied.headers.get('location'));
  }
  const authHeader=request.headers.get('authorization')||'';
  if(!authHeader.startsWith('Bearer '))return json({error:'authentication_required'},401);
  const upstreamJwt=authHeader.slice(7).trim();
  const user=await getUser(upstreamJwt,env);
  if(!user)return json({error:'supabase_session_invalid'},401);
  const requested=Array.isArray(body.scope)?body.scope.filter(s=>typeof s==='string'):[];
  const selected=requested.filter(s=>[READ,WRITE,'offline_access'].includes(s));
  if(!selected.includes(READ))return json({error:'read_scope_required'},400);
  const approved=await oauth.approveConsent(request,body.handle,{scope:selected});
  const completed=await oauth.completeAuthorization({
   request:approved.request,
   userId:user.id,metadata:{origin:'LINK TASK'},
   scope:selected,
   props:{userId:user.id,upstreamJwt}
  });
  return redirectJson(approved.headers,completed.redirectTo);
 }
 return json({error:'method_not_allowed'},405);
}

const mcpHandler={async fetch(request,env,ctx){
 const userId=ctx.props?.userId,upstreamJwt=ctx.props?.upstreamJwt;
 const user=await getUser(upstreamJwt,env);
 if(!user||user.id!==userId){
  // First release: after upstream JWT expiration a fresh OAuth login is needed.
  return json({error:'supabase_session_expired_reconnect'},401);
 }
 if(request.method!=='POST')return json({error:'method_not_allowed'},405,{allow:'POST'});
 if(Number(request.headers.get('content-length')||0)>16000)return json({error:'payload_too_large'},413);
 const body=await request.json().catch(()=>null);
 const fail=(id,code,message)=>json({jsonrpc:'2.0',id,error:{code,message}});
 const reply=(id,result)=>json({jsonrpc:'2.0',id,result},200,{'mcp-protocol-version':'2025-06-18'});
 if(!body||body.jsonrpc!=='2.0'||typeof body.method!=='string')return fail(null,-32600,'Invalid Request');
 if(!Object.prototype.hasOwnProperty.call(body,'id'))return new Response(null,{status:202});
 if(body.method==='initialize')return reply(body.id,{
  protocolVersion:'2025-06-18',capabilities:{tools:{}},
  serverInfo:{name:'LINK TASK',version:'0.5.0'},
  instructions:'No registras conversaciones automáticamente. Usa herramientas de escritura solo con autorización del usuario.'
 });
 if(body.method==='ping')return reply(body.id,{});
 if(body.method==='tools/list')return reply(body.id,{tools:TOOLS});
 if(body.method!=='tools/call')return fail(body.id,-32601,'Method not found');
 const name=body.params?.name,tool=TOOLS.find(t=>t.name===name);
 if(!tool)return fail(body.id,-32602,'Unknown tool');
 const isRead=!!tool.annotations?.readOnlyHint;
 if(!ctx.auth.scope.includes(isRead?READ:WRITE))return insufficientScope(ctx.auth,[READ,WRITE]);
 const args=body.params?.arguments;
 const values=await runTool(name,args&&typeof args==='object'&&!Array.isArray(args)?args:{},user,upstreamJwt,env);
 return reply(body.id,{content:[{type:'text',text:JSON.stringify(values.data)}],isError:!values.ok});
}};

const defaultHandler={async fetch(request,env){
 const path=new URL(request.url).pathname;
 try{
  if(path==='/health')return json({service:'LINK TASK MCP',status:'ready',version:'0.5.0',tools:TOOLS.length,oauth:true});
  if(path==='/consent.js')return new Response(consentScript,{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'}});
  if(path==='/authorize')return handleAuthorize(request,env);
  if(path==='/')return new Response('LINK TASK MCP — '+RESOURCE,{headers:{'content-type':'text/plain; charset=utf-8'}});
  return json({error:'not_found'},404);
 }catch(error){
  if(error instanceof AuthorizationError){
   if(error.redirectTo)return Response.redirect(error.redirectTo,302);
   return json({error:error.description||'authorization_error'},400);
  }
  return json({error:'authorization_unavailable'},500);
 }
}};
export default new OAuthProvider({
 apiRoute:'/mcp',apiHandler:mcpHandler,defaultHandler,
 authorizeEndpoint:'/authorize',tokenEndpoint:'/oauth/token',
 clientRegistrationEndpoint:'/oauth/register',
 scopesSupported:[READ,WRITE,'offline_access'],requiredScopes:[READ],
 resourceMetadata:{resource:RESOURCE,resource_name:'LINK TASK',authorization_servers:[HOST]},
 clientIdMetadataDocumentEnabled:true
});
