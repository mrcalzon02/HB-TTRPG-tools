(() => {
  'use strict';

  const STORAGE_KEY = 'hb-shadowrun-danger-intensity-v2';
  const LEGACY_STORAGE_KEY = 'hb-shadowrun-danger-intensity-v1';
  const PROFILE_DEFAULTS = Object.freeze({ low: 25, standard: 50, high: 75, prime: 100 });
  const PROFILE_ORDER = Object.freeze(['low', 'standard', 'high', 'prime']);
  let values = readValues();

  function readValues() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) {
        const parsed = JSON.parse(current);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      }
      // The v1 controller could assign the currently active profile's value to
      // another profile during initialization. Do not migrate that ambiguous state.
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return {};
    } catch (_) {
      return {};
    }
  }

  function writeValues() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      return true;
    } catch (_) {
      return false;
    }
  }

  function clamp(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : PROFILE_DEFAULTS.standard;
  }

  function getValue(profile = 'standard') {
    const resolved = PROFILE_ORDER.includes(profile) ? profile : 'standard';
    const stored = Number(values[resolved]);
    return Number.isFinite(stored) ? clamp(stored) : PROFILE_DEFAULTS[resolved];
  }

  function setValue(profile, value, persist = true) {
    const resolved = PROFILE_ORDER.includes(profile) ? profile : 'standard';
    values[resolved] = clamp(value);
    if (persist) writeValues();
    return values[resolved];
  }

  function resetValue(profile, persist = true) {
    const resolved = PROFILE_ORDER.includes(profile) ? profile : 'standard';
    delete values[resolved];
    if (persist) writeValues();
    return PROFILE_DEFAULTS[resolved];
  }

  function effectiveThreatForIntensity(value) {
    const percent = clamp(value);
    if (percent <= 25) return 'low';
    if (percent <= 50) return 'standard';
    if (percent <= 75) return 'high';
    return 'prime';
  }

  function profileLabel(profile) {
    return window.ShadowrunSprawlDiscoveryEngine?.threatProfiles?.[profile]
      || ({ low: 'Low Heat', standard: 'Standard Heat', high: 'High Heat', prime: 'Prime Runner Heat' }[profile])
      || profile;
  }

  function formatPercent(value) {
    const number = clamp(value);
    return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  function wrapEngine() {
    const original = window.ShadowrunSprawlDiscoveryEngine;
    if (!original) return false;
    if (original.__dangerIntensityWrapped) return true;
    const baseGenerate = original.generateSprawlDiscovery.bind(original);
    window.ShadowrunSprawlDiscoveryEngine = Object.freeze({
      ...original,
      __dangerIntensityWrapped: true,
      __baseGenerateSprawlDiscovery: baseGenerate,
      generateSprawlDiscovery(input = {}) {
        const requestedProfile = PROFILE_ORDER.includes(input.threat) ? input.threat : 'standard';
        const dangerIntensityPercent = getValue(requestedProfile);
        const effectiveThreat = effectiveThreatForIntensity(dangerIntensityPercent);
        const result = baseGenerate({
          ...input,
          threat: effectiveThreat,
          seed: `${input.seed || ''}|danger-profile:${requestedProfile}|danger-intensity:${dangerIntensityPercent.toFixed(2)}`
        });
        return {
          ...result,
          threat: requestedProfile,
          threatLabel: `${profileLabel(requestedProfile)} · ${formatPercent(dangerIntensityPercent)}% danger`,
          dangerProfile: requestedProfile,
          dangerIntensityPercent,
          effectiveThreat,
          sites: (result.sites || []).map(site => ({
            ...site,
            dangerProfile: requestedProfile,
            dangerIntensityPercent,
            effectiveThreat
          }))
        };
      }
    });
    return true;
  }

  wrapEngine();

  window.ShadowrunDangerIntensity = Object.freeze({
    defaults: PROFILE_DEFAULTS,
    profiles: PROFILE_ORDER,
    getValue,
    setValue,
    resetValue,
    effectiveThreatForIntensity,
    profileLabel,
    formatPercent,
    wrapEngine
  });
})();
