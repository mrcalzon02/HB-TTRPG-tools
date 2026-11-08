/* This worker owns only Work Shift Guide assets within its registration scope. */
const CACHE_VERSION = "1.0.0-d88729769fed8dcb";
const CACHE_PREFIX = `work-shift-guide-blank:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_URL = new URL(self.registration.scope);
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./position.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./position-template.json",
  "./LICENSE.txt",
  "./README.md"
];
const ASSET_URLS = new Set(ASSETS.map(path => new URL(path, APP_URL).href));
const INDEX_URL = new URL("./index.html", APP_URL).href;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...ASSET_URLS].map(url => new Request(url, {cache: "reload"})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function fetchAndCache(request, assetURL, cache) {
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(assetURL, response.clone());
  }
  return response;
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== APP_URL.origin || !url.pathname.startsWith(APP_URL.pathname)) return;
  const assetURL = `${url.origin}${url.pathname}`;
  // Downloads, other applications, external links and unknown resources pass through.
  if (!ASSET_URLS.has(assetURL)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (event.request.mode === "navigate") {
      try {
        return await fetchAndCache(event.request, assetURL, cache);
      } catch (error) {
        const cached = await cache.match(assetURL) || await cache.match(INDEX_URL);
        if (cached) return cached;
        throw error;
      }
    }
    const cached = await cache.match(assetURL);
    return cached || fetchAndCache(event.request, assetURL, cache);
  })());
});
