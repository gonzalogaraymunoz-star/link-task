// Google Tasks OAuth integration. Secrets live in Cloudflare, never in Git.
const ORIGIN='https://link-task-mcp.gonzalogaraymunoz.workers.dev';
const CALLBACK=ORIGIN+'/google/callback';
const SCOPE='https://www.googleapis.com/auth/tasks';
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const enc=new TextEncoder(),dec=new TextDecoder();
function b64(bytes){return btoa(String.fromCharCode(...bytes))}
function from64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
function configured(env){return !!(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&env.GOOGLE_TOKEN_ENCRYPTION_KEY&&env.OAUTH_KV)}
async function key(env){
 const raw=from64(env.GOOGLE_TOKEN_ENCRYPTION_KEY);
 if(raw.length!==32)throw new Error('invalid_encryption_key');
 return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
}
async function seal(value,env){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(env),enc.encode(JSON.stringify(value)));
 return b64(iv)+'.'+b64(new Uint8Array(data));
}
async function unseal(payload,env){
 const [a,b]=(payload||'').split('.');
 if(!a||!b)throw new Error('invalid_encrypted_token');
 const value=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(a)},await key(env),from64(b));
 return JSON.parse(dec.decode(value));
}
const tokenKey=id=>'google:token:'+id;
const stateKey=state=>'google:state:'+state;
async function exchange(form,env){
 const body=new URLSearchParams({...form,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET});
 const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
 if(!res.ok)throw new Error('google_token_exchange_failed');
 return res.json();
}
export async function googleTool(name,args,user,env){
 if(!configured(env))return {ok:false,data:{error:'google_not_configured'}};
 try{
  if(name==='google_connect'){
   const state=b64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('/','_').replaceAll('+','-').replaceAll('=','');
   await env.OAUTH_KV.put(stateKey(state),JSON.stringify({userId:user.id}),{expirationTtl:600});
   const p=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:CALLBACK,response_type:'code',scope:SCOPE,access_type:'offline',prompt:'consent',state});
   return {ok:true,data:{authorization_url:'https://accounts.google.com/o/oauth2/v2/auth?'+p,expires_in_seconds:600}};
  }
  if(name==='google_disconnect'){
   await env.OAUTH_KV.delete(tokenKey(user.id));
   return {ok:true,data:{disconnected:true}};
  }
  const saved=await env.OAUTH_KV.get(tokenKey(user.id));
  if(!saved)return {ok:false,data:{error:'google_not_connected'}};
  const credential=await unseal(saved,env);
  if(!credential.refresh_token)return {ok:false,data:{error:'google_reconnect_required'}};
  // Refresh for each operation; access tokens are never stored.
  const tokens=await exchange({grant_type:'refresh_token',refresh_token:credential.refresh_token},env);
  const call=async (path,options={})=>{
   const response=await fetch('https://tasks.googleapis.com/tasks/v1'+path,{...options,headers:{Authorization:'Bearer '+tokens.access_token,'content-type':'application/json',...(options.headers||{})}});
   const data=await response.json().catch(()=>({}));
   return {ok:response.ok,data:response.ok?data:{error:'google_api_error',status:response.status,details:data.error?.message||null}};
  };
  if(name==='google_tasklists')return call('/users/@me/lists?maxResults=100');
  if(name==='google_tasks_list'){
   if(typeof args.tasklist_id!=='string'||!args.tasklist_id.trim())return {ok:false,data:{error:'tasklist_id_required'}};
   const q=new URLSearchParams({maxResults:'100',showCompleted:'false',showHidden:'false'});
   return call('/lists/'+encodeURIComponent(args.tasklist_id)+'/tasks?'+q);
  }
  if(name==='google_task_create'){
   if(typeof args.tasklist_id!=='string'||!args.tasklist_id.trim()||typeof args.title!=='string'||!args.title.trim())return {ok:false,data:{error:'tasklist_id_and_title_required'}};
   const task={title:args.title.trim().slice(0,500)};
   if(typeof args.notes==='string')task.notes=args.notes.slice(0,4000);
   if(args.due){
    if(typeof args.due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(args.due)||Number.isNaN(Date.parse(args.due)))return {ok:false,data:{error:'due_must_be_yyyy_mm_dd'}};
    task.due=args.due+'T00:00:00.000Z';
   }
   return call('/lists/'+encodeURIComponent(args.tasklist_id)+'/tasks',{method:'POST',body:JSON.stringify(task)});
  }
  return {ok:false,data:{error:'unknown_google_tool'}};
 }catch(e){return {ok:false,data:{error:e.message==='google_token_exchange_failed'?'google_reconnect_required':'google_connection_failed'}}}
}
export async function googleCallback(request,env){
 if(!configured(env))return json({error:'google_not_configured'},503);
 const u=new URL(request.url),state=u.searchParams.get('state'),code=u.searchParams.get('code');
 if(!state||!code||u.searchParams.get('error'))return json({error:'authorization_denied_or_invalid'},400);
 const pending=await env.OAUTH_KV.get(stateKey(state));
 if(!pending)return json({error:'expired_or_invalid_state'},400);
 await env.OAUTH_KV.delete(stateKey(state)); // One-time use.
 try{
  const {userId}=JSON.parse(pending);
  if(!/^[a-f0-9-]{36}$/i.test(userId))return json({error:'invalid_state'},400);
  const tokens=await exchange({grant_type:'authorization_code',code,redirect_uri:CALLBACK},env);
  if(!tokens.refresh_token)return json({error:'no_refresh_token_reauthorize'},400);
  await env.OAUTH_KV.put(tokenKey(userId),await seal({refresh_token:tokens.refresh_token},env));
  return new Response('<!doctype html><html lang="es"><meta charset="utf-8"><title>LINK TASK</title><body><h1>Google Tasks conectado</h1><p>Ya puedes volver a ChatGPT.</p></body></html>',{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-frame-options':'DENY','referrer-policy':'no-referrer'}});
 }catch{return json({error:'google_authorization_failed'},502)}
}
