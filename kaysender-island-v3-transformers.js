(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, number(value, minimum)));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const text = value => String(value || '').trim();
  const slug = value => text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unnamed';
  const round = (value, digits = 3) => Number(number(value).toFixed(digits));
  const sum = values => values.reduce((total, value) => total + number(value), 0);

  const MIGRATION_ID = 'island-2.0.0-to-3.0.0';
  const PROFILE_TYPE = 'floating-island-foundation-profile';
  const TARGET_VERSION = '3.0.0';

  const MIGRATION_WARNINGS = Object.freeze([
    'Potability and throughput were not recorded in v2; false and zero values are conservative placeholders, not negative findings.',
    'V2 estimated settlement population but did not quantify food production.',
    'V2 resource presence did not provide tonnage or safe extraction limits.',
    'V2 recorded drift speed but not bearing. Zero degrees is a visible placeholder that must be reviewed.',
    'V2 did not retain fault locations, fracture history, or annual loss rate.',
    'Landing capacity, vessel class, and approach bearing were not recorded in v2.',
    'The v2 maximum population becomes a land-limited estimate only. Sustainable capacity remains zero until food and water are quantified.',
    'The v2 route summary did not quantify arrivals or services.',
    'V2 site slots were generated capacity placeholders. Migration does not assert that they are completed or active sites.'
  ]);

  function surveyStatus(chartQuality) {
    return ({
      'survey-grade coordinates': 'survey-grade',
      'reliable seasonal charts': 'operational',
      'usable with corrections': 'operational',
      'outdated charts': 'partial',
      'contradictory reports': 'partial',
      'rumor only': 'unmapped',
      'deliberately falsified': 'unmapped'
    })[text(chartQuality).toLowerCase()] || 'partial';
  }

  function timelineConfidence(description) {
    return ({
      'fixed altitude': 'survey-grade',
      'precisely charted drift': 'survey-grade',
      'predictable cycle': 'high',
      'charted seasonal route': 'high',
      'seasonally predictable': 'moderate',
      'weather-dependent route': 'moderate',
      'weather-sensitive': 'low',
      'loosely predictable wandering': 'low',
      'irregular oscillation': 'low',
      'erratic wandering': 'low',
      'violent altitude surges': 'unknown',
      'frequent course reversal': 'unknown',
      'unknown pattern': 'unknown',
      'unknown external pull': 'unknown'
    })[text(description).toLowerCase()] || 'unknown';
  }

  function routeChartConfidence(chartQuality) {
    return ({
      'survey-grade coordinates': 'survey-grade',
      'reliable seasonal charts': 'reliable',
      'usable with corrections': 'usable',
      'outdated charts': 'poor',
      'contradictory reports': 'poor',
      'rumor only': 'rumor',
      'deliberately falsified': 'rumor'
    })[text(chartQuality).toLowerCase()] || 'poor';
  }

  function stabilityRisk(score) {
    const value = clamp(score, 0, 20);
    if (value >= 18) return 'minimal';
    if (value >= 15) return 'low';
    if (value >= 11) return 'guarded';
    if (value >= 6) return 'high';
    return 'critical';
  }

  function habitatCondition(wildlifeDensity) {
    const value = text(wildlifeDensity).toLowerCase();
    if (value.includes('rich biodiversity')) return 'pristine';
    if (value.includes('established') || value.includes('migration stop')) return 'healthy';
    if (value.includes('limited') || value.includes('apex')) return 'strained';
    if (value.includes('sparse') || value.includes('unstable')) return 'degraded';
    if (value.includes('sterile')) return 'collapsed';
    return 'strained';
  }

  function ecologyPressure(wildlifeDensity) {
    const value = text(wildlifeDensity).toLowerCase();
    if (value.includes('sterile') || value.includes('sparse')) return 'recovering';
    if (value.includes('established') || value.includes('limited')) return 'stable';
    if (value.includes('migration stop') || value.includes('apex')) return 'strained';
    if (value.includes('unstable')) return 'degrading';
    return 'stable';
  }

  function landingType(approachProfile) {
    const value = text(approachProfile).toLowerCase();
    if (value.includes('underside')) return 'underside-dock';
    if (value.includes('moving rendezvous')) return 'moving-rendezvous';
    if (value.includes('cliff') || value.includes('shelf')) return 'cliff-dock';
    return 'open-field';
  }

  function usablePercentForCell(cell, fallback) {
    const slope = text(cell?.slopeClass).toLowerCase();
    if (slope === 'gentle') return 80;
    if (slope === 'moderate' || slope === 'mixed') return 55;
    if (slope === 'steep' || slope.includes('vertical')) return 25;
    return clamp(fallback, 0, 100);
  }

  function arablePercentForCell(cell, usablePercent, globalArablePercent) {
    const slope = text(cell?.slopeClass).toLowerCase();
    const globalValue = clamp(globalArablePercent, 0, 100);
    if (slope === 'gentle') return Math.min(usablePercent, globalValue);
    if (slope === 'steep' || slope.includes('vertical')) return 0;
    return Math.min(usablePercent, round(globalValue / 2, 1));
  }

  function findAnchor(cells, predicate, fallback = null) {
    return cells.find(predicate) || fallback || cells[0] || null;
  }

  function sourceDescriptor(source = {}) {
    return {
      profileType: source.profileType,
      schemaVersion: source.schemaVersion,
      name: source.name,
      profileId: source.profileId ?? null,
      revision: source.revision ?? null,
      referencePolicy: 'pinned-revision-required-when-enveloped'
    };
  }

  function publicSiteIds(profile) {
    const denied = new Set(profile.visibility?.gmOnlySiteIds || []);
    return unique(profile.visibility?.playerKnownSiteIds || []).filter(id => !denied.has(id));
  }

  function publicHazardIds(profile) {
    const denied = new Set(profile.visibility?.gmOnlyHazardIds || []);
    return unique(profile.visibility?.playerKnownHazardIds || []).filter(id => !denied.has(id));
  }

  function bindingConstraint(capacity = {}) {
    const candidates = [
      ['water', number(capacity.waterLimitedPopulation)],
      ['food', number(capacity.foodLimitedPopulation)],
      ['land', number(capacity.landLimitedPopulation)]
    ];
    return candidates.sort((a, b) => a[1] - b[1])[0]?.[0] || 'unknown';
  }

  function migrateV2ToV3(input) {
    const source = clone(input || {});
    if (source.profileType !== PROFILE_TYPE || source.schemaVersion !== '2.0.0') {
      throw new Error('Island v3 transformer requires a floating-island-foundation-profile at schemaVersion 2.0.0.');
    }
    if (!source.mapFoundation || !Array.isArray(source.mapFoundation.cells) || !source.mapFoundation.cells.length) {
      throw new Error('Island 2.0.0 profile is missing mapFoundation cells.');
    }

    const sourceCells = source.mapFoundation.cells;
    const sourceSlots = source.mapFoundation.siteSlots || [];
    const regionCrosswalk = Object.fromEntries(sourceCells.map(cell => [cell.id, `cell-${slug(cell.id)}`]));
    const siteCrosswalk = Object.fromEntries(sourceSlots.map(slot => [slot.id, `site-${slug(slot.id)}`]));
    const waterAnchor = findAnchor(sourceCells, cell => /basin|wet|lake|spring|river/i.test(text(cell.terrain)));
    const resourceAnchor = findAnchor(sourceCells, cell => /ridge|quarry|cliff|exposed/i.test(text(cell.terrain)));
    const settlementAnchor = [...sourceCells].sort((a, b) => {
      const usableA = number(a.areaKm2) * usablePercentForCell(a, source.geometry?.usableSurfacePercent) / 100;
      const usableB = number(b.areaKm2) * usablePercentForCell(b, source.geometry?.usableSurfacePercent) / 100;
      return usableB - usableA || sourceCells.indexOf(a) - sourceCells.indexOf(b);
    })[0];
    const approachAnchor = findAnchor(sourceCells, cell => text(cell.access) === 'edge-access');

    const hasWater = Boolean(text(source.hydrology?.profile) && text(source.hydrology?.profile).toLowerCase() !== 'none');
    const hasResource = Boolean(text(source.resources?.mineralPresence));
    const waterId = hasWater ? 'water-migrated-summary' : null;
    const resourceId = hasResource ? 'resource-migrated-summary' : null;
    const meanAltitude = number(source.motion?.meanAltitudeM);

    const cells = sourceCells.map(cell => {
      const usablePercent = usablePercentForCell(cell, source.geometry?.usableSurfacePercent);
      return {
        id: regionCrosswalk[cell.id],
        x: Math.max(0, Math.trunc(number(cell.grid?.x))),
        y: Math.max(0, Math.trunc(number(cell.grid?.y))),
        areaKm2: Math.max(0, number(cell.areaKm2)),
        terrainType: text(cell.terrain) || 'unassigned',
        elevationM: meanAltitude + number(cell.elevationM),
        slopeClass: text(cell.slopeClass) || 'unknown',
        usablePercent,
        arablePercent: arablePercentForCell(cell, usablePercent, source.terrain?.arableSoilPercent),
        waterCatchmentId: hasWater && cell.id === waterAnchor?.id ? waterId : null,
        siteIds: unique((cell.sites || []).map(id => siteCrosswalk[id]).filter(Boolean)),
        resourceNodeIds: hasResource && cell.id === resourceAnchor?.id ? [resourceId] : [],
        hazardIds: []
      };
    });

    const sites = sourceSlots.map(slot => ({
      id: siteCrosswalk[slot.id],
      name: `${text(slot.id).replace(/[-_]+/g, ' ')} ${text(slot.type)}`.trim(),
      type: text(slot.type) || 'site',
      mapCellId: regionCrosswalk[slot.regionId],
      status: text(slot.status).toLowerCase() === 'unassigned' ? 'planned' : 'unknown',
      visibility: text(slot.status).toLowerCase() === 'unassigned' ? 'gm-only' : 'known-locally',
      maximumFootprintKm2: Math.max(0, number(slot.maximumFootprintKm2)),
      tags: unique(['migrated-v2-slot', text(slot.access), text(slot.terrainContext)])
    })).filter(site => site.mapCellId);

    const population = Math.max(0, Math.trunc(number(source.population?.permanentPopulation)));
    const landLimit = Math.max(0, Math.trunc(number(source.insertionCapacity?.maximumSupportedPopulation)));
    const altitudeMinimum = number(source.motion?.minimumAltitudeM, meanAltitude - number(source.motion?.verticalOscillationM));
    const altitudeMaximum = number(source.motion?.maximumAltitudeM, meanAltitude + number(source.motion?.verticalOscillationM));
    const warnings = unique([...(source.warnings || []), ...MIGRATION_WARNINGS]);
    const settlementSlot = (population > 0 || number(source.insertionCapacity?.recommendedSettlementSites) > 0) ? {
      id: 'settlement-slot-migrated-primary',
      mapCellId: regionCrosswalk[settlementAnchor.id],
      maximumPopulation: landLimit,
      maximumFootprintKm2: Math.min(number(settlementAnchor.areaKm2) * 0.5, number(source.geometry?.flatAreaKm2)),
      waterSourceIds: waterId ? [waterId] : [],
      landingZoneIds: ['landing-migrated-primary-approach'],
      status: population > 0 ? 'occupied' : 'open'
    } : null;

    const migrated = {
      schemaVersion: TARGET_VERSION,
      profileType: PROFILE_TYPE,
      name: text(source.name) || 'Unnamed Floating Island',
      classification: {
        sizeClass: text(source.classification?.sizeClass) || 'unclassified',
        shapeProfile: text(source.classification?.shapeProfile) || 'unclassified',
        currentUse: text(source.classification?.currentUse) || 'unclassified',
        sovereignty: 'unclaimed or not recorded in v2',
        surveyStatus: surveyStatus(source.access?.chartQuality)
      },
      geometry: {
        lengthKm: Math.max(0.001, number(source.geometry?.lengthKm, 0.001)),
        widthKm: Math.max(0.001, number(source.geometry?.widthKm, 0.001)),
        meanThicknessM: Math.max(0.001, number(source.geometry?.meanThicknessM, 0.001)),
        planAreaKm2: Math.max(0.001, number(source.geometry?.planAreaKm2, 0.001)),
        usableAreaKm2: Math.max(0, number(source.geometry?.usableAreaKm2)),
        flatAreaKm2: Math.max(0, number(source.geometry?.flatAreaKm2)),
        arableAreaKm2: Math.max(0, number(source.geometry?.arableAreaKm2)),
        grossVolumeKm3: Math.max(0, number(source.geometry?.grossVolumeKm3)),
        estimatedMassMillionTons: Math.max(0, number(source.geometry?.estimatedMassMillionTons)),
        coordinateSystem: 'local-grid-v1',
        mapScaleKmPerCell: Math.max(0.001, number(Math.max(number(source.mapFoundation.cellWidthKm), number(source.mapFoundation.cellHeightKm)), Math.sqrt(number(source.mapFoundation.nominalCellAreaKm2, 1))))
      },
      composition: {
        ordinaryRockPercent: clamp(source.composition?.ordinaryRockPercent, 0, 100),
        floatstonePercent: clamp(source.composition?.floatstonePercent, 0, 100),
        soilSedimentPercent: clamp(source.composition?.soilSedimentPercent, 0, 100),
        cavernVoidPercent: clamp(source.composition?.cavernVoidPercent, 0, 100)
      },
      map: {
        columns: Math.max(1, Math.trunc(number(source.mapFoundation.columns, 1))),
        rows: Math.max(1, Math.trunc(number(source.mapFoundation.rows, 1))),
        activeCellIds: cells.map(cell => cell.id),
        cells
      },
      hydrology: {
        annualRainfallMm: Math.max(0, number(source.hydrology?.annualRainfallMm)),
        sources: hasWater ? [{
          id: waterId,
          mapCellId: regionCrosswalk[waterAnchor.id],
          type: `migrated summary: ${text(source.hydrology.profile)}`,
          potable: false,
          averageDailyLiters: 0,
          seasonality: 'not quantified in v2',
          status: 'unknown'
        }] : [],
        reservoirs: [],
        annualRenewableM3: 0,
        dailySustainableLiters: 0,
        storedWaterM3: 0,
        reserveDaysAtCurrentUse: 0,
        systemLossPercent: 0
      },
      foodCapacity: {
        arableAreaKm2: Math.max(0, number(source.geometry?.arableAreaKm2)),
        pastureAreaKm2: 0,
        forageAreaKm2: 0,
        annualFoodUnits: 0,
        sustainablePopulation: 0,
        emergencyPopulation90Days: population,
        importDependencyPercent: 100
      },
      resources: {
        nodes: hasResource ? [{
          id: resourceId,
          mapCellId: regionCrosswalk[resourceAnchor.id],
          resourceType: text(source.resources.mineralPresence),
          quality: [text(source.resources.depositScale), text(source.resources.mineralAccessibility)].filter(Boolean).join('; ') || 'not quantified in v2',
          estimatedReserveTons: 0,
          annualSafeExtractionTons: 0,
          status: 'surveyed'
        }] : [],
        annualSafeExtractionTons: 0,
        currentAnnualExtractionTons: 0
      },
      motion: {
        meanAltitudeM: meanAltitude,
        altitudeTimeline: [{
          id: 'altitude-segment-migrated-baseline',
          startDay: 0,
          endDay: 30,
          minimumAltitudeM: altitudeMinimum,
          maximumAltitudeM: altitudeMaximum,
          confidence: timelineConfidence(source.motion?.altitudePredictability)
        }],
        driftTimeline: [{
          id: 'drift-segment-migrated-baseline',
          startDay: 0,
          endDay: 30,
          bearingDegrees: 0,
          averageKmPerDay: Math.max(0, number(source.motion?.horizontalDriftKpd)),
          confidence: timelineConfidence(source.motion?.driftPredictability)
        }],
        forecastHorizonDays: 30
      },
      stability: {
        structuralIntegrity: `migrated v2 structural stability score ${number(source.derivedScores?.structuralStability)}; source descriptor was not retained`,
        overallRisk: stabilityRisk(source.derivedScores?.structuralStability),
        annualSurfaceLossPercent: 0,
        faultZones: [],
        fractureEvents: [],
        emergencyThreshold: 'not established during v2 migration'
      },
      approaches: {
        landingZones: [{
          id: 'landing-migrated-primary-approach',
          name: 'Migrated Primary Approach',
          mapCellId: regionCrosswalk[approachAnchor.id],
          type: landingType(source.access?.approachProfile),
          maximumVesselClass: 'not recorded in v2',
          dailyCapacity: 0,
          weatherLimit: text(source.access?.approachProfile) || 'not recorded in v2',
          status: 'restricted'
        }],
        approachCorridors: [{
          id: 'approach-migrated-primary-lane',
          landingZoneId: 'landing-migrated-primary-approach',
          bearingDegrees: 0,
          minimumAltitudeM: altitudeMinimum,
          maximumAltitudeM: altitudeMaximum,
          hazardIds: [],
          pilotRequirement: text(source.access?.approachProfile) || 'not recorded in v2'
        }]
      },
      sites,
      hazards: [],
      ecology: {
        habitats: number(source.ecology?.habitatAreaKm2) > 0 ? [{
          id: 'habitat-migrated-primary',
          name: 'Migrated Primary Habitat',
          cellIds: cells.map(cell => cell.id),
          areaKm2: Math.max(0, number(source.ecology.habitatAreaKm2)),
          condition: habitatCondition(source.ecology?.wildlifeDensity),
          capacityIndex: Math.max(0, number(source.ecology?.carryingCapacityIndex))
        }] : [],
        speciesSlots: number(source.ecology?.habitatAreaKm2) > 0 && text(source.ecology?.dominantWildlife) ? [{
          id: 'species-slot-migrated-dominant',
          habitatId: 'habitat-migrated-primary',
          role: 'dominant wildlife summary',
          populationBand: text(source.ecology.dominantWildlife),
          status: 'stable'
        }] : [],
        carryingCapacityIndex: Math.max(0, number(source.ecology?.carryingCapacityIndex)),
        currentPressure: ecologyPressure(source.ecology?.wildlifeDensity)
      },
      settlementCapacity: {
        waterLimitedPopulation: 0,
        foodLimitedPopulation: 0,
        landLimitedPopulation: landLimit,
        sustainablePopulation: 0,
        emergencyPopulation: population,
        settlementSlots: settlementSlot ? [settlementSlot] : []
      },
      routeNodeExport: {
        nodes: [{
          id: 'route-node-migrated-primary',
          name: `${text(source.name) || 'Unnamed Island'} Migrated Route Node`,
          mapCellId: regionCrosswalk[approachAnchor.id],
          landingZoneIds: ['landing-migrated-primary-approach'],
          altitudeBand: `${altitudeMinimum}-${altitudeMaximum} metres`,
          services: [],
          status: 'restricted'
        }],
        defaultNodeId: 'route-node-migrated-primary',
        routeCapability: {
          maximumDailyArrivals: 0,
          resupplyWater: false,
          resupplyFood: false,
          repairCapability: 'none',
          chartConfidence: routeChartConfidence(source.access?.chartQuality)
        }
      },
      derived: {
        geometryReconciles: number(source.geometry?.planAreaKm2) >= number(source.geometry?.usableAreaKm2) && number(source.geometry?.usableAreaKm2) >= number(source.geometry?.flatAreaKm2) && number(source.geometry?.flatAreaKm2) >= number(source.geometry?.arableAreaKm2),
        compositionReconciles: Math.abs(sum([
          source.composition?.ordinaryRockPercent,
          source.composition?.floatstonePercent,
          source.composition?.soilSedimentPercent,
          source.composition?.cavernVoidPercent
        ]) - 100) <= 0.1,
        mapAreaReconciles: Math.abs(sum(cells.map(cell => cell.areaKm2)) - number(source.geometry?.planAreaKm2)) <= Math.max(0.1, number(source.geometry?.planAreaKm2) * 0.02),
        waterCapacityReconciles: false,
        foodCapacityReconciles: false,
        settlementCapacityReconciles: false,
        brokenReferenceIds: [],
        warnings
      },
      visibility: {
        playerKnownSiteIds: sites.filter(site => site.visibility !== 'gm-only').map(site => site.id),
        gmOnlySiteIds: sites.filter(site => site.visibility === 'gm-only').map(site => site.id),
        playerKnownHazardIds: [],
        gmOnlyHazardIds: [],
        publicFacts: text(source.outputs?.summary) ? [text(source.outputs.summary)] : [],
        gmSecrets: []
      },
      outputs: {
        playerSafeSummary: text(source.outputs?.summary) || `${text(source.name) || 'Unnamed Island'} is a migrated Island 2.0.0 foundation.`,
        gmBrief: unique([...(source.outputs?.gmNotes || []), ...warnings]).join(' '),
        wikiDraft: source.outputs?.wikiDraft && typeof source.outputs.wikiDraft === 'object' ? clone(source.outputs.wikiDraft) : {
          id: slug(source.name),
          title: text(source.name) || 'Unnamed Island',
          category: 'Floating Islands'
        },
        downstreamExports: {}
      }
    };

    migrated.outputs.downstreamExports = buildDownstreamExports(migrated, {});
    return {
      changed: true,
      data: migrated,
      applied: [MIGRATION_ID],
      log: [{
        code: MIGRATION_ID,
        message: 'Migrated the generated Island 2.0.0 foundation into the deliberately editable Island 3.0.0 production contract. Quantitative systems absent from v2 remain conservative provisional placeholders and require review.',
        fromVersion: '2.0.0',
        toVersion: TARGET_VERSION
      }],
      crosswalks: { regions: regionCrosswalk, siteSlots: siteCrosswalk }
    };
  }

  function buildPopulationPayload(profile, source = {}) {
    const knownHazardSet = new Set(publicHazardIds(profile));
    return {
      consumer: 'population-generator',
      contractVersion: '1.0.0',
      source: sourceDescriptor({ ...profile, ...source }),
      payload: {
        capacityLimits: {
          waterLimitedPopulation: profile.settlementCapacity.waterLimitedPopulation,
          foodLimitedPopulation: profile.settlementCapacity.foodLimitedPopulation,
          landLimitedPopulation: profile.settlementCapacity.landLimitedPopulation,
          sustainablePopulation: profile.settlementCapacity.sustainablePopulation,
          emergencyPopulation: profile.settlementCapacity.emergencyPopulation,
          bindingConstraint: bindingConstraint(profile.settlementCapacity)
        },
        habitableCells: profile.map.cells.filter(cell => profile.map.activeCellIds.includes(cell.id)).map(cell => ({
          id: cell.id,
          areaKm2: cell.areaKm2,
          terrainType: cell.terrainType,
          usablePercent: cell.usablePercent,
          arablePercent: cell.arablePercent
        })),
        settlementSlots: profile.settlementCapacity.settlementSlots.map(slot => ({
          id: slot.id,
          mapCellId: slot.mapCellId,
          maximumPopulation: slot.maximumPopulation,
          maximumFootprintKm2: slot.maximumFootprintKm2,
          status: slot.status
        })),
        supplyPressure: {
          dailySustainableWaterLiters: profile.hydrology.dailySustainableLiters,
          storedWaterM3: profile.hydrology.storedWaterM3,
          reserveDaysAtCurrentUse: profile.hydrology.reserveDaysAtCurrentUse,
          annualFoodUnits: profile.foodCapacity.annualFoodUnits,
          foodImportDependencyPercent: profile.foodCapacity.importDependencyPercent,
          ecologicalPressure: profile.ecology.currentPressure,
          currentAnnualExtractionTons: profile.resources.currentAnnualExtractionTons,
          annualSafeExtractionTons: profile.resources.annualSafeExtractionTons
        },
        knownHazards: profile.hazards.filter(hazard => knownHazardSet.has(hazard.id)).map(hazard => ({
          id: hazard.id,
          name: hazard.name,
          type: hazard.type,
          severity: hazard.severity,
          status: hazard.status,
          cellIds: clone(hazard.cellIds)
        })),
        routeAccess: {
          defaultNodeId: profile.routeNodeExport.defaultNodeId,
          ...clone(profile.routeNodeExport.routeCapability)
        },
        constraints: [
          `Food capacity is the binding population limit at ${profile.settlementCapacity.sustainablePopulation} people.`,
          `The occupied western settlement slot is locally capped at ${profile.settlementCapacity.settlementSlots[0]?.maximumPopulation || 0} people.`,
          `Emergency population above ${profile.settlementCapacity.sustainablePopulation} requires temporary stores, imports, rationing, or displacement into non-settlement areas.`,
          'The eastern rim should not be treated as normal residential expansion land while its structural hazard remains active.'
        ]
      }
    };
  }

  function buildSettlementPayload(profile, settlementSlotId = '', source = {}) {
    const slot = profile.settlementCapacity.settlementSlots.find(item => item.id === settlementSlotId) || profile.settlementCapacity.settlementSlots[0];
    if (!slot) throw new Error('Settlement consumer requires at least one settlement slot.');
    const hostCell = profile.map.cells.find(cell => cell.id === slot.mapCellId);
    if (!hostCell) throw new Error(`Settlement slot ${slot.id} references missing cell ${slot.mapCellId}.`);
    const publicSites = new Set(publicSiteIds(profile));
    const publicHazards = new Set(publicHazardIds(profile));
    const landingIds = new Set(slot.landingZoneIds);
    return {
      consumer: 'settlement-generator',
      contractVersion: '1.0.0',
      source: sourceDescriptor({ ...profile, ...source }),
      payload: {
        selectedSettlementSlot: clone(slot),
        hostCell: {
          id: hostCell.id,
          x: hostCell.x,
          y: hostCell.y,
          areaKm2: hostCell.areaKm2,
          terrainType: hostCell.terrainType,
          elevationM: hostCell.elevationM,
          slopeClass: hostCell.slopeClass,
          usablePercent: hostCell.usablePercent,
          arablePercent: hostCell.arablePercent,
          siteIds: clone(hostCell.siteIds),
          hazardIds: clone(hostCell.hazardIds)
        },
        referencedWaterSources: profile.hydrology.sources.filter(item => slot.waterSourceIds.includes(item.id)).map(clone),
        referencedLandingZones: profile.approaches.landingZones.filter(item => landingIds.has(item.id)).map(clone),
        availableRouteNodes: profile.routeNodeExport.nodes.filter(node => node.landingZoneIds.some(id => landingIds.has(id))).map(clone),
        publicSites: profile.sites.filter(site => publicSites.has(site.id)).map(clone),
        knownHazards: profile.hazards.filter(hazard => publicHazards.has(hazard.id) && hazard.cellIds.includes(hostCell.id)).map(clone),
        capacityLimits: {
          slotMaximumPopulation: slot.maximumPopulation,
          islandSustainablePopulation: profile.settlementCapacity.sustainablePopulation,
          islandEmergencyPopulation: profile.settlementCapacity.emergencyPopulation,
          waterLimitedPopulation: profile.settlementCapacity.waterLimitedPopulation,
          foodLimitedPopulation: profile.settlementCapacity.foodLimitedPopulation,
          landLimitedPopulation: profile.settlementCapacity.landLimitedPopulation,
          bindingIslandConstraint: bindingConstraint(profile.settlementCapacity)
        },
        designConstraints: [
          'Keep the settlement within the selected slot footprint unless the parent Island adds another slot.',
          'Use only water sources and landing zones referenced by the selected slot.',
          'Reflect seasonal skyport closure in import and trade assumptions.',
          'Exclude hidden parent records from this standard settlement payload.'
        ]
      }
    };
  }

  function buildEcologyPayload(profile, source = {}) {
    const habitatCellIds = unique(profile.ecology.habitats.flatMap(habitat => habitat.cellIds));
    const habitatCellSet = new Set(habitatCellIds);
    const publicHazards = new Set(publicHazardIds(profile));
    return {
      consumer: 'ecology-generator',
      contractVersion: '1.0.0',
      source: sourceDescriptor({ ...profile, ...source }),
      payload: {
        habitats: profile.ecology.habitats.map(clone),
        speciesSlots: profile.ecology.speciesSlots.map(clone),
        habitatCells: profile.map.cells.filter(cell => habitatCellSet.has(cell.id)).map(cell => ({
          id: cell.id,
          areaKm2: cell.areaKm2,
          terrainType: cell.terrainType,
          elevationM: cell.elevationM,
          slopeClass: cell.slopeClass,
          usablePercent: cell.usablePercent,
          arablePercent: cell.arablePercent,
          waterCatchmentId: cell.waterCatchmentId,
          resourceNodeIds: clone(cell.resourceNodeIds),
          hazardIds: clone(cell.hazardIds)
        })),
        waterContext: profile.hydrology.sources.filter(item => habitatCellSet.has(item.mapCellId)).map(clone),
        knownHazards: profile.hazards.filter(hazard => publicHazards.has(hazard.id) && hazard.cellIds.some(id => habitatCellSet.has(id))).map(clone),
        humanPressure: {
          islandSustainablePopulation: profile.settlementCapacity.sustainablePopulation,
          occupiedSettlementSlotIds: profile.settlementCapacity.settlementSlots.filter(slot => slot.status === 'occupied').map(slot => slot.id),
          currentAnnualExtractionTons: profile.resources.currentAnnualExtractionTons,
          annualSafeExtractionTons: profile.resources.annualSafeExtractionTons,
          foodImportDependencyPercent: profile.foodCapacity.importDependencyPercent,
          currentEcologicalPressure: profile.ecology.currentPressure
        },
        ecologicalConstraints: [
          'Habitat generation must retain the source habitat and species-slot IDs.',
          'The pasture and basin cells form one connected managed habitat in the source profile.',
          'Resource extraction pressure must remain below the parent Island safe extraction total.',
          'Hidden parent sites and secrets are excluded from this standard ecology payload.'
        ]
      }
    };
  }

  function buildRoutePayload(profile, source = {}) {
    const landingIds = new Set(profile.routeNodeExport.nodes.flatMap(node => node.landingZoneIds));
    const landingZones = profile.approaches.landingZones.filter(zone => landingIds.has(zone.id));
    const corridorList = profile.approaches.approachCorridors.filter(corridor => landingIds.has(corridor.landingZoneId));
    const hazardIds = new Set(corridorList.flatMap(corridor => corridor.hazardIds));
    const publicHazards = new Set(publicHazardIds(profile));
    return {
      consumer: 'route-generator',
      contractVersion: '1.0.0',
      source: sourceDescriptor({ ...profile, ...source }),
      payload: {
        defaultNodeId: profile.routeNodeExport.defaultNodeId,
        nodes: profile.routeNodeExport.nodes.map(clone),
        landingZones: landingZones.map(clone),
        approachCorridors: corridorList.map(clone),
        motionForecast: {
          meanAltitudeM: profile.motion.meanAltitudeM,
          forecastHorizonDays: profile.motion.forecastHorizonDays,
          altitudeTimeline: profile.motion.altitudeTimeline.map(clone),
          driftTimeline: profile.motion.driftTimeline.map(clone)
        },
        knownApproachHazards: profile.hazards.filter(hazard => hazardIds.has(hazard.id) && publicHazards.has(hazard.id)).map(clone),
        routeCapability: clone(profile.routeNodeExport.routeCapability),
        resupplyContext: {
          dailySustainableWaterLiters: profile.hydrology.dailySustainableLiters,
          reserveDaysAtCurrentUse: profile.hydrology.reserveDaysAtCurrentUse,
          foodImportDependencyPercent: profile.foodCapacity.importDependencyPercent,
          currentAnnualExtractionTons: profile.resources.currentAnnualExtractionTons
        },
        routingConstraints: [
          'The Western Skyport is the only active route node in this payload.',
          'Use the source altitude and drift timelines rather than treating the Island as stationary.',
          'The western lane is seasonally constrained by crosswind shear.',
          `Maximum daily arrivals cannot exceed ${profile.routeNodeExport.routeCapability.maximumDailyArrivals} without a parent Island revision.`,
          'Hidden parent records are excluded from this standard route payload.'
        ]
      }
    };
  }

  function buildDownstreamPayloads(profile, source = {}, settlementSlotId = '') {
    return {
      population: buildPopulationPayload(profile, source),
      settlement: profile.settlementCapacity.settlementSlots.length ? buildSettlementPayload(profile, settlementSlotId, source) : null,
      ecology: buildEcologyPayload(profile, source),
      route: buildRoutePayload(profile, source)
    };
  }

  function buildDownstreamExports(profile, source = {}) {
    const payloads = buildDownstreamPayloads(profile, source);
    return {
      population: payloads.population?.payload || {},
      settlement: payloads.settlement?.payload || {},
      ecology: payloads.ecology?.payload || {},
      route: payloads.route?.payload || {},
      market: {
        exportCapacityTons: profile.resources.currentAnnualExtractionTons,
        importDependencyPercent: profile.foodCapacity.importDependencyPercent
      },
      faction: {
        claimableSiteIds: profile.sites.map(site => site.id)
      },
      crisis: {
        faultZoneIds: profile.stability.faultZones.map(zone => zone.id),
        reserveDaysAtCurrentUse: profile.hydrology.reserveDaysAtCurrentUse
      },
      encounter: {
        siteIds: profile.sites.map(site => site.id),
        hazardIds: profile.hazards.map(hazard => hazard.id)
      }
    };
  }

  const api = Object.freeze({
    MIGRATION_ID,
    MIGRATION_WARNINGS,
    PROFILE_TYPE,
    TARGET_VERSION,
    buildDownstreamExports,
    buildDownstreamPayloads,
    buildEcologyPayload,
    buildPopulationPayload,
    buildRoutePayload,
    buildSettlementPayload,
    migrateV2ToV3,
    routeChartConfidence,
    slug,
    surveyStatus,
    timelineConfidence
  });

  root.KaysenderIslandV3Transformers = api;
})();
