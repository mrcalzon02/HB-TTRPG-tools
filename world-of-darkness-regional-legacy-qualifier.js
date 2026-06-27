((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WODRegionalLegacyQualifier = api;
  if (root?.WODDetailDiversityCore) root.WODDetailDiversityCore = api.enhanceCore(root.WODDetailDiversityCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const VERSION = '1.0.0';
  const clone = value => JSON.parse(JSON.stringify(value));

  function enhanceCore(core) {
    if (!core?.createSession || !core?.hash32 || !core?.regionalThemeManifestationChannels) return core;
    if (core.__regionalLegacyQualifierVersion === VERSION) return core;

    function createSession(data) {
      const baseSession = core.createSession(data);
      const channels = core.regionalThemeManifestationChannels;

      function qualify(theme, location, line) {
        if (!theme || theme.themeSource !== 'legacy-rare') return theme;
        const region = core.neighborhoodKey(location, Number(data?.neighborhoodCellDegrees || 0.015));
        const entryKey = String(location?.entryKey || '');
        const worldKey = /^wodworld-[0-9a-f]{8}\|/.test(entryKey) ? entryKey.split('|', 1)[0] : 'baseline-world';
        const channel = channels[core.hash32(`${worldKey}|${region}|${line}|legacy-theme-channel-v32`) % channels.length];
        return {
          ...clone(theme),
          id: `${theme.id}--${channel.id}`,
          label: `${theme.label} — ${channel.label}`,
          description: `${theme.description} ${channel.description}`,
          legacyBaseId: theme.id,
          legacyBaseLabel: theme.label,
          familyId: theme.id,
          familyLabel: theme.label,
          manifestationChannelId: channel.id,
          manifestationChannelLabel: channel.label,
          themeSource: 'legacy-rare-qualified',
          variationCount: Number(theme.variationCount || 0) + channels.length - 1
        };
      }

      function themeFor(location, line) {
        return qualify(baseSession.themeFor(location, line), location, line);
      }

      function generate(input) {
        const base = baseSession.generate(input);
        const oldTheme = base.regionalTheme || {};
        const theme = qualify(oldTheme, input.location || {}, input.line || 'unified');
        if (theme === oldTheme) return base;
        let hiddenFunction = String(base.hiddenFunction || '');
        if (oldTheme.label && oldTheme.description) {
          hiddenFunction = hiddenFunction.replace(
            `Regional theme: ${oldTheme.label} — ${oldTheme.description}`,
            `Regional theme: ${theme.label} — ${theme.description}`
          );
        }
        if (oldTheme.label) hiddenFunction = hiddenFunction.replace(`The wider ${oldTheme.label}`, `The wider ${theme.label}`);
        return {
          ...base,
          regionalTheme: {
            ...theme,
            catalogLine: base.catalogLine,
            catalogLabel: base.catalogLabel
          },
          hiddenFunction,
          diversitySignature: core.hash32(`${base.diversitySignature}|${theme.id}`).toString(16).padStart(8, '0')
        };
      }

      return Object.freeze({ ...baseSession, themeFor, generate, regionalLegacyQualifierVersion: VERSION });
    }

    return Object.freeze({
      ...core,
      createSession,
      regionalThemeVariantCount(line = 'unified', legacyCount = 0) {
        const baseCount = core.regionalThemeVariantCount(line, 0);
        return baseCount + Number(legacyCount || 0) * core.regionalThemeManifestationChannels.length;
      },
      __regionalLegacyQualifierVersion: VERSION
    });
  }

  return Object.freeze({ version: VERSION, enhanceCore });
});
