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
