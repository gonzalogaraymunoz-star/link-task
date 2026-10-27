import assert from 'node:assert/strict';
const origin='https://link-task.gonzalogaraymunoz.workers.dev';
const release='2026-10-27-kanban-operativo-replica-v2';
async function get(path){const r=await fetch(origin+path,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)});return {status:r.status,contentType:r.headers.get('content-type')||'',body:await r.text()}}
const health=await get('/api/health');assert.equal(health.status,200,'health HTTP');assert.equal(JSON.parse(health.body).service,'link-task');
const home=await get('/');assert.equal(home.status,200,'homepage HTTP');assert.match(home.body,/id="auth"/);assert.ok(home.body.includes('_kanban.js?v='+release),'homepage updated release');
const board=await get('/_kanban.js?v='+release);assert.equal(board.status,200,'Kanban JS HTTP');assert.match(board.contentType,/javascript/);for(const key of ['planned_for','verification','Backlog'])assert.ok(board.body.includes(key),'Kanban script missing '+key);
const unauth=await get('/api/entries');assert.equal(unauth.status,401,'JWT gate on entries');
const links=await get('/api/task-links?task_id=33333333-3333-4333-8333-333333333333');assert.equal(links.status,401,'JWT gate on links');
console.log('LIVE_SMOKE_OK: health, HTML, Kanban, auth API gates. No data modified.');
