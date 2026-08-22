(function installHBFoundryAPI(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HBFoundryAPI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createHBFoundryAPI(root) {
  'use strict';

  const VERSION = '1.1.0';
  const scriptElement = root?.document?.currentScript || null;
  const defaultBase = root?.location?.href || 'https://mrcalzon02.github.io/HB-TTRPG-tools/';
  const BASE_URL = new URL('.', scriptElement?.src || defaultBase);
  const MANIFEST_URL = new URL('api/foundry-capabilities.json', BASE_URL);
  const SEARCH_INDEX_URL = new URL('search-index.json', BASE_URL);
  const COLLECTIONS_URL = new URL('api/resource-collections.json', BASE_URL);
  const manifestPromise = { value: null };
  const collectionsPromise = { value: null };
  const scriptPromises = new Map();
  const resourceCache = new Map();

  function fail(message) { throw new Error(`[HBFoundryAPI] ${message}`); }
  function normalize(value) { return String(value ?? '').toLowerCase().trim(); }
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }

  function sameOriginUrl(path) {
    const url = new URL(String(path || ''), BASE_URL);
    if (url.origin !== BASE_URL.origin) fail(`Cross-origin resource is not registered for facade access: ${url.href}`);
    return url;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) fail(`${url} returned HTTP ${response.status}.`);
    return response.json();
  }

  async function manifest() {
    if (!manifestPromise.value) manifestPromise.value = fetchJson(MANIFEST_URL);
    return manifestPromise.value;
  }

  async function collectionManifest() {
    if (!collectionsPromise.value) collectionsPromise.value = fetchJson(COLLECTIONS_URL).catch(() => ({ resources: [] }));
    return collectionsPromise.value;
  }

  function matches(entry, filter = {}) {
    if (!entry) return false;
    if (filter.workspace && normalize(entry.workspace) !== normalize(filter.workspace)) return false;
    if (filter.kind && normalize(entry.kind) !== normalize(filter.kind)) return false;
    if (filter.mode && normalize(entry.mode) !== normalize(filter.mode)) return false;
    if (filter.status && normalize(entry.status) !== normalize(filter.status)) return false;
    if (filter.query) {
      const haystack = normalize([entry.id, entry.title, entry.workspace, entry.kind, entry.mode, entry.status, entry.description, ...(entry.tags || [])].join(' '));
      if (!normalize(filter.query).split(/\s+/).every(term => haystack.includes(term))) return false;
    }
    if (filter.tags?.length) {
      const tags = new Set((entry.tags || []).map(normalize));
      if (!filter.tags.every(tag => tags.has(normalize(tag)))) return false;
    }
    return true;
  }

  async function listCapabilities(filter = {}) {
    const data = await manifest();
    return clone((data.capabilities || []).filter(entry => matches(entry, filter)));
  }

  async function describe(id) {
    const data = await manifest();
    const entry = (data.capabilities || []).find(item => item.id === id);
    if (!entry) fail(`Unknown capability: ${id}`);
    return clone(entry);
  }

  async function listLaboratories(filter = {}) {
    const data = await manifest();
    return clone((data.laboratories || []).filter(entry => matches(entry, filter)));
  }

  async function allResourceDescriptors() {
    const [data, extras] = await Promise.all([manifest(), collectionManifest()]);
    const merged = new Map();
    for (const entry of data.resources || []) merged.set(entry.id, entry);
    for (const entry of extras.resources || []) merged.set(entry.id, { ...(merged.get(entry.id) || {}), ...entry });
    return [...merged.values()];
  }

  async function listResources(filter = {}) {
    return clone((await allResourceDescriptors()).filter(entry => matches(entry, filter)));
  }

  async function resourceDescriptor(id) {
    const entry = (await allResourceDescriptors()).find(item => item.id === id);
    if (!entry) fail(`Unknown resource: ${id}`);
    return entry;
  }

  async function getPath(path, options = {}) {
    const url = sameOriginUrl(path);
    const response = await fetch(url, { cache: options.refresh ? 'reload' : 'no-cache' });
    if (!response.ok) fail(`${path} returned HTTP ${response.status}.`);
    const format = options.format || (/\.json(?:$|\?)/i.test(url.pathname) ? 'json' : 'text');
    return format === 'json' && !options.raw ? response.json() : response.text();
  }

  async function getResource(id, options = {}) {
    const descriptor = await resourceDescriptor(id);
    const url = sameOriginUrl(descriptor.path);
    const cacheKey = `${id}:${options.raw ? 'raw' : 'parsed'}`;
    if (!options.refresh && resourceCache.has(cacheKey)) return clone(resourceCache.get(cacheKey));
    const response = await fetch(url, { cache: options.refresh ? 'reload' : 'no-cache' });
    if (!response.ok) fail(`${descriptor.path} returned HTTP ${response.status}.`);
    let value;
    if (options.raw || descriptor.format !== 'json') value = await response.text();
    else value = await response.json();
    resourceCache.set(cacheKey, value);
    return clone(value);
  }

  function walk(value, query, resourceId, path, output, maxResults) {
    if (output.length >= maxResults || value == null) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const text = String(value);
      const at = normalize(text).indexOf(query);
      if (at >= 0) output.push({ resourceId, path: path.join('.'), value: text.length > 420 ? `${text.slice(Math.max(0, at - 120), at + 280)}…` : text });
      return;
    }
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length && output.length < maxResults; index += 1) walk(value[index], query, resourceId, [...path, index], output, maxResults);
      return;
    }
    if (typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (normalize(key).includes(query) && output.length < maxResults) output.push({ resourceId, path: [...path, key].join('.'), value: typeof child === 'object' ? '[structured value]' : String(child) });
        walk(child, query, resourceId, [...path, key], output, maxResults);
        if (output.length >= maxResults) break;
      }
    }
  }

  function stripHtml(text) {
    return String(text || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  async function searchResources(queryValue, options = {}) {
    const query = normalize(queryValue);
    if (!query) fail('searchResources requires a non-empty query.');
    const maxResults = Math.max(1, Math.min(200, Number(options.maxResults) || 40));
    const descriptors = await listResources({ workspace: options.workspace, kind: options.kind, query: options.resourceQuery });
    const selected = options.resourceIds?.length ? descriptors.filter(entry => options.resourceIds.includes(entry.id)) : descriptors;
    const results = [];
    for (const descriptor of selected) {
      if (results.length >= maxResults) break;
      try {
        const data = await getResource(descriptor.id);
        if (descriptor.format === 'json') walk(data, query, descriptor.id, [], results, maxResults);
        else {
          const text = stripHtml(data);
          const normalized = normalize(text);
          let offset = 0;
          while (results.length < maxResults) {
            const at = normalized.indexOf(query, offset);
            if (at < 0) break;
            results.push({ resourceId: descriptor.id, path: descriptor.path, value: text.slice(Math.max(0, at - 140), at + 300) });
            offset = at + query.length;
          }
        }
      } catch (error) {
        if (options.includeErrors) results.push({ resourceId: descriptor.id, error: error.message });
      }
    }
    return results;
  }

  async function expandResourceIndex(id) {
    const descriptor = await resourceDescriptor(id);
    if (!descriptor.indexRules?.length) fail(`${id} is not registered as an expandable resource index.`);
    const data = await getResource(id);
    const children = [];
    const seen = new Set();
    for (const rule of descriptor.indexRules) {
      const values = data?.[rule.key];
      if (!Array.isArray(values)) continue;
      for (const value of values) {
        const raw = typeof value === 'string' ? value : value?.path;
        if (!raw) continue;
        const path = `${rule.base || ''}${raw}`.replace(/^\.\//, '');
        if (seen.has(path)) continue;
        seen.add(path);
        children.push({
          id: `${id}::${path}`,
          parentId: id,
          title: typeof value === 'object' && value.title ? value.title : path.split('/').pop(),
          workspace: descriptor.workspace,
          kind: rule.kind || descriptor.childKind || 'collection-member',
          format: /\.json$/i.test(path) ? 'json' : /\.html?$/i.test(path) ? 'html' : 'text',
          path,
          tags: [...new Set([...(descriptor.tags || []), ...(rule.tags || [])])]
        });
      }
    }
    return children;
  }

  async function searchCollection(id, queryValue, options = {}) {
    const query = normalize(queryValue);
    if (!query) fail('searchCollection requires a non-empty query.');
    const maxResults = Math.max(1, Math.min(500, Number(options.maxResults) || 80));
    const children = await expandResourceIndex(id);
    const results = [];
    for (const child of children) {
      if (results.length >= maxResults) break;
      try {
        const data = await getPath(child.path, { format: child.format === 'json' ? 'json' : 'text' });
        if (child.format === 'json') walk(data, query, child.id, [], results, maxResults);
        else {
          const text = stripHtml(data);
          const normalized = normalize(text);
          let offset = 0;
          while (results.length < maxResults) {
            const at = normalized.indexOf(query, offset);
            if (at < 0) break;
            results.push({ resourceId: child.id, parentId: id, path: child.path, value: text.slice(Math.max(0, at - 140), at + 300) });
            offset = at + query.length;
          }
        }
      } catch (error) {
        if (options.includeErrors) results.push({ resourceId: child.id, parentId: id, path: child.path, error: error.message });
      }
    }
    return results;
  }

  function resolveGlobal(path) {
    const parts = String(path || '').split('.').filter(Boolean);
    let value = root;
    for (const part of parts) value = value?.[part];
    return value;
  }

  function loadScript(path) {
    if (!root?.document) fail(`Cannot load browser runtime ${path} without a document.`);
    const url = sameOriginUrl(path).href;
    if (scriptPromises.has(url)) return scriptPromises.get(url);
    const existing = [...root.document.scripts].find(script => script.src === url || script.src.split('?')[0] === url);
    if (existing && (existing.dataset.hbFoundryLoaded === 'true' || root.document.readyState !== 'loading')) return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const script = existing || root.document.createElement('script');
      const done = () => { script.dataset.hbFoundryLoaded = 'true'; resolve(); };
      const bad = () => reject(new Error(`[HBFoundryAPI] ${path} could not be loaded.`));
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', bad, { once: true });
      if (!existing) {
        script.src = url;
        script.async = false;
        script.dataset.hbFoundryLoader = 'true';
        root.document.head.appendChild(script);
      }
    });
    scriptPromises.set(url, promise);
    promise.catch(() => scriptPromises.delete(url));
    return promise;
  }

  async function warm(id) {
    const descriptor = await describe(id);
    const invocation = descriptor.invocation;
    if (!invocation) return descriptor;
    if (resolveGlobal(invocation.global)) return descriptor;
    if (descriptor.runtime?.autoLoad === false) fail(`${id} requires page context: ${descriptor.runtime.context || 'initialize its canonical page runtime first'}.`);
    for (const script of descriptor.runtime?.scripts || []) await loadScript(script);
    if (!resolveGlobal(invocation.global)) fail(`${id} loaded its declared scripts but ${invocation.global} is still unavailable.`);
    return descriptor;
  }

  async function invoke(id, input = {}) {
    const descriptor = await warm(id);
    const invocation = descriptor.invocation;
    if (!invocation) {
      if (descriptor.resourceId) return getResource(descriptor.resourceId);
      fail(`${id} is discoverable but has no executable invocation contract.`);
    }
    const target = resolveGlobal(invocation.global);
    if (!target) fail(`${invocation.global} is unavailable.`);
    if (invocation.type === 'global-method') {
      const fn = target?.[invocation.method];
      if (typeof fn !== 'function') fail(`${invocation.global}.${invocation.method} is not callable.`);
      return fn.call(target, input);
    }
    if (invocation.type === 'global-dispatch') {
      const operation = input?.[invocation.operationField || 'operation'];
      if (!operation || !invocation.allowedOperations?.includes(operation)) fail(`Unsupported operation for ${id}: ${operation || '(missing)'}.`);
      const fn = target?.[operation];
      if (typeof fn !== 'function') fail(`${invocation.global}.${operation} is not callable.`);
      const rawArgs = input?.[invocation.argsField || 'args'];
      const args = Array.isArray(rawArgs) ? rawArgs : rawArgs === undefined ? [] : [rawArgs];
      return fn.apply(target, args);
    }
    fail(`Unsupported invocation type: ${invocation.type}`);
  }

  async function siteIndex(options = {}) {
    const data = await fetchJson(SEARCH_INDEX_URL);
    if (!options.query) return clone(data);
    const terms = normalize(options.query).split(/\s+/).filter(Boolean);
    return clone(data.filter(entry => {
      const text = normalize([entry.id, entry.title, entry.workspace, entry.description, ...(entry.keywords || [])].join(' '));
      return terms.every(term => text.includes(term));
    }));
  }

  async function catalog(filter = {}) {
    const [capabilities, laboratories, resources, indexedPages] = await Promise.all([
      listCapabilities(filter.capabilities || {}),
      listLaboratories(filter.laboratories || {}),
      listResources(filter.resources || {}),
      siteIndex(filter.site || {})
    ]);
    return { version: VERSION, baseUrl: BASE_URL.href, capabilities, laboratories, resources, indexedPages };
  }

  return Object.freeze({
    version: VERSION,
    baseUrl: BASE_URL.href,
    manifestUrl: MANIFEST_URL.href,
    collectionsUrl: COLLECTIONS_URL.href,
    manifest,
    collectionManifest,
    catalog,
    listCapabilities,
    describe,
    warm,
    invoke,
    listLaboratories,
    listResources,
    getResource,
    getPath,
    expandResourceIndex,
    searchResources,
    searchCollection,
    siteIndex
  });
});
