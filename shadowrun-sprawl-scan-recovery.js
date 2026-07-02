(() => {
  'use strict';

  if (window.__shadowrunSprawlScanRecoveryInstalled) return;
  window.__shadowrunSprawlScanRecoveryInstalled = true;

  const nativeFetch = window.fetch.bind(window);
  const ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  function requestUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    return input?.url || String(input || '');
  }

  function isShadowrunOverpassRequest(input) {
    const panel = document.getElementById('shadowrun-sprawl-discovery-panel');
    if (!panel || panel.hidden) return false;
    try {
      const url = new URL(requestUrl(input), location.href);
      return ENDPOINTS.some(endpoint => url.origin === new URL(endpoint).origin);
    } catch (_) {
      return false;
    }
  }

  function queryFromBody(body) {
    if (body instanceof URLSearchParams) return body.get('data') || '';
    if (typeof body === 'string') {
      try { return new URLSearchParams(body).get('data') || body; }
      catch (_) { return body; }
    }
    return '';
  }

  function bboxFromQuery(query) {
    const match = String(query || '').match(/\((-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?)\)/);
    return match?.[1] || '';
  }

  function extendedQuery(bbox) {
    return `[out:json][timeout:22];(`
      + `nwr["name"]["amenity"](${bbox});`
      + `nwr["name"]["shop"](${bbox});`
      + `nwr["name"]["tourism"](${bbox});`
      + `nwr["name"]["office"](${bbox});`
      + `nwr["name"]["healthcare"](${bbox});`
      + `nwr["name"]["leisure"](${bbox});`
      + `nwr["name"]["craft"](${bbox});`
      + `nwr["name"]["building"](${bbox});`
      + `nwr["name"]["historic"](${bbox});`
      + `nwr["name"]["public_transport"](${bbox});`
      + `nwr["name"]["railway"](${bbox});`
      + `nwr["name"]["man_made"](${bbox});`
      + `nwr["name"]["emergency"](${bbox});`
      + `nwr["name"]["club"](${bbox});`
      + `nwr["name"]["social_facility"](${bbox});`
      + `nwr["name"]["landuse"~"retail|commercial|industrial|cemetery|recreation_ground"](${bbox});`
      + `);out center tags qt;`;
  }

  function broadQuery(bbox) {
    return `[out:json][timeout:22];nwr["name"](${bbox});out center tags qt;`;
  }

  function hasPlaceSignal(tags = {}) {
    if (!tags.name && !tags.brand && !tags.operator) return false;
    if (tags.amenity || tags.shop || tags.tourism || tags.office || tags.healthcare || tags.leisure || tags.craft) return true;
    if (tags.building && tags.building !== 'no') return true;
    if (tags.historic || tags.man_made || tags.emergency || tags.club || tags.social_facility) return true;
    if (tags.public_transport) return true;
    if (['station', 'halt', 'tram_stop', 'subway_entrance'].includes(tags.railway)) return true;
    if (['retail', 'commercial', 'industrial', 'cemetery', 'recreation_ground'].includes(tags.landuse)) return true;
    return false;
  }

  function filteredPayload(payload) {
    const elements = Array.isArray(payload?.elements)
      ? payload.elements.filter(element => hasPlaceSignal(element?.tags || {}))
      : [];
    return { ...(payload || {}), elements };
  }

  function jsonResponse(payload, response) {
    const headers = new Headers(response.headers);
    headers.set('content-type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(payload), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  async function fetchRecovery(endpoint, init, query) {
    const response = await nativeFetch(endpoint, {
      ...(init || {}),
      method: 'POST',
      body: new URLSearchParams({ data: query }),
      headers: { ...(init?.headers || {}), Accept: 'application/json' }
    });
    if (!response.ok) return null;
    const payload = filteredPayload(await response.clone().json());
    return payload.elements.length ? jsonResponse(payload, response) : null;
  }

  window.fetch = async function shadowrunRecoveredFetch(input, init) {
    const response = await nativeFetch(input, init);
    if (!isShadowrunOverpassRequest(input) || !response.ok) return response;

    try {
      const originalPayload = await response.clone().json();
      if (Array.isArray(originalPayload?.elements) && originalPayload.elements.length) return response;
      const bbox = bboxFromQuery(queryFromBody(init?.body));
      if (!bbox) return response;

      const currentUrl = requestUrl(input);
      const endpoints = [currentUrl, ...ENDPOINTS.filter(endpoint => endpoint !== currentUrl)];
      for (const query of [extendedQuery(bbox), broadQuery(bbox)]) {
        for (const endpoint of endpoints) {
          try {
            const recovered = await fetchRecovery(endpoint, init, query);
            if (recovered) {
              document.dispatchEvent(new CustomEvent('shadowrun:visible-place-scan-recovered', {
                detail: { endpoint, mode: query.includes('nwr["name"](') ? 'broad' : 'extended' }
              }));
              return recovered;
            }
          } catch (error) {
            if (error?.name === 'AbortError') throw error;
          }
        }
      }
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
    }
    return response;
  };
})();
