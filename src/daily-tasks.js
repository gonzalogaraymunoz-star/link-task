// LINK TASK daily task routines: one source record, one Google Tasks item per local date.
import {googleTool} from './google-tasks.js';

const PREFIX='linktask:daily:v1:';
const doneKey=(id,date)=>PREFIX+'done:'+id+':'+date;
const recordKey=id=>PREFIX+'record:'+id;
const titleNorm=s=>String(s||'').trim().toLocaleLowerCase('es');
function localDate(timeZone,clock=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(clock);
}
function validZone(zone){try{new Intl.DateTimeFormat('en-US',{timeZone:zone});return true}catch{return false}}
function marker(id){return 'LINKTASK_ROUTINE:'+id}
const textValue=(s,max)=>typeof s==='string'?s.trim().slice(0,max):'';

async function materialize(record,env,clock=new Date()){
 const date=localDate(record.timeZone,clock),statusKey=doneKey(record.id,date);
 const done=await env.OAUTH_KV.get(statusKey);
 if(done)return {ok:true,date,already_created:true,task_id:done};
 const user={id:record.userId};
 const existing=await googleTool('google_tasks_list',{tasklist_id:record.listId,due_date:date},user,env);
 if(!existing.ok)return existing;
 const match=(existing.data.items||[]).find(t=>String(t.notes||'').includes(marker(record.id)));
 if(match){
  await env.OAUTH_KV.put(statusKey,match.id,{expirationTtl:90*24*3600});
  return {ok:true,date,already_created:true,task_id:match.id};
 }
 const notes=[record.notes||'','Negocio: '+record.project,marker(record.id)].filter(Boolean).join('\n');
 const created=await googleTool('google_task_create',{tasklist_id:record.listId,title:record.title,notes,due:date},user,env);
 if(!created.ok)return created;
 await env.OAUTH_KV.put(statusKey,created.data.id,{expirationTtl:90*24*3600});
 return {ok:true,date,already_created:false,task_id:created.data.id};
}
export async function createDailyRoutine(args,user,env){
 if(!env?.OAUTH_KV)return {ok:false,data:{error:'storage_not_configured'}};
 const title=textValue(args.title,160),listTitle=textValue(args.list_title,100),project=textValue(args.project,120)||listTitle;
 const timeZone=textValue(args.timezone,80)||'America/Santiago',notes=textValue(args.notes,600);
 if(!title||!listTitle)return {ok:false,data:{error:'title_and_list_required'}};
 if(!validZone(timeZone))return {ok:false,data:{error:'invalid_timezone'}};
 const list=await googleTool('google_tasklist_create',{title:listTitle},user,env);
 if(!list.ok)return list;
 const identifier=crypto.randomUUID();
 const record={id:identifier,userId:user.id,listId:list.data.id,listTitle:titleNorm(list.data.title),title,project,timeZone,notes,enabled:true,createdAt:new Date().toISOString()};
 // Detect an equivalent record before inserting to avoid creating parallel daily series.
 let cursor,prior=null;
 do{
  const page=await env.OAUTH_KV.list({prefix:PREFIX+'record:',limit:1000,...(cursor?{cursor}:{})});
  for(const k of page.keys){
   const raw=await env.OAUTH_KV.get(k.name);
   if(!raw)continue;
   try{const r=JSON.parse(raw);if(r.enabled&&r.userId===user.id&&r.listId===record.listId&&titleNorm(r.title)===titleNorm(title)){prior=r;break}}catch{}
  }
  if(prior)break;
  cursor=page.list_complete?null:page.cursor;
 }while(cursor);
 const routine=prior||record;
 if(!prior)await env.OAUTH_KV.put(recordKey(routine.id),JSON.stringify(routine));
 const today=await materialize(routine,env);
 return {ok:today.ok,data:today.ok?{routine_id:routine.id,title:routine.title,list_title:list.data.title,list_id:routine.listId,project:routine.project,time_zone:timeZone,due:today.date,task_id:today.task_id,already_exists:!!prior,created_today:!today.already_created,recurrence:'daily'}:{error:'routine_saved_but_task_failed',routine_id:routine.id,cause:today.data?.error}};
}
export async function runDailyRoutines(env,clock=new Date()){
 if(!env.OAUTH_KV)return {error:'storage_not_configured'};
 let cursor=null,seen=0,created=0,skipped=0,errors=0;
 do{
  const page=await env.OAUTH_KV.list({prefix:PREFIX+'record:',limit:100,...(cursor?{cursor}:{})});
  for(const item of page.keys){
   const raw=await env.OAUTH_KV.get(item.name);
   if(!raw)continue;
   let record;try{record=JSON.parse(raw)}catch{errors++;continue}
   if(!record.enabled)continue;
   seen++;
   try{
    const result=await materialize(record,env,clock);
    if(!result.ok)errors++;
    else if(result.already_created)skipped++;
    else created++;
   }catch{errors++}
  }
  cursor=page.list_complete?null:page.cursor;
 }while(cursor);
 return {seen,created,skipped,errors};
}
