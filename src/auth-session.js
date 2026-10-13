// Short-lived Supabase JWTs must never be baked into long-lived OAuth grants.
// Store independently encrypted, per-grant refresh credentials in Cloudflare KV.
import {SUPA,getUser} from './core.js';

const te=new TextEncoder(), td=new TextDecoder();
const THIRTY_DAYS_MS=30*24*60*60*1000;
const REFRESH_AHEAD_MS=90*1000;
const SESSION_PREFIX='link_task:supa_session:';
const safeId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const to64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const from64=s=>Uint8Array.from(atob(s),x=>x.charCodeAt(0));

async function sessionKey(env){
 if(!env.OAUTH_KV||!env.GOOGLE_TOKEN_ENCRYPTION_KEY)throw Error('session_encryption_not_configured');
 const secret=from64(env.GOOGLE_TOKEN_ENCRYPTION_KEY);
 if(secret.length!==32)throw Error('invalid_encryption_key');
 // Derive a separate key: Google Tasks and Supabase session ciphertext are not interchangeable.
 const root=await crypto.subtle.importKey('raw',secret,'HKDF',false,['deriveKey']);
 return crypto.subtle.deriveKey({
   name:'HKDF',hash:'SHA-256',
   salt:te.encode('LINK TASK credential storage, v1'),
   info:te.encode('Supabase OAuth session, v1')
 },root,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encrypt(obj,env){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await sessionKey(env),te.encode(JSON.stringify(obj)));
 return to64(iv)+'.'+to64(data);
}
async function decrypt(value,env){
 const [iv,bytes]=(value||'').split('.');
 if(!iv||!bytes)throw Error('invalid_session_ciphertext');
 return JSON.parse(td.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(iv)},await sessionKey(env),from64(bytes))));
}
const expiresInMs=seconds=>Math.min(86400,Math.max(60,Number(seconds)||3600))*1000;
async function store(id,record,env){
 const seconds=Math.floor((record.absoluteExpiry-Date.now())/1000);
 if(seconds<=0)throw Error('session_expired');
 await env.OAUTH_KV.put(SESSION_PREFIX+id,await encrypt(record,env),{expirationTtl:Math.max(60,seconds)});
}

// Created only after Supabase has verified the JWT and the user explicitly approved OAuth.
// The refresh token never enters OAuthProvider props or the outgoing ChatGPT response.
export async function createAuthSession({userId,accessToken,refreshToken,expiresIn},env){
 if(!safeId.test(userId)||typeof accessToken!=='string'||!accessToken||
    typeof refreshToken!=='string'||!refreshToken||refreshToken.length>4096)
   throw Error('invalid_login_session');
 const sessionId=crypto.randomUUID(),now=Date.now();
 await store(sessionId,{
   userId,accessToken,refreshToken,
   tokenExpiry:now+expiresInMs(expiresIn),
   absoluteExpiry:now+THIRTY_DAYS_MS
 },env);
 return sessionId;
}
async function refresh(sessionId,session,env){
 let response;
 try{
   response=await fetch(SUPA+'/auth/v1/token?grant_type=refresh_token',{
     method:'POST',
     headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'},
     body:JSON.stringify({refresh_token:session.refreshToken})
   });
 }catch{return {error:'auth_refresh_temporarily_unavailable'}}
 if(!response.ok){
   // A second request may have rotated the refresh token concurrently.
   const other=await env.OAUTH_KV.get(SESSION_PREFIX+sessionId);
   if(other){
     try{
       const newer=await decrypt(other,env);
       if(newer.userId===session.userId&&newer.refreshToken!==session.refreshToken &&
          newer.tokenExpiry>Date.now()+REFRESH_AHEAD_MS)return {session:newer};
     }catch{}
   }
   return {error:response.status>=500?'auth_refresh_temporarily_unavailable':'auth_reconnect_required'};
 }
 const value=await response.json().catch(()=>null);
 if(!value?.access_token||!value?.refresh_token)return {error:'auth_reconnect_required'};
 const next={...session,accessToken:value.access_token,refreshToken:value.refresh_token,tokenExpiry:Date.now()+expiresInMs(value.expires_in)};
 await store(sessionId,next,env);
 return {session:next};
}
export async function resolveAuthSession(props,env){
 const sessionId=props?.sessionId,userId=props?.userId;
 if(!safeId.test(sessionId||'')||!safeId.test(userId||''))return {error:'auth_reconnect_required'};
 let saved;
 try{
   const encrypted=await env.OAUTH_KV.get(SESSION_PREFIX+sessionId);
   if(!encrypted)return {error:'auth_reconnect_required'};
   saved=await decrypt(encrypted,env);
 }catch{return {error:'auth_session_unavailable'}}
 if(saved.userId!==userId||Date.now()>=saved.absoluteExpiry)return {error:'auth_reconnect_required'};
 if(Date.now()+REFRESH_AHEAD_MS>=saved.tokenExpiry){
   try{
     const result=await refresh(sessionId,saved,env);
     if(result.error)return result;
     saved=result.session;
   }catch{return {error:'auth_refresh_temporarily_unavailable'}}
 }
 const user=await getUser(saved.accessToken,env);
 if(!user||user.id!==userId)return {error:'auth_reconnect_required'};
 return {user,jwt:saved.accessToken};
}
