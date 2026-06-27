((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WODSystemSiteExpansion = api;
  if (root?.WODDetailDiversityCore && root?.WODSystemSiteCatalog) {
    root.WODDetailDiversityCore = api.enhanceCore(root.WODDetailDiversityCore, root.WODSystemSiteCatalog);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const VERSION = '1.0.0';
  const clone = value => JSON.parse(JSON.stringify(value));
  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  function enhanceCore(core, catalog) {
    if (!core?.createSession || !core?.hash32 || !catalog?.lines) return core;
    if (core.__systemSiteExpansionVersion === VERSION) return core;

    function createSession(data) {
      const baseSession = core.createSession(data);
      const used = new Map();

      function neighborhood(location) {
        return core.neighborhoodKey?.(location, Number(data?.neighborhoodCellDegrees || 0.015)) || 'unknown-neighborhood';
      }

      function usageSet(location, line, field) {
        const key = `${neighborhood(location)}|${line}|${field}`;
        if (!used.has(key)) used.set(key, new Set());
        return used.get(key);
      }

      function candidatesFor(line, catalogLine, field, status) {
        const direct = catalog.lines?.[catalogLine]?.[field] || [];
        const unified = line === 'unified' ? catalog.lines?.unified?.[field] || [] : [];
        const combined = line === 'unified' && catalogLine !== 'unified' ? [...direct, ...unified] : direct;
        return combined.filter(candidate => !candidate.statuses?.length || candidate.statuses.includes(status));
      }

      function score(candidate, location) {
        let value = 0;
        const category = normalize(location.category).replaceAll(' ', '_');
        const featureText = `${normalize(location.featureLabel)} ${Object.entries(location.sourceTags || {}).map(([key, item]) => `${normalize(key)} ${normalize(item)}`).join(' ')}`;
        if (candidate.categories?.includes(category)) value += 16;
        else if (!candidate.categories?.length) value += 4;
        for (const hook of candidate.featureHooks || []) if (featureText.includes(normalize(hook))) value += 6;
        return value;
      }

      function pick(field, location, line, catalogLine, status, baseThemeId) {
        const candidates = candidatesFor(line, catalogLine, field, status);
        if (!candidates.length) return null;
        const ranked = candidates.map(candidate => ({
          candidate,
          score: score(candidate, location) + core.hash32(`${location.entryKey || location.osmId}|${field}|${candidate.id}`) / 0xffffffff
        })).sort((left, right) => right.score - left.score);
        const best = ranked[0].score;
        const preferred = ranked.filter(item => item.score >= best - 4).map(item => item.candidate);
        const remaining = ranked.map(item => item.candidate).filter(candidate => !preferred.some(item => item.id === candidate.id));
        const set = usageSet(location, line, field);
        const seed = core.hash32(`${location.entryKey || location.osmId}|${line}|${catalogLine}|${status}|${field}|${baseThemeId}`);
        const preferredStart = seed % preferred.length;
        for (let offset = 0; offset < preferred.length; offset += 1) {
          const candidate = preferred[(preferredStart + offset) % preferred.length];
          if (!set.has(candidate.id)) {
            set.add(candidate.id);
            return candidate;
          }
        }
        if (remaining.length) {
          const remainingStart = seed % remaining.length;
          for (let offset = 0; offset < remaining.length; offset += 1) {
            const candidate = remaining[(remainingStart + offset) % remaining.length];
            if (!set.has(candidate.id)) {
              set.add(candidate.id);
              return candidate;
            }
          }
        }
        return preferred[preferredStart];
      }

      function generate(input) {
        const base = baseSession.generate(input);
        if (!base || base.status === 'MUNDANE') return { ...base, siteProfile: null };

        const line = input.line || 'unified';
        const catalogLine = base.catalogLine || line;
        const location = input.location || {};
        const themeId = base.regionalTheme?.id || 'unclassified-region';
        const siteType = pick('siteTypes', location, line, catalogLine, base.status, themeId);
        const hiddenFunction = pick('hiddenFunctions', location, line, catalogLine, base.status, themeId);
        const infrastructure = pick('infrastructures', location, line, catalogLine, base.status, themeId);
        const systemSecret = pick('systemSecrets', location, line, catalogLine, base.status, themeId);
        const custodian = pick('custodians', location, line, catalogLine, base.status, themeId);
        const evidence = pick('evidencePatterns', location, line, catalogLine, base.status, themeId);
        const conflict = pick('conflicts', location, line, catalogLine, base.status, themeId);
        const consequence = pick('consequences', location, line, catalogLine, base.status, themeId);

        const siteProfile = {
          schemaVersion: VERSION,
          catalogLine,
          catalogLabel: base.catalogLabel,
          inventoryStatus: base.status,
          siteType: clone(siteType),
          hiddenFunction: clone(hiddenFunction),
          infrastructure: clone(infrastructure),
          operationalSecret: clone(systemSecret),
          custodian: clone(custodian),
          evidencePattern: clone(evidence),
          localConflict: clone(conflict),
          failureConsequence: clone(consequence),
          combinationSignature: core.hash32([
            siteType?.id, hiddenFunction?.id, infrastructure?.id, systemSecret?.id,
            custodian?.id, evidence?.id, conflict?.id, consequence?.id
          ].join('|')).toString(16).padStart(8, '0')
        };

        const associationPrefix = base.status === 'TANGENTIAL'
          ? 'The trace is associated with a nearby or former'
          : 'The location functions as a';
        const expandedHiddenFunction = [
          base.hiddenFunction,
          `${associationPrefix} ${siteType?.label || 'unclassified supernatural site'}: ${siteType?.text || 'Its exact structural role remains uncertain.'}`,
          `Specific hidden function — ${hiddenFunction?.label || 'Unclassified'}: ${hiddenFunction?.text || 'No stable function has been documented.'}`,
          `Supernatural infrastructure — ${infrastructure?.label || 'Unclassified'}: ${infrastructure?.text || 'No stable infrastructure has been documented.'}`
        ].join(' ');
        const expandedContextEffect = `${base.contextEffect} Evidence pattern — ${evidence?.label || 'Unclassified'}: ${evidence?.text || 'The available evidence remains inconsistent.'}`;
        const expandedMechanicalSeed = `${base.mechanicalSeed} Failure consequence — ${consequence?.label || 'Unclassified'}: ${consequence?.text || 'Failure produces an unresolved local escalation.'}`;
        const expandedCharacter = `${custodian?.label || 'Unclassified Custodian'}: ${custodian?.text || 'Custody remains disputed.'} ${base.embeddedCharacter}`;
        const expandedSecret = `System secret — ${systemSecret?.label || 'Unclassified'}: ${systemSecret?.text || 'No additional system-specific secret is known.'} ${base.operationalSecret}`;
        const expandedVulnerability = `${base.vulnerability} Local struggle — ${conflict?.label || 'Unclassified'}: ${conflict?.text || 'The principal conflict remains unresolved.'}`;
        const regionalTheme = { ...clone(base.regionalTheme), siteProfile: clone(siteProfile) };
        const diversitySignature = core.hash32(`${base.diversitySignature}|${siteProfile.combinationSignature}`).toString(16).padStart(8, '0');

        return {
          ...base,
          regionalTheme,
          siteProfile,
          siteType,
          systemHiddenFunction: hiddenFunction,
          supernaturalInfrastructure: infrastructure,
          systemSecret,
          custodianType: custodian,
          evidencePattern: evidence,
          localConflict: conflict,
          failureConsequence: consequence,
          hiddenFunction: expandedHiddenFunction,
          contextEffect: expandedContextEffect,
          mechanicalSeed: expandedMechanicalSeed,
          embeddedCharacter: expandedCharacter,
          operationalSecret: expandedSecret,
          vulnerability: expandedVulnerability,
          diversitySignature
        };
      }

      return Object.freeze({
        ...baseSession,
        generate,
        systemSiteUsed: used,
        systemSiteCatalogVersion: catalog.schemaVersion
      });
    }

    return Object.freeze({
      ...core,
      createSession,
      systemSiteCatalog: catalog,
      __systemSiteExpansionVersion: VERSION
    });
  }

  return Object.freeze({ version: VERSION, enhanceCore });
});
