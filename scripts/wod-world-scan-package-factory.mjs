import diversityCore from '../world-of-darkness-detail-diversity-core.js';
import systemSiteCatalog from '../world-of-darkness-system-site-catalog.js';
import systemSiteExpansion from '../world-of-darkness-system-site-expansion.js';

const expandedDiversityCore = systemSiteExpansion.enhanceCore(diversityCore, systemSiteCatalog);

const STATUS_LABELS = Object.freeze({
  MUNDANE: 'Mundane / No Known Connection',
  TANGENTIAL: 'Tangential / Peripheral Association',
  ACTIVE_UNREGISTERED: 'Active but Unregistered',
  INVENTORIED: 'Formally Inventoried'
});

const clone = value => JSON.parse(JSON.stringify(value));

export function hash32(input) {
  let hash = 2166136261;
  for (const character of String(input)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function keyFrom(prefix, input) {
  return `${prefix}-${hash32(input).toString(16).padStart(8, '0')}`;
}

export function rotateArrays(value, seed, path = '') {
  if (Array.isArray(value)) {
    if (!value.length) return [];
    const offset = hash32(`${seed}|${path}`) % value.length;
    return value.slice(offset).concat(value.slice(0, offset)).map((item, index) => rotateArrays(item, seed, `${path}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rotateArrays(item, seed, path ? `${path}.${key}` : key)]));
  }
  return value;
}

function interpretationFor(status) {
  if (status === 'MUNDANE') return {
    registry: 'No supernatural inventory entry',
    confidence: 'No credible supernatural evidence',
    catalogueNote: 'This world seed does not place the location in any supernatural inventory.'
  };
  if (status === 'TANGENTIAL') return {
    registry: 'Peripheral association — not inventoried',
    confidence: 'Weak, indirect, historical, or route-adjacent evidence',
    catalogueNote: 'The location is peripheral to supernatural activity and is not inventoried.'
  };
  if (status === 'ACTIVE_UNREGISTERED') return {
    registry: 'Active supernatural site — unregistered',
    confidence: 'Active evidence without a formal ownership record',
    catalogueNote: 'The location is used or affected but remains absent from faction inventories.'
  };
  return {
    registry: 'Formal supernatural inventory entry',
    confidence: 'Formally catalogued inside this world seed',
    catalogueNote: 'The location is recorded, monitored, claimed, or administratively recognized in this generated world.'
  };
}

function combinedPool(baseCrosslinks, crosslinkExpansion, poolName) {
  return [...(baseCrosslinks?.[poolName] || []), ...(crosslinkExpansion?.[poolName] || [])];
}

function selectPoolEntry({ baseCrosslinks, crosslinkExpansion, poolName, status, worldSeed, locationKey, gameLine, catalogLine }) {
  const eligible = combinedPool(baseCrosslinks, crosslinkExpansion, poolName)
    .filter(entry => Array.isArray(entry.statuses) && entry.statuses.includes(status));
  if (!eligible.length) throw new Error(`No ${poolName} entries support ${status}.`);
  const index = hash32(`${worldSeed.seedValue}|${locationKey}|${gameLine}|${catalogLine}|${poolName}`) % eligible.length;
  return clone(eligible[index]);
}

export function createWorldScanPackageFactory({
  worldSeed,
  gameLine,
  generatedAt,
  baseLocations,
  contextExpansion,
  detailDiversity,
  baseCrosslinks,
  crosslinkExpansion
}) {
  if (!worldSeed?.worldSeedKey || !worldSeed?.seedValue) throw new Error('World seed metadata is required.');
  if (!['unified', 'vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage'].includes(gameLine)) throw new Error(`Unsupported game line ${gameLine}.`);

  const scopedDetail = rotateArrays(detailDiversity, worldSeed.seedValue);
  const session = expandedDiversityCore.createSession(scopedDetail);

  function generate(location) {
    if (!/^gmaps-[0-9a-f]{8}$/.test(location.locationKey || '')) throw new Error(`Invalid location key ${location.locationKey}.`);
    const packageKey = keyFrom('wodpkg', `${worldSeed.worldSeedKey}|${location.locationKey}|${gameLine}`);
    const seed = hash32(`${worldSeed.seedValue}|${location.locationKey}|${gameLine}|status`);
    const status = expandedDiversityCore.inventoryStatusFromSeed(seed, gameLine);
    const detail = session.generate({
      location: {
        entryKey: `${worldSeed.worldSeedKey}|${location.locationKey}`,
        osmId: location.osmId,
        name: location.name,
        address: location.address,
        lat: location.coordinates.lat,
        lng: location.coordinates.lng,
        category: location.category,
        categoryLabel: location.categoryLabel || location.category,
        featureLabel: location.featureLabel || 'Named Map Feature',
        sourceTags: location.sourceTags || {}
      },
      line: gameLine,
      inventoryStatus: status,
      seed,
      baseLocations,
      contextExpansion
    });
    const interpretation = interpretationFor(status);
    const outputArgs = {
      baseCrosslinks,
      crosslinkExpansion,
      status,
      worldSeed,
      locationKey: location.locationKey,
      gameLine,
      catalogLine: detail.catalogLine
    };

    return {
      schemaVersion: '2.1.0',
      packageKey,
      worldSeedKey: worldSeed.worldSeedKey,
      worldSeedLabel: worldSeed.label,
      locationKey: location.locationKey,
      gameLine,
      generatedAt,
      location: {
        name: location.name,
        address: location.address || '',
        referenceUrl: location.referenceUrl || '',
        category: location.category,
        coordinates: clone(location.coordinates),
        inventoryStatus: status,
        claimed: false,
        contextSnapshot: {
          inventoryLabel: STATUS_LABELS[status],
          locationVariant: `${detail.variant} of ${detail.effectiveVariantCount}`,
          contextTitle: detail.contextTitle,
          contextEffect: detail.contextEffect,
          mechanicalSeed: detail.mechanicalSeed,
          publicFacade: detail.publicFacade,
          hiddenFunction: detail.hiddenFunction,
          evidenceConfidence: interpretation.confidence,
          catalogueNote: interpretation.catalogueNote,
          supernaturalRegistry: interpretation.registry,
          regionalTheme: clone(detail.regionalTheme),
          catalogLine: detail.catalogLine,
          catalogLabel: detail.catalogLabel,
          siteProfile: clone(detail.siteProfile),
          siteType: clone(detail.siteType),
          systemHiddenFunction: clone(detail.systemHiddenFunction),
          supernaturalInfrastructure: clone(detail.supernaturalInfrastructure),
          systemSecret: clone(detail.systemSecret),
          custodianType: clone(detail.custodianType),
          evidencePattern: clone(detail.evidencePattern),
          localConflict: clone(detail.localConflict),
          failureConsequence: clone(detail.failureConsequence),
          associatedCharacter: detail.embeddedCharacter,
          temporalAnchor: detail.temporalAnchor,
          traumaticCatalyst: detail.traumaticCatalyst,
          operationalSecret: detail.operationalSecret,
          vulnerability: detail.vulnerability,
          sensoryAnchor: detail.sensoryAnchor,
          mediaFeed: detail.mediaFeed,
          streetRumor: detail.rumor,
          diversitySignature: detail.diversitySignature
        },
        spatialContext: {
          source: location.source || 'OpenStreetMap / Overpass server rescan',
          osmType: location.osmType,
          osmId: location.osmId,
          osmUrl: location.referenceUrl || '',
          featureLabel: location.featureLabel || 'Named Map Feature',
          sourceTags: clone(location.sourceTags || {}),
          scanKey: location.scanKey,
          scanZoom: location.scanZoom,
          scanBounds: clone(location.scanBounds || {}),
          scanCenter: clone(location.scanCenter || {}),
          discoveredAt: generatedAt
        }
      },
      outputs: {
        population: selectPoolEntry({ ...outputArgs, poolName: 'population' }),
        struggle: selectPoolEntry({ ...outputArgs, poolName: 'struggles' }),
        adventureHook: selectPoolEntry({ ...outputArgs, poolName: 'adventureHooks' }),
        locationSeed: selectPoolEntry({ ...outputArgs, poolName: 'locationSeeds' }),
        item: selectPoolEntry({ ...outputArgs, poolName: 'items' })
      },
      crossLinks: clone(baseCrosslinks?.crossLinks || []),
      source: {
        crosslinkSchemaVersion: baseCrosslinks?.schemaVersion,
        generatorVersion: 'world-seeded-system-site-server-rescan-3.2.0',
        contextResolverVersion: '1.0.0',
        detailDiversityVersion: detailDiversity?.schemaVersion,
        regionalThemeVersion: detail.regionalTheme?.themeVersion || 'legacy',
        systemSiteCatalogVersion: systemSiteCatalog.schemaVersion,
        systemSiteExpansionVersion: systemSiteExpansion.version,
        detailDiversityPolicy: 'world-seed-rotated-pools-with-compositional-regional-themes-and-system-specific-site-structures'
      }
    };
  }

  return Object.freeze({
    generate,
    gameLine,
    worldSeedKey: worldSeed.worldSeedKey,
    statusProfile: expandedDiversityCore.statusProfile(gameLine),
    catalogLines: [...expandedDiversityCore.catalogLines],
    systemSiteCatalogVersion: systemSiteCatalog.schemaVersion
  });
}
