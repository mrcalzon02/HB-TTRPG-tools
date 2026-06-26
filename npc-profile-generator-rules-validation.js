(() => {
  'use strict';
  const base = globalThis.NpcProfileRules;
  if (!base) throw new Error('npc-profile-generator-rules-core.js must load before validation.');
  const { object, diag } = base._internals;

  function pointerGet(target, pointer) {
    if (pointer === '' || pointer === '/') return target;
    if (typeof pointer !== 'string' || !pointer.startsWith('/')) return undefined;
    return pointer.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~')).reduce((value, key) => value == null ? undefined : value[key], target);
  }

  function evaluateCondition(target, condition) {
    const actual = pointerGet(target, condition.path);
    switch (condition.operator) {
      case 'equals': return actual === condition.value;
      case 'not-equals': return actual !== condition.value;
      case 'in': return Array.isArray(condition.value) && condition.value.includes(actual);
      case 'not-in': return Array.isArray(condition.value) && !condition.value.includes(actual);
      case 'present': return actual !== undefined && actual !== null && actual !== '';
      case 'absent': return actual === undefined || actual === null || actual === '';
      case 'state-is': return actual === condition.value;
      case 'greater-than': return Number(actual) > Number(condition.value);
      case 'less-than': return Number(actual) < Number(condition.value);
      default: return false;
    }
  }

  function evaluateValidationRules(archetype, profile) {
    const diagnostics = [];
    for (const rule of archetype?.validationRules || []) {
      if (rule.when?.length && !rule.when.every(condition => evaluateCondition(profile, condition))) continue;
      if (!(rule.assert || []).every(condition => evaluateCondition(profile, condition))) {
        diagnostics.push(diag(
          rule.id?.toUpperCase().replace(/-/g, '_') || 'ARCHETYPE_RULE_FAILED',
          rule.severity || 'error',
          rule.message || `Rule ${rule.id} failed.`,
          rule.path || '/',
          { ruleId: rule.id }
        ));
      }
    }
    return diagnostics;
  }

  function section(profile, id) {
    return id === 'identity' ? profile?.identity : profile?.sections?.[id];
  }

  function validateProfileAgainstArchetype(profile, archetype) {
    const diagnostics = [...base.resolveApplicability(archetype, { roll: 99 }).diagnostics];
    for (const [id, policy] of Object.entries(archetype?.sectionPolicies || {})) {
      const actual = section(profile, id);
      const state = id === 'identity' ? (object(actual) ? 'present' : 'none') : actual?.state;
      const at = id === 'identity' ? '/identity' : `/sections/${id}`;
      if (policy.policy === 'required' && state !== 'present') diagnostics.push(diag('PROFILE_REQUIRED_SECTION_MISSING', 'error', `${id} is required for ${archetype.id}.`, at));
      if (policy.policy === 'derived' && state !== 'present') diagnostics.push(diag('PROFILE_DERIVED_SECTION_MISSING', 'error', `${id} must be present as derived data.`, at));
      if (policy.policy === 'prohibited' && state === 'present') diagnostics.push(diag('PROFILE_PROHIBITED_SECTION_PRESENT', 'error', `${id} is prohibited for ${archetype.id}.`, at));
      if (policy.policy === 'not-applicable' && state === 'present') diagnostics.push(diag('PROFILE_NOT_APPLICABLE_SECTION_PRESENT', 'error', `${id} is not applicable to ${archetype.id}.`, at));

      if (state === 'present' && object(actual?.data)) {
        for (const field of policy.requiredFields || []) {
          if (actual.data[field] === undefined || actual.data[field] === null || actual.data[field] === '') diagnostics.push(diag('PROFILE_REQUIRED_FIELD_MISSING', 'error', `${id}.${field} is required.`, `${at}/data/${field}`));
        }
        for (const field of policy.prohibitedFields || []) {
          if (actual.data[field] !== undefined && actual.data[field] !== null && actual.data[field] !== '') diagnostics.push(diag('PROFILE_PROHIBITED_FIELD_PRESENT', 'error', `${id}.${field} is prohibited.`, `${at}/data/${field}`));
        }
      }

      if (policy.policy === 'substitute') {
        if (state !== 'not-applicable' || actual?.substituteSection !== policy.substituteSection) diagnostics.push(diag('PROFILE_SUBSTITUTION_MISSING', 'error', `${id} must point to ${policy.substituteSection}.`, at));
        if (profile?.sections?.extensions?.[policy.substituteSection]?.state !== 'present') diagnostics.push(diag('PROFILE_SUBSTITUTE_SECTION_MISSING', 'error', `${policy.substituteSection} must be present.`, `/sections/extensions/${policy.substituteSection}`));
      }
    }
    diagnostics.push(...evaluateValidationRules(archetype, profile));
    return { diagnostics, valid: !diagnostics.some(item => item.severity === 'error') };
  }

  globalThis.NpcProfileRules = Object.freeze({
    ...base,
    pointerGet,
    evaluateCondition,
    evaluateValidationRules,
    validateProfileAgainstArchetype
  });
})();
