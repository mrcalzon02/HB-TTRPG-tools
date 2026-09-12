(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./data/exo-vessel/ftl-maintenance-evidence-integration-registry.json'),
      require('./blacklight-exo-ftl-maintenance-evidence-runtime.js'),
      require('./blacklight-exo-arnock-service-documentation-runtime.js'),
      require('./data/exo-vessel/zwlei-murrek-transit-engineering-registry.json')
    );
  } else {
    root.BlacklightFTLMaintenanceEvidenceIntegration = factory(
      root.BLACKLIGHT_FTL_MAINTENANCE_EVIDENCE_INTEGRATION || null,
      root.BlacklightFTLMaintenanceEvidence || null,
      root.BlacklightArnockServiceDocumentation || null,
      root.BLACKLIGHT_ZWLEI_MURREK_TRANSIT_ENGINEERING || null
    );
  }
}(typeof self !== 'undefined' ? self : this, function (registry, maintenanceRuntime, arnockRuntime, murrekRegistry) {
  'use strict';

  const PASS = new Set(['ACCEPTED', 'PASS', 'RESOLVED', 'CERTIFIED']);
  const CONDITIONAL = new Set(['CONDITIONAL', 'CONDITIONALLY_CERTIFIED']);
  const FAIL = new Set(['FAIL', 'FAILED', 'REJECTED', 'BLOCKED']);
  const CONFLICT = new Set(['CONFLICT']);

  function statusOf(value, fallback) {
    const s = String(value || fallback || 'UNRESOLVED').toUpperCase();
    if (PASS.has(s)) return 'PASS';
    if (CONDITIONAL.has(s)) return 'CONDITIONAL';
    if (FAIL.has(s)) return 'FAIL';
    if (CONFLICT.has(s)) return 'CONFLICT';
    return 'UNRESOLVED';
  }

  function evidence(status, summary, sourceIds, measurements, bounds) {
    return {
      status: status || 'UNRESOLVED',
      summary: summary || null,
      sourceIds: Array.isArray(sourceIds) ? sourceIds.slice() : [],
      measurements: measurements || null,
      bounds: bounds || null
    };
  }

  function boolStatus(value, unresolvedWhenFalse) {
    if (value === true) return 'PASS';
    if (value === false) return unresolvedWhenFalse ? 'UNRESOLVED' : 'FAIL';
    return 'UNRESOLVED';
  }

  function mergeProvenance() {
    const out = [];
    const seen = new Set();
    Array.prototype.slice.call(arguments).forEach((list) => {
      (Array.isArray(list) ? list : []).forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const normalized = {
          sourceId: String(item.sourceId || item.source || 'UNRESOLVED'),
          status: String(item.status || 'UNRESOLVED'),
          scope: String(item.scope || item.notes || 'Source-specific evidence'),
          revision: item.revision || null,
          epoch: item.epoch || null
        };
        const key = [normalized.sourceId, normalized.status, normalized.scope, normalized.revision, normalized.epoch].join('|');
        if (!seen.has(key)) { seen.add(key); out.push(normalized); }
      });
    });
    return out;
  }

  function mapArnock(context) {
    if (!arnockRuntime || typeof arnockRuntime.resolveArnockServicePacket !== 'function') {
      return { adapterStatus: 'UNRESOLVED', packet: context.arnockServicePacket || {}, evidence: {}, provenance: [] };
    }
    const packet = context.arnockServicePacket || arnockRuntime.resolveArnockServicePacket(context.arnock || context);
    const a = packet.acceptance || {};
    const t = packet.transitRecertification || {};
    const c = packet.calibration || {};
    const iface = packet.interfaces || {};
    const tools = Array.isArray(packet.tools) ? packet.tools : [];
    const requiredTools = tools.filter((x) => x && x.required).map((x) => x.class);
    const e = {
      IDENTITY: evidence(packet.systemIdentity && packet.systemIdentity.status === 'UNRESOLVED' ? 'UNRESOLVED' : 'PASS', 'Ar\'nock system/module identity and solid-state modular ancestry.', ['blacklight.arnock.maintenance-fabrication'], packet.systemIdentity || null),
      INTERFACE: evidence(Object.values(iface).some((x) => x !== null) ? 'PASS' : 'UNRESOLVED', 'Mechanical, power, data/control, thermal, fluid, and reference interfaces remain technology-specific.', ['blacklight.arnock.maintenance-fabrication'], iface),
      STATIC_HEALTH: evidence(boolStatus(a.staticTests, true), 'Static module evidence from the Ar\'nock service packet.', ['blacklight.arnock.maintenance-fabrication'], { staticTests: a.staticTests, requiredTools }),
      DYNAMIC_HEALTH: evidence(boolStatus(a.dynamicTests, true), 'Dynamic/load evidence from the Ar\'nock service packet.', ['blacklight.arnock.maintenance-fabrication'], { dynamicTests: a.dynamicTests }),
      CALIBRATION: evidence(statusOf(c.status), 'Calibration/reference state remains tied to module identity and installation ancestry.', ['blacklight.arnock.maintenance-fabrication'], c),
      TIMING: evidence(boolStatus(a.timingTests, true), 'Timing/protocol evidence. Functional compatibility does not imply certified latency equivalence.', ['blacklight.arnock.maintenance-fabrication'], { timingTests: a.timingTests, timingImpactSeconds: t.timingImpactSeconds }),
      POWER_RESERVE: evidence((t.affectedDomains || []).includes('sectional power or cooling') ? 'UNRESOLVED' : 'UNRESOLVED', 'Ar\'nock service packet identifies affected domains but protected energy/peak-power bounds must be supplied independently.', ['blacklight.ftl.maintenance-evidence-integration']),
      THERMAL_RESERVE: evidence(boolStatus(a.thermalSoak, true), 'Thermal soak is necessary evidence but does not by itself establish whole-installation thermal reserve.', ['blacklight.arnock.maintenance-fabrication'], { thermalSoak: a.thermalSoak }),
      SECTIONAL_TOPOLOGY: evidence((t.affectedDomains || []).length ? 'UNRESOLVED' : 'UNRESOLVED', 'Sectional reachability/latency requires installation topology evidence beyond module acceptance.', ['blacklight.ftl.maintenance-evidence-integration'], { affectedDomains: t.affectedDomains || [] }),
      FAMILY_SPECIFIC: evidence(t.required ? (t.familyStatus === 'RESOLVED' ? 'UNRESOLVED' : 'UNRESOLVED') : 'PASS', t.required ? 'Transit recertification required; family-specific evidence remains separate from machinery repair evidence.' : 'No transit recertification trigger declared.', ['blacklight.arnock.maintenance-fabrication'], { family: t.family || null, familyStatus: t.familyStatus || 'UNRESOLVED' }),
      PROVENANCE: evidence(Array.isArray(packet.provenance) && packet.provenance.length ? 'PASS' : 'UNRESOLVED', 'Ar\'nock service ancestry and calibration provenance.', ['blacklight.arnock.maintenance-fabrication'], packet.provenance || null)
    };
    return { adapterStatus: 'RESOLVED', packet, evidence: e, provenance: packet.provenance || [] };
  }

  function mapMurrek(context) {
    const m = context.murrek || {};
    const src = context.murrekEvidence || m.evidence || {};
    const family = context.family || m.family || null;
    const familyStatus = context.familyStatus || m.familyStatus || (family ? 'RESOLVED' : 'UNRESOLVED');
    const sourceIds = ['data/exo-vessel/zwlei-murrek-transit-engineering-registry.json'];
    const e = {
      IDENTITY: evidence(statusOf(src.identityStatus), 'Named Mur\'rek installation/class identity and service ancestry.', sourceIds, src.identity || null),
      INTERFACE: evidence(statusOf(src.interfaceStatus), 'Vital-fluid, field-vane, sensor, reference, and isolation interfaces.', sourceIds, src.interfaces || null),
      STATIC_HEALTH: evidence(statusOf(src.staticStatus), 'Vane geometry, dielectric condition, fluid isolation, and sensor-ampulla integrity.', sourceIds, src.static || null),
      DYNAMIC_HEALTH: evidence(statusOf(src.dynamicStatus), 'Commanded/observed vane symmetry, hydraulic authority, and navigation-current agreement.', sourceIds, src.dynamic || null),
      CALIBRATION: evidence(statusOf(src.calibrationStatus), 'Gravitic/inertial reference and navigation-current calibration.', sourceIds, src.calibration || null),
      TIMING: evidence(statusOf(src.timingStatus), 'Sensor lookahead, arbitration/command latency, vane response, and abort/isolation timing.', sourceIds, src.timing || null, src.timingBounds || null),
      POWER_RESERVE: evidence(statusOf(src.powerStatus), 'Bio-reactive power-fluid and protected recovery evidence. Stored energy and peak delivery remain distinct.', sourceIds, src.power || null, src.powerBounds || null),
      THERMAL_RESERVE: evidence(statusOf(src.thermalStatus), 'Conductive coolant and complete emergency-sequence heat rejection evidence.', sourceIds, src.thermal || null, src.thermalBounds || null),
      SECTIONAL_TOPOLOGY: evidence(statusOf(src.topologyStatus), 'Fluid, command, reference, sensor, and recovery reachability with latency.', sourceIds, src.topology || null),
      FAMILY_SPECIFIC: evidence(familyStatus === 'RESOLVED' ? statusOf(src.familySpecificStatus) : 'UNRESOLVED', familyStatus === 'RESOLVED' ? 'Family-specific evidence must match independently resolved family authority.' : 'Mur\'rek “gravitic slipstream” wording does not identify a consolidated FTL family.', sourceIds, { family, familyStatus, sourceTerm: murrekRegistry && murrekRegistry.confirmedInstallation ? murrekRegistry.confirmedInstallation.sourceTerm : 'bio-reactive gravitic slipstream system' }),
      PROVENANCE: evidence(Array.isArray(src.provenance) && src.provenance.length ? 'PASS' : 'UNRESOLVED', 'Named-source, measurement, repair/refit, and derivation ancestry.', sourceIds, src.provenance || null)
    };
    return { adapterStatus: 'RESOLVED', packet: src, evidence: e, provenance: src.provenance || [] };
  }

  function overlayEvidence(base, override) {
    const out = Object.assign({}, base || {});
    Object.keys(override || {}).forEach((key) => {
      out[key] = Object.assign({}, out[key] || {}, override[key] || {});
    });
    return out;
  }

  function resolveIntegratedFTLMaintenanceEvidence(context) {
    context = context || {};
    const adapterKey = context.adapter || context.technologyAdapter || 'generic';
    let mapped;
    let technologyBasis;
    let sourceAuthority = null;
    if (adapterKey === 'arnock-solid-state-modular') {
      mapped = mapArnock(context);
      technologyBasis = 'SOLID_STATE_ELECTROMECHANICAL_MODULAR';
      sourceAuthority = 'data/exo-vessel/arnock-maintenance-fabrication-registry.json';
    } else if (adapterKey === 'zwlei-murrek-fluid-vane') {
      mapped = mapMurrek(context);
      technologyBasis = 'ZWLEI_MURREK_FLUID_VANE';
      sourceAuthority = 'data/exo-vessel/zwlei-murrek-transit-engineering-registry.json';
    } else {
      mapped = { adapterStatus: context.technologyBasis ? 'RESOLVED' : 'UNRESOLVED', packet: context.sourceEvidence || {}, evidence: context.evidence || {}, provenance: context.sourceProvenance || [] };
      technologyBasis = context.technologyBasis || 'UNRESOLVED';
    }

    const evidenceInput = overlayEvidence(mapped.evidence, context.evidenceOverrides || context.evidence);
    const family = context.family || null;
    const familyStatus = context.familyStatus || (family ? 'RESOLVED' : 'UNRESOLVED');
    const genericContext = Object.assign({}, context, {
      technologyBasis,
      technologyBasisStatus: mapped.adapterStatus,
      technologyBasisAuthority: sourceAuthority,
      evidence: evidenceInput,
      family,
      familyStatus,
      provenance: mergeProvenance(mapped.provenance, context.provenance, [{
        sourceId: 'blacklight.ftl.maintenance-evidence-integration',
        status: 'DERIVED',
        scope: 'Technology-specific evidence adapter into cross-civilization maintenance certification.',
        revision: '1.0.0',
        epoch: null
      }])
    });

    const resolved = maintenanceRuntime && typeof maintenanceRuntime.resolveFTLMaintenanceEvidence === 'function'
      ? maintenanceRuntime.resolveFTLMaintenanceEvidence(genericContext)
      : { status: 'UNRESOLVED', certification: { disposition: 'UNRESOLVED', reasons: ['GENERIC_MAINTENANCE_RUNTIME_UNAVAILABLE'] } };

    return {
      schemaVersion: '1.0.0',
      status: resolved.status || (resolved.certification && resolved.certification.disposition) || 'UNRESOLVED',
      adapter: { key: adapterKey, technologyBasis, status: mapped.adapterStatus, sourceAuthority },
      sourceEvidence: mapped.packet || {},
      maintenanceEvidence: resolved,
      familyFirewall: {
        family,
        familyStatus,
        inferredFromTechnology: false,
        notes: adapterKey === 'zwlei-murrek-fluid-vane' && familyStatus !== 'RESOLVED'
          ? 'Named-source “gravitic slipstream” terminology is preserved without keyword normalization.'
          : 'Transit family is accepted only from independent family authority.'
      },
      provenance: genericContext.provenance
    };
  }

  return {
    resolveIntegratedFTLMaintenanceEvidence,
    mapArnock,
    mapMurrek,
    registry: registry || null
  };
}));
