import test from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import worker from '../src/index.js';
import { KANBAN_SCRIPT } from '../src/kanban.js';

test('Replica build: Kanban es JS sintácticamente válido y no usa datos simulados', () => {
 assert.doesNotThrow(() => new Script(KANBAN_SCRIPT));
 for (const feature of ['planned_for','verification','in_progress','done','task-links','dragstart','drop','America/Santiago','Backlog','Planificar hoy']) {
  assert.ok(KANBAN_SCRIPT.includes(feature), 'Falta '+feature);
 }
 assert.doesNotMatch(KANBAN_SCRIPT, /demo navegable|datos simulados|let tasks=\s*\[/i);
});

test('Replica build: ruta de Kanban se sirve desde el Worker real', async () => {
 const r=await worker.fetch(new Request('https://link-task.example.test/_kanban.js'));
 assert.equal(r.status,200);
 assert.match(r.headers.get('content-type'),/text\/javascript/);
 assert.ok((await r.text()).includes('planned_for'));
});

test('Replica backend: validación y persistencia de fecha, verificación y vínculos con JWT', async () => {
 const baseFetch=globalThis.fetch;
 const seen=[];
 const uid='11111111-1111-4111-8111-111111111111';
 const task='22222222-2222-4222-8222-222222222222';
 const entry='33333333-3333-4333-8333-333333333333';
 globalThis.fetch=async (url,opts={})=>{
  const u=new URL(String(url));
  if(u.pathname.endsWith('/auth/v1/user')) return Response.json({id:uid,email:'example@test.invalid'});
  if(u.pathname.includes('/rest/v1/')){
   seen.push({path:u.pathname,search:u.search,method:opts.method||'GET',body:opts.body?JSON.parse(opts.body):null,authorization:opts.headers?.authorization});
   if(opts.method==='POST'||opts.method==='PATCH')return Response.json([{id:task,kind:'task',status:opts.body?JSON.parse(opts.body).status:'open'}]);
   return Response.json([]);
  }
  throw Error('Unexpected route '+url);
 };
 try {
  const path='https://link-task.example.test',headers={'authorization':'Bearer test-user-jwt','content-type':'application/json'};
  const bad=await worker.fetch(new Request(path+'/api/entries',{method:'POST',headers,body:JSON.stringify({kind:'task',title:'Revisión',planned_for:'2026-02-31'})}));
  assert.equal(bad.status,400);
  assert.equal(seen.length,0,'Una fecha inválida no debe tocar la BD');
  const create=await worker.fetch(new Request(path+'/api/entries',{method:'POST',headers,
   body:JSON.stringify({kind:'task',title:'Revisión',business:'LINK WORLD',planned_for:null,objective:'Validar',origin:'chatgpt',client_event_id:'replay-1'})}));
  assert.equal(create.status,201);
  assert.equal(seen.at(-1).body.planned_for,null);
  assert.equal(seen.at(-1).body.client_event_id,'replay-1');
  assert.equal(seen.at(-1).body.user_id,uid);
  const patch=await worker.fetch(new Request(path+'/api/entries/'+task,{method:'PATCH',headers,body:JSON.stringify({status:'verification',planned_for:'2026-10-27'})}));
  assert.equal(patch.status,200);
  assert.equal(seen.at(-1).body.status,'verification');
  assert.equal(seen.at(-1).body.planned_for,'2026-10-27');
  assert.ok(seen.at(-1).search.includes('user_id=eq.'));
  assert.ok(seen.at(-1).search.includes('kind=eq.task'));
  const link=await worker.fetch(new Request(path+'/api/task-links',{method:'POST',headers,body:JSON.stringify({task_id:task,related_entry_id:entry})}));
  assert.equal(link.status,201);
  assert.equal(seen.at(-1).body.related_entry_id,entry);
  assert.equal(seen.at(-1).body.user_id,uid);
  const missing=await worker.fetch(new Request(path+'/api/task-links',{method:'POST',headers,body:JSON.stringify({task_id:task})}));
  assert.equal(missing.status,400);
  const anonymous=await worker.fetch(new Request(path+'/api/task-links?task_id='+task));
  assert.equal(anonymous.status,401);
 } finally {globalThis.fetch=baseFetch}
});


test('Replica API: un vínculo repetido devuelve exactamente la relación solicitada',async()=>{
 const previous=globalThis.fetch;
 const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const task='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 const unrelated='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 const wanted='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
 globalThis.fetch=async (uri,opts={})=>{
  const url=new URL(String(uri));
  if(url.pathname==='/auth/v1/user')return Response.json({id:user});
  if(url.pathname==='/rest/v1/link_task_task_links'){
   if(opts.method==='POST')return Response.json({code:'23505',message:'duplicate'},{status:409});
   return Response.json([
    {id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',task_entry_id:task,related_entry_id:unrelated},
    {id:'ffffffff-ffff-4fff-8fff-ffffffffffff',task_entry_id:task,related_entry_id:wanted}
   ]);
  }
  throw Error('Unexpected route '+uri);
 };
 try{
  const response=await worker.fetch(new Request('https://link-task.example.test/api/task-links',{
   method:'POST',headers:{authorization:'Bearer test-token','content-type':'application/json'},
   body:JSON.stringify({task_id:task,related_entry_id:wanted})
  }));
  assert.equal(response.status,201);
  const payload=await response.json();
  assert.equal(payload.related_entry_id,wanted);
  assert.notEqual(payload.related_entry_id,unrelated);
 }finally{globalThis.fetch=previous}
});
