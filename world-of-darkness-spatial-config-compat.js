(() => {
  'use strict';

  const COMPAT_VERSION = '2.7.0';
  const CONFIG_PATH_PATTERN = /(?:^|\/)data\/world-of-darkness\/spatial-engine-config\.json(?:[?#].*)?$/;
  const GAME_LINES = new Set(['unified', 'vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage']);
  const CORE_DATA_DEFAULTS = Object.freeze({
    locations: 'data/world-of-darkness/locations_core_v2.json',
    contextExpansion: 'data/world-of-darkness/location_context_expansion_v3.json',
    detailDiversity: 'data/world-of-darkness/location_detail_diversity_v1.json',
    characters: 'data/world-of-darkness/characters_core.json',
    rumors: 'data/world-of-darkness/rumors_core.json',
    centralRegistry: 'data/world-of-darkness/poi_registry.json',
    crosslinks: 'data/world-of-darkness/location_crosslink_core.json',
    crosslinkExpansion: 'data/world-of-darkness/location_crosslink_expansion_v2.json',
    generatedLocationRegistry: 'data/world-of-darkness/generated_location_registry.json',
    influenceOverlayRegistry: 'data/world-of-darkness/influence_overlay_registry.json'
  });

  if (window.WODSpatialConfigCompat?.version === COMPAT_VERSION) return;

  const nativeFetch = window.fetch.bind(window);

  function requestUrl(input) {
    if (input instanceof Request) return input.url;
    return String(input ?? '');
  }

  function activeGameLine(explicitLine = '') {
    if (GAME_LINES.has(explicitLine)) return explicitLine;
    const selected = document.getElementById('wod-spatial-line')?.value || '';
    return GAME_LINES.has(selected) ? selected : 'vampire';
  }

  function wrapDetailCore(core) {
    if (!core || core.__activeLineStatusBridge === COMPAT_VERSION) return core;
    const bridged = {
      ...core,
      inventoryStatusFromSeed(seed, line = '') {
        return core.inventoryStatusFromSeed(seed, activeGameLine(line));
      },
      __activeLineStatusBridge: COMPAT_VERSION
    };
    return Object.freeze(bridged);
  }

  let detailCoreValue = window.WODDetailDiversityCore ? wrapDetailCore(window.WODDetailDiversityCore) : null;
  try {
    Object.defineProperty(window, 'WODDetailDiversityCore', {
      configurable: true,
      enumerable: true,
      get() { return detailCoreValue; },
      set(value) { detailCoreValue = wrapDetailCore(value); }
    });
  } catch (_) {
    if (window.WODDetailDiversityCore) window.WODDetailDiversityCore = wrapDetailCore(window.WODDetailDiversityCore);
  }

  function mergedConfig(payload) {
    const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    return {
      ...source,
      coreData: {
        ...CORE_DATA_DEFAULTS,
        ...(source.coreData && typeof source.coreData === 'object' ? source.coreData : {})
      },
      compatibility: {
        ...(source.compatibility && typeof source.compatibility === 'object' ? source.compatibility : {}),
        spatialConfigCompatVersion: COMPAT_VERSION,
        staleSchemaDefaultsApplied: true,
        activeGameLineStatusBridge: true
      }
    };
  }

  function syntheticConfigResponse(payload) {
    return new Response(JSON.stringify(mergedConfig(payload)), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  }

  window.fetch = async function wodSpatialConfigCompatibleFetch(input, init = {}) {
    const rawUrl = requestUrl(input);
    if (!CONFIG_PATH_PATTERN.test(rawUrl)) return nativeFetch(input, init);

    const freshUrl = new URL(rawUrl, location.href);
    freshUrl.searchParams.set('wod-config', COMPAT_VERSION);

    let response;
    try {
      response = await nativeFetch(freshUrl.href, { ...init, cache: 'no-store' });
    } catch (error) {
      console.warn('Chronicle configuration request failed; using governed default dataset paths.', error);
      return syntheticConfigResponse({ schemaVersion: 'compatibility-fallback' });
    }

    if (!response.ok) {
      console.warn(`Chronicle configuration returned ${response.status}; using governed default dataset paths.`);
      return syntheticConfigResponse({ schemaVersion: 'compatibility-fallback' });
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      console.warn('Chronicle configuration was not valid JSON; using governed default dataset paths.', error);
      return syntheticConfigResponse({ schemaVersion: 'compatibility-fallback' });
    }

    return syntheticConfigResponse(payload);
  };

  window.WODSpatialConfigCompat = Object.freeze({
    version: COMPAT_VERSION,
    coreDataDefaults: CORE_DATA_DEFAULTS,
    resolveGameLine: activeGameLine,
    upgrade: mergedConfig
  });
})();
