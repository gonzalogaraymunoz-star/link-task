import assert from 'node:assert/strict';
const site='https://link-task.gonzalogaraymunoz.workers.dev';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const stamp=Date.now().toString(36);
// Cloudflare may serve the former Worker on some PoPs for a few seconds after deployment.
async function untilReady(path,verify){
 let last='';
 for(let attempt=0;attempt<18;attempt++){
  try{
   const response=await fetch(site+path+(path.includes('?')?'&':'?')+'smoke='+stamp+'-'+attempt,{cache:'no-store'});
   const body=await response.text();
   if(response.ok&&verify(body))return body;
   last=path+': '+response.status+' / '+body.slice(0,90);
  }catch(e){last=path+': '+String(e).slice(0,140)}
  await sleep(1500);
 }
 throw new Error('LINK TASK deployment did not propagate: '+last);
}
const html=await untilReady('/',body=>body.includes('id="dashboard"')&&body.includes('/_experience.css')&&body.includes('/_experience.js'));
await untilReady('/_experience.css',body=>body.includes('.pulsePanel')&&body.includes('data-visual'));
await untilReady('/_experience.js',body=>body.includes('pulseMetricNumber')&&body.includes('sidebarCompact'));
await untilReady('/_link-brand.css',body=>body.includes('#F8F8F5')&&body.includes('#D9FA87'));
await untilReady('/_link-brand.js',body=>body.includes('M329 230 L319 230')&&body.includes('wordDivider'));
await untilReady('/_responsive.css',body=>body.includes('max-width:480px')&&body.includes('mobileNavBackdrop'));
await untilReady('/_mobile.js',body=>body.includes('mobileNavOpen')&&body.includes('aria-expanded'));
await untilReady('/api/health',body=>{try{return JSON.parse(body).service==='link-task'}catch{return false}});
assert.ok(html.includes('id="feed"'));
assert.ok(html.includes('/_link-brand.css'));
assert.ok(html.includes('/_link-brand.js'));
assert.ok(html.includes('/_responsive.css'));
assert.ok(html.includes('/_mobile.js'));
assert.ok(html.includes('viewport-fit=cover'));
console.log('LINK TASK app smoke OK: responsive mobile/tablet/desktop assets, official brand, panel + API');
