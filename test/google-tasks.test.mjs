import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {googleTool, googleCallback} from '../src/google-tasks.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;

function fixture(){
 const db=new Map();
 const env={
  GOOGLE_CLIENT_ID:'test-client.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET:'test-secret',
  GOOGLE_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,27).toString('base64'),
  OAUTH_KV:{
   get:async k=>db.get(k)||null,
   put:async(k,v)=>{db.set(k,v)},
   delete:async k=>{db.delete(k)}
  }
 };
 return {env,db,user:{id:'00000000-0000-4000-8000-000000000001'}};
}
test('unconfigured Google connection fails closed',async()=>{
 const result=await googleTool('google_connect',{},fixture().user,{});
 assert.equal(result.ok,false);
 assert.equal(result.data.error,'google_not_configured');
});
test('missing or expired OAuth state cannot bind a Google account',async()=>{
 const {env,db}=fixture();
 const response=await googleCallback(new Request('https://link-task-mcp.gonzalogaraymunoz.workers.dev/google/callback?state=invalid&code=dummy'),env);
 assert.equal(response.status,400);
 assert.equal(db.size,0);
});
test('Google OAuth completes once and Tasks actions use the matching user',async()=>{
 const {env,db,user}=fixture();
 const original=globalThis.fetch;
 const calls=[];
 globalThis.fetch=async(url,opt)=>{
  const dest=String(url);
  calls.push({url:dest,method:opt?.method,authorization:opt?.headers?.Authorization,body:String(opt?.body||'')});
  if(dest==='https://oauth2.googleapis.com/token'){
   const params=new URLSearchParams(opt.body);
   if(params.get('grant_type')==='authorization_code')
    return new Response(JSON.stringify({access_token:'temporary',refresh_token:'encrypted-refresh'}),{status:200});
   if(params.get('grant_type')==='refresh_token')
    return new Response(JSON.stringify({access_token:'new-access'}),{status:200});
  }
  if(dest.endsWith('/users/@me/lists?maxResults=100'))
   return new Response(JSON.stringify({items:[{id:'list1',title:'Caracol'}]}),{status:200});
  if(dest.includes('/lists/list1/tasks')&&opt.method==='POST')
   return new Response(JSON.stringify({id:'task1',title:'Emitir boleta'}),{status:200});
  throw new Error('unexpected_fetch');
 };
 try{
  const connect=await googleTool('google_connect',{},user,env);
  assert.equal(connect.ok,true);
  const authorize=new URL(connect.data.authorization_url);
  assert.equal(authorize.searchParams.get('scope'),'https://www.googleapis.com/auth/tasks');
  assert.equal(authorize.searchParams.get('redirect_uri'),'https://link-task-mcp.gonzalogaraymunoz.workers.dev/google/callback');
  const state=authorize.searchParams.get('state');
  assert.ok(db.has('google:state:'+state));
  const callback=new Request('https://link-task-mcp.gonzalogaraymunoz.workers.dev/google/callback?code=code&state='+state);
  assert.equal((await googleCallback(callback,env)).status,200);
  assert.equal(db.has('google:state:'+state),false);
  assert.equal((await googleCallback(callback,env)).status,400);
  const ciphertext=db.get('google:token:'+user.id);
  assert.ok(ciphertext);
  assert.equal(ciphertext.includes('encrypted-refresh'),false);
  const lists=await googleTool('google_tasklists',{},user,env);
  assert.deepEqual(lists.data.items,[{id:'list1',title:'Caracol'}]);
  const invalid=await googleTool('google_task_create',{tasklist_id:'list1',title:'Boleta',due:'tomorrow'},user,env);
  assert.equal(invalid.ok,false);
  assert.equal(invalid.data.error,'due_must_be_yyyy_mm_dd');
  const task=await googleTool('google_task_create',{tasklist_id:'list1',title:'Emitir boleta',due:'2026-10-13'},user,env);
  assert.equal(task.ok,true);
  assert.equal(task.data.id,'task1');
  assert.ok(calls.some(c=>c.authorization==='Bearer new-access'));
  const other={id:'00000000-0000-4000-8000-000000000002'};
  const otherResult=await googleTool('google_tasklists',{},other,env);
  assert.equal(otherResult.ok,false);
  assert.equal(otherResult.data.error,'google_not_connected');
  assert.equal((await googleTool('google_disconnect',{},user,env)).ok,true);
  assert.equal(db.has('google:token:'+user.id),false);
 }finally{globalThis.fetch=original}
});
