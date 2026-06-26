(() => {
  'use strict';
  const POLICY_TYPES = ['required','optional','weighted-none','unknown-allowed','substitute','derived','prohibited','not-applicable'];
  const SECTION_STATES = ['present','none','unknown','not-applicable'];
  const policies = new Set(POLICY_TYPES);
  const states = new Set(SECTION_STATES);
  const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const diag = (code, severity, message, path = '/', extra = {}) => ({ code, severity, message, path, ...extra });
  const unique = (...groups) => [...new Set(groups.flatMap(group => group || []))];

  function mergeById(parent = [], child = [], mergeItem = (a, b) => ({ ...a, ...b })) {
    const result = new Map((parent || []).map(item => [item.id, clone(item)]));
    for (const item of child || []) result.set(item.id, result.has(item.id) ? mergeItem(result.get(item.id), clone(item)) : clone(item));
    return [...result.values()];
  }

  function mergeArchetypes(parent = {}, child = {}) {
    const sectionPolicies = clone(parent.sectionPolicies) || {};
    for (const [id, policy] of Object.entries(child.sectionPolicies || {})) sectionPolicies[id] = { ...(sectionPolicies[id] || {}), ...clone(policy) };
    const specializedSections = mergeById(parent.specializedSections, child.specializedSections, (a, b) => ({
      ...a, ...b, fields: mergeById(a.fields, b.fields)
    }));
    return {
      ...clone(parent), ...clone(child),
      parentId: child.parentId ?? parent.parentId ?? null,
      tags: unique(parent.tags, child.tags),
      generationDefaults: { ...(clone(parent.generationDefaults) || {}), ...(clone(child.generationDefaults) || {}) },
      sectionPolicies,
      specializedSections,
      validationRules: mergeById(parent.validationRules, child.validationRules),
      inheritanceChain: unique(parent.inheritanceChain, parent.id ? [parent.id] : [], child.id ? [child.id] : [])
    };
  }

  function indexArchetypes(records = []) {
    const index = new Map();
    const diagnostics = [];
    for (const record of records) {
      if (!object(record) || !record.id) {
        diagnostics.push(diag('ARCHETYPE_RECORD_INVALID','error','Archetype record requires an id.','/archetypes'));
      } else if (index.has(record.id)) {
        diagnostics.push(diag('ARCHETYPE_ID_DUPLICATE','error',`Duplicate archetype ${record.id}.`,`/archetypes/${record.id}`));
      } else index.set(record.id, clone(record));
    }
    return { index, diagnostics };
  }

  function validatePolicy(sectionId, policy, specializedIds = new Set()) {
    const out = [];
    const at = `/sectionPolicies/${sectionId}`;
    if (!object(policy) || !policies.has(policy.policy)) return [diag('POLICY_TYPE_INVALID','error',`Invalid policy for ${sectionId}.`,`${at}/policy`)];
    if (policy.policy === 'weighted-none' && (!Number.isInteger(policy.noneWeight) || policy.noneWeight < 0 || policy.noneWeight > 100)) {
      out.push(diag('POLICY_NONE_WEIGHT_INVALID','error',`${sectionId} noneWeight must be 0-100.`,`${at}/noneWeight`));
    }
    if (policy.policy === 'unknown-allowed' && policy.unknownWeight !== undefined && (!Number.isInteger(policy.unknownWeight) || policy.unknownWeight < 0 || policy.unknownWeight > 100)) {
      out.push(diag('POLICY_UNKNOWN_WEIGHT_INVALID','error',`${sectionId} unknownWeight must be 0-100.`,`${at}/unknownWeight`));
    }
    if (policy.policy === 'substitute') {
      if (!policy.substituteSection) out.push(diag('POLICY_SUBSTITUTE_MISSING','error',`${sectionId} needs substituteSection.`,`${at}/substituteSection`));
      else if (!specializedIds.has(policy.substituteSection)) out.push(diag('POLICY_SUBSTITUTE_UNKNOWN','error',`Unknown substitute ${policy.substituteSection}.`,`${at}/substituteSection`));
    }
    if (['prohibited','not-applicable'].includes(policy.policy) && !policy.reason) out.push(diag('POLICY_REASON_MISSING','error',`${sectionId} needs a reason.`,`${at}/reason`));
    return out;
  }

  function validateArchetype(archetype) {
    if (!object(archetype)) return [diag('ARCHETYPE_INVALID','error','Archetype must be an object.')];
    const out = [];
    if (!archetype.id) out.push(diag('ARCHETYPE_ID_MISSING','error','Archetype id is required.','/id'));
    if (!object(archetype.sectionPolicies)) return [...out, diag('ARCHETYPE_POLICIES_MISSING','error','sectionPolicies must be an object.','/sectionPolicies')];
    const specialized = new Set((archetype.specializedSections || []).map(section => section.id));
    for (const [id, policy] of Object.entries(archetype.sectionPolicies)) out.push(...validatePolicy(id, policy, specialized));
    return out;
  }

  function resolveArchetype(id, records) {
    const indexed = records instanceof Map ? { index: records, diagnostics: [] } : indexArchetypes(records);
    const { index, diagnostics } = indexed;
    const cache = new Map();
    const visiting = [];
    function visit(current) {
      if (cache.has(current)) return cache.get(current);
      const cycleAt = visiting.indexOf(current);
      if (cycleAt >= 0) {
        const cycle = [...visiting.slice(cycleAt), current];
        diagnostics.push(diag('ARCHETYPE_INHERITANCE_CYCLE','error',`Inheritance cycle: ${cycle.join(' -> ')}.`,`/archetypes/${current}/parentId`,{cycle}));
        return null;
      }
      const record = index.get(current);
      if (!record) {
        diagnostics.push(diag('ARCHETYPE_NOT_FOUND','error',`Archetype ${current} not found.`,`/archetypes/${current}`));
        return null;
      }
      visiting.push(current);
      let resolved = clone(record);
      if (record.parentId) {
        if (!index.has(record.parentId)) diagnostics.push(diag('ARCHETYPE_PARENT_MISSING','error',`Missing parent ${record.parentId}.`,`/archetypes/${current}/parentId`));
        else {
          const parent = visit(record.parentId);
          if (parent) resolved = mergeArchetypes(parent, record);
        }
      } else resolved.inheritanceChain = [record.id];
      visiting.pop();
      diagnostics.push(...validateArchetype(resolved).map(item => ({...item, archetypeId: current})));
      cache.set(current, resolved);
      return resolved;
    }
    const archetype = visit(id);
    return { archetype, diagnostics, index, valid: Boolean(archetype) && !diagnostics.some(item => item.severity === 'error') };
  }

  function rollValue(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 50;
    if (number >= 0 && number <= 1) return Math.floor(number * 100);
    return Math.max(0, Math.min(99, Math.floor(number)));
  }

  function resolvePolicyState(sectionId, policy, options = {}) {
    const roll = rollValue(options.roll);
    if (states.has(options.explicitState)) return { sectionId, state: options.explicitState, policy: policy.policy, roll, explicit: true };
    const base = { sectionId, policy: policy.policy, roll };
    switch (policy.policy) {
      case 'required': return { ...base, state: 'present' };
      case 'optional': return { ...base, state: states.has(options.optionalState) ? options.optionalState : 'present' };
      case 'weighted-none': return { ...base, state: roll < Number(policy.noneWeight || 0) ? 'none' : 'present', noneWeight: Number(policy.noneWeight || 0) };
      case 'unknown-allowed': {
        const unknownWeight = Number(policy.unknownWeight ?? 25);
        return { ...base, state: roll < unknownWeight ? 'unknown' : 'present', unknownWeight };
      }
      case 'substitute': return { ...base, state: 'not-applicable', reason: policy.reason || `Use ${policy.substituteSection}.`, substituteSection: policy.substituteSection };
      case 'derived': return { ...base, state: 'present', derived: true };
      case 'prohibited': return { ...base, state: 'not-applicable', prohibited: true, reason: policy.reason };
      case 'not-applicable': return { ...base, state: 'not-applicable', reason: policy.reason };
      default: return { ...base, state: 'unknown', invalidPolicy: true };
    }
  }

  function resolveApplicability(archetype, options = {}) {
    const diagnostics = validateArchetype(archetype);
    const sections = {};
    const specialized = new Set((archetype?.specializedSections || []).map(section => section.id));
    for (const [id, policy] of Object.entries(archetype?.sectionPolicies || {})) {
      const source = options.rollForSection;
      const roll = typeof source === 'function' ? source(id, policy) : object(source) && source[id] !== undefined ? source[id] : options.roll;
      const result = resolvePolicyState(id, policy, { roll, explicitState: options.explicitStates?.[id], optionalState: options.optionalStates?.[id] });
      if (Array.isArray(policy.requiredFields)) result.requiredFields = [...policy.requiredFields];
      if (Array.isArray(policy.prohibitedFields)) result.prohibitedFields = [...policy.prohibitedFields];
      sections[id] = result;
      if (result.substituteSection && !specialized.has(result.substituteSection)) diagnostics.push(diag('APPLICABILITY_SUBSTITUTE_UNAVAILABLE','error',`Substitute ${result.substituteSection} is unavailable.`,`/sectionPolicies/${id}/substituteSection`));
    }
    return { archetypeId: archetype?.id || null, sections, specializedSections: clone(archetype?.specializedSections || []), diagnostics, valid: !diagnostics.some(item => item.severity === 'error') };
  }

  globalThis.NpcProfileRules = {
    ENGINE_ID: 'universal-npc-applicability-engine',
    VERSION: '0.1.0',
    POLICY_TYPES: Object.freeze(POLICY_TYPES),
    SECTION_STATES: Object.freeze(SECTION_STATES),
    indexArchetypes, mergeArchetypes, validatePolicy, validateArchetype,
    resolveArchetype, resolvePolicyState, resolveApplicability,
    _internals: { object, clone, diag }
  };
})();
