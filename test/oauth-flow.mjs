
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const host='https://link-task-mcp.gonzalogaraymunoz.workers.dev';
const endpoint=host+'/oauth/register';
const callback='https://example.com/link-task-smoke-callback';
const registration=await fetch(endpoint,{
 method:'POST',headers:{'content-type':'application/json'},
 body:JSON.stringify({
  client_name:'LINK TASK OAuth smoke test',
  redirect_uris:[callback],
  token_endpoint_auth_method:'none',
  grant_types:['authorization_code','refresh_token'],
  response_types:['code']
 })
});
const payload=await registration.json().catch(()=>({}));
assert.equal(registration.status,201,'Dynamic OAuth client registration failed: '+JSON.stringify(payload));
assert.ok(payload.client_id);
const verifier='test-oauth-pkce-verifier-'+('X'.repeat(49));
const challenge=createHash('sha256').update(verifier).digest('base64url');
const request=new URL(host+'/authorize');
request.searchParams.set('response_type','code');
request.searchParams.set('client_id',payload.client_id);
request.searchParams.set('redirect_uri',callback);
request.searchParams.set('code_challenge',challenge);
request.searchParams.set('code_challenge_method','S256');
request.searchParams.set('scope','link_task:read link_task:write');
request.searchParams.set('state','automated-oauth-consent-test');
request.searchParams.set('resource',host+'/mcp');
const authorized=await fetch(request,{redirect:'manual'});
const page=await authorized.text();
assert.equal(authorized.status,200,'Consent page did not open. Status: '+authorized.status+' body: '+page.slice(0,300));
assert.match(page,/oauth-consent/);
assert.match(page,/scope/);
assert.match(page,/LINK TASK OAuth smoke test/);
assert.match(page,/example.com/);
assert.ok(authorized.headers.get('set-cookie'),'OAuth consent must be tied to a browser-bound cookie');
console.log('OAuth flow test OK: registration, PKCE authorization request, consent screen, browser cookie');
