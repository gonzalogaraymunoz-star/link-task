import assert from 'node:assert/strict';
const site='https://link-task.gonzalogaraymunoz.workers.dev';
const [page,css,js,health]=await Promise.all([
 fetch(site+'/'),fetch(site+'/_experience.css'),fetch(site+'/_experience.js'),fetch(site+'/api/health')
]);
assert.equal(page.status,200);
assert.equal(css.status,200);
assert.equal(js.status,200);
assert.equal(health.status,200);
const html=await page.text(),stylesheet=await css.text(),motion=await js.text();
assert.ok(html.includes('_experience.css'));
assert.ok(html.includes('_experience.js'));
assert.ok(html.includes('id="dashboard"'));
assert.ok(stylesheet.includes('.pulsePanel'));
assert.ok(motion.includes('pulseMetricNumber'));
const h=await health.json();assert.equal(h.service,'link-task');
console.log('LINK TASK app smoke OK: HTML, CSS, motion JS, health + original dashboard');
