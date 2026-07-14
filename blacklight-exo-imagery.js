(() => {
  'use strict';

  const cache = new Map();
  const NASA_SEARCH = 'https://images-api.nasa.gov/search';

  function hash(value) {
    let state = 2166136261;
    for (const char of String(value)) { state ^= char.charCodeAt(0); state = Math.imul(state, 16777619); }
    return state >>> 0;
  }

  async function resolve(object, system) {
    const key = `${system?.seed || 'system'}:${object?.id || object?.name || 'object'}`;
    if (cache.has(key)) return cache.get(key);
    const promise = resolveUncached(object, system);
    cache.set(key, promise);
    return promise;
  }

  async function resolveUncached(object, system) {
    if (!object) return null;
    const published = String(object.provenance || system?.provenance || '').startsWith('published');
    if (published && object.kind !== 'belt') {
      const result = await publishedImage(object).catch(() => null);
      if (result) return result;
    }
    return artisticApproximation(object, system);
  }

  async function publishedImage(object) {
    const parent = object.parentName ? ` ${object.parentName}` : '';
    const query = `${object.name}${parent}`.trim();
    const attempts = [
      `${NASA_SEARCH}?q=${encodeURIComponent(query)}&media_type=image&center=JPL&page_size=30`,
      `${NASA_SEARCH}?q=${encodeURIComponent(`${query} JPL`)}&media_type=image&page_size=30`
    ];
    for (const url of attempts) {
      const response = await fetch(url, {mode:'cors', cache:'force-cache'});
      if (!response.ok) continue;
      const payload = await response.json();
      const items = payload?.collection?.items || [];
      const selected = chooseItem(items, object);
      if (!selected) continue;
      const data = selected.data?.[0] || {};
      const image = selected.links?.find(link => link.render === 'image')?.href || selected.links?.[0]?.href;
      if (!image) continue;
      return {
        url:image,
        sourceUrl:data.nasa_id ? `https://images.nasa.gov/details/${encodeURIComponent(data.nasa_id)}` : image,
        caption:`NASA/JPL published image · ${data.title || object.name}${data.date_created ? ` · ${String(data.date_created).slice(0,10)}` : ''}`,
        alt:`NASA/JPL reference image of ${object.name}`,
        approximate:false
      };
    }
    return null;
  }

  function chooseItem(items, object) {
    const name = String(object.name || '').toLowerCase();
    const parent = String(object.parentName || '').toLowerCase();
    return items
      .map(item => {
        const data = item.data?.[0] || {};
        const haystack = `${data.title || ''} ${data.description || ''} ${(data.keywords || []).join(' ')} ${data.center || ''}`.toLowerCase();
        let score = 0;
        if (haystack.includes(name)) score += 10;
        if (parent && haystack.includes(parent)) score += 3;
        if (/jpl|jet propulsion laboratory/.test(haystack)) score += 5;
        if (/planet|moon|satellite|solar system/.test(haystack)) score += 2;
        if (/diagram|logo|poster|artist concept/.test(haystack)) score -= 4;
        return {item, score};
      })
      .filter(entry => entry.score >= 10)
      .sort((a, b) => b.score - a.score)[0]?.item || null;
  }

  function artisticApproximation(object, system) {
    const seed = hash(`${system?.seed || ''}:${object.id || object.name}`);
    const color = normalizeColor(object.color || colorFor(object));
    const dark = shade(color, -42);
    const light = shade(color, 56);
    const atmosphere = /gas|ice giant|atmosphere|cloud/i.test(`${object.type || ''} ${object.atmosphere || ''}`);
    const cratered = /barren|rock|asteroid|dwarf|moon|airless|none/i.test(`${object.type || ''} ${object.atmosphere || ''}`);
    const bands = atmosphere ? Array.from({length:7}, (_, index) => {
      const y = 56 + index * 18 + ((seed >>> (index % 16)) & 7);
      const opacity = .12 + ((seed >>> ((index + 5) % 16)) & 7) / 35;
      return `<path d="M28 ${y} Q128 ${y - 14} 228 ${y} Q128 ${y + 15} 28 ${y}" fill="none" stroke="rgba(255,255,255,${opacity.toFixed(2)})" stroke-width="${4 + index % 3}"/>`;
    }).join('') : '';
    const craters = cratered ? Array.from({length:14}, (_, index) => {
      const a = ((seed * (index + 3)) % 6283) / 1000;
      const r = 16 + ((seed >>> (index % 24)) & 63);
      const x = 128 + Math.cos(a) * r;
      const y = 128 + Math.sin(a) * r;
      const size = 2 + ((seed >>> ((index + 9) % 24)) & 7);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size}" fill="rgba(0,0,0,.22)" stroke="rgba(255,255,255,.12)"/>`;
    }).join('') : '';
    const rings = object.rings ? `<ellipse cx="128" cy="128" rx="116" ry="32" fill="none" stroke="rgba(220,215,198,.55)" stroke-width="6" transform="rotate(-12 128 128)"/><ellipse cx="128" cy="128" rx="105" ry="27" fill="none" stroke="rgba(120,112,96,.55)" stroke-width="2" transform="rotate(-12 128 128)"/>` : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><radialGradient id="g" cx="34%" cy="28%"><stop offset="0" stop-color="${light}"/><stop offset=".58" stop-color="${color}"/><stop offset="1" stop-color="${dark}"/></radialGradient><clipPath id="c"><circle cx="128" cy="128" r="92"/></clipPath></defs><rect width="256" height="256" fill="#020304"/>${rings}<circle cx="128" cy="128" r="92" fill="url(#g)" stroke="rgba(255,255,255,.35)" stroke-width="2"/><g clip-path="url(#c)">${bands}${craters}</g><text x="128" y="241" text-anchor="middle" fill="#dfe8eb" font-family="system-ui" font-size="11">ARTISTIC APPROXIMATION</text></svg>`;
    return {
      url:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      sourceUrl:'https://ssd.jpl.nasa.gov/',
      caption:`Artistic approximation generated from the stored ${object.type || object.kind || 'body'} classification, color, radius, atmosphere, and orbital record. No suitable NASA/JPL observational image was resolved.`,
      alt:`Artistic approximation of ${object.name}`,
      approximate:true
    };
  }

  function colorFor(object) {
    const text = `${object.type || ''} ${object.atmosphere || ''}`;
    if (/gas giant/i.test(text)) return '#c89e67';
    if (/ice giant|methane/i.test(text)) return '#68a9c7';
    if (/ocean|water/i.test(text)) return '#3e78ad';
    if (/volcan|sulfur/i.test(text)) return '#b76a3f';
    if (/ice|frozen|cryogenic/i.test(text)) return '#b7cbd8';
    return '#8f8578';
  }

  function normalizeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : '#8f8578';
  }

  function shade(hex, amount) {
    const value = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (value >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (value & 255) + amount));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  globalThis.BlacklightExoImagery = Object.freeze({resolve});
})();
