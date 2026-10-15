import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {entryTool} from '../src/entries.js';

if(!globalThis.crypto)globalThis.crypto=webcrypto;
const user={id:'11111111-1111-4111-8111-111111111111'};
const env={SUPABASE_PUBLISHABLE_KEY:'publishable-key'};

test('registra decisión, reconcilia LINK WORLD y no duplica con mismo evento',async()=>{
 const original=globalThis.fetch,entries=new Map(),events=new Map(),calls=[];
 const ok=(data,status=200)=>({ok:status<300,status,json:async()=>data});
 globalThis.fetch=async(url,options={})=>{
   const u=new URL(url),resource=u.pathname.split('/').pop(),method=options.method||'GET';
   assert.equal(options.headers.authorization,'Bearer user-jwt');
   calls.push([resource,method]);
   if(resource==='link_world_businesses')return ok([{id:'22222222-2222-4222-8222-222222222222',slug:'caracol',name:'CARACOL',global_id:'LNK-BIZ-TEST'}]);
   if(resource==='link_task_entries'){
     if(method==='GET'){
       let rows=u.searchParams.has('id')?[...entries.values()].filter(x=>x.id===u.searchParams.get('id')?.slice(3)):[...entries.values()];
       if(u.searchParams.has('kind'))rows=rows.filter(x=>x.kind===u.searchParams.get('kind')?.slice(3));
       return ok(rows);
     }
     const p=JSON.parse(options.body);
     if(entries.has(p.id))return ok({error:'duplicate'},409);
     const row={...p,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
     entries.set(p.id,row);
     return ok([row],201);
   }
   if(resource==='event_bus'){
     if(method==='GET')return ok([...events.values()].filter(x=>x.dedupe_key===u.searchParams.get('dedupe_key')?.slice(3)).map(x=>({id:'event-1',external_id:x.external_id,dedupe_key:x.dedupe_key})));
     const event=JSON.parse(options.body);
     events.set(event.dedupe_key,event);
     return ok(null,201);
   }
   throw Error('unhandled: '+url);
 };
 try{
   const args={kind:'decision',title:'Mantener un registro único',summary:'Acordamos conectar resultados con negocio.',business_slug:'caracol',client_event_id:'decision:2026-10-14:caracol:registro'};
   const first=await entryTool('record_entry',args,user,'user-jwt',env);
   assert.equal(first.ok,true);assert.equal(first.data.created,true);assert.equal(first.data.link_world.linked,true);
   const second=await entryTool('record_entry',args,user,'user-jwt',env);
   assert.equal(second.ok,true);assert.equal(second.data.created,false);
   const taskArgs={kind:'task',title:'Refrigerar el espumante',summary:'Tarea operativa vinculada a Google Tasks.',business_slug:'caracol',status:'done',reference_url:'https://tasks.google.com/task/test',client_event_id:'google-task:test'};
   const task=await entryTool('record_entry',taskArgs,user,'user-jwt',env);
   assert.equal(task.ok,true);assert.equal(task.data.entry.kind,'task');assert.equal(task.data.entry.status,'done');
   assert.equal(entries.size,2);assert.equal(events.size,2);
   const listing=await entryTool('list_entries',{kind:'decision'},user,'user-jwt',env);
   assert.equal(listing.ok,true);assert.equal(listing.data.count,1);
   const taskListing=await entryTool('list_entries',{kind:'task'},user,'user-jwt',env);
   assert.equal(taskListing.ok,true);assert.equal(taskListing.data.count,1);
   assert.equal(calls.filter(([r,m])=>r==='link_task_entries'&&m==='POST').length,2);
 }finally{globalThis.fetch=original;}
});

test('no permite duplicar una clave para decisiones distintas',async()=>{
 const r=await entryTool('record_entry',{kind:'evidence',title:'',summary:'x',client_event_id:'id'},user,'jwt',env);
 assert.equal(r.ok,false);assert.equal(r.data.error,'kind_title_summary_and_client_event_id_required');
});
