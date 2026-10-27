import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Real deployed frontend, entirely mocked API. It never authenticates a user or touches their data.
const origin = process.env.LINK_TASK_BASE_URL || 'https://link-task.gonzalogaraymunoz.workers.dev';
const localDay = () => {
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return [parts.year,parts.month,parts.day].join('-');
};
const UUID={planned:'11111111-1111-4111-8111-111111111111',backlog:'22222222-2222-4222-8222-222222222222',verify:'33333333-3333-4333-8333-333333333333',evidence:'44444444-4444-4444-8444-444444444444',session:'55555555-5555-4555-8555-555555555555'};
const day=localDay();
const original=[
 {id:UUID.planned,kind:'task',status:'open',business:'Caracol',title:'Tarea planificada',summary:'Publicar contenido real',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),planned_for:day,due_on:null,objective:'Marketing Caracol',origin:'QA',position:0},
 {id:UUID.backlog,kind:'task',status:'open',business:'LINK WORLD',title:'Backlog sin fecha',summary:'Debe aparecer en backlog',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),planned_for:null,due_on:null,objective:'Organizar',origin:'QA',position:1},
 {id:UUID.verify,kind:'task',status:'verification',business:'Caracol',title:'Por verificar',summary:'Validación operativa',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),planned_for:day,objective:'Control',origin:'QA',position:2},
 {id:UUID.evidence,kind:'evidence',status:'open',business:'Caracol',title:'Prueba documental',summary:'Archivo QA',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),planned_for:null}
];
const browser=await chromium.launch({headless:true});
const output=[];
try {
 for(const width of [1440,390]){
  let entries=structuredClone(original),links=[],writes=[],errors=[];
  const context=await browser.newContext({viewport:{width,height:860},locale:'es-CL'});
  await context.addInitScript(()=>{
    localStorage.setItem('linktask_session',JSON.stringify({token:'qa-local-token-not-real',refresh:'',email:'qa@example.invalid',exp:Math.floor(Date.now()/1000)+3600}));
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method();
   let status=200,result={};
   const body=method==='POST'||method==='PATCH'?req.postDataJSON():null;
   if(path==='/api/config')result={url:'https://example.supabase.test',key:'test-only'};
   else if(path==='/api/me')result={email:'qa@example.invalid',user_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'};
   else if(path==='/api/entries'&&method==='GET')result={entries};
   else if(path==='/api/sessions'&&method==='GET')result={sessions:[{id:UUID.session,title:'Sesión de QA',started_at:new Date().toISOString(),category:'Caracol'}]};
   else if(path==='/api/insights')result={measured_seconds:0};
   else if(path==='/api/entries'&&method==='POST'){
    assert.equal(body.kind,'task');
    const x={...body,id:'66666666-6666-4666-8666-666666666666',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    entries=[x,...entries];writes.push({path,method,body});result=x;status=201;
   } else if(path.startsWith('/api/entries/')&&method==='PATCH'){
    const id=path.slice('/api/entries/'.length),current=entries.find(x=>x.id===id);
    assert.ok(current,'Unknown task id');
    Object.assign(current,body,{updated_at:new Date().toISOString()});
    writes.push({path,method,body});result={...current};
   } else if(path==='/api/task-links'&&method==='GET')result={links:links.filter(x=>x.task_entry_id===url.searchParams.get('task_id'))};
   else if(path==='/api/task-links'&&method==='POST'){
    const x={id:'77777777-7777-4777-8777-777777777777',task_entry_id:body.task_id,related_entry_id:body.related_entry_id||null,related_session_id:body.related_session_id||null};
    links.push(x);writes.push({path,method,body});result=x;status=201;
   }else{ status=404;result={error:'Unmocked path: '+method+' '+path};}
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result)});
  });
  await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#linkKanban .lkcard').first().waitFor({state:'visible',timeout:20000});
  assert.equal(await page.locator('#linkKanban .lkcolumn').count(),4,'Four Kanban stages');
  const layout=await page.evaluate(()=>{
   const board=document.querySelector('#linkKanban').getBoundingClientRect(),stats=document.querySelector('#dashboard .stats').getBoundingClientRect();
   return {boardTop:board.top,statsTop:stats.top,pageWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth};
  });
  assert.ok(layout.boardTop<layout.statsTop,'Board must be above metrics');
  assert.ok(layout.pageWidth<=layout.innerWidth+2,'No full-page horizontal overflow at '+width+': '+JSON.stringify(layout));
  assert.equal(await page.locator('.lkbackitem').filter({hasText:'Backlog sin fecha'}).count(),1,'Backlog auto displayed');
  await page.locator('.lkbackitem').filter({hasText:'Backlog sin fecha'}).getByRole('button',{name:'Planificar hoy'}).click();
  await page.locator('.lkcard').filter({hasText:'Backlog sin fecha'}).waitFor({state:'visible',timeout:12000});
  assert.ok(writes.some(x=>x.method==='PATCH'&&x.body.planned_for===day),'Planning must persist API PATCH');
  await page.locator('.lkcard').filter({hasText:'Tarea planificada'}).click();
  await page.locator('.lkdetail select[aria-label^="Cambiar etapa de"]').selectOption('verification');
  await page.waitForFunction(id=>[...document.querySelectorAll('.lkcolumn')].some(col=>col.dataset.stage==='verification'&&[...col.querySelectorAll('.lkcard')].some(card=>card.dataset.taskId===id)),UUID.planned);
  assert.ok(writes.some(x=>x.body.status==='verification'),'Status change must persist');
  await page.locator('.lkdetail select[aria-label="Elegir evidencia o sesión para vincular"]').selectOption('entry:'+UUID.evidence);
  await page.locator('.lkdetail').getByRole('button',{name:'Vincular'}).click();
  await page.locator('.lkrelations').getByText('Evidencia · Prueba documental').waitFor({state:'visible',timeout:10000});
  assert.ok(writes.some(x=>x.path==='/api/task-links'),'Evidence linkage must call API');
  await page.locator('.lkhead').getByRole('button',{name:/Nueva tarea/}).click();
  await page.locator('.lkform input[required]').fill('Nueva tarea desde navegador');
  await page.locator('.lkform').getByRole('button',{name:'Guardar tarea'}).click();
  await page.locator('.lkbackitem').filter({hasText:'Nueva tarea desde navegador'}).waitFor({state:'visible',timeout:12000});
  assert.ok(writes.some(x=>x.method==='POST'&&x.path==='/api/entries'&&x.body.client_event_id),'Creation idempotency token required');
  await page.locator('.lktoolbar select[aria-label="Filtrar por negocio"]').selectOption('Caracol');
  assert.equal(await page.locator('.lkboard .lkcard').filter({hasText:'Backlog sin fecha'}).count(),0,'Business filter');
  await page.locator('.lktoolbar select[aria-label="Filtrar por período"]').selectOption('month');
  assert.ok(await page.locator('.lkboard .lkcard').count()>=1,'Month filter shows planned tasks');
  assert.deepEqual(errors,[],'Uncaught browser exceptions');
  output.push({width,layout,recordedMockWrites:writes.length,status:'PASS'});
  await context.close();
 }
 console.log('BROWSER_E2E_MOCKED_API_PASS '+JSON.stringify(output));
}finally{await browser.close()}
