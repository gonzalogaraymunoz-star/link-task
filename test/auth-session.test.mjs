import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createAuthSession,resolveAuthSession} from '../src/auth-session.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;

function fixture(){
 const db=new Map();
 const env={
  GOOGLE_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,77).toString('base64'),
  SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',
  OAUTH_KV:{
   get:async k=>db.get(k)||null,
   put:async(k,v)=>db.set(k,v),
   delete:async k=>db.delete(k)
  }
 };
 const userId='12345678-1234-4123-8123-123456789abc';
 return {db,env,userId};
}
test('store rotating session encrypted; refresh expired JWT without new user login',async()=>{
 const {db,env,userId}=fixture();
 const id=await createAuthSession({userId,accessToken:'old-access',refreshToken:'private-refresh',expiresIn:60},env);
 const raw=db.get('link_task:supa_session:'+id);
 assert.ok(raw);
 assert.equal(raw.includes('private-refresh'),false);
 assert.equal(raw.includes('old-access'),false);
 const original=globalThis.fetch;
 const calls=[];
 globalThis.fetch=async(url,options={})=>{
  calls.push([String(url),options.method||'GET']);
  if(String(url).endsWith('?grant_type=refresh_token')){
   assert.equal(JSON.parse(options.body).refresh_token,'private-refresh');
   return new Response(JSON.stringify({access_token:'new-access',refresh_token:'rotated-refresh',expires_in:3600}),{status:200});
  }
  if(String(url).endsWith('/auth/v1/user')){
   assert.equal(options.headers.authorization,'Bearer new-access');
   return new Response(JSON.stringify({id:userId,email:'test@example.com'}),{status:200});
  }
  throw Error('unexpected fetch: '+url);
 };
 try{
  const result=await resolveAuthSession({userId,sessionId:id},env);
  assert.equal(result.error,undefined);
  assert.equal(result.jwt,'new-access');
  assert.equal(result.user.id,userId);
  assert.equal(calls.length,2);
  const subsequent=await resolveAuthSession({userId,sessionId:id},env);
  assert.equal(subsequent.jwt,'new-access');
  assert.equal(calls.filter(x=>x[1]==='POST').length,1);
  assert.equal(db.get('link_task:supa_session:'+id).includes('rotated-refresh'),false);
 }finally{globalThis.fetch=original}
});
test('session cannot be used by another Supabase user or legacy OAuth props',async()=>{
 const {env,userId}=fixture();
 const sessionId=await createAuthSession({userId,accessToken:'token',refreshToken:'refresh',expiresIn:3600},env);
 const wrong=await resolveAuthSession({userId:'11111111-1111-4111-8111-111111111111',sessionId},env);
 assert.equal(wrong.error,'auth_reconnect_required');
 const legacy=await resolveAuthSession({userId,upstreamJwt:'expired'},env);
 assert.equal(legacy.error,'auth_reconnect_required');
});
test('revoked refresh grant requires consent; transient network failure does not',async()=>{
 const {env,userId}=fixture(),original=globalThis.fetch;
 const sessionId=await createAuthSession({userId,accessToken:'old',refreshToken:'revoked',expiresIn:60},env);
 try{
  globalThis.fetch=async()=>new Response('{}',{status:401});
  assert.equal((await resolveAuthSession({userId,sessionId},env)).error,'auth_reconnect_required');
  globalThis.fetch=async()=>{throw Error('network down')};
  assert.equal((await resolveAuthSession({userId,sessionId},env)).error,'auth_refresh_temporarily_unavailable');
 }finally{globalThis.fetch=original}
});
test('valid Supabase JWT with outage should not prompt reconnection',async()=>{
 const {env,userId}=fixture(),original=globalThis.fetch;
 const sessionId=await createAuthSession({userId,accessToken:'still-valid',refreshToken:'fresh',expiresIn:3600},env);
 try{
  globalThis.fetch=async()=>new Response('{}',{status:503});
  assert.equal((await resolveAuthSession({userId,sessionId},env)).error,'auth_identity_temporarily_unavailable');
 }finally{globalThis.fetch=original}
});
