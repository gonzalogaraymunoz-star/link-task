
import test from 'node:test';
import assert from 'node:assert/strict';
import {TOOLS,runTool,getUser} from '../src/core.js';
const env={SUPABASE_PUBLISHABLE_KEY:'test-key'};
const user={id:'11111111-1111-4111-8111-111111111111',email:'test@example.org'};
let original;
test.beforeEach(()=>{original=globalThis.fetch});
test.afterEach(()=>{globalThis.fetch=original});
test('define seis herramientas MCP',()=>{
 assert.deepEqual(TOOLS.map(t=>t.name),['get_workspace','list_sessions','get_insights','start_session','end_session','record_work']);
 assert.equal(TOOLS.filter(t=>t.annotations.readOnlyHint).length,3);
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
test('registro puntual no mide duración',async()=>{
 let payload;
 globalThis.fetch=async(url,options)=>{
  assert.ok(url.includes('/link_task_sessions'));
  payload=JSON.parse(options.body);
  return {ok:true,status:201,json:async()=>[{id:'saved-id',title:payload.title}]};
 };
 const r=await runTool('record_work',{title:'Diseñar puente MCP',result:'Evidencia creada'},user,'jwt',env);
 assert.equal(r.ok,true);
 assert.equal(payload.context.duration_kind,'not_measured');
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
