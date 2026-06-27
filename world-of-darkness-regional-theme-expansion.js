((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WODRegionalThemeExpansion = api;
  if (root?.WODDetailDiversityCore) root.WODDetailDiversityCore = api.enhanceCore(root.WODDetailDiversityCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const VERSION = '3.1.0';
  const LEGACY_DENOMINATOR = 32;
  const DISTRICT_MULTIPLIER = 4;
  const clone = value => JSON.parse(JSON.stringify(value));

  function enhanceCore(core) {
    if (!core?.createSession || !core?.hash32 || !core?.regionalThemeComponents || !core?.regionalThemeDynamics) return core;
    if (core.__regionalThemeExpansionVersion === VERSION) return core;

    function createSession(data) {
      const baseSession = core.createSession(data);
      const cellDegrees = Number(data?.neighborhoodCellDegrees || 0.015);
      const pools = data?.pools || {};

      function scopeKey(location) {
        const entryKey = String(location?.entryKey || '');
        const prefix = entryKey.includes('|') ? entryKey.split('|', 1)[0] : '';
        return /^wodworld-[0-9a-f]{8}$/.test(prefix) ? prefix : 'baseline-world';
      }

      function themeFor(location, line) {
        const components = core.regionalThemeComponents[line] || core.regionalThemeComponents.unified;
        const dynamics = core.regionalThemeDynamics;
        const legacyThemes = pools.regionalThemes?.[line] || pools.regionalThemes?.unified || [];
        const region = core.neighborhoodKey(location, cellDegrees);
        const district = core.neighborhoodKey(location, cellDegrees * DISTRICT_MULTIPLIER);
        const scope = scopeKey(location);
        const legacyRoll = core.hash32(`${scope}|${region}|${line}|regional-theme-legacy-v31`);
        const variationCount = components.actors.length * components.structures.length * dynamics.length + legacyThemes.length;

        if (legacyThemes.length && legacyRoll % LEGACY_DENOMINATOR === 0) {
          const legacy = clone(legacyThemes[core.hash32(`${scope}|${region}|${line}|legacy-theme-index-v31`) % legacyThemes.length]);
          return {
            ...legacy,
            familyId: legacy.id,
            districtKey: district,
            neighborhoodKey: region,
            themeVersion: VERSION,
            themeSource: 'legacy-rare',
            variationCount,
            legacyFrequencyDenominator: LEGACY_DENOMINATOR
          };
        }

        const actor = components.actors[core.hash32(`${scope}|${district}|${line}|regional-theme-family-v31`) % components.actors.length];
        const localProductSize = components.structures.length * dynamics.length;
        const localIndex = core.hash32(`${scope}|${region}|${line}|regional-theme-local-product-v31`) % localProductSize;
        const structure = components.structures[localIndex % components.structures.length];
        const dynamic = dynamics[Math.floor(localIndex / components.structures.length) % dynamics.length];
        return {
          id: `${actor.id}--${structure.id}--${dynamic.id}`,
          label: `${actor.label} ${structure.label}: ${dynamic.label}`,
          faction: actor.faction,
          description: `${actor.description} ${structure.description} ${dynamic.description}`,
          familyId: actor.id,
          familyLabel: actor.label,
          structureId: structure.id,
          structureLabel: structure.label,
          dynamicId: dynamic.id,
          dynamicLabel: dynamic.label,
          districtKey: district,
          neighborhoodKey: region,
          themeVersion: VERSION,
          themeSource: 'compositional-product-space',
          variationCount,
          legacyFrequencyDenominator: LEGACY_DENOMINATOR
        };
      }

      function generate(input) {
        const base = baseSession.generate(input);
        const theme = themeFor(input.location || {}, input.line || 'unified');
        const oldTheme = base.regionalTheme || {};
        let hiddenFunction = String(base.hiddenFunction || '');
        if (oldTheme.label && oldTheme.description) {
          hiddenFunction = hiddenFunction.replace(
            `Regional theme: ${oldTheme.label} — ${oldTheme.description}`,
            `Regional theme: ${theme.label} — ${theme.description}`
          );
        }
        if (oldTheme.label) hiddenFunction = hiddenFunction.replace(`The wider ${oldTheme.label}`, `The wider ${theme.label}`);
        const regionalTheme = {
          ...clone(theme),
          catalogLine: base.catalogLine,
          catalogLabel: base.catalogLabel
        };
        return {
          ...base,
          regionalTheme,
          hiddenFunction,
          diversitySignature: core.hash32(`${base.diversitySignature}|${theme.id}`).toString(16).padStart(8, '0')
        };
      }

      return Object.freeze({ ...baseSession, themeFor, generate, regionalThemeExpansionVersion: VERSION });
    }

    return Object.freeze({
      ...core,
      createSession,
      regionalThemeVariantCount(line = 'unified', legacyCount = 0) {
        const components = core.regionalThemeComponents[line] || core.regionalThemeComponents.unified;
        return components.actors.length * components.structures.length * core.regionalThemeDynamics.length + Number(legacyCount || 0);
      },
      legacyThemeFrequencyDenominator: LEGACY_DENOMINATOR,
      themeDistrictMultiplier: DISTRICT_MULTIPLIER,
      __regionalThemeExpansionVersion: VERSION
    });
  }

  return Object.freeze({ version: VERSION, enhanceCore });
});
