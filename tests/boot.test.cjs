const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../boot.js'), 'utf8');
function boot(viewport) {
  const elements = Object.fromEntries(['loading', 'loading-message', 'loading-help', 'retry'].map(id => [id, {
    hidden: id === 'retry' || id === 'loading-help', textContent: '',
    addEventListener(name, handler) { this[name] = handler; }
  }]));
  const events = {}, timers = new Map(); let next = 0, reloads = 0;
  const properties = {}, viewportEvents = {};
  const window = {innerHeight: 568, visualViewport: viewport ? {height: viewport, addEventListener(name, handler) { viewportEvents[name] = handler; }} : undefined, addEventListener(name, handler) { events[name] = handler; }, location: {reload() { reloads++; }}};
  vm.runInNewContext(code, {window, document: {documentElement: {style: {setProperty(name, value) {properties[name] = value; }}}, getElementById(id) { return elements[id]; }},
    setTimeout(handler) { timers.set(++next, handler); return next; }, clearTimeout(id) { timers.delete(id); }});
  return {elements, events, timers, properties, window, viewportEvents, api: window.__islandBoot, reloads: () => reloads};
}
test('missing or stalled module exposes a retry instead of waiting forever', () => {
  const b = boot(); [...b.timers.values()][0]();
  assert.equal(b.elements.retry.hidden, false); assert.equal(b.elements['loading-help'].hidden, false);
  b.elements.retry.click(); assert.equal(b.reloads(), 1);
});
test('script errors are caught before the game module starts', () => {
  const b = boot(); b.events.error({target: {tagName: 'SCRIPT'}});
  assert.equal(b.elements.retry.hidden, false); assert.match(b.elements['loading-message'].textContent, /起動できません/);
});
test('image progress updates and successful start cancels the watchdog', () => {
  const b = boot(); b.api.progress('画像 3/6'); assert.equal(b.elements['loading-message'].textContent, '画像 3/6');
  b.api.ready(); assert.equal(b.timers.size, 0); assert.equal(b.elements.loading.hidden, true);
  b.events.error({message: 'later unrelated error'}); assert.equal(b.elements.loading.hidden, true);
});
test('BGM failure does not prevent game loading', () => {
  const b = boot(); b.events.error({target: {tagName: 'AUDIO'}});
  assert.equal(b.elements.retry.hidden, true);
});
test('fits the visible Safari area when browser controls change its height', () => {
  const b = boot(650.9); assert.equal(b.properties['--island-height'], '650px');
  b.window.visualViewport.height = 570.2; b.viewportEvents.resize();
  assert.equal(b.properties['--island-height'], '570px');
});
test('older browsers without visualViewport fall back to innerHeight', () => {
  const b = boot(); assert.equal(b.properties['--island-height'], '568px');
  b.window.innerHeight = 320; b.events.resize();
  assert.equal(b.properties['--island-height'], '320px');
});
