
export const APP='https://link-task.gonzalogaraymunoz.workers.dev';
export const SUPA='https://zgbnjlrxzvzpigmwidsp.supabase.co';
export const HOST='https://link-task-mcp.gonzalogaraymunoz.workers.dev';
export const RESOURCE=HOST+'/mcp';
export const READ='link_task:read', WRITE='link_task:write';
export const TOOLS=[
{name:'get_workspace',description:'Consultar el usuario conectado y su espacio LINK TASK. No lee chats privados.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
{name:'list_sessions',description:'Leer las sesiones guardadas del usuario autorizado.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
{name:'get_insights',description:'Leer estadísticas de sesiones reales, sin inventar tiempos.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
{name:'start_session',description:'Iniciar sesión medible solamente con autorización del usuario.',inputSchema:{type:'object',properties:{title:{type:'string'},category:{type:'string'},client_event_id:{type:'string'}},required:['title'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false}},
{name:'end_session',description:'Cerrar una sesión activa y guardar resultado.',inputSchema:{type:'object',properties:{id:{type:'string'},result:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false}},
{name:'record_work',description:'Registrar una actividad completada sin duración medida. Ejecutar solo por solicitud del usuario.',inputSchema:{type:'object',properties:{title:{type:'string'},category:{type:'string'},result:{type:'string'},client_event_id:{type:'string'}},required:['title'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false}}
];
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const str=(s,max)=>typeof s==='string'?s.trim().slice(0,max):'';
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
 if(name==='get_workspace')return {ok:true,data:{user_id:user.id,email:user.email,app_url:APP}};
 if(name==='list_sessions')return app(jwt,'/api/sessions');
 if(name==='get_insights')return app(jwt,'/api/insights');
 if(name==='start_session'||name==='record_work'){
  const title=str(args.title,160),category=str(args.category,60)||'unclassified';
  if(!title)return {ok:false,data:{error:'title_required'}};
  const eventId=str(args.client_event_id,120);
  if(name==='start_session')return app(jwt,'/api/sessions','POST',{title,category,client_event_id:eventId||undefined});
  // An activity record is not a timer: start=end, duration_kind=not_measured.
  const now=new Date().toISOString();
  const row={user_id:user.id,title,category,source:'mcp',started_at:now,ended_at:now,result:str(args.result,4000)||null,context:{kind:'activity_record',duration_kind:'not_measured'}};
  if(eventId)row.client_event_id=eventId;
  try{
   const response=await fetch(SUPA+'/rest/v1/link_task_sessions?select=id,title,started_at,ended_at,result',{
    method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+jwt,'content-type':'application/json',prefer:'return=representation'},body:JSON.stringify(row)});
   const data=await response.json().catch(()=>({}));
   if(response.ok)return {ok:true,data:{session:data?.[0]||null,duration_kind:'not_measured'}};
   return {ok:false,data:{error:response.status===409?'duplicate_client_event_id':'record_failed'}};
  }catch{return {ok:false,data:{error:'record_unavailable'}}}
 }
 if(name==='end_session'){
  const id=str(args.id,36);
  if(!uuid.test(id))return {ok:false,data:{error:'invalid_session_id'}};
  return app(jwt,'/api/sessions/'+id+'/end','POST',{result:str(args.result,4000)});
 }
 return {ok:false,data:{error:'unknown_tool'}};
}
