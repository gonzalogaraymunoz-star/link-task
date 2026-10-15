// Explicit, idempotent ChatGPT → LINK TASK → LINK WORLD registrations.
// Data is written under the user's Supabase JWT; never under a service role.
// Historical ChatGPT conversations are not accessible to this Worker.
const SUPA='https://zgbnjlrxzvzpigmwidsp.supabase.co';
const kinds=new Set(['conversation','decision','task','evidence']);
const states=new Set(['open','in_progress','done','archived']);
const slugPattern=/^[a-z0-9][a-z0-9-]{1,99}$/;
const text=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';

async function request(path,jwt,env,method='GET',payload,prefer){
  if(!jwt||!env.SUPABASE_PUBLISHABLE_KEY)return {ok:false,error:'authentication_required'};
  try{
    const response=await fetch(SUPA+'/rest/v1/'+path,{
      method,
      headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+jwt,
        'content-type':'application/json',...(prefer?{prefer}: {})},
      body:payload===undefined?undefined:JSON.stringify(payload)
    });
    const data=await response.json().catch(()=>null);
    return {ok:response.ok,status:response.status,data,error:response.ok?null:'supabase_request_failed'};
  }catch{return {ok:false,error:'supabase_unavailable'};}
}

function ensureRow(result){
  return Array.isArray(result?.data)?result.data[0]||null:null;
}

async function stableUuid(userId,eventId){
  const seed=new TextEncoder().encode('LINK-TASK-entry-v1:'+userId+':'+eventId);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',seed)).slice(0,16);
  digest[6]=(digest[6]&15)|80;
  digest[8]=(digest[8]&63)|128;
  const hex=[...digest].map(v=>v.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}

async function worldTarget(slug,projectSlug,jwt,env){
  if(slug==='link-world'){
    if(projectSlug)return {ok:false,error:'project_requires_business'};
    return {ok:true,business:'LINK WORLD',businessId:null,globalId:null,projectId:null};
  }
  if(!slugPattern.test(slug))return {ok:false,error:'invalid_business_slug'};
  const b=await request('link_world_businesses?slug=eq.'+encodeURIComponent(slug)+'&select=id,slug,name,global_id&limit=1',jwt,env);
  if(!b.ok)return {ok:false,error:'business_directory_unavailable'};
  const business=ensureRow(b);
  if(!business)return {ok:false,error:'business_not_found'};
  let projectId=null;
  if(projectSlug){
    if(!slugPattern.test(projectSlug))return {ok:false,error:'invalid_project_slug'};
    const p=await request('projects?slug=eq.'+encodeURIComponent(projectSlug)+'&select=id,slug,name,status&limit=1',jwt,env);
    if(!p.ok)return {ok:false,error:'project_directory_unavailable'};
    const project=ensureRow(p);
    if(!project||project.status!=='active')return {ok:false,error:'active_project_not_found'};
    projectId=project.id;
  }
  return {ok:true,business:business.name,businessId:business.id,globalId:business.global_id,projectId};
}

async function readEntry(id,jwt,env){
  const r=await request('link_task_entries?id=eq.'+encodeURIComponent(id)+'&select=id,kind,status,business,title,summary,reference_url,created_at,updated_at&limit=1',jwt,env);
  return r.ok?{ok:true,entry:ensureRow(r)}:{ok:false,error:'entry_read_failed'};
}

async function relayToWorld(entry,target,sourceEventId,jwt,env){
  const dedupe='linktask:entry:'+entry.id+':recorded';
  const event={
    source_provider:'linktask',event_type:'LINK_TASK_ENTRY_RECORDED',
    entity_type:target.globalId?'business':'linktask_entry',global_id:target.globalId||null,
    external_id:entry.id,correlation_id:entry.id,dedupe_key:dedupe,
    occurred_at:entry.created_at||new Date().toISOString(),
    payload:{link_task_entry_id:entry.id,kind:entry.kind,title:entry.title,status:entry.status,
      business_id:target.businessId,business_name:target.business,project_id:target.projectId,
      source_event_id:sourceEventId,evidence_url:entry.reference_url||null,
      source:'chatgpt_explicit_registration'}
  };
  const saved=await request('event_bus?on_conflict=dedupe_key',jwt,env,'POST',event,'resolution=ignore-duplicates,return=minimal');
  if(!saved.ok)return {ok:false,error:'world_event_write_failed',status:saved.status};
  const checked=await request('event_bus?dedupe_key=eq.'+encodeURIComponent(dedupe)+'&select=id,external_id,dedupe_key&limit=1',jwt,env);
  if(!checked.ok||ensureRow(checked)?.external_id!==entry.id)return {ok:false,error:'world_event_readback_failed'};
  return {ok:true};
}

export async function entryTool(name,args,user,jwt,env){
  if(name==='list_entries'){
    const kind=text(args.kind,32);
    if(kind&&!kinds.has(kind)&&kind!=='task')return {ok:false,data:{error:'invalid_kind'}};
    const limit=Math.min(100,Math.max(1,Number(args.limit)||50));
    const qs='link_task_entries?select=id,kind,status,business,title,summary,reference_url,created_at,updated_at&order=created_at.desc&limit='+limit+(kind?'&kind=eq.'+encodeURIComponent(kind):'');
    const r=await request(qs,jwt,env);
    return r.ok?{ok:true,data:{entries:r.data||[],count:r.data?.length||0}}:{ok:false,data:{error:'entries_unavailable'}};
  }
  if(name!=='record_entry')return {ok:false,data:{error:'unknown_entry_tool'}};
  const kind=text(args.kind,32),title=text(args.title,180),summary=text(args.summary,10000);
  const state=text(args.status,32)||'done';
  const businessSlug=text(args.business_slug,100)||'link-world';
  const projectSlug=text(args.project_slug,100);
  const eventId=text(args.client_event_id,120);
  const ref=text(args.reference_url,1000);
  if(!kinds.has(kind)||!title||!summary||!eventId)return {ok:false,data:{error:'kind_title_summary_and_client_event_id_required'}};
  if(!states.has(state))return {ok:false,data:{error:'invalid_status'}};
  if(ref&&!/^https:\/\//i.test(ref))return {ok:false,data:{error:'https_reference_required'}};
  const target=await worldTarget(businessSlug,projectSlug,jwt,env);
  if(!target.ok)return {ok:false,data:{error:target.error}};
  const id=await stableUuid(user.id,eventId);
  const current=await readEntry(id,jwt,env);
  if(!current.ok)return {ok:false,data:{error:current.error}};
  let entry=current.entry,created=false;
  if(entry&&(entry.kind!==kind||entry.title!==title||entry.business!==target.business))
    return {ok:false,data:{error:'client_event_id_already_used_for_other_entry'}};
  if(!entry){
    const row={id,user_id:user.id,kind,title,summary,status:state,business:target.business,reference_url:ref||null};
    const write=await request('link_task_entries?select=id,kind,status,business,title,summary,reference_url,created_at,updated_at',
      jwt,env,'POST',row,'return=representation');
    if(!write.ok&&write.status!==409)return {ok:false,data:{error:'entry_write_failed',status:write.status}};
    entry=write.ok?ensureRow(write):null;
    if(!entry){
      const retry=await readEntry(id,jwt,env);entry=retry.entry;
      if(!retry.ok||!entry||entry.title!==title||entry.kind!==kind)
        return {ok:false,data:{error:'entry_readback_failed'}};
    }else created=true;
  }
  const world=await relayToWorld(entry,target,eventId,jwt,env);
  return {ok:world.ok,data:{
    entry,created,already_exists:!created,
    link_world:{linked:world.ok,business_slug:businessSlug,project_slug:projectSlug||null,
      error:world.ok?null:world.error},
    visibility:'link_task_entries + event_bus; no automatic chat import'
  }};
}
