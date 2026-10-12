#!/usr/bin/env node
/**
 * Dependency-free regression gate for the homepage Tools directory and search.
 * Run: node scripts/validate-foundry-directory.mjs
 * No GitHub Actions or network access required.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const home = read('index.html');
const siteMap = read('site-map.html');
const index = JSON.parse(read('search-index.json'));
const searchScript = read('foundry-search.js');

assert.ok(Array.isArray(index) && index.length > 0, 'Search index must be a nonempty array');
const ids = new Set();
for (const entry of index) {
  assert.ok(entry.id && entry.title && entry.workspace && entry.description && entry.url, 'Incomplete search entry');
  assert.ok(!ids.has(entry.id), 'Duplicate search ID: ' + entry.id);
  ids.add(entry.id);
  if (/^https?:\/\//.test(entry.url)) continue;
  const pathname = entry.url.split(/[?#]/, 1)[0];
  assert.ok(pathname && !pathname.startsWith('/') && !pathname.includes('..'), 'Unsafe index path: ' + entry.url);
  assert.ok(existsSync(join(root, pathname)), 'Search target missing: ' + entry.url);
}

const primaryNav = home.match(/<nav class="top-nav" aria-label="Primary">([\s\S]*?)<\/nav>/)?.[1];
const modulesNav = home.match(/<nav class="top-nav no-print" aria-label="Module sections">([\s\S]*?)<\/nav>/)?.[1];
assert.ok(primaryNav && modulesNav, 'Homepage navigation structure missing');
for (const path of [
  'low-power-system-setup-archive.html',
  'acquisition-library.html',
  'ss13-ss14.html',
  'final-battle-scenario.html'
]) {
  assert.ok(!primaryNav.includes('href="' + path + '"'), path + ' unexpectedly returned to primary navigation');
  assert.ok(home.includes('href="' + path + '"'), path + ' missing from homepage');
}
assert.ok(modulesNav.includes('href="final-battle-scenario.html"'), 'Final Battle Scenario missing from Modules navigation');
const searchAt = home.indexOf('id="foundry-search"');
const cardsAt = home.indexOf('<div class="menu-grid no-print">');
const modulesAt = home.indexOf('<section id="modules"');
assert.ok(searchAt >= 0 && searchAt < cardsAt && cardsAt < modulesAt, 'Tools cards must remain under search');
for (const marker of ['data-cubechat-card="true"', 'data-final-battle-scenario-card="true"']) {
  const at = home.indexOf(marker);
  assert.ok(at > cardsAt && at < modulesAt, marker + ' must remain a Tools card');
}
for (const path of ['cubechat.html', 'final-battle-scenario.html']) {
  assert.ok(siteMap.includes('href="' + path + '"'), 'Human site map missing ' + path);
  assert.ok(index.some(entry => entry.url === path), 'Search index missing ' + path);
}

function fakeBrowser() {
  class Element {
    constructor() {
      this.value = '';
      this.textContent = '';
      this.children = [];
      this.events = {};
    }
    append(...nodes) { this.children.push(...nodes); }
    appendChild(node) { this.children.push(node); }
    replaceChildren(...nodes) { this.children = nodes; }
    addEventListener(name, fn) { this.events[name] = fn; }
    focus() { this.focused = true; }
    scrollIntoView() {}
  }
  const elements = Object.fromEntries([
    'foundry-tool-search', 'foundry-search-results', 'foundry-search-status',
    'foundry-search-clear', 'foundry-search'
  ].map(id => [id, new Element()]));
  return {
    elements,
    document: {
      getElementById(id) { return elements[id] || null; },
      createElement() { return new Element(); }
    }
  };
}
async function launch(query, fetchIndex) {
  const browser = fakeBrowser();
  runInNewContext(searchScript, {
    document: browser.document, fetch: fetchIndex,
    location: { search: query }, URLSearchParams
  }, { timeout: 2000 });
  await new Promise(resolve => setImmediate(resolve));
  return browser.elements;
}

const testEntries = Array.from({ length: 27 }, (_, i) => ({
  id: 'bulk-' + i, title: 'Bulk item ' + i, workspace: 'Tests',
  description: 'Indexed test page', keywords: ['bulkquery'], url: 'index.html'
}));
const ok = await launch('?search=bulkquery', async () => ({ ok: true, json: async () => testEntries }));
assert.equal(ok['foundry-search-results'].children.length, 27, 'Search must not silently truncate matching results');
assert.ok(ok['foundry-tool-search'].events.input, 'Input listener absent after successful load');

const offline = await launch('?search=potion', async () => { throw Error('simulated offline state'); });
const input = offline['foundry-tool-search'];
assert.ok(input.events.input, 'Input listener absent when index is unavailable');
input.value = 'world';
input.events.input();
assert.equal(offline['foundry-search-results'].children.length, 1, 'Fallback entries must remain searchable');
offline['foundry-search-clear'].events.click();
assert.equal(input.value, '', 'Clear control must work in fallback mode');
assert.ok(input.focused, 'Clear control must return focus to search');

console.log('PASS: Foundry directory links, menu placement, sitemap coverage, full search, and offline controls (' + index.length + ' indexed entries).');
