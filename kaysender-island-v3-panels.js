(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const modelApi = root.KaysenderIslandV3ProfileModel;
  if (!modelApi) throw new Error('KaysenderIslandV3ProfileModel must load before Island v3 production panels.');

  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const FIELD = (path, label, type = 'text', options = {}) => Object.freeze({ path, label, type, ...options });
  const RECORD_FIELD = (id, label, type = 'text', options = {}) => Object.freeze({ id, label, type, ...options });

  const SCALAR_PANELS = Object.freeze([
    {
      id: 'identity',
      title: 'Identity and Classification',
      fields: [
        FIELD('name', 'Island Name'),
        FIELD('classification.sizeClass', 'Size Class'),
        FIELD('classification.shapeProfile', 'Shape Profile'),
        FIELD('classification.currentUse', 'Current Use'),
        FIELD('classification.sovereignty', 'Sovereignty'),
        FIELD('classification.surveyStatus', 'Survey Status', 'enum', { options: ['unmapped', 'partial', 'operational', 'survey-grade'] })
      ]
    },
    {
      id: 'geometry',
      title: 'Geometry',
      fields: [
        FIELD('geometry.lengthKm', 'Length (km)', 'number', { minimum: 0.001, step: 0.1 }),
        FIELD('geometry.widthKm', 'Width (km)', 'number', { minimum: 0.001, step: 0.1 }),
        FIELD('geometry.meanThicknessM', 'Mean Thickness (m)', 'number', { minimum: 0.001, step: 1 }),
        FIELD('geometry.planAreaKm2', 'Plan Area (km²)', 'number', { minimum: 0.001, step: 0.1 }),
        FIELD('geometry.usableAreaKm2', 'Usable Area (km²)', 'number', { minimum: 0, step: 0.1 }),
        FIELD('geometry.flatAreaKm2', 'Flat Area (km²)', 'number', { minimum: 0, step: 0.1 }),
        FIELD('geometry.arableAreaKm2', 'Arable Area (km²)', 'number', { minimum: 0, step: 0.1 }),
        FIELD('geometry.grossVolumeKm3', 'Gross Volume (km³)', 'number', { minimum: 0, step: 0.01 }),
        FIELD('geometry.estimatedMassMillionTons', 'Estimated Mass (million tons)', 'number', { minimum: 0, step: 1 }),
        FIELD('geometry.coordinateSystem', 'Coordinate System', 'text', { readOnly: true }),
        FIELD('geometry.mapScaleKmPerCell', 'Map Scale (km/cell)', 'number', { minimum: 0.001, step: 0.1 })
      ]
    },
    {
      id: 'composition',
      title: 'Composition',
      fields: [
        FIELD('composition.ordinaryRockPercent', 'Ordinary Rock (%)', 'percent', { step: 0.1 }),
        FIELD('composition.floatstonePercent', 'Floatstone (%)', 'percent', { step: 0.1 }),
        FIELD('composition.soilSedimentPercent', 'Soil and Sediment (%)', 'percent', { step: 0.1 }),
        FIELD('composition.cavernVoidPercent', 'Cavern Void (%)', 'percent', { step: 0.1 })
      ]
    },
    {
      id: 'hydrology-totals',
      title: 'Hydrology Ledger',
      fields: [
        FIELD('hydrology.annualRainfallMm', 'Annual Rainfall (mm)', 'number', { minimum: 0, step: 1 }),
        FIELD('hydrology.annualRenewableM3', 'Annual Renewable Water (m³)', 'number', { minimum: 0, step: 1 }),
        FIELD('hydrology.dailySustainableLiters', 'Daily Sustainable Water (L)', 'number', { minimum: 0, step: 1 }),
        FIELD('hydrology.storedWaterM3', 'Stored Water (m³)', 'number', { minimum: 0, step: 1 }),
        FIELD('hydrology.reserveDaysAtCurrentUse', 'Reserve Days', 'number', { minimum: 0, step: 0.1 }),
        FIELD('hydrology.systemLossPercent', 'System Loss (%)', 'percent', { step: 0.1 })
      ]
    },
    {
      id: 'food-capacity',
      title: 'Food Capacity',
      fields: [
        FIELD('foodCapacity.arableAreaKm2', 'Arable Area (km²)', 'number', { minimum: 0, step: 0.1 }),
        FIELD('foodCapacity.pastureAreaKm2', 'Pasture Area (km²)', 'number', { minimum: 0, step: 0.1 }),
        FIELD('foodCapacity.forageAreaKm2', 'Forage Area (km²)', 'number', { minimum: 0, step: 0.1 }),
        FIELD('foodCapacity.annualFoodUnits', 'Annual Food Units', 'number', { minimum: 0, step: 1 }),
        FIELD('foodCapacity.sustainablePopulation', 'Food-Sustainable Population', 'integer', { minimum: 0 }),
        FIELD('foodCapacity.emergencyPopulation90Days', 'Emergency Population (90 days)', 'integer', { minimum: 0 }),
        FIELD('foodCapacity.importDependencyPercent', 'Import Dependency (%)', 'percent', { step: 0.1 })
      ]
    },
    {
      id: 'resource-totals',
      title: 'Resource Extraction',
      fields: [
        FIELD('resources.annualSafeExtractionTons', 'Annual Safe Extraction (tons)', 'number', { minimum: 0, step: 1 }),
        FIELD('resources.currentAnnualExtractionTons', 'Current Annual Extraction (tons)', 'number', { minimum: 0, step: 1 })
      ]
    },
    {
      id: 'motion-summary',
      title: 'Motion Forecast',
      fields: [
        FIELD('motion.meanAltitudeM', 'Mean Altitude (m)', 'number', { step: 1 }),
        FIELD('motion.forecastHorizonDays', 'Forecast Horizon (days)', 'integer', { minimum: 1 })
      ]
    },
    {
      id: 'stability-summary',
      title: 'Stability Summary',
      fields: [
        FIELD('stability.structuralIntegrity', 'Structural Integrity'),
        FIELD('stability.overallRisk', 'Overall Risk', 'enum', { options: ['minimal', 'low', 'guarded', 'high', 'critical'] }),
        FIELD('stability.annualSurfaceLossPercent', 'Annual Surface Loss (%)', 'percent', { step: 0.01 }),
        FIELD('stability.emergencyThreshold', 'Emergency Threshold', 'textarea')
      ]
    },
    {
      id: 'ecology-summary',
      title: 'Ecology Summary',
      fields: [
        FIELD('ecology.carryingCapacityIndex', 'Carrying Capacity Index', 'number', { minimum: 0, step: 0.1 }),
        FIELD('ecology.currentPressure', 'Current Pressure', 'enum', { options: ['recovering', 'stable', 'strained', 'degrading', 'collapse'] })
      ]
    },
    {
      id: 'settlement-capacity',
      title: 'Settlement Capacity',
      fields: [
        FIELD('settlementCapacity.waterLimitedPopulation', 'Water-Limited Population', 'integer', { minimum: 0 }),
        FIELD('settlementCapacity.foodLimitedPopulation', 'Food-Limited Population', 'integer', { minimum: 0 }),
        FIELD('settlementCapacity.landLimitedPopulation', 'Land-Limited Population', 'integer', { minimum: 0 }),
        FIELD('settlementCapacity.sustainablePopulation', 'Sustainable Population', 'integer', { minimum: 0 }),
        FIELD('settlementCapacity.emergencyPopulation', 'Emergency Population', 'integer', { minimum: 0 })
      ]
    },
    {
      id: 'route-capability',
      title: 'Route Capability',
      fields: [
        FIELD('routeNodeExport.defaultNodeId', 'Default Route Node ID'),
        FIELD('routeNodeExport.routeCapability.maximumDailyArrivals', 'Maximum Daily Arrivals', 'integer', { minimum: 0 }),
        FIELD('routeNodeExport.routeCapability.resupplyWater', 'Water Resupply', 'boolean'),
        FIELD('routeNodeExport.routeCapability.resupplyFood', 'Food Resupply', 'boolean'),
        FIELD('routeNodeExport.routeCapability.repairCapability', 'Repair Capability', 'enum', { options: ['none', 'emergency', 'routine', 'major'] }),
        FIELD('routeNodeExport.routeCapability.chartConfidence', 'Chart Confidence', 'enum', { options: ['rumor', 'poor', 'usable', 'reliable', 'survey-grade'] })
      ]
    },
    {
      id: 'visibility',
      title: 'Visibility',
      fields: [
        FIELD('visibility.playerKnownSiteIds', 'Player-Known Site IDs', 'list'),
        FIELD('visibility.gmOnlySiteIds', 'GM-Only Site IDs', 'list'),
        FIELD('visibility.playerKnownHazardIds', 'Player-Known Hazard IDs', 'list'),
        FIELD('visibility.gmOnlyHazardIds', 'GM-Only Hazard IDs', 'list'),
        FIELD('visibility.publicFacts', 'Public Facts', 'lines'),
        FIELD('visibility.gmSecrets', 'GM Secrets', 'lines')
      ]
    },
    {
      id: 'outputs',
      title: 'Outputs',
      fields: [
        FIELD('outputs.playerSafeSummary', 'Player-Safe Summary', 'textarea'),
        FIELD('outputs.gmBrief', 'GM Brief', 'textarea'),
        FIELD('outputs.wikiDraft', 'Wiki Draft JSON', 'json')
      ]
    },
    {
      id: 'derived',
      title: 'Derived Reconciliation',
      readOnly: true,
      fields: [
        FIELD('derived.geometryReconciles', 'Geometry Reconciles', 'boolean', { readOnly: true }),
        FIELD('derived.compositionReconciles', 'Composition Reconciles', 'boolean', { readOnly: true }),
        FIELD('derived.mapAreaReconciles', 'Map Area Reconciles', 'boolean', { readOnly: true }),
        FIELD('derived.waterCapacityReconciles', 'Water Capacity Reconciles', 'boolean', { readOnly: true }),
        FIELD('derived.foodCapacityReconciles', 'Food Capacity Reconciles', 'boolean', { readOnly: true }),
        FIELD('derived.settlementCapacityReconciles', 'Settlement Capacity Reconciles', 'boolean', { readOnly: true }),
        FIELD('derived.brokenReferenceIds', 'Broken Reference IDs', 'list', { readOnly: true }),
        FIELD('derived.warnings', 'Warnings', 'lines', { readOnly: true })
      ]
    }
  ]);

  const COLLECTION_PANELS = Object.freeze([
    {
      id: 'waterSources', title: 'Water Sources', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('mapCellId', 'Map Cell ID'),
        RECORD_FIELD('type', 'Source Type'), RECORD_FIELD('potable', 'Potable', 'boolean'),
        RECORD_FIELD('averageDailyLiters', 'Average Daily Liters', 'number', { minimum: 0 }), RECORD_FIELD('seasonality', 'Seasonality'),
        RECORD_FIELD('status', 'Status', 'enum', { options: ['active', 'restricted', 'contaminated', 'dry', 'unknown'] })
      ], defaults: { mapCellId: '', type: 'unknown source', potable: false, averageDailyLiters: 0, seasonality: 'not recorded', status: 'unknown' }
    },
    {
      id: 'reservoirs', title: 'Reservoirs', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('mapCellId', 'Map Cell ID'),
        RECORD_FIELD('capacityM3', 'Capacity (m³)', 'number', { minimum: 0 }), RECORD_FIELD('currentVolumeM3', 'Current Volume (m³)', 'number', { minimum: 0 }),
        RECORD_FIELD('potable', 'Potable', 'boolean'), RECORD_FIELD('status', 'Status', 'enum', { options: ['operational', 'damaged', 'contaminated', 'offline'] })
      ], defaults: { mapCellId: '', capacityM3: 0, currentVolumeM3: 0, potable: false, status: 'offline' }
    },
    {
      id: 'resourceNodes', title: 'Resource Nodes', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('mapCellId', 'Map Cell ID'),
        RECORD_FIELD('resourceType', 'Resource Type'), RECORD_FIELD('quality', 'Quality'),
        RECORD_FIELD('estimatedReserveTons', 'Estimated Reserve (tons)', 'number', { minimum: 0 }),
        RECORD_FIELD('annualSafeExtractionTons', 'Annual Safe Extraction (tons)', 'number', { minimum: 0 }),
        RECORD_FIELD('status', 'Status', 'enum', { options: ['untapped', 'surveyed', 'active', 'depleted', 'sealed', 'contested'] })
      ], defaults: { mapCellId: '', resourceType: 'unknown resource', quality: 'unassessed', estimatedReserveTons: 0, annualSafeExtractionTons: 0, status: 'untapped' }
    },
    {
      id: 'altitudeSegments', title: 'Altitude Timeline', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('startDay', 'Start Day', 'integer', { minimum: 0 }),
        RECORD_FIELD('endDay', 'End Day', 'integer', { minimum: 1 }), RECORD_FIELD('minimumAltitudeM', 'Minimum Altitude (m)', 'number'),
        RECORD_FIELD('maximumAltitudeM', 'Maximum Altitude (m)', 'number'), RECORD_FIELD('confidence', 'Confidence', 'enum', { options: ['unknown', 'low', 'moderate', 'high', 'survey-grade'] })
      ], defaults: { startDay: 0, endDay: 1, minimumAltitudeM: 0, maximumAltitudeM: 0, confidence: 'unknown' }
    },
    {
      id: 'driftSegments', title: 'Drift Timeline', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('startDay', 'Start Day', 'integer', { minimum: 0 }),
        RECORD_FIELD('endDay', 'End Day', 'integer', { minimum: 1 }), RECORD_FIELD('bearingDegrees', 'Bearing (degrees)', 'number', { minimum: 0, maximum: 359.999 }),
        RECORD_FIELD('averageKmPerDay', 'Average km/day', 'number', { minimum: 0 }), RECORD_FIELD('confidence', 'Confidence', 'enum', { options: ['unknown', 'low', 'moderate', 'high', 'survey-grade'] })
      ], defaults: { startDay: 0, endDay: 1, bearingDegrees: 0, averageKmPerDay: 0, confidence: 'unknown' }
    },
    {
      id: 'faultZones', title: 'Fault Zones', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('cellIds', 'Cell IDs', 'list'),
        RECORD_FIELD('risk', 'Risk', 'enum', { options: ['minimal', 'low', 'guarded', 'high', 'critical'] }),
        RECORD_FIELD('status', 'Status', 'enum', { options: ['dormant', 'monitored', 'active', 'stabilized', 'failed'] }),
        RECORD_FIELD('trigger', 'Trigger'), RECORD_FIELD('estimatedLossKm2', 'Estimated Loss (km²)', 'number', { minimum: 0 })
      ], defaults: { cellIds: [], risk: 'guarded', status: 'monitored', trigger: 'not established', estimatedLossKm2: 0 }
    },
    {
      id: 'fractureEvents', title: 'Fracture Events', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('day', 'Day', 'integer', { minimum: 0 }),
        RECORD_FIELD('faultZoneId', 'Fault Zone ID'), RECORD_FIELD('severity', 'Severity', 'enum', { options: ['minor', 'moderate', 'major', 'catastrophic'] }),
        RECORD_FIELD('surfaceLossKm2', 'Surface Loss (km²)', 'number', { minimum: 0 }), RECORD_FIELD('notes', 'Notes', 'textarea')
      ], defaults: { day: 0, faultZoneId: '', severity: 'minor', surfaceLossKm2: 0, notes: '' }
    },
    {
      id: 'landingZones', title: 'Landing Zones', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('name', 'Name'), RECORD_FIELD('mapCellId', 'Map Cell ID'),
        RECORD_FIELD('type', 'Type', 'enum', { options: ['open-field', 'cliff-dock', 'tower-mooring', 'underside-dock', 'moving-rendezvous'] }),
        RECORD_FIELD('maximumVesselClass', 'Maximum Vessel Class'), RECORD_FIELD('dailyCapacity', 'Daily Capacity', 'integer', { minimum: 0 }),
        RECORD_FIELD('weatherLimit', 'Weather Limit'), RECORD_FIELD('status', 'Status', 'enum', { options: ['operational', 'restricted', 'damaged', 'closed', 'secret'] })
      ], defaults: { name: 'New Landing Zone', mapCellId: '', type: 'open-field', maximumVesselClass: 'unknown', dailyCapacity: 0, weatherLimit: 'not recorded', status: 'restricted' }
    },
    {
      id: 'approachCorridors', title: 'Approach Corridors', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('landingZoneId', 'Landing Zone ID'),
        RECORD_FIELD('bearingDegrees', 'Bearing (degrees)', 'number', { minimum: 0, maximum: 359.999 }),
        RECORD_FIELD('minimumAltitudeM', 'Minimum Altitude (m)', 'number'), RECORD_FIELD('maximumAltitudeM', 'Maximum Altitude (m)', 'number'),
        RECORD_FIELD('hazardIds', 'Hazard IDs', 'list'), RECORD_FIELD('pilotRequirement', 'Pilot Requirement')
      ], defaults: { landingZoneId: '', bearingDegrees: 0, minimumAltitudeM: 0, maximumAltitudeM: 0, hazardIds: [], pilotRequirement: 'not recorded' }
    },
    {
      id: 'sites', title: 'Sites', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('name', 'Name'), RECORD_FIELD('type', 'Type'),
        RECORD_FIELD('mapCellId', 'Map Cell ID'), RECORD_FIELD('status', 'Status', 'enum', { options: ['planned', 'active', 'abandoned', 'ruined', 'sealed', 'unknown'] }),
        RECORD_FIELD('visibility', 'Visibility', 'enum', { options: ['public', 'known-locally', 'rumored', 'gm-only'] }),
        RECORD_FIELD('maximumFootprintKm2', 'Maximum Footprint (km²)', 'number', { minimum: 0 }), RECORD_FIELD('tags', 'Tags', 'list')
      ], defaults: { name: 'New Site', type: 'site', mapCellId: '', status: 'planned', visibility: 'gm-only', maximumFootprintKm2: 0, tags: [] }
    },
    {
      id: 'hazards', title: 'Hazards', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('name', 'Name'), RECORD_FIELD('type', 'Type'),
        RECORD_FIELD('cellIds', 'Cell IDs', 'list'), RECORD_FIELD('severity', 'Severity', 'enum', { options: ['minor', 'moderate', 'major', 'critical'] }),
        RECORD_FIELD('visibility', 'Visibility', 'enum', { options: ['public', 'known-locally', 'rumored', 'gm-only'] }),
        RECORD_FIELD('status', 'Status', 'enum', { options: ['dormant', 'active', 'seasonal', 'contained', 'resolved'] })
      ], defaults: { name: 'New Hazard', type: 'hazard', cellIds: [], severity: 'minor', visibility: 'gm-only', status: 'dormant' }
    },
    {
      id: 'habitats', title: 'Habitats', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('name', 'Name'), RECORD_FIELD('cellIds', 'Cell IDs', 'list'),
        RECORD_FIELD('areaKm2', 'Area (km²)', 'number', { minimum: 0 }), RECORD_FIELD('condition', 'Condition', 'enum', { options: ['pristine', 'healthy', 'strained', 'degraded', 'collapsed'] }),
        RECORD_FIELD('capacityIndex', 'Capacity Index', 'number', { minimum: 0 })
      ], defaults: { name: 'New Habitat', cellIds: [], areaKm2: 0, condition: 'strained', capacityIndex: 0 }
    },
    {
      id: 'speciesSlots', title: 'Species Slots', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('habitatId', 'Habitat ID'), RECORD_FIELD('role', 'Role'),
        RECORD_FIELD('populationBand', 'Population Band'), RECORD_FIELD('status', 'Status', 'enum', { options: ['vacant', 'stable', 'declining', 'invasive', 'migratory'] })
      ], defaults: { habitatId: '', role: 'unassigned ecological role', populationBand: 'unknown', status: 'vacant' }
    },
    {
      id: 'settlementSlots', title: 'Settlement Slots', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('mapCellId', 'Map Cell ID'),
        RECORD_FIELD('maximumPopulation', 'Maximum Population', 'integer', { minimum: 0 }), RECORD_FIELD('maximumFootprintKm2', 'Maximum Footprint (km²)', 'number', { minimum: 0 }),
        RECORD_FIELD('waterSourceIds', 'Water Source IDs', 'list'), RECORD_FIELD('landingZoneIds', 'Landing Zone IDs', 'list'),
        RECORD_FIELD('status', 'Status', 'enum', { options: ['open', 'reserved', 'occupied', 'unsafe', 'closed'] })
      ], defaults: { mapCellId: '', maximumPopulation: 0, maximumFootprintKm2: 0, waterSourceIds: [], landingZoneIds: [], status: 'open' }
    },
    {
      id: 'routeNodes', title: 'Route Nodes', fields: [
        RECORD_FIELD('id', 'Stable ID', 'text', { readOnly: true }), RECORD_FIELD('name', 'Name'), RECORD_FIELD('mapCellId', 'Map Cell ID'),
        RECORD_FIELD('landingZoneIds', 'Landing Zone IDs', 'list'), RECORD_FIELD('altitudeBand', 'Altitude Band'),
        RECORD_FIELD('services', 'Services', 'list'), RECORD_FIELD('status', 'Status', 'enum', { options: ['active', 'restricted', 'seasonal', 'closed', 'secret'] })
      ], defaults: { name: 'New Route Node', mapCellId: '', landingZoneIds: [], altitudeBand: 'not recorded', services: [], status: 'restricted' }
    }
  ]);

  function fieldInput(definition, value, locked) {
    const wrapper = document.createElement('label');
    wrapper.className = `island-production-field field-${definition.type}${locked ? ' locked' : ''}`;
    const caption = document.createElement('span');
    caption.textContent = definition.label;
    wrapper.appendChild(caption);

    let input;
    if (definition.type === 'textarea' || definition.type === 'lines' || definition.type === 'json') {
      input = document.createElement('textarea');
      input.rows = definition.type === 'json' ? 8 : 4;
      if (definition.type === 'lines') input.value = Array.isArray(value) ? value.join('\n') : String(value || '');
      else if (definition.type === 'json') input.value = JSON.stringify(value || {}, null, 2);
      else input.value = String(value || '');
    } else if (definition.type === 'enum') {
      input = document.createElement('select');
      (definition.options || []).forEach(option => {
        const element = document.createElement('option');
        element.value = option;
        element.textContent = option;
        element.selected = option === value;
        input.appendChild(element);
      });
    } else {
      input = document.createElement('input');
      input.type = definition.type === 'boolean' ? 'checkbox' : ['number', 'integer', 'percent'].includes(definition.type) ? 'number' : 'text';
      if (definition.type === 'boolean') input.checked = Boolean(value);
      else if (definition.type === 'list') input.value = Array.isArray(value) ? value.join(', ') : String(value || '');
      else input.value = value ?? '';
      if (definition.minimum !== undefined) input.min = String(definition.minimum);
      if (definition.maximum !== undefined) input.max = String(definition.maximum);
      if (definition.step !== undefined) input.step = String(definition.step);
      if (definition.type === 'integer') input.step = '1';
    }
    input.name = definition.path || definition.id;
    input.disabled = Boolean(locked);
    input.readOnly = Boolean(definition.readOnly);
    input.dataset.valueType = definition.type;
    wrapper.appendChild(input);
    return { wrapper, input };
  }

  function inputValue(input, definition) {
    if (definition.type === 'boolean') return input.checked;
    if (definition.type === 'lines') return input.value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    return input.value;
  }

  class IslandProductionPanels {
    constructor(options = {}) {
      if (!options.root || !(options.root instanceof Element)) throw new Error('Island production panels require a root Element.');
      if (!(options.model instanceof modelApi.IslandProfileModel)) throw new Error('Island production panels require an IslandProfileModel.');
      this.root = options.root;
      this.model = options.model;
      this.onDiagnostic = typeof options.onDiagnostic === 'function' ? options.onDiagnostic : null;
      this.unsubscribe = this.model.subscribe(() => this.render());
      this.render();
    }

    #scalarPanel(panel) {
      const section = document.createElement('details');
      section.className = 'island-production-panel scalar-panel';
      section.dataset.panelId = panel.id;
      section.open = ['identity', 'geometry', 'hydrology-totals'].includes(panel.id);
      const summary = document.createElement('summary');
      summary.textContent = panel.title;
      section.appendChild(summary);
      const form = document.createElement('form');
      form.className = 'island-production-fields';
      const controls = [];
      panel.fields.forEach(definition => {
        const locked = panel.readOnly || definition.readOnly || this.model.isLocked(definition.path);
        const control = fieldInput(definition, this.model.get(definition.path), locked);
        controls.push({ definition, input: control.input });
        form.appendChild(control.wrapper);
      });
      if (!panel.readOnly) {
        const actions = document.createElement('div');
        actions.className = 'island-production-actions';
        const apply = document.createElement('button');
        apply.type = 'submit';
        apply.textContent = `Apply ${panel.title}`;
        actions.appendChild(apply);
        form.appendChild(actions);
        form.addEventListener('submit', event => {
          event.preventDefault();
          try {
            controls.forEach(({ definition, input }) => {
              if (!input.disabled && !definition.readOnly) this.model.setField(definition.path, inputValue(input, definition), definition);
            });
          } catch (error) {
            this.onDiagnostic?.({ severity: 'error', code: 'island-panel-apply-failed', path: panel.id, message: error.message });
          }
        });
      }
      section.appendChild(form);
      return section;
    }

    #recordCard(panel, record) {
      const card = document.createElement('article');
      card.className = 'island-production-record';
      card.dataset.recordId = record.id;
      const heading = document.createElement('header');
      const title = document.createElement('strong');
      title.textContent = record.name || record.id;
      const identity = document.createElement('small');
      identity.textContent = record.id;
      heading.append(title, identity);
      card.appendChild(heading);
      const form = document.createElement('form');
      form.className = 'island-production-fields';
      const controls = [];
      panel.fields.forEach(definition => {
        const fieldPath = `${modelApi.COLLECTIONS[panel.id].path}.${record.id}.${definition.id}`;
        const locked = definition.readOnly || this.model.isLocked(fieldPath);
        const control = fieldInput({ ...definition, path: definition.id }, record[definition.id], locked);
        controls.push({ definition, input: control.input });
        form.appendChild(control.wrapper);
      });
      const actions = document.createElement('div');
      actions.className = 'island-production-actions';
      const apply = document.createElement('button');
      apply.type = 'submit';
      apply.textContent = 'Apply Record';
      actions.appendChild(apply);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove Record';
      remove.addEventListener('click', () => {
        try {
          const result = this.model.removeRecord(panel.id, record.id);
          if (!result.removed && result.reason === 'referenced') {
            this.onDiagnostic?.({
              severity: 'warning',
              code: 'island-record-still-referenced',
              path: modelApi.COLLECTIONS[panel.id].path,
              message: `${record.id} is still referenced by ${result.references.map(item => item.path).join(', ')}.`,
              references: result.references
            });
          }
        } catch (error) {
          this.onDiagnostic?.({ severity: 'error', code: 'island-record-remove-failed', path: panel.id, message: error.message });
        }
      });
      actions.appendChild(remove);
      form.appendChild(actions);
      form.addEventListener('submit', event => {
        event.preventDefault();
        try {
          const patch = {};
          const definitions = {};
          controls.forEach(({ definition, input }) => {
            if (!input.disabled && !definition.readOnly) patch[definition.id] = inputValue(input, definition);
            definitions[definition.id] = definition;
          });
          this.model.updateRecord(panel.id, record.id, patch, definitions);
        } catch (error) {
          this.onDiagnostic?.({ severity: 'error', code: 'island-record-apply-failed', path: panel.id, message: error.message });
        }
      });
      card.appendChild(form);
      return card;
    }

    #collectionPanel(panel) {
      const section = document.createElement('details');
      section.className = 'island-production-panel collection-panel';
      section.dataset.panelId = panel.id;
      const records = this.model.listRecords(panel.id);
      const summary = document.createElement('summary');
      summary.textContent = `${panel.title} (${records.length})`;
      section.appendChild(summary);
      const list = document.createElement('div');
      list.className = 'island-production-records';
      records.forEach(record => list.appendChild(this.#recordCard(panel, record)));
      section.appendChild(list);
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'island-production-add-record';
      add.textContent = `Add ${panel.title.replace(/s$/, '')}`;
      add.disabled = this.model.isLocked(modelApi.COLLECTIONS[panel.id].path);
      add.addEventListener('click', () => {
        try {
          this.model.addRecord(panel.id, clone(panel.defaults), { preferredId: panel.title.replace(/s$/, '') });
        } catch (error) {
          this.onDiagnostic?.({ severity: 'error', code: 'island-record-add-failed', path: panel.id, message: error.message });
        }
      });
      section.appendChild(add);
      return section;
    }

    render() {
      this.root.classList.add('kaysender-island-production-panels');
      this.root.replaceChildren();
      SCALAR_PANELS.forEach(panel => this.root.appendChild(this.#scalarPanel(panel)));
      COLLECTION_PANELS.forEach(panel => this.root.appendChild(this.#collectionPanel(panel)));
    }

    destroy() {
      this.unsubscribe?.();
      this.root.replaceChildren();
      this.root.classList.remove('kaysender-island-production-panels');
    }
  }

  class IslandProductionController {
    constructor(options = {}) {
      if (!options.editorId) throw new Error('Island production controller requires an editorId.');
      if (!root.KaysenderEditorLifecycle) throw new Error('KaysenderEditorLifecycle is unavailable.');
      this.editorId = options.editorId;
      this.lifecycle = root.KaysenderEditorLifecycle;
      this.onProfileChange = typeof options.onProfileChange === 'function' ? options.onProfileChange : null;
      this.onDiagnostics = typeof options.onDiagnostics === 'function' ? options.onDiagnostics : null;
      this.suppressDirty = false;
      this.model = new modelApi.IslandProfileModel(options.profile || {}, {
        getLocks: typeof options.getLocks === 'function' ? options.getLocks : () => options.locks || []
      });
      this.unsubscribe = this.model.subscribe(event => {
        if (!this.suppressDirty && ['field-changed', 'record-added', 'record-updated', 'record-removed'].includes(event.type)) {
          this.lifecycle.markDirty(this.editorId, 'Island production profile changed.');
        }
        this.onProfileChange?.(clone(event));
      });
      if (options.root) {
        this.panels = new IslandProductionPanels({
          root: options.root,
          model: this.model,
          onDiagnostic: diagnostic => this.onDiagnostics?.([clone(diagnostic)])
        });
      }
    }

    replaceProfile(profile) {
      this.suppressDirty = true;
      try {
        return this.model.replaceProfile(profile);
      } finally {
        this.suppressDirty = false;
      }
    }

    getProfile() {
      return this.model.getProfile();
    }

    buildCanonical(options = {}) {
      return this.model.buildCanonical(options);
    }

    commitCanonical(options = {}) {
      this.suppressDirty = true;
      try {
        return this.model.commitCanonical(options);
      } finally {
        this.suppressDirty = false;
      }
    }

    destroy() {
      this.panels?.destroy();
      this.unsubscribe?.();
      this.panels = null;
      this.unsubscribe = null;
    }
  }

  root.KaysenderIslandV3Panels = Object.freeze({
    COLLECTION_PANELS,
    IslandProductionController,
    IslandProductionPanels,
    SCALAR_PANELS,
    fieldInput,
    inputValue
  });
})();
