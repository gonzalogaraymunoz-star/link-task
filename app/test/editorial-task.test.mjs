import test from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import { TASK_BRIEF_SCRIPT } from '../src/task-brief.js';
import { enhanceHtml } from '../src/index.js';

test('editorial client script is valid JavaScript', () => {
  assert.doesNotThrow(() => new Script(TASK_BRIEF_SCRIPT));
});

test('task details render editable brief and copyable agent instructions', () => {
  assert.match(TASK_BRIEF_SCRIPT, /PROMPT PARA AGENTE/);
  assert.match(TASK_BRIEF_SCRIPT, /CRITERIO DE CIERRE/);
  assert.match(TASK_BRIEF_SCRIPT, /SIGUIENTE ACCIÓN/);
  assert.match(TASK_BRIEF_SCRIPT, /navigator\.clipboard\.writeText/);
  assert.match(TASK_BRIEF_SCRIPT, /noopener noreferrer/);
  assert.match(TASK_BRIEF_SCRIPT, /document\.createElement\('a'\)/);
  assert.doesNotMatch(TASK_BRIEF_SCRIPT, /\.innerHTML\s*=/);
});

test('HTML enhancement includes editorial asset after existing Kanban UI', () => {
  const html = '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>';
  const result = enhanceHtml(html);
  assert.match(result, /\/_kanban\.js\?v=/);
  assert.match(result, /\/_task-brief\.js\?v=/);
  assert.ok(result.indexOf('/_task-brief.js')>result.indexOf('/_kanban.js'));
});
