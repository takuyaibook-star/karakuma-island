import test from 'node:test';
import assert from 'node:assert/strict';
import {drawForestSign} from '../decor.mjs';

test('the sign renders without the roundRect API missing on older Safari', () => {
  const calls = [];
  const ctx = new Proxy({}, {
    get(_target, name) {
      if (name === 'roundRect') return undefined;
      if (name === 'createLinearGradient') return () => ({addColorStop() {}});
      return (...args) => calls.push([name, ...args]);
    },
    set() { return true; }
  });
  assert.doesNotThrow(() => drawForestSign(ctx));
  assert.ok(calls.some(([name, label]) => name === 'fillText' && label === 'キノコの森'));
  assert.equal(calls.at(-1)[0], 'restore');
});
