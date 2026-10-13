import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createDailyRoutine,runDailyRoutines} from '../src/daily-tasks.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;

function fixture(){
 const db=new Map(),ids={list:'caracol-list',user:'12345678-1234-4123-8123-123456789abc'};
 let tasks=[],next=0;
 const env={
  GOOGLE_CLIENT_ID:'test.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'test-secret',
  GOOGLE_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,21).toString('base64'),
  OAUTH_KV:{
   get:async k=>db.get(k)||null,
   put:async(k,v)=>db.set(k,v),
   delete:async k=>db.delete(k),
   list:async({prefix})=>({keys:[...db.keys()].filter(k=>k.startsWith(prefix)).map(name=>({name})),list_complete:true})
  }
 };
 const fetchMock=async(url,opts={})=>{
  url=String(url);
  if(url.endsWith('/token'))return new Response(JSON.stringify({access_token:'google-access'}),{status:200});
  if(url.includes('/users/@me/lists?'))return new Response(JSON.stringify({items:[{id:ids.list,title:'Caracol Marketing'}]}),{status:200});
  if(url.includes('/lists/'+ids.list+'/tasks?'))return new Response(JSON.stringify({items:tasks}),{status:200});
  if(url.endsWith('/lists/'+ids.list+'/tasks')&&opts.method==='POST'){
   const input=JSON.parse(opts.body), t={id:'task-'+(++next),...input};tasks.push(t);
   return new Response(JSON.stringify(t),{status:200});
  }
  throw Error('unexpected URL '+url);
 };
 async function seed(){
  // Stores a correctly encrypted refresh token via real consent helper in google-tasks.js.
  const {googleTool,googleCallback}=await import('../src/google-tasks.js');
  const original=globalThis.fetch;
  globalThis.fetch=async(url,opts={})=>{
   if(String(url).includes('/oauth2.googleapis.com/token'))return new Response(JSON.stringify({refresh_token:'refresh',access_token:'access'}),{status:200});
   return fetchMock(url,opts);
  };
  try{
   const c=await googleTool('google_connect',{}, {id:ids.user},env);
   const state=new URL(c.data.authorization_url).searchParams.get('state');
   const u='https://link-task-mcp.gonzalogaraymunoz.workers.dev/google/callback?code=code&state='+state;
   assert.equal((await googleCallback(new Request(u),env)).status,200);
  }finally{globalThis.fetch=original}
 }
 return {env,db,ids,seed,fetchMock,tasks};
}
test('daily routine creates only one task per local day, with a persistent routine record',async()=>{
 const f=fixture();await f.seed();
 const original=globalThis.fetch;globalThis.fetch=f.fetchMock;
 try{
  const input={title:'Publicar reel Caracol',list_title:'Caracol Marketing',project:'Caracol Marketing',timezone:'America/Santiago'};
  const first=await createDailyRoutine(input,{id:f.ids.user},f.env);
  assert.equal(first.ok,true);
  assert.equal(first.data.created_today,true);
  assert.equal(f.tasks.length,1);
  assert.ok(f.tasks[0].notes.includes('LINKTASK_ROUTINE:'));
  const second=await createDailyRoutine(input,{id:f.ids.user},f.env);
  assert.equal(second.ok,true);
  assert.equal(second.data.already_exists,true);
  assert.equal(f.tasks.length,1);
  const sameDay=await runDailyRoutines(f.env,new Date(first.data.due+'T17:00:00Z'));
  assert.equal(sameDay.created,0);
  assert.equal(f.tasks.length,1);
  const tomorrow=new Date(first.data.due+'T17:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
  const another=await runDailyRoutines(f.env,tomorrow);
  assert.equal(another.created,1);
  assert.equal(f.tasks.length,2);
  assert.equal((await runDailyRoutines(f.env,tomorrow)).created,0);
  assert.equal(f.tasks.length,2);
 }finally{globalThis.fetch=original}
});
