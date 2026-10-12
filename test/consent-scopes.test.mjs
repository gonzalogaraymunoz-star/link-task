import test from 'node:test';
import assert from 'node:assert/strict';
import {consentScript} from '../src/consent.js';

test('OAuth consent reads scopes from the document even when boxes are outside the form',()=>{
 assert.match(consentScript,/document\.querySelectorAll\('input\[name=/);
 assert.doesNotMatch(consentScript,/form\.querySelectorAll\('input\[name=/);
});
