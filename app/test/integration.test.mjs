import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{enhanceHtml} from '../src/index.js';
test('enhancer conserva el formulario de autenticación',async()=>{
 const result=await worker.fetch(new Request('https://link-task.example.test/'));
 const html=await result.text();
 assert.match(html,/id="auth"/);
 assert.match(html,/id="dashboard"/);
 assert.match(html,/id="entryForm"/);
 assert.match(html,/id="sessionForm"/);
 assert.match(html,/id="feed"/);
 assert.match(html,/_experience\.css/);
 assert.match(html,/_experience\.js/);
});
test('cada recurso visual se sirve sin tocar Supabase',async()=>{
 const css=await worker.fetch(new Request('https://link-task.example.test/_experience.css'));
 assert.equal(css.status,200);
 assert.match(await css.text(),/\.pulsePanel/);
 const script=await worker.fetch(new Request('https://link-task.example.test/_experience.js'));
 assert.equal(script.status,200);
 assert.match(await script.text(),/updateVisual/);
});
test('enlace MCP y API original permanecen en el código de origen',async()=>{
 const r=await worker.fetch(new Request('https://link-task.example.test/api/health'));
 assert.equal(r.status,200);
 const data=await r.json();
 assert.equal(data.service,'link-task');
});
test('una página ajena no se modifica',()=>assert.equal(enhanceHtml('abc'),'abc'));

test('branding LINK DIGITAL conserva logo, identidad y paleta original',async()=>{
 const css=await worker.fetch(new Request('https://link-task.example.test/_link-brand.css'));
 assert.equal(css.status,200);
 const style=await css.text();
 assert.match(style,/#F8F8F5/);
 assert.match(style,/#D9FA87/);
 assert.match(style,/\.brand \.logo svg/);
 const branding=await worker.fetch(new Request('https://link-task.example.test/_link-brand.js'));
 assert.equal(branding.status,200);
 const script=await branding.text();
 assert.match(script,/M329 230 L319 230/);
 assert.match(script,/LINK<span class="wordDivider">/);
});
test('la versión pública incluye identidad LINK DIGITAL, sin reemplazar formularios',async()=>{
 const response=await worker.fetch(new Request('https://link-task.example.test/'));
 const html=await response.text();
 assert.match(html,/_link-brand\.css/);
 assert.match(html,/_link-brand\.js/);
 assert.match(html,/linktask_brand_v1/);
 assert.match(html,/id="entryForm"/);
 assert.match(html,/id="sessionForm"/);
});

test('responsive: meta viewport y recursos táctiles están enlazados',async()=>{
 const response=await worker.fetch(new Request('https://link-task.example.test/'));
 const html=await response.text();
 assert.match(html,/viewport-fit=cover/);
 assert.match(html,/_responsive\\.css/);
 assert.match(html,/_mobile\\.js/);
 assert.match(html,/id="entryForm"/);
 assert.match(html,/id="sessionForm"/);
});
test('responsive: tamaños 320, 480, 850, 1160 y pantalla panorámica documentados',async()=>{
 const r=await worker.fetch(new Request('https://link-task.example.test/_responsive.css'));
 assert.equal(r.status,200);
 const css=await r.text();
 for(const breakpoint of ['max-width:355px','max-width:480px','max-width:620px','max-width:850px','max-width:1160px','min-width:1600px']){
  assert.ok(css.includes(breakpoint),'Missing breakpoint '+breakpoint);
 }
 assert.match(css,/mobileNavBackdrop/);
 assert.match(css,/100dvh/);
 assert.match(css,/env\\(safe-area-inset-bottom\\)/);
 assert.match(css,/font-size:16px/);
 assert.match(css,/max-width:100%/);
});
test('responsive: navegación accesible y controles móviles mantienen foco y cierre',async()=>{
 const r=await worker.fetch(new Request('https://link-task.example.test/_mobile.js'));
 assert.equal(r.status,200);
 const code=await r.text();
 assert.doesNotThrow(()=>new Function(code));
 assert.match(code,/aria-expanded/);
 assert.match(code,/aria-hidden/);
 assert.match(code,/inert/);
 assert.match(code,/mobileNavOpen/);
 assert.match(code,/touchend/);
 assert.match(code,/Escape/);
 assert.match(code,/newEntry/);
});
