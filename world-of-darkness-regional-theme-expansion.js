((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WODRegionalThemeExpansion = api;
  if (root?.WODDetailDiversityCore) root.WODDetailDiversityCore = api.enhanceCore(root.WODDetailDiversityCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const VERSION = '3.2.0';
  const LEGACY_DENOMINATOR = 32;
  const DISTRICT_MULTIPLIER = 4;
  const MANIFESTATION_CHANNELS = Object.freeze([
    { id: 'access-and-thresholds', label: 'Through Access and Thresholds', description: 'The influence is most visible in who receives entry, who is redirected, and which otherwise ordinary thresholds become politically meaningful.' },
    { id: 'records-and-identities', label: 'Through Records and Identities', description: 'The pattern manifests through names, credentials, ownership files, case histories, and identities that do not remain administratively stable.' },
    { id: 'staff-and-regulars', label: 'Through Staff and Regulars', description: 'Workers, residents, and repeat visitors carry the arrangement through habits they may understand only partially.' },
    { id: 'infrastructure-and-maintenance', label: 'Through Infrastructure and Maintenance', description: 'Utilities, repairs, service routes, equipment, and overlooked technical systems express the supernatural pressure.' },
    { id: 'events-and-crowds', label: 'Through Events and Crowds', description: 'The influence strengthens during recurring gatherings, shift changes, celebrations, emergencies, and other changes in population.' },
    { id: 'ownership-and-contracts', label: 'Through Ownership and Contracts', description: 'Leases, debts, insurance, employment, favors, and formal obligations carry more supernatural weight than the physical property alone.' },
    { id: 'emergency-and-recovery', label: 'Through Emergency and Recovery', description: 'Crises, medical response, temporary shelter, cleanup, and recovery procedures reveal the hidden regional arrangement.' },
    { id: 'supply-and-distribution', label: 'Through Supply and Distribution', description: 'Deliveries, storage, food, medicine, ritual materials, and specialized labor connect the site to a wider supernatural network.' },
    { id: 'surveillance-and-witnesses', label: 'Through Surveillance and Witnesses', description: 'Cameras, observers, testimony, rumors, and selective gaps in attention determine who can prove what happened.' },
    { id: 'reputation-and-social-permission', label: 'Through Reputation and Social Permission', description: 'Introductions, status, fear, trust, and local reputation grant or deny access more effectively than visible barriers.' },
    { id: 'environment-and-weather', label: 'Through Environment and Weather', description: 'Water, vegetation, temperature, light, pollution, and seasonal conditions modulate the strength and form of the influence.' },
    { id: 'memory-and-ritual-repetition', label: 'Through Memory and Ritual Repetition', description: 'Repeated stories, ceremonies, anniversaries, routes, and remembered obligations keep the regional pattern active.' }
  ]);
  const clone = value => JSON.parse(JSON.stringify(value));

  function mix32(value) {
    let mixed = value >>> 0;
    mixed ^= mixed >>> 16;
    mixed = Math.imul(mixed, 0x7feb352d);
    mixed ^= mixed >>> 15;
    mixed = Math.imul(mixed, 0x846ca68b);
    mixed ^= mixed >>> 16;
    return mixed >>> 0;
  }

  function selectIndex(core, input, length) {
    return length ? mix32(core.hash32(input)) % length : 0;
  }

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
        const legacyRoll = mix32(core.hash32(`${scope}|${region}|${line}|regional-theme-legacy-v32`));
        const variationCount = components.actors.length
          * components.structures.length
          * dynamics.length
          * MANIFESTATION_CHANNELS.length
          + legacyThemes.length;

        if (legacyThemes.length && legacyRoll % LEGACY_DENOMINATOR === 0) {
          const legacy = clone(legacyThemes[selectIndex(core, `${scope}|${region}|${line}|legacy-theme-index-v32`, legacyThemes.length)]);
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

        const actor = components.actors[selectIndex(core, `${scope}|${district}|${line}|regional-theme-family-v32`, components.actors.length)];
        const localProductSize = components.structures.length * dynamics.length * MANIFESTATION_CHANNELS.length;
        const localIndex = selectIndex(core, `${scope}|${region}|${line}|regional-theme-local-product-v32`, localProductSize);
        const structureIndex = localIndex % components.structures.length;
        const dynamicIndex = Math.floor(localIndex / components.structures.length) % dynamics.length;
        const channelIndex = Math.floor(localIndex / (components.structures.length * dynamics.length)) % MANIFESTATION_CHANNELS.length;
        const structure = components.structures[structureIndex];
        const dynamic = dynamics[dynamicIndex];
        const channel = MANIFESTATION_CHANNELS[channelIndex];
        return {
          id: `${actor.id}--${structure.id}--${dynamic.id}--${channel.id}`,
          label: `${actor.label} ${structure.label}: ${dynamic.label} — ${channel.label}`,
          faction: actor.faction,
          description: `${actor.description} ${structure.description} ${dynamic.description} ${channel.description}`,
          familyId: actor.id,
          familyLabel: actor.label,
          structureId: structure.id,
          structureLabel: structure.label,
          dynamicId: dynamic.id,
          dynamicLabel: dynamic.label,
          manifestationChannelId: channel.id,
          manifestationChannelLabel: channel.label,
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
        return components.actors.length
          * components.structures.length
          * core.regionalThemeDynamics.length
          * MANIFESTATION_CHANNELS.length
          + Number(legacyCount || 0);
      },
      regionalThemeManifestationChannels: MANIFESTATION_CHANNELS,
      legacyThemeFrequencyDenominator: LEGACY_DENOMINATOR,
      themeDistrictMultiplier: DISTRICT_MULTIPLIER,
      __regionalThemeExpansionVersion: VERSION
    });
  }

  return Object.freeze({
    version: VERSION,
    manifestationChannels: MANIFESTATION_CHANNELS,
    enhanceCore
  });
});
