import {entryTool} from './entries.js';

export const APP='https://link-task.gonzalogaraymunoz.workers.dev';
export const SUPA='https://zgbnjlrxzvzpigmwidsp.supabase.co';
export const HOST='https://link-task-mcp.gonzalogaraymunoz.workers.dev';
export const RESOURCE=HOST+'/mcp';
export const READ='link_task:read', WRITE='link_task:write';
export const TOOLS=[
{name:'get_workspace',description:'Consultar el usuario conectado y su espacio LINK TASK. No lee chats privados.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
{name:'list_sessions',description:'Leer las sesiones guardadas del usuario autorizado.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
{name:'list_businesses',description:'Listar negocios oficiales del directorio LINK WORLD para asociar registros.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
{name:'get_insights',description:'Leer estadísticas de sesiones reales, sin inventar tiempos.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
{name:'start_session',description:'Iniciar sesión medible solamente con autorización del usuario.',inputSchema:{type:'object',properties:{title:{type:'string'},category:{type:'string'},client_event_id:{type:'string'}},required:['title'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false}},
{name:'end_session',description:'Cerrar una sesión activa y guardar resultado. Con edit_closed=true también permite corregir una sesión ya cerrada por solicitud explícita.',inputSchema:{type:'object',properties:{id:{type:'string'},result:{type:'string'},edit_closed:{type:'boolean'},title:{type:'string'},category:{type:'string'},started_at:{type:'string',description:'Fecha y hora ISO 8601 con zona horaria'},ended_at:{type:'string',description:'Fecha y hora ISO 8601 con zona horaria'},time_source:{type:'string'},edit_reason:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false}},
{name:'update_closed_session',description:'Corregir título, categoría, resultado o tiempos de una sesión cerrada. Recalcula duración, conserva auditoría y requiere solicitud explícita del usuario.',inputSchema:{type:'object',properties:{id:{type:'string'},title:{type:'string'},category:{type:'string'},result:{type:'string'},started_at:{type:'string',description:'Fecha y hora ISO 8601 con zona horaria'},ended_at:{type:'string',description:'Fecha y hora ISO 8601 con zona horaria'},time_source:{type:'string'},edit_reason:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false}},
{name:'record_work',description:'Registrar actividad completada asociada a un negocio real de LINK WORLD. Requiere business_slug del directorio central. Ejecutar solo por solicitud del usuario.',inputSchema:{type:'object',properties:{title:{type:'string'},category:{type:'string'},result:{type:'string'},client_event_id:{type:'string'},business_slug:{type:'string',description:'Slug oficial del negocio en LINK WORLD, p.ej. lama-travelers'}},required:['title','business_slug'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false}}
];
TOOLS.push(
{name:'list_entries',description:'Leer los registros propios de LINK TASK (conversaciones, decisiones, evidencias y tareas). Permite comprobar lo que realmente aparece en la aplicación. No obtiene chats privados.',inputSchema:{type:'object',properties:{kind:{type:'string',enum:['conversation','decision','evidence','task']},limit:{type:'integer',minimum:1,maximum:100}},additionalProperties:false},annotations:{readOnlyHint:true}},
{name:'record_entry',description:'Registrar explícitamente una conversación relevante, decisión o evidencia en LINK TASK, sin importar chats enteros ni duplicar tareas. Guarda en Supabase y comprueba enlace al event_bus de LINK WORLD. Requiere permiso del usuario, ID de evento estable y negocio oficial o link-world.',inputSchema:{type:'object',properties:{kind:{type:'string',enum:['conversation','decision','evidence']},title:{type:'string'},summary:{type:'string'},business_slug:{type:'string',description:'Slug de negocio oficial o link-world para una decisión transversal'},project_slug:{type:'string',description:'Proyecto oficial activo; omitir cuando no se conozca'},status:{type:'string',enum:['open','in_progress','done','archived']},reference_url:{type:'string',description:'URL HTTPS de evidencia verificable cuando exista'},client_event_id:{type:'string',description:'Clave estable por registro para evitar duplicados entre reintentos'}},required:['kind','title','summary','client_event_id'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false}}
);
TOOLS.push(
{name:'link_world_connect_daily_routine',description:'Conectar una rutina diaria existente de LINK TASK al negocio y proyecto de LINK WORLD en Supabase y sincronizar la tarea de hoy. Requiere autorización del usuario.',inputSchema:{type:'object',properties:{routine_id:{type:'string'},business_slug:{type:'string'},project_slug:{type:'string'}},required:['routine_id','business_slug','project_slug'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false}},
{name:'google_connect',description:'Generar enlace de autorización Google Tasks para el usuario autenticado. Abrir URL para conectar.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
{name:'google_daily_routine_create',description:'Crear una rutina diaria de tareas en Google Tasks, con lista propia y una tarea por día. Escribir sólo por solicitud expresa del usuario.',inputSchema:{type:'object',properties:{title:{type:'string'},list_title:{type:'string'},project:{type:'string'},timezone:{type:'string'},notes:{type:'string'}},required:['title','list_title'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false}},
{name:'google_tasklist_create',description:'Crear nueva lista de Google Tasks sólo cuando el usuario lo solicite expresamente.',inputSchema:{type:'object',properties:{title:{type:'string'}},required:['title'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false}},
{name:'google_tasklists',description:'Consultar listas de Google Tasks del usuario conectado.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
{name:'google_tasks_list',description:'Consultar tareas pendientes de una lista Google Tasks.',inputSchema:{type:'object',properties:{tasklist_id:{type:'string'}},required:['tasklist_id'],additionalProperties:false},annotations:{readOnlyHint:true}},
{name:'google_task_create',description:'Crear una tarea en Google Tasks, solo con solicitud explícita del usuario.',inputSchema:{type:'object',properties:{tasklist_id:{type:'string'},title:{type:'string'},notes:{type:'string'},due:{type:'string',description:'Fecha YYYY-MM-DD'}},required:['tasklist_id','title'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false}},
{name:'google_disconnect',description:'Desconectar credenciales Google Tasks del usuario, solo por solicitud explícita.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:true}}
);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const str=(s,max)=>typeof s==='string'?s.trim().slice(0,max):'';
const has=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const iso=value=>{
 const raw=str(value,50),time=Date.parse(raw);
 return raw&&Number.isFinite(time)?new Date(time).toISOString():'';
};
async function updateClosedSession(args,user,jwt,env){
 const id=str(args.id,36);
 if(!uuid.test(id))return {ok:false,data:{error:'invalid_session_id'}};
 const requested={},changed=[];
 if(has(args,'title')){requested.title=str(args.title,160);if(!requested.title)return {ok:false,data:{error:'title_required'}};changed.push('title')}
 if(has(args,'category')){requested.category=str(args.category,60);if(!requested.category)return {ok:false,data:{error:'category_required'}};changed.push('category')}
 if(has(args,'result')){requested.result=str(args.result,4000)||null;changed.push('result')}
 if(has(args,'started_at')){requested.started_at=iso(args.started_at);if(!requested.started_at)return {ok:false,data:{error:'invalid_started_at'}};changed.push('started_at')}
 if(has(args,'ended_at')){requested.ended_at=iso(args.ended_at);if(!requested.ended_at)return {ok:false,data:{error:'invalid_ended_at'}};changed.push('ended_at')}
 if(!changed.length)return {ok:false,data:{error:'no_changes'}};
 const query='id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(user.id)+'&ended_at=not.is.null';
 const headers={apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+jwt,'content-type':'application/json'};
 let existing;
 try{
  const found=await fetch(SUPA+'/rest/v1/link_task_sessions?'+query+'&select=id,title,category,started_at,ended_at,result,context&limit=1',{headers});
  if(!found.ok)return {ok:false,data:{error:'session_lookup_failed'}};
  existing=(await found.json())?.[0];
 }catch{return {ok:false,data:{error:'session_lookup_unavailable'}}}
 if(!existing)return {ok:false,data:{error:'not_found_or_open'}};
 const start=requested.started_at||existing.started_at,end=requested.ended_at||existing.ended_at;
 const durationSeconds=Math.round((Date.parse(end)-Date.parse(start))/1000);
 if(!Number.isFinite(durationSeconds)||durationSeconds<0)return {ok:false,data:{error:'end_before_start'}};
 const previous={};
 for(const field of changed)previous[field]=field==='result'?String(existing[field]||'').slice(0,500):existing[field];
 const currentContext=existing.context&&typeof existing.context==='object'&&!Array.isArray(existing.context)?existing.context:{};
 const history=Array.isArray(currentContext.edit_history)?currentContext.edit_history.slice(-4):[];
 const correctedAt=new Date().toISOString();
 const context={...currentContext,corrected_by:'mcp',corrected_at:correctedAt,edit_history:[...history,{
  at:correctedAt,source:'mcp',reason:str(args.edit_reason,300)||'Corrección autorizada por el usuario',changed_fields:changed,previous
 }]};
 if(requested.started_at||requested.ended_at){
  context.duration_kind='measured';
  context.time_source=str(args.time_source,80)||'user_reported';
  context.measured_duration_seconds=durationSeconds;
  context.measured_duration_minutes=Number((durationSeconds/60).toFixed(2));
 }
 const patch={...requested,context};
 try{
  const response=await fetch(SUPA+'/rest/v1/link_task_sessions?'+query+'&select=id,title,category,started_at,ended_at,result,context',{
   method:'PATCH',headers:{...headers,prefer:'return=representation'},body:JSON.stringify(patch)
  });
  const data=await response.json().catch(()=>[]);
  if(!response.ok||!data?.[0])return {ok:false,data:{error:'closed_session_edit_failed'}};
  return {ok:true,data:{session:data[0],duration_kind:data[0].context?.duration_kind||null,duration_minutes:data[0].context?.measured_duration_minutes??null}};
 }catch{return {ok:false,data:{error:'closed_session_edit_unavailable'}}}
}
export async function getUser(jwt,env){
 if(!jwt||jwt.length>5000||!env.SUPABASE_PUBLISHABLE_KEY)return null;
 try{
 const response=await fetch(SUPA+'/auth/v1/user',{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+jwt}});
 if(!response.ok)return null;
 const u=await response.json();
 return uuid.test(u.id)?{id:u.id,email:u.email||null}:null;
 }catch{return null}
}
async function app(jwt,path,method='GET',body){
 try{
 const response=await fetch(APP+path,{method,headers:{authorization:'Bearer '+jwt,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 return {ok:response.ok,status:response.status,data:await response.json().catch(()=>({error:'invalid_upstream_response'}))};
 }catch{return {ok:false,status:503,data:{error:'link_task_unavailable'}}}
}
export async function runTool(name,args,user,jwt,env){
 if(name==='list_entries'||name==='record_entry')return entryTool(name,args,user,jwt,env);
 if(name==='get_workspace')return {ok:true,data:{user_id:user.id,email:user.email,app_url:APP}};
 if(name==='list_sessions')return app(jwt,'/api/sessions');
 if(name==='list_businesses'){
  try{const response=await fetch(SUPA+'/rest/v1/link_world_businesses?select=id,slug,name&order=name.asc',{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+jwt}});return {ok:response.ok,data:response.ok?{businesses:await response.json()}:{error:'business_directory_unavailable'}}}catch{return {ok:false,data:{error:'business_directory_unavailable'}}}
 }
 if(name==='get_insights')return app(jwt,'/api/insights');
 if(name==='start_session'||name==='record_work'){
  const title=str(args.title,160),category=str(args.category,60)||'unclassified';
  if(!title)return {ok:false,data:{error:'title_required'}};
  const eventId=str(args.client_event_id,120);
  if(name==='start_session')return app(jwt,'/api/sessions','POST',{title,category,client_event_id:eventId||undefined});
  // An activity record is not a timer: start=end, duration_kind=not_measured.
  const businessSlug=str(args.business_slug,100);
  if(!/^[a-z0-9][a-z0-9-]{1,99}$/.test(businessSlug))return {ok:false,data:{error:'business_slug_required'}};
  let business;
  try{const found=await fetch(SUPA+'/rest/v1/link_world_businesses?slug=eq.'+encodeURIComponent(businessSlug)+'&select=id,slug,name&limit=1',{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+jwt}});if(!found.ok)return {ok:false,data:{error:'business_directory_unavailable'}};business=(await found.json())?.[0];}catch{return {ok:false,data:{error:'business_directory_unavailable'}}}
  if(!business)return {ok:false,data:{error:'business_not_found'}};
  const now=new Date().toISOString();
  const row={user_id:user.id,title,category,source:'mcp',started_at:now,ended_at:now,result:str(args.result,4000)||null,context:{kind:'activity_record',duration_kind:'not_measured',business_id:business.id,business_slug:business.slug,business_name:business.name}};
  if(eventId)row.client_event_id=eventId;
  try{
   const response=await fetch(SUPA+'/rest/v1/link_task_sessions?select=id,title,started_at,ended_at,result',{
    method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+jwt,'content-type':'application/json',prefer:'return=representation'},body:JSON.stringify(row)});
   const data=await response.json().catch(()=>({}));
   if(response.ok)return {ok:true,data:{session:data?.[0]||null,duration_kind:'not_measured'}};
   return {ok:false,data:{error:response.status===409?'duplicate_client_event_id':'record_failed'}};
  }catch{return {ok:false,data:{error:'record_unavailable'}}}
 }
 if(name==='update_closed_session'||(name==='end_session'&&args.edit_closed===true))return updateClosedSession(args,user,jwt,env);
 if(name==='end_session'){
  const id=str(args.id,36);
  if(!uuid.test(id))return {ok:false,data:{error:'invalid_session_id'}};
  return app(jwt,'/api/sessions/'+id+'/end','POST',{result:str(args.result,4000)});
 }
 return {ok:false,data:{error:'unknown_tool'}};
}
