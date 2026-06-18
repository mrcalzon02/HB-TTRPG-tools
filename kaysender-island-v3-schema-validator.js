(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

  const id = prefix => ({ type: 'string', pattern: new RegExp(`^${prefix}-[a-z0-9][a-z0-9-]*$`) });
  const text = (minLength = 0) => ({ type: 'string', minLength });
  const number = (minimum = null, maximum = null) => ({ type: 'number', minimum, maximum });
  const integer = (minimum = null, maximum = null) => ({ type: 'integer', minimum, maximum });
  const enumeration = values => ({ enum: values });
  const array = (items, options = {}) => ({ type: 'array', items, ...options });
  const object = (required, properties, additionalProperties = false) => ({ type: 'object', required, properties, additionalProperties });

  const cellId = id('cell');
  const siteId = id('site');
  const hazardId = id('hazard');
  const routeNodeId = id('route-node');
  const waterId = id('water');
  const landingId = id('landing');
  const resourceId = id('resource');
  const faultId = id('fault');
  const habitatId = id('habitat');

  const mapCell = object(
    ['id', 'x', 'y', 'areaKm2', 'terrainType', 'elevationM', 'slopeClass', 'usablePercent', 'arablePercent', 'siteIds', 'resourceNodeIds', 'hazardIds'],
    {
      id: cellId,
      x: integer(0),
      y: integer(0),
      areaKm2: number(0),
      terrainType: text(1),
      elevationM: { type: 'number' },
      slopeClass: text(1),
      usablePercent: number(0, 100),
      arablePercent: number(0, 100),
      waterCatchmentId: { type: ['string', 'null'] },
      siteIds: array(siteId, { uniqueItems: true }),
      resourceNodeIds: array(resourceId, { uniqueItems: true }),
      hazardIds: array(hazardId, { uniqueItems: true })
    }
  );

  const waterSource = object(
    ['id', 'mapCellId', 'type', 'potable', 'averageDailyLiters', 'seasonality', 'status'],
    {
      id: waterId,
      mapCellId: cellId,
      type: text(1),
      potable: { type: 'boolean' },
      averageDailyLiters: number(0),
      seasonality: text(1),
      status: enumeration(['active', 'restricted', 'contaminated', 'dry', 'unknown'])
    }
  );

  const reservoir = object(
    ['id', 'mapCellId', 'capacityM3', 'currentVolumeM3', 'potable', 'status'],
    {
      id: id('reservoir'),
      mapCellId: cellId,
      capacityM3: number(0),
      currentVolumeM3: number(0),
      potable: { type: 'boolean' },
      status: enumeration(['operational', 'damaged', 'contaminated', 'offline'])
    }
  );

  const resourceNode = object(
    ['id', 'mapCellId', 'resourceType', 'quality', 'estimatedReserveTons', 'annualSafeExtractionTons', 'status'],
    {
      id: resourceId,
      mapCellId: cellId,
      resourceType: text(1),
      quality: text(1),
      estimatedReserveTons: number(0),
      annualSafeExtractionTons: number(0),
      status: enumeration(['untapped', 'surveyed', 'active', 'depleted', 'sealed', 'contested'])
    }
  );

  const altitudeSegment = object(
    ['id', 'startDay', 'endDay', 'minimumAltitudeM', 'maximumAltitudeM', 'confidence'],
    {
      id: id('altitude-segment'),
      startDay: integer(0),
      endDay: integer(1),
      minimumAltitudeM: { type: 'number' },
      maximumAltitudeM: { type: 'number' },
      confidence: enumeration(['unknown', 'low', 'moderate', 'high', 'survey-grade'])
    }
  );

  const driftSegment = object(
    ['id', 'startDay', 'endDay', 'bearingDegrees', 'averageKmPerDay', 'confidence'],
    {
      id: id('drift-segment'),
      startDay: integer(0),
      endDay: integer(1),
      bearingDegrees: { type: 'number', minimum: 0, exclusiveMaximum: 360 },
      averageKmPerDay: number(0),
      confidence: enumeration(['unknown', 'low', 'moderate', 'high', 'survey-grade'])
    }
  );

  const faultZone = object(
    ['id', 'cellIds', 'risk', 'status', 'trigger', 'estimatedLossKm2'],
    {
      id: faultId,
      cellIds: array(cellId, { minItems: 1, uniqueItems: true }),
      risk: enumeration(['minimal', 'low', 'guarded', 'high', 'critical']),
      status: enumeration(['dormant', 'monitored', 'active', 'stabilized', 'failed']),
      trigger: text(1),
      estimatedLossKm2: number(0)
    }
  );

  const fractureEvent = object(
    ['id', 'day', 'faultZoneId', 'severity', 'surfaceLossKm2', 'notes'],
    {
      id: id('fracture-event'),
      day: integer(0),
      faultZoneId: faultId,
      severity: enumeration(['minor', 'moderate', 'major', 'catastrophic']),
      surfaceLossKm2: number(0),
      notes: text()
    }
  );

  const landingZone = object(
    ['id', 'name', 'mapCellId', 'type', 'maximumVesselClass', 'dailyCapacity', 'weatherLimit', 'status'],
    {
      id: landingId,
      name: text(1),
      mapCellId: cellId,
      type: enumeration(['open-field', 'cliff-dock', 'tower-mooring', 'underside-dock', 'moving-rendezvous']),
      maximumVesselClass: text(1),
      dailyCapacity: integer(0),
      weatherLimit: text(1),
      status: enumeration(['operational', 'restricted', 'damaged', 'closed', 'secret'])
    }
  );

  const approachCorridor = object(
    ['id', 'landingZoneId', 'bearingDegrees', 'minimumAltitudeM', 'maximumAltitudeM', 'hazardIds', 'pilotRequirement'],
    {
      id: id('approach'),
      landingZoneId: landingId,
      bearingDegrees: { type: 'number', minimum: 0, exclusiveMaximum: 360 },
      minimumAltitudeM: { type: 'number' },
      maximumAltitudeM: { type: 'number' },
      hazardIds: array(hazardId, { uniqueItems: true }),
      pilotRequirement: text(1)
    }
  );

  const site = object(
    ['id', 'name', 'type', 'mapCellId', 'status', 'visibility', 'maximumFootprintKm2', 'tags'],
    {
      id: siteId,
      name: text(1),
      type: text(1),
      mapCellId: cellId,
      status: enumeration(['planned', 'active', 'abandoned', 'ruined', 'sealed', 'unknown']),
      visibility: enumeration(['public', 'known-locally', 'rumored', 'gm-only']),
      maximumFootprintKm2: number(0),
      tags: array(text(), { uniqueItems: true })
    }
  );

  const hazard = object(
    ['id', 'name', 'type', 'cellIds', 'severity', 'visibility', 'status'],
    {
      id: hazardId,
      name: text(1),
      type: text(1),
      cellIds: array(cellId, { minItems: 1, uniqueItems: true }),
      severity: enumeration(['minor', 'moderate', 'major', 'critical']),
      visibility: enumeration(['public', 'known-locally', 'rumored', 'gm-only']),
      status: enumeration(['dormant', 'active', 'seasonal', 'contained', 'resolved'])
    }
  );

  const habitat = object(
    ['id', 'name', 'cellIds', 'areaKm2', 'condition', 'capacityIndex'],
    {
      id: habitatId,
      name: text(1),
      cellIds: array(cellId, { minItems: 1, uniqueItems: true }),
      areaKm2: number(0),
      condition: enumeration(['pristine', 'healthy', 'strained', 'degraded', 'collapsed']),
      capacityIndex: number(0)
    }
  );

  const speciesSlot = object(
    ['id', 'habitatId', 'role', 'populationBand', 'status'],
    {
      id: id('species-slot'),
      habitatId,
      role: text(1),
      populationBand: text(1),
      status: enumeration(['vacant', 'stable', 'declining', 'invasive', 'migratory'])
    }
  );

  const settlementSlot = object(
    ['id', 'mapCellId', 'maximumPopulation', 'maximumFootprintKm2', 'waterSourceIds', 'landingZoneIds', 'status'],
    {
      id: id('settlement-slot'),
      mapCellId: cellId,
      maximumPopulation: integer(0),
      maximumFootprintKm2: number(0),
      waterSourceIds: array(waterId, { uniqueItems: true }),
      landingZoneIds: array(landingId, { uniqueItems: true }),
      status: enumeration(['open', 'reserved', 'occupied', 'unsafe', 'closed'])
    }
  );

  const routeNode = object(
    ['id', 'name', 'mapCellId', 'landingZoneIds', 'altitudeBand', 'services', 'status'],
    {
      id: routeNodeId,
      name: text(1),
      mapCellId: cellId,
      landingZoneIds: array(landingId, { minItems: 1, uniqueItems: true }),
      altitudeBand: text(1),
      services: array(text(), { uniqueItems: true }),
      status: enumeration(['active', 'restricted', 'seasonal', 'closed', 'secret'])
    }
  );

  const downstreamExports = object(
    ['population', 'settlement', 'ecology', 'route', 'market', 'faction', 'crisis', 'encounter'],
    {
      population: { type: 'object', additionalProperties: true },
      settlement: { type: 'object', additionalProperties: true },
      ecology: { type: 'object', additionalProperties: true },
      route: { type: 'object', additionalProperties: true },
      market: { type: 'object', additionalProperties: true },
      faction: { type: 'object', additionalProperties: true },
      crisis: { type: 'object', additionalProperties: true },
      encounter: { type: 'object', additionalProperties: true }
    }
  );

  const PROFILE_SCHEMA = object(
    [
      'schemaVersion', 'profileType', 'name', 'classification', 'geometry', 'composition', 'map',
      'hydrology', 'foodCapacity', 'resources', 'motion', 'stability', 'approaches', 'sites',
      'hazards', 'ecology', 'settlementCapacity', 'routeNodeExport', 'derived', 'visibility', 'outputs'
    ],
    {
      schemaVersion: { const: '3.0.0' },
      profileType: { const: 'floating-island-foundation-profile' },
      name: text(1),
      classification: object(
        ['sizeClass', 'shapeProfile', 'currentUse', 'sovereignty', 'surveyStatus'],
        {
          sizeClass: text(1), shapeProfile: text(1), currentUse: text(1), sovereignty: text(1),
          surveyStatus: enumeration(['unmapped', 'partial', 'operational', 'survey-grade'])
        }
      ),
      geometry: object(
        ['lengthKm', 'widthKm', 'meanThicknessM', 'planAreaKm2', 'usableAreaKm2', 'flatAreaKm2', 'arableAreaKm2', 'grossVolumeKm3', 'estimatedMassMillionTons', 'coordinateSystem', 'mapScaleKmPerCell'],
        {
          lengthKm: { type: 'number', exclusiveMinimum: 0 },
          widthKm: { type: 'number', exclusiveMinimum: 0 },
          meanThicknessM: { type: 'number', exclusiveMinimum: 0 },
          planAreaKm2: { type: 'number', exclusiveMinimum: 0 },
          usableAreaKm2: number(0), flatAreaKm2: number(0), arableAreaKm2: number(0),
          grossVolumeKm3: number(0), estimatedMassMillionTons: number(0),
          coordinateSystem: { const: 'local-grid-v1' },
          mapScaleKmPerCell: { type: 'number', exclusiveMinimum: 0 }
        }
      ),
      composition: object(
        ['ordinaryRockPercent', 'floatstonePercent', 'soilSedimentPercent', 'cavernVoidPercent'],
        {
          ordinaryRockPercent: number(0, 100), floatstonePercent: number(0, 100),
          soilSedimentPercent: number(0, 100), cavernVoidPercent: number(0, 100)
        }
      ),
      map: object(
        ['columns', 'rows', 'activeCellIds', 'cells'],
        {
          columns: integer(1), rows: integer(1),
          activeCellIds: array(cellId, { uniqueItems: true }),
          cells: array(mapCell)
        }
      ),
      hydrology: object(
        ['annualRainfallMm', 'sources', 'reservoirs', 'annualRenewableM3', 'dailySustainableLiters', 'storedWaterM3', 'reserveDaysAtCurrentUse', 'systemLossPercent'],
        {
          annualRainfallMm: number(0), sources: array(waterSource), reservoirs: array(reservoir),
          annualRenewableM3: number(0), dailySustainableLiters: number(0), storedWaterM3: number(0),
          reserveDaysAtCurrentUse: number(0), systemLossPercent: number(0, 100)
        }
      ),
      foodCapacity: object(
        ['arableAreaKm2', 'pastureAreaKm2', 'forageAreaKm2', 'annualFoodUnits', 'sustainablePopulation', 'emergencyPopulation90Days', 'importDependencyPercent'],
        {
          arableAreaKm2: number(0), pastureAreaKm2: number(0), forageAreaKm2: number(0),
          annualFoodUnits: number(0), sustainablePopulation: integer(0), emergencyPopulation90Days: integer(0),
          importDependencyPercent: number(0, 100)
        }
      ),
      resources: object(
        ['nodes', 'annualSafeExtractionTons', 'currentAnnualExtractionTons'],
        { nodes: array(resourceNode), annualSafeExtractionTons: number(0), currentAnnualExtractionTons: number(0) }
      ),
      motion: object(
        ['meanAltitudeM', 'altitudeTimeline', 'driftTimeline', 'forecastHorizonDays'],
        {
          meanAltitudeM: { type: 'number' }, altitudeTimeline: array(altitudeSegment),
          driftTimeline: array(driftSegment), forecastHorizonDays: integer(1)
        }
      ),
      stability: object(
        ['structuralIntegrity', 'overallRisk', 'annualSurfaceLossPercent', 'faultZones', 'fractureEvents', 'emergencyThreshold'],
        {
          structuralIntegrity: text(1), overallRisk: enumeration(['minimal', 'low', 'guarded', 'high', 'critical']),
          annualSurfaceLossPercent: number(0, 100), faultZones: array(faultZone), fractureEvents: array(fractureEvent),
          emergencyThreshold: text(1)
        }
      ),
      approaches: object(
        ['landingZones', 'approachCorridors'],
        { landingZones: array(landingZone), approachCorridors: array(approachCorridor) }
      ),
      sites: array(site),
      hazards: array(hazard),
      ecology: object(
        ['habitats', 'speciesSlots', 'carryingCapacityIndex', 'currentPressure'],
        {
          habitats: array(habitat), speciesSlots: array(speciesSlot), carryingCapacityIndex: number(0),
          currentPressure: enumeration(['recovering', 'stable', 'strained', 'degrading', 'collapse'])
        }
      ),
      settlementCapacity: object(
        ['waterLimitedPopulation', 'foodLimitedPopulation', 'landLimitedPopulation', 'sustainablePopulation', 'emergencyPopulation', 'settlementSlots'],
        {
          waterLimitedPopulation: integer(0), foodLimitedPopulation: integer(0), landLimitedPopulation: integer(0),
          sustainablePopulation: integer(0), emergencyPopulation: integer(0), settlementSlots: array(settlementSlot)
        }
      ),
      routeNodeExport: object(
        ['nodes', 'defaultNodeId', 'routeCapability'],
        {
          nodes: array(routeNode), defaultNodeId: routeNodeId,
          routeCapability: object(
            ['maximumDailyArrivals', 'resupplyWater', 'resupplyFood', 'repairCapability', 'chartConfidence'],
            {
              maximumDailyArrivals: integer(0), resupplyWater: { type: 'boolean' }, resupplyFood: { type: 'boolean' },
              repairCapability: enumeration(['none', 'emergency', 'routine', 'major']),
              chartConfidence: enumeration(['rumor', 'poor', 'usable', 'reliable', 'survey-grade'])
            }
          )
        }
      ),
      derived: object(
        ['geometryReconciles', 'compositionReconciles', 'mapAreaReconciles', 'waterCapacityReconciles', 'foodCapacityReconciles', 'settlementCapacityReconciles', 'brokenReferenceIds', 'warnings'],
        {
          geometryReconciles: { type: 'boolean' }, compositionReconciles: { type: 'boolean' },
          mapAreaReconciles: { type: 'boolean' }, waterCapacityReconciles: { type: 'boolean' },
          foodCapacityReconciles: { type: 'boolean' }, settlementCapacityReconciles: { type: 'boolean' },
          brokenReferenceIds: array(text(), { uniqueItems: true }), warnings: array(text())
        }
      ),
      visibility: object(
        ['playerKnownSiteIds', 'gmOnlySiteIds', 'playerKnownHazardIds', 'gmOnlyHazardIds', 'publicFacts', 'gmSecrets'],
        {
          playerKnownSiteIds: array(siteId, { uniqueItems: true }), gmOnlySiteIds: array(siteId, { uniqueItems: true }),
          playerKnownHazardIds: array(hazardId, { uniqueItems: true }), gmOnlyHazardIds: array(hazardId, { uniqueItems: true }),
          publicFacts: array(text()), gmSecrets: array(text())
        }
      ),
      outputs: object(
        ['playerSafeSummary', 'gmBrief', 'wikiDraft', 'downstreamExports'],
        {
          playerSafeSummary: text(1), gmBrief: text(1), wikiDraft: { type: 'object', additionalProperties: true },
          downstreamExports
        }
      )
    }
  );

  function typeMatches(value, expected) {
    if (Array.isArray(expected)) return expected.some(item => typeMatches(value, item));
    if (expected === 'null') return value === null;
    if (expected === 'array') return Array.isArray(value);
    if (expected === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
    if (expected === 'integer') return Number.isInteger(value);
    if (expected === 'number') return typeof value === 'number' && Number.isFinite(value);
    return typeof value === expected;
  }

  function diagnostic(code, path, message) {
    return { severity: 'error', code, path: path || '$', message };
  }

  function childPath(path, key, arrayIndex = false) {
    if (arrayIndex) return `${path}[${key}]`;
    return path === '$' ? `$.${key}` : `${path}.${key}`;
  }

  function validateNode(value, schema, path, diagnostics) {
    if ('const' in schema && value !== schema.const) {
      diagnostics.push(diagnostic('schema-const', path, `Expected constant ${JSON.stringify(schema.const)}.`));
      return;
    }
    if (schema.enum && !schema.enum.includes(value)) {
      diagnostics.push(diagnostic('schema-enum', path, `Expected one of ${schema.enum.join(', ')}.`));
      return;
    }
    if (schema.type && !typeMatches(value, schema.type)) {
      diagnostics.push(diagnostic('schema-type', path, `Expected ${Array.isArray(schema.type) ? schema.type.join(' or ') : schema.type}.`));
      return;
    }

    if (typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) diagnostics.push(diagnostic('schema-min-length', path, `String must contain at least ${schema.minLength} character${schema.minLength === 1 ? '' : 's'}.`));
      if (schema.pattern && !schema.pattern.test(value)) diagnostics.push(diagnostic('schema-pattern', path, `Value does not match ${schema.pattern}.`));
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      if (schema.minimum !== null && schema.minimum !== undefined && value < schema.minimum) diagnostics.push(diagnostic('schema-minimum', path, `Value must be at least ${schema.minimum}.`));
      if (schema.maximum !== null && schema.maximum !== undefined && value > schema.maximum) diagnostics.push(diagnostic('schema-maximum', path, `Value must be at most ${schema.maximum}.`));
      if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) diagnostics.push(diagnostic('schema-exclusive-minimum', path, `Value must be greater than ${schema.exclusiveMinimum}.`));
      if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) diagnostics.push(diagnostic('schema-exclusive-maximum', path, `Value must be less than ${schema.exclusiveMaximum}.`));
    }

    if (Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) diagnostics.push(diagnostic('schema-min-items', path, `Array must contain at least ${schema.minItems} item${schema.minItems === 1 ? '' : 's'}.`));
      if (schema.uniqueItems) {
        const seen = new Set();
        value.forEach((item, index) => {
          const key = JSON.stringify(item);
          if (seen.has(key)) diagnostics.push(diagnostic('schema-unique-items', childPath(path, index, true), 'Array items must be unique.'));
          seen.add(key);
        });
      }
      if (schema.items) value.forEach((item, index) => validateNode(item, schema.items, childPath(path, index, true), diagnostics));
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const properties = schema.properties || {};
      (schema.required || []).forEach(key => {
        if (!Object.prototype.hasOwnProperty.call(value, key)) diagnostics.push(diagnostic('schema-required', childPath(path, key), `Required property ${key} is missing.`));
      });
      if (schema.additionalProperties === false) {
        Object.keys(value).forEach(key => {
          if (!Object.prototype.hasOwnProperty.call(properties, key)) diagnostics.push(diagnostic('schema-additional-property', childPath(path, key), `Property ${key} is not allowed.`));
        });
      }
      Object.entries(properties).forEach(([key, childSchema]) => {
        if (Object.prototype.hasOwnProperty.call(value, key)) validateNode(value[key], childSchema, childPath(path, key), diagnostics);
      });
    }
  }

  function validate(profileInput) {
    const profile = clone(profileInput || {});
    const diagnostics = [];
    validateNode(profile, PROFILE_SCHEMA, '$', diagnostics);
    return diagnostics;
  }

  function isValid(profileInput) {
    return validate(profileInput).length === 0;
  }

  root.KaysenderIslandV3Schema = Object.freeze({
    PROFILE_SCHEMA,
    isValid,
    validate
  });
})();
