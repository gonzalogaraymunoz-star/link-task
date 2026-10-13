// LINK WORLD bridge. Supabase is the canonical bus; Google Tasks is a task execution view.
// Every database call runs as the explicitly authenticated Supabase user (RLS).
import {SUPA} from './core.js';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const slug=/^[a-z0-9][a-z0-9-]{1,100}$/;
const clean=s=>typeof s==='string'?s.trim():'';

async function rest(path,jwt,env,options={}){
 if(!jwt||!env.SUPABASE_PUBLISHABLE_KEY)return {ok:false,error:'supabase_auth_required'};
 try{
  const response=await fetch(SUPA+'/rest/v1/'+path,{
   ...options,
   headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+jwt,
    'content-type':'application/json',...options.headers}
  });
  const data=await response.json().catch(()=>null);
  return {ok:response.ok,status:response.status,data,error:response.ok?null:'supabase_rls_or_api_error'};
 }catch{return {ok:false,error:'supabase_unavailable'}}
}
const opts={headers:{prefer:'resolution=ignore-duplicates,return=minimal'}};

export async function resolveWorldTarget({business_slug,project_slug},jwt,env){
 const businessSlug=clean(business_slug),projectSlug=clean(project_slug);
 if(!slug.test(businessSlug)||!slug.test(projectSlug))return {ok:false,error:'valid_business_and_project_slugs_required'};
 const [b,p]=await Promise.all([
  rest('link_world_businesses?slug=eq.'+encodeURIComponent(businessSlug)+'&select=id,global_id,name',jwt,env),
  rest('projects?slug=eq.'+encodeURIComponent(projectSlug)+'&select=id,name,client_id,status',jwt,env)
 ]);
 if(!b.ok||!p.ok)return {ok:false,error:'link_world_read_failed'};
 const biz=b.data?.[0],proj=p.data?.[0];
 if(!biz||!proj||!uuid.test(biz.id)||!uuid.test(proj.id)||!biz.global_id)return {ok:false,error:'business_or_project_not_found'};
 if(proj.status!=='active')return {ok:false,error:'project_not_active'};
 return {ok:true,target:{
  businessId:biz.id,globalId:biz.global_id,projectId:proj.id,
  businessSlug,projectSlug,projectName:proj.name
 }};
}

async function busEvent(record,target,{eventType,dedupeKey,googleTaskId,date,status},jwt,env){
 const event={
  source_provider:'linktask',
  event_type:eventType,
  entity_type:'business',
  global_id:target.globalId,
  external_id:googleTaskId||record.id,
  correlation_id:record.id,
  dedupe_key:dedupeKey,
  occurred_at:new Date().toISOString(),
  payload:{
   routine_id:record.id,title:record.title,business_id:target.businessId,
   project_id:target.projectId,project_name:target.projectName,
   project_path:target.projectSlug==='marketing-caracol'?'//Marketing Caracol/Marketing Caracol':target.projectName,
   timezone:record.timeZone||'America/Santiago',
   google_tasklist_id:record.listId||null,google_task_id:googleTaskId||null,
   google_tasks_status:status||'pending',due_date:date||null,
   recurrence:'daily',calendar_event_id:record.calendarEventId||null,
   calendar_action:'reuse_existing',evidence_state:'pending'
  }
 };
 return rest('event_bus?on_conflict=dedupe_key',jwt,env,{method:'POST',body:JSON.stringify(event),...opts});
}
export async function linkRoutineToWorld(record,target,jwt,env){
 if(!record?.id||!record?.userId)return {ok:false,error:'routine_missing'};
 if(!target?.projectId||!target?.businessId||!target?.globalId)return {ok:false,error:'link_world_target_invalid'};
 const relation={
  source_type:'project',source_key:target.projectId,
  target_type:'linktask_routine',target_key:record.id,
  relation:'tracks',label:target.projectName+' ↔ '+record.title,
  state:'active',metadata:{provider:'google_tasks',adapter:'link-task-mcp',status:'routine_registered'},
  evidence:{authorized_by:'user_explicit_request',verified_business:target.businessId,verified_project:target.projectId}
 };
 const rel=await rest('entity_relations?on_conflict=source_type,source_key,target_type,target_key,relation',jwt,env,{method:'POST',body:JSON.stringify(relation),...opts});
 if(!rel.ok)return {ok:false,error:'link_world_relation_failed',status:rel.status};
 const event=await busEvent(record,target,{eventType:'TASK_ROUTINE_LINKED',dedupeKey:'linktask:routine:'+record.id+':linked'},jwt,env);
 if(!event.ok)return {ok:false,error:'link_world_event_failed',status:event.status};
 return {ok:true,target};
}
export async function pushDailyTaskToWorld(record,{date,taskId,status='needsAction',revision='initial'},jwt,env){
 const target=record?.linkWorld;
 if(!target?.globalId||!taskId||!date)return {ok:false,error:'binding_or_task_missing'};
 // An event is immutable. The same external task/state can be delivered repeatedly without duplication.
 const dedupeKey='linktask:google_tasks:'+record.userId+':'+taskId+':'+status+':'+encodeURIComponent(revision);
 const evt=await busEvent(record,target,{eventType:'GOOGLE_TASK_STATUS',dedupeKey,googleTaskId:taskId,date,status},jwt,env);
 return evt.ok?{ok:true,date,taskId,status}:{ok:false,error:'link_world_event_failed',status:evt.status};
}
