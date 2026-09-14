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

  async function fetchResource(path, baseUrl, mode) {
    const url = resolveFirstPartyUrl(path, baseUrl);
    const cacheKey = `${mode}:${url.href}`;
    if (RESOURCE_CACHE.has(cacheKey)) return RESOURCE_CACHE.get(cacheKey);
    const request = fetch(url.href, { credentials: 'same-origin', cache: 'no-cache' }).then(response => {
      if (!response.ok) throw new Error(`Failed to fetch ${url.pathname}: HTTP ${response.status}.`);
      return mode === 'json' ? response.json() : response.text();
    });
    RESOURCE_CACHE.set(cacheKey, request);
    try {
      return await request;
    } catch (error) {
      RESOURCE_CACHE.delete(cacheKey);
      throw error;
    }
  }

  function findSkill(index, skillName) {
    const skills = Array.isArray(index && index.skills) ? index.skills : [];
    const skill = skills.find(item => item && item.name === skillName);
    if (!skill) throw new Error(`Skill is not registered in skills/index.json: ${skillName}`);
    const expectedPath = `skills/${skillName}/SKILL.md`;
    if (skill.path !== expectedPath) {
      throw new Error(`Registered skill path does not match its authoritative skill name: ${skillName}`);
    }
    return skill;
  }

  function validatePersonalityBinding(index) {
    const binding = index && index.defaultPersonality;
    if (
      !binding ||
      binding.engramId !== 'blacklight.charles' ||
      typeof binding.authorityPath !== 'string' ||
      !binding.authorityPath ||
      binding.binding !== 'inherited' ||
      binding.scope !== 'all-registered-skills' ||
      binding.loadPolicy !== 'load-once-before-selected-skills'
    ) {
      throw new Error('The Agent Skills registry does not expose the canonical blacklight.charles defaultPersonality binding.');
    }
    return binding;
  }

  async function load(skillName, options = {}) {
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    const index = await fetchResource('skills/index.json', baseUrl, 'json');
    const skill = findSkill(index, skillName);
    const personalityBinding = validatePersonalityBinding(index);
    const [personality, skillText] = await Promise.all([
      fetchResource(personalityBinding.authorityPath, baseUrl, 'json'),
      fetchResource(skill.path, baseUrl, 'text')
    ]);
    if (personality.engram_id !== personalityBinding.engramId) {
      throw new Error(`Loaded personality engram id does not match registry binding: ${personality.engram_id}`);
    }
    return Object.freeze({
      skillName,
      skill,
      skillText,
      personalityEngramId: personalityBinding.engramId,
      personalityBinding,
      personality,
      rule: 'Apply the canonical Charles personality as the conversational layer while using the selected skill as task procedure. Personality does not grant capability execution.'
    });
  }

  async function loadMany(skillNames, options = {}) {
    const names = Array.from(new Set((Array.isArray(skillNames) ? skillNames : [skillNames]).map(String).filter(Boolean)));
    if (!names.length) throw new Error('At least one registered skill name is required.');
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    const index = await fetchResource('skills/index.json', baseUrl, 'json');
    const skills = names.map(name => findSkill(index, name));
    const personalityBinding = validatePersonalityBinding(index);
    const personality = await fetchResource(personalityBinding.authorityPath, baseUrl, 'json');
    if (personality.engram_id !== personalityBinding.engramId) {
      throw new Error(`Loaded personality engram id does not match registry binding: ${personality.engram_id}`);
    }
    const skillTexts = await Promise.all(skills.map(skill => fetchResource(skill.path, baseUrl, 'text')));
    return Object.freeze({
      skillNames: names,
      skills: skills.map((skill, index) => Object.freeze({ skill, skillText: skillTexts[index] })),
      personalityEngramId: personalityBinding.engramId,
      personalityBinding,
      personality,
      rule: 'Load Charles once, then apply all selected skills beneath the same conversational personality layer.'
    });
  }

  root.HBFoundrySkillContextLoader = Object.freeze({
    load,
    loadMany,
    resolveFirstPartyUrl
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
