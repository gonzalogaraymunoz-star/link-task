
import test from 'node:test';
import assert from 'node:assert/strict';
import {TOOLS,runTool,getUser} from '../src/core.js';
const env={SUPABASE_PUBLISHABLE_KEY:'test-key'};
const user={id:'11111111-1111-4111-8111-111111111111',email:'test@example.org'};
let original;
test.beforeEach(()=>{original=globalThis.fetch});
test.afterEach(()=>{globalThis.fetch=original});
test('define diecinueve herramientas MCP',()=>{
 assert.deepEqual(TOOLS.map(t=>t.name),['get_workspace','list_sessions','list_businesses','get_insights','start_session','end_session','update_closed_session','record_work','list_entries','record_entry','link_world_connect_daily_routine','google_connect','google_daily_routine_create','google_tasklist_create','google_tasklists','google_tasks_list','google_task_update_status','google_task_create','google_disconnect']);
 assert.equal(TOOLS.filter(t=>t.annotations.readOnlyHint).length,8);
 const statusTool=TOOLS.find(t=>t.name==='google_task_update_status');
 assert.deepEqual(statusTool.inputSchema.required,['tasklist_id','task_id','status']);
 assert.equal(TOOLS.find(t=>t.name==='google_tasks_list').annotations.readOnlyHint,true);
 assert.equal(TOOLS.find(t=>t.name==='google_task_create').annotations.readOnlyHint,false);
});
test('no se acepta identidad si falta JWT',async()=>{
 assert.equal(await getUser('',env),null);
});
test('workspace conserva identidad del usuario',async()=>{
 const r=await runTool('get_workspace',{},user,'jwt',env);
 assert.equal(r.data.user_id,user.id);
});
test('no registrar actividad sin título',async()=>{
 let n=0;globalThis.fetch=async()=>{n++;throw Error('no request should occur')};
 const r=await runTool('record_work',{title:' '},user,'jwt',env);
 assert.equal(r.ok,false);assert.equal(n,0);
});
test('rechazar ID inválido de sesión',async()=>{
 const r=await runTool('end_session',{id:'../other-user'},user,'jwt',env);
 assert.equal(r.data.error,'invalid_session_id');
});
test('edita una sesión cerrada, conserva auditoría y recalcula duración',async()=>{
 const id='33333333-3333-4333-8333-333333333333';
 let patch;
 globalThis.fetch=async(url,options={})=>{
  assert.ok(String(url).includes('user_id=eq.'+user.id));
  assert.ok(String(url).includes('ended_at=not.is.null'));
  if(!options.method)return {ok:true,status:200,json:async()=>[{
   id,title:'Cotización',category:'Ventas',started_at:'2026-10-15T13:41:12.974Z',
   ended_at:'2026-10-15T13:41:12.974Z',result:'Duración no medida',
   context:{kind:'activity_record',duration_kind:'not_measured'}
  }]};
  assert.equal(options.method,'PATCH');
  patch=JSON.parse(options.body);
  return {ok:true,status:200,json:async()=>[{id,title:'Cotización',category:'Ventas',...patch}]};
 };
 const r=await runTool('end_session',{
  id,edit_closed:true,started_at:'2026-10-15T10:08:00-03:00',ended_at:'2026-10-15T10:40:00-03:00',
  result:'Duración medida: 32 minutos.',time_source:'conversation_timestamps',edit_reason:'Primera solicitud a última entrega'
 },user,'jwt',env);
 assert.equal(r.ok,true);
 assert.equal(patch.context.duration_kind,'measured');
 assert.equal(patch.context.measured_duration_seconds,1920);
 assert.equal(patch.context.measured_duration_minutes,32);
 assert.equal(patch.context.edit_history.length,1);
 assert.equal(r.data.duration_minutes,32);
});
test('registro puntual no mide duración',async()=>{
 let payload;
 globalThis.fetch=async(url,options)=>{
  if(url.includes('/link_world_businesses'))return {ok:true,status:200,json:async()=>[{id:'22222222-2222-4222-8222-222222222222',slug:'lama-travelers',name:'LAMA Travelers'}]};
  assert.ok(url.includes('/link_task_sessions'));
  payload=JSON.parse(options.body);
  return {ok:true,status:201,json:async()=>[{id:'saved-id',title:payload.title}]};
 };
 const r=await runTool('record_work',{title:'Diseñar puente MCP',result:'Evidencia creada',business_slug:'lama-travelers'},user,'jwt',env);
 assert.equal(r.ok,true);
 assert.equal(payload.context.duration_kind,'not_measured');
 assert.equal(payload.context.business_slug,'lama-travelers');
 assert.equal(payload.user_id,user.id);
 assert.equal(payload.started_at,payload.ended_at);
});
test('lectura reenvía bearer individual a API de LINK TASK',async()=>{
 let authorization;
 globalThis.fetch=async(url,options)=>{assert.ok(url.endsWith('/api/sessions'));authorization=options.headers.authorization;return {ok:true,status:200,json:async()=>({sessions:[]})}};
 const r=await runTool('list_sessions',{},user,'jwt-especifico',env);
 assert.equal(authorization,'Bearer jwt-especifico');
 assert.deepEqual(r.data,{sessions:[]});
});
