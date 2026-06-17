(() => {
  'use strict';

  const migrations = [];

  function deepClone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function isText(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function register(definition) {
    const required = ['id', 'profileType', 'toVersion', 'applies', 'migrate'];
    required.forEach(field => {
      const valid = ['applies', 'migrate'].includes(field)
        ? typeof definition?.[field] === 'function'
        : isText(definition?.[field]);
      if (!valid) throw new Error(`Profile migration is missing required field ${field}.`);
    });
    if (migrations.some(item => item.id === definition.id)) {
      throw new Error(`Profile migration ${definition.id} is already registered.`);
    }
    const migration = Object.freeze({
      ...definition,
      fromVersion: definition.fromVersion || 'legacy-unversioned'
    });
    migrations.push(migration);
    return migration;
  }

  function migrate(dataInput, profileType, options = {}) {
    let data = deepClone(dataInput || {});
    const log = [];
    const applied = [];
    const maximumPasses = Number(options.maximumPasses || 20);

    for (let pass = 0; pass < maximumPasses; pass += 1) {
      const migration = migrations.find(item => (
        item.profileType === profileType &&
        !applied.includes(item.id) &&
        item.applies(data, { profileType, applied: [...applied] })
      ));
      if (!migration) break;
      const next = migration.migrate(deepClone(data), { profileType });
      if (!next || typeof next !== 'object' || Array.isArray(next)) {
        throw new Error(`Profile migration ${migration.id} did not return an object.`);
      }
      data = next;
      data.profileType = profileType;
      data.schemaVersion = migration.toVersion;
      applied.push(migration.id);
      log.push({
        code: migration.id,
        message: migration.message || `Migrated ${profileType} from ${migration.fromVersion} to ${migration.toVersion}.`,
        fromVersion: migration.fromVersion,
        toVersion: migration.toVersion
      });
    }

    return {
      changed: applied.length > 0,
      data,
      applied,
      log
    };
  }

  function list(profileType = '') {
    return migrations
      .filter(item => !profileType || item.profileType === profileType)
      .map(item => ({
        id: item.id,
        profileType: item.profileType,
        fromVersion: item.fromVersion,
        toVersion: item.toVersion,
        message: item.message || ''
      }));
  }

  function take(source, key, fallback = undefined) {
    return source[key] !== undefined ? source[key] : fallback;
  }

  function removeLegacyIslandFields(data) {
    const legacyFields = [
      'sizeClass', 'shapeProfile', 'currentUse',
      'lengthKm', 'widthKm', 'meanThicknessM', 'usableSurfacePercent',
      'baseRockPercent', 'floatstonePercent', 'soilPercent', 'cavernVoidPercent',
      'meanAltitudeM', 'verticalOscillationM', 'oscillationPeriodHours',
      'altitudePredictability', 'horizontalDriftKpd', 'driftPredictability',
      'nearestCivilizationKm', 'routeTraffic', 'routeAccess', 'chartQuality', 'approachProfile',
      'waterProfile', 'annualRainfallMm',
      'primaryTerrain', 'secondaryTerrain', 'flatlandPercent', 'arableSoilPercent',
      'vegetationCoverPercent', 'mineralPresence', 'mineralAccessibility', 'primaryResource',
      'wildlifeDensity', 'dominantWildlife', 'existingPopulation',
      'knownDungeonCount', 'hiddenSiteDensity',
      'foodProfile', 'factionPressure', 'threatClock', 'altitudeBand', 'settlementFootprint'
    ];
    legacyFields.forEach(key => delete data[key]);
    return data;
  }

  register({
    id: 'island-legacy-flat-to-2.0.0',
    profileType: 'floating-island-foundation-profile',
    fromVersion: 'legacy-flat',
    toVersion: '2.0.0',
    message: 'Migrated the legacy flat floating-island profile into the current nested Island 2.0.0 structure.',
    applies: data => (
      !data.geometry &&
      !data.classification &&
      [
        'lengthKm', 'widthKm', 'waterProfile', 'routeAccess', 'meanAltitudeM',
        'primaryTerrain', 'existingPopulation', 'knownDungeonCount'
      ].some(key => data[key] !== undefined)
    ),
    migrate: source => {
      const migrated = removeLegacyIslandFields(deepClone(source));
      migrated.name = source.name || 'Unnamed Floating Island';
      migrated.classification = {
        sizeClass: take(source, 'sizeClass', ''),
        shapeProfile: take(source, 'shapeProfile', ''),
        currentUse: take(source, 'currentUse', take(source, 'settlementFootprint', ''))
      };
      migrated.geometry = {
        lengthKm: take(source, 'lengthKm', 0),
        widthKm: take(source, 'widthKm', 0),
        meanThicknessM: take(source, 'meanThicknessM', 0),
        usableSurfacePercent: take(source, 'usableSurfacePercent', 0)
      };
      migrated.composition = {
        ordinaryRockPercent: take(source, 'baseRockPercent', 0),
        floatstonePercent: take(source, 'floatstonePercent', 0),
        soilSedimentPercent: take(source, 'soilPercent', 0),
        cavernVoidPercent: take(source, 'cavernVoidPercent', 0)
      };
      migrated.motion = {
        meanAltitudeM: take(source, 'meanAltitudeM', 0),
        verticalOscillationM: take(source, 'verticalOscillationM', 0),
        oscillationPeriodHours: take(source, 'oscillationPeriodHours', 0),
        altitudePredictability: take(source, 'altitudePredictability', take(source, 'altitudeBand', '')),
        horizontalDriftKpd: take(source, 'horizontalDriftKpd', 0),
        driftPredictability: take(source, 'driftPredictability', '')
      };
      migrated.access = {
        nearestCivilizationKm: take(source, 'nearestCivilizationKm', 0),
        routeTraffic: take(source, 'routeTraffic', take(source, 'routeAccess', '')),
        chartQuality: take(source, 'chartQuality', ''),
        approachProfile: take(source, 'approachProfile', '')
      };
      migrated.hydrology = {
        profile: take(source, 'waterProfile', ''),
        annualRainfallMm: take(source, 'annualRainfallMm', 0)
      };
      migrated.terrain = {
        primary: take(source, 'primaryTerrain', ''),
        secondary: take(source, 'secondaryTerrain', ''),
        flatlandPercent: take(source, 'flatlandPercent', 0),
        arableSoilPercent: take(source, 'arableSoilPercent', 0),
        vegetationCoverPercent: take(source, 'vegetationCoverPercent', 0)
      };
      migrated.resources = {
        mineralPresence: take(source, 'mineralPresence', take(source, 'primaryResource', '')),
        mineralAccessibility: take(source, 'mineralAccessibility', '')
      };
      migrated.ecology = {
        wildlifeDensity: take(source, 'wildlifeDensity', ''),
        dominantWildlife: take(source, 'dominantWildlife', '')
      };
      migrated.population = {
        permanentPopulation: take(source, 'existingPopulation', 0)
      };
      migrated.siteInventory = {
        knownDungeonCount: take(source, 'knownDungeonCount', 0),
        hiddenSiteDensity: take(source, 'hiddenSiteDensity', '')
      };
      migrated.compatibility = {
        foodProfile: take(source, 'foodProfile', ''),
        factionPressure: take(source, 'factionPressure', ''),
        threatClock: take(source, 'threatClock', '')
      };
      return migrated;
    }
  });

  window.KaysenderEditorMigrations = Object.freeze({
    register,
    migrate,
    list
  });
})();
