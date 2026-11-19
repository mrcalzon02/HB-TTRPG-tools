(function installHBFoundrySkillContextLoader(root) {
  'use strict';

  const INSTALL_BASE_URL = (() => {
    if (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) {
      return new URL('./', document.currentScript.src).href;
    }
    if (typeof location !== 'undefined' && location.href) return new URL('./', location.href).href;
    return null;
  })();
  const RESOURCE_CACHE = new Map();
  const REGISTRY_CACHE = new Map();
  const ENGRAM_CACHE = new Map();

  function currentBaseUrl() {
    if (INSTALL_BASE_URL) return INSTALL_BASE_URL;
    if (typeof location !== 'undefined' && location.href) return new URL('./', location.href).href;
    throw new Error('A browser URL context or explicit baseUrl is required.');
  }

  function normalizeBaseUrl(value) {
    const url = new URL(value || currentBaseUrl());
    if (!/^https?:$/.test(url.protocol)) throw new Error('The skill context loader requires an http(s) static origin.');
    if (!url.pathname.endsWith('/')) url.pathname = `${url.pathname}/`;
    url.search = '';
    url.hash = '';
    return url;
  }

  function resolveFirstPartyUrl(path, baseUrl) {
    const base = normalizeBaseUrl(baseUrl);
    const resolved = new URL(String(path || ''), base);
    if (resolved.origin !== base.origin) throw new Error(`Cross-origin resource rejected: ${resolved.href}`);
    if (!resolved.pathname.startsWith(base.pathname)) throw new Error(`Resource escaped the Foundry base path: ${resolved.pathname}`);
    return resolved;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
    return value;
  }

  async function fetchResource(path, baseUrl, mode) {
    const url = resolveFirstPartyUrl(path, baseUrl);
    const cacheKey = `${mode}:${url.href}`;
    if (RESOURCE_CACHE.has(cacheKey)) return RESOURCE_CACHE.get(cacheKey);
    const request = fetch(url.href, { credentials: 'same-origin', cache: 'no-cache' }).then(async response => {
      if (!response.ok) throw new Error(`Failed to fetch ${url.pathname}: HTTP ${response.status}.`);
      const value = mode === 'json' ? await response.json() : await response.text();
      return mode === 'json' ? deepFreeze(value) : value;
    });
    RESOURCE_CACHE.set(cacheKey, request);
    try {
      return await request;
    } catch (error) {
      RESOURCE_CACHE.delete(cacheKey);
      throw error;
    }
  }

  function clearCache() {
    const cleared = RESOURCE_CACHE.size + REGISTRY_CACHE.size + ENGRAM_CACHE.size;
    RESOURCE_CACHE.clear();
    REGISTRY_CACHE.clear();
    ENGRAM_CACHE.clear();
    return cleared;
  }

  const ENGRAM_PATH = 'docs/blacklight/charles-personality-engram.json';
  const REGISTRY_PATH = 'skills/index.json';
  const ENGRAM_ID = 'blacklight.charles';

  function findSkill(index, skillName) {
    const skills = Array.isArray(index && index.skills) ? index.skills : [];
    const skill = skills.find(item => item && item.name === skillName);
    if (!skill) throw new Error('Skill is not registered in skills/index.json: ' + skillName);
    if (skill.path !== 'skills/' + skillName + '/SKILL.md') {
      throw new Error('Registered skill path does not match its authoritative skill name: ' + skillName);
    }
    if (skill.personalityPolicy !== 'inherit-default' ||
        !Array.isArray(skill.personalityEngramIds) ||
        !skill.personalityEngramIds.includes(ENGRAM_ID)) {
      throw new Error('Skill does not declare the required Charles personality companion: ' + skillName);
    }
    return skill;
  }

  function validatePersonalityBinding(index) {
    const binding = index && index.defaultPersonality;
    if (!binding || binding.engramId !== ENGRAM_ID ||
        binding.authorityPath !== ENGRAM_PATH ||
        binding.personalityVersion !== 'CE1.1' ||
        binding.binding !== 'inherited' ||
        binding.scope !== 'all-registered-skills' ||
        binding.loadPolicy !== 'load-once-before-selected-skills' ||
        binding.required !== true ||
        binding.reciprocalRegistryPath !== REGISTRY_PATH ||
        binding.missingCompanionPolicy !== 'fail-closed-before-skill-activation' ||
        binding.optionalSkillDiscovery !== true ||
        binding.integrity?.algorithm !== 'sha256' ||
        !/^[a-f0-9]{64}$/.test(binding.integrity.digest)) {
      throw new Error('The Agent Skills registry has no valid mandatory reciprocal Charles engram binding.');
    }
    return binding;
  }

  async function sha256(value) {
    const subtle = root.crypto && root.crypto.subtle;
    const Encoder = root.TextEncoder;
    if (!subtle || typeof Encoder !== 'function') {
      throw new Error('Cannot verify Charles engram integrity: host SHA-256 verification is unavailable.');
    }
    const digest = await subtle.digest('SHA-256', new Encoder().encode(value));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function validateTrustedPin(value, label) {
    if (value == null) return null;
    if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
      throw new Error(label + ' must be an externally trusted lowercase SHA-256 hex digest.');
    }
    return value;
  }

  async function loadRegistry(baseUrl, options = {}) {
    const pinned = validateTrustedPin(options.expectedRegistrySha256, 'expectedRegistrySha256');
    const key = baseUrl.href;
    if (!REGISTRY_CACHE.has(key)) {
      const promise = (async () => {
        const raw = await fetchResource(REGISTRY_PATH, baseUrl, 'text');
        const digest = await sha256(raw);
        let index;
        try { index = JSON.parse(raw); }
        catch (error) { throw new Error('Skill registry is not valid JSON: ' + error.message); }
        validatePersonalityBinding(index);
        return Object.freeze({ index: deepFreeze(index), digest });
      })();
      REGISTRY_CACHE.set(key, promise);
      promise.catch(() => { if (REGISTRY_CACHE.get(key) === promise) REGISTRY_CACHE.delete(key); });
    }
    const result = await REGISTRY_CACHE.get(key);
    if (pinned !== null && pinned !== result.digest) {
      throw new Error('Skill registry SHA-256 differs from externally trusted pin; refusing skill activation.');
    }
    return result;
  }

  async function loadMandatoryEngram(index, baseUrl, options = {}) {
    const binding = validatePersonalityBinding(index);
    const pinned = validateTrustedPin(options.expectedEngramSha256, 'expectedEngramSha256');
    if (pinned !== null && pinned !== binding.integrity.digest) {
      throw new Error('Registry engram SHA-256 differs from externally trusted pin; refusing skill activation.');
    }
    const key = baseUrl.href + ':' + binding.integrity.digest;
    if (!ENGRAM_CACHE.has(key)) {
      const promise = resolveMandatoryEngram(binding, baseUrl);
      ENGRAM_CACHE.set(key, promise);
      promise.catch(() => { if (ENGRAM_CACHE.get(key) === promise) ENGRAM_CACHE.delete(key); });
    }
    return ENGRAM_CACHE.get(key);
  }

  async function resolveMandatoryEngram(binding, baseUrl) {
    const raw = await fetchResource(ENGRAM_PATH, baseUrl, 'text');
    const actualHash = await sha256(raw);
    if (actualHash !== binding.integrity.digest) {
      throw new Error('Charles engram SHA-256 mismatch; refusing skill activation.');
    }
    let personality;
    try {
      personality = JSON.parse(raw);
    } catch (error) {
      throw new Error('Charles engram is not valid JSON: ' + error.message);
    }
    const link = personality.skill_registry;
    if (personality.engram_id !== ENGRAM_ID ||
        personality.personality_version !== binding.personalityVersion ||
        personality.kind !== 'personality_engram' ||
        personality.passive !== true ||
        !link || link.registry_path !== REGISTRY_PATH ||
        link.binding !== 'bidirectional-required' ||
        link.index_load !== 'mandatory-before-skill-selection' ||
        link.skill_selection !== 'optional-on-demand' ||
        link.missing_or_invalid !== 'fail-closed-for-skill-activation' ||
        link.tool_authority !== 'host-controlled' ||
        personality.capability_boundary?.grants_tools !== false ||
        personality.instruction_boundary?.host_and_system_policy_overrides_engram !== true) {
      throw new Error('Charles engram does not satisfy the reciprocal registry and authority contract.');
    }
    return { personality: deepFreeze(personality), binding: deepFreeze(binding) };
  }

  function validatePortableSkillDocument(skill, skillText) {
    const end = skillText.indexOf('\n---\n', 4);
    if (!skillText.startsWith('---\n') || end < 0) {
      throw new Error('Missing required skill frontmatter: ' + skill.name);
    }
    const frontmatter = skillText.slice(4, end);
    if (!/^  required-personality-engram: blacklight\.charles\s*$/m.test(frontmatter) ||
        !/^  required-skill-index: skills\/index\.json\s*$/m.test(frontmatter)) {
      throw new Error('Skill lacks mandatory reciprocal companion metadata: ' + skill.name);
    }
  }

  async function discover(options = {}) {
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    const registry = await loadRegistry(baseUrl, options);
    const index = registry.index;
    const verified = await loadMandatoryEngram(index, baseUrl, options);
    return Object.freeze({
      personality: verified.personality,
      personalityBinding: verified.binding,
      registrySha256: registry.digest,
      engramSha256: verified.binding.integrity.digest,
      externalTrustPinned: options.expectedRegistrySha256 != null && options.expectedEngramSha256 != null,
      skills: Array.isArray(index.skills) ? index.skills : [],
      skillSelection: 'optional-on-demand',
      rule: 'Registry and engram are required companions. Skills are optional selections; none grants host permissions.'
    });
  }

  async function load(skillName, options = {}) {
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    const registry = await loadRegistry(baseUrl, options);
    const index = registry.index;
    const verified = await loadMandatoryEngram(index, baseUrl, options);
    const skill = findSkill(index, skillName);
    const skillText = await fetchResource(skill.path, baseUrl, 'text');
    validatePortableSkillDocument(skill, skillText);
    return Object.freeze({
      skillName,
      skill,
      skillIndex: index,
      skillText,
      personalityEngramId: verified.binding.engramId,
      personalityBinding: verified.binding,
      personality: verified.personality,
      registrySha256: registry.digest,
      engramSha256: verified.binding.integrity.digest,
      externalTrustPinned: options.expectedRegistrySha256 != null && options.expectedEngramSha256 != null,
      rule: 'Apply the canonical Charles personality beneath host policy. The selected skill supplies workflow, not permissions.'
    });
  }

  async function loadMany(skillNames, options = {}) {
    const names = Array.from(new Set((Array.isArray(skillNames) ? skillNames : [skillNames]).map(String).filter(Boolean)));
    if (!names.length) throw new Error('At least one registered skill name is required.');
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    const registry = await loadRegistry(baseUrl, options);
    const index = registry.index;
    const verified = await loadMandatoryEngram(index, baseUrl, options);
    const skills = names.map(name => findSkill(index, name));
    const skillTexts = await Promise.all(skills.map(skill => fetchResource(skill.path, baseUrl, 'text')));
    skills.forEach((skill, position) => validatePortableSkillDocument(skill, skillTexts[position]));
    return Object.freeze({
      skillNames: names,
      skillIndex: index,
      skills: skills.map((skill, position) => Object.freeze({ skill, skillText: skillTexts[position] })),
      personalityEngramId: verified.binding.engramId,
      personalityBinding: verified.binding,
      personality: verified.personality,
      registrySha256: registry.digest,
      engramSha256: verified.binding.integrity.digest,
      externalTrustPinned: options.expectedRegistrySha256 != null && options.expectedEngramSha256 != null,
      rule: 'Verify one required Charles engram and the registry before applying optionally selected skills.'
    });
  }

  root.HBFoundrySkillContextLoader = Object.freeze({
    discover,
    load,
    loadMany,
    clearCache,
    resolveFirstPartyUrl
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
