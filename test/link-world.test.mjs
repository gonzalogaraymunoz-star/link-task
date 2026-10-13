import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveWorldTarget,linkRoutineToWorld,pushDailyTaskToWorld} from '../src/link-world.js';
const env={SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
const jwt='test.jwt',biz='31333b84-79fa-4c52-b974-977145ec9e9a',project='a694491c-9bfc-4f0b-bc50-b62ae3b49efd';
let savedFetch;
test.beforeEach(()=>{savedFetch=globalThis.fetch});
test.afterEach(()=>{globalThis.fetch=savedFetch});
test('connects only to actual accessible business/project using user JWT and RLS',async()=>{
 const calls=[];
 globalThis.fetch=async(url,options={})=>{
  calls.push({url:String(url),method:options.method||'GET',headers:options.headers,body:options.body?JSON.parse(options.body):null});
  if(String(url).includes('link_world_businesses?'))return new Response(JSON.stringify([{id:biz,global_id:'LNK-BIZ-8940CF9AD521445D',name:'CARACOL'}]),{status:200});
  if(String(url).includes('projects?'))return new Response(JSON.stringify([{id:project,name:'Marketing Caracol',status:'active'}]),{status:200});
  if(String(url).includes('entity_relations?'))return new Response(null,{status:201});
  if(String(url).includes('event_bus?'))return new Response(null,{status:201});
  throw Error('unexpected URL');
 };
 const v=await resolveWorldTarget({business_slug:'caracol',project_slug:'marketing-caracol'},jwt,env);
 assert.equal(v.ok,true);assert.equal(v.target.businessId,biz);assert.equal(v.target.projectId,project);
 const record={id:'caracol-marketing-reel',userId:'11111111-1111-4111-8111-111111111111',title:'Publicar reel Caracol',timeZone:'America/Santiago',listId:'goog-list',calendarEventId:'existing-google-event-id'};
 const linked=await linkRoutineToWorld(record,v.target,jwt,env);
 assert.equal(linked.ok,true);
 const projected=await pushDailyTaskToWorld({...record,linkWorld:v.target},{date:'2026-10-13',taskId:'google-task-id'},jwt,env);
 assert.equal(projected.ok,true);
 assert.equal(calls.filter(c=>c.method==='POST').length,3);
 assert.ok(calls.every(c=>c.headers?.authorization==='Bearer '+jwt));
 const post=calls.find(c=>c.url.includes('event_bus?')&&c.body.event_type==='GOOGLE_TASK_STATUS');
 assert.equal(post.body.external_id,'google-task-id');
 assert.equal(post.body.global_id,'LNK-BIZ-8940CF9AD521445D');
 assert.equal(post.body.payload.project_id,project);
 assert.equal(post.body.payload.calendar_action,'reuse_existing');
 assert.equal(post.body.dedupe_key,'linktask:google_tasks:11111111-1111-4111-8111-111111111111:google-task-id:needsAction');
});
test('does not write when project is not visible to authenticated member',async()=>{
 let posts=0;globalThis.fetch=async url=>{
  if(String(url).includes('link_world_businesses?'))return new Response(JSON.stringify([{id:biz,global_id:'LNK-BIZ-8940CF9AD521445D'}]));
  if(String(url).includes('projects?'))return new Response('[]');
  posts++;
  throw Error('unexpected write');
 };
 const v=await resolveWorldTarget({business_slug:'caracol',project_slug:'marketing-caracol'},jwt,env);
 assert.equal(v.ok,false);assert.equal(v.error,'business_or_project_not_found');assert.equal(posts,0);
});
