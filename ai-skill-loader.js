(function installHBFoundrySkillLoader(root) {
  'use strict';

  const STATUS = Object.freeze({
    DISCOVERABLE: 'discoverable',
    ONBOARDABLE: 'onboardable',
    RUNTIME_REQUIRED: 'runtime-required',
    RUNTIME_COMPATIBLE: 'runtime-compatible',
    SELF_TEST_PASSED: 'self-test-passed',
    READY: 'ready',
    INCOMPATIBLE: 'incompatible'
  });

  const INSTALL_BASE_URL = (() => {
    if (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) {
      return new URL('./', document.currentScript.src).href;
    }
    if (typeof location !== 'undefined' && location.href) return new URL('./', location.href).href;
    return null;
  })();

  function currentBaseUrl() {
    if (INSTALL_BASE_URL) return INSTALL_BASE_URL;
    if (typeof location !== 'undefined' && location.href) return new URL('./', location.href).href;
    throw new Error('A browser URL context or explicit baseUrl is required.');
  }

  function normalizeBaseUrl(value) {
    const url = new URL(value || currentBaseUrl());
    if (!/^https?:$/.test(url.protocol)) throw new Error('The skill loader requires an http(s) static origin.');
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

  async function fetchJson(path, baseUrl) {
    const url = resolveFirstPartyUrl(path, baseUrl);
    const response = await fetch(url.href, { credentials: 'same-origin', cache: 'no-cache' });
    if (!response.ok) throw new Error(`Failed to fetch ${url.pathname}: HTTP ${response.status}.`);
    return response.json();
  }

  function findSkill(index, skillName) {
    const skills = Array.isArray(index && index.skills) ? index.skills : [];
    const skill = skills.find(item => item && item.name === skillName);
    if (!skill) throw new Error(`Skill is not registered in skills/index.json: ${skillName}`);
    return skill;
  }

  function findCapability(registry, capabilityId) {
    const capabilities = Array.isArray(registry && registry.capabilities) ? registry.capabilities : [];
    const capability = capabilities.find(item => item && item.id === capabilityId);
    if (!capability) throw new Error(`Capability is not registered in api/foundry-capabilities.json: ${capabilityId}`);
    return capability;
  }

  function manifestPathForSkill(skill) {
    if (skill.manifestPath) return skill.manifestPath;
    const skillPath = String(skill.path || '');
    const slash = skillPath.lastIndexOf('/');
    if (slash < 0) throw new Error(`Registered skill path cannot resolve a companion manifest: ${skillPath}`);
    return `${skillPath.slice(0, slash)}/manifest.json`;
  }

  function sameStringArray(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => String(value) === String(right[index]));
  }

  function packageRuntimeScripts(manifest) {
    const declared = Array.isArray(manifest.runtime?.scripts)
      ? manifest.runtime.scripts.map(String).filter(Boolean)
      : [];
    if (declared.length) return declared;
    const legacy = String(manifest.runtime?.authoritativePath || '');
    return legacy ? [legacy] : [];
  }

  function validatePackage(skill, manifest, capability, contracts) {
    if (!manifest || manifest.packageType !== 'hb-agent-skill-companion') throw new Error('Skill companion manifest type is missing or unsupported.');
    if (manifest.skill?.name !== skill.name) throw new Error('Skill companion manifest name does not match the registered Agent Skill.');
    const capabilityId = manifest.skill?.capabilityId;
    if (!capabilityId || !Array.isArray(skill.capabilityIds) || !skill.capabilityIds.includes(capabilityId)) {
      throw new Error('Skill companion capability is not declared by the registered Agent Skill.');
    }
    if (capability.id !== capabilityId) throw new Error('Resolved capability does not match the companion manifest.');
    if (manifest.runtime?.crossOriginCodeAllowed !== false || manifest.runtime?.sameOriginOnly !== true) {
      throw new Error('Portable executable skills must explicitly forbid cross-origin runtime loading.');
    }

    const runtimePaths = packageRuntimeScripts(manifest);
    const capabilityScripts = Array.isArray(capability.runtime?.scripts) ? capability.runtime.scripts.map(String) : [];
    if (!runtimePaths.length) throw new Error('Companion manifest does not declare a runtime script set.');
    if (!sameStringArray(runtimePaths, capabilityScripts)) {
      throw new Error('Companion runtime scripts must exactly match the canonical capability runtime script order.');
    }

    const authoritativePath = String(manifest.runtime?.authoritativePath || runtimePaths[runtimePaths.length - 1] || '');
    if (!runtimePaths.includes(authoritativePath)) throw new Error('Companion authoritative runtime path is not present in its declared runtime script set.');

    const expectedGlobal = String(manifest.runtime?.expectedGlobal || '');
    if (!expectedGlobal || capability.invocation?.global !== expectedGlobal) throw new Error('Companion runtime export does not match the canonical capability invocation global.');
    const contract = contracts?.capabilities?.[capabilityId];
    if (!contract) throw new Error(`Operation contract is missing for ${capabilityId}.`);
    return { capabilityId, runtimePaths, authoritativePath, expectedGlobal, contract };
  }

  function resolveGlobal(path) {
    return String(path || '').split('.').filter(Boolean).reduce((value, key) => value == null ? undefined : value[key], root);
  }

  function scriptAlreadyLoaded(url) {
    if (typeof document === 'undefined') return false;
    return Array.from(document.scripts || []).some(script => script.src === url.href);
  }

  function loadScript(path, baseUrl) {
    if (typeof document === 'undefined') return Promise.reject(new Error('This loader requires a browser DOM to attach declared runtime scripts.'));
    const url = resolveFirstPartyUrl(path, baseUrl);
    if (scriptAlreadyLoaded(url)) return Promise.resolve(url.href);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url.href;
      script.async = false;
      script.dataset.hbSkillRuntime = path;
      script.addEventListener('load', () => resolve(url.href), { once: true });
      script.addEventListener('error', () => reject(new Error(`Failed to load registered runtime: ${url.pathname}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  async function loadRuntime(runtimePaths, expectedGlobal, baseUrl) {
    const loadedScripts = [];
    for (const path of runtimePaths) loadedScripts.push(await loadScript(path, baseUrl));
    const runtime = resolveGlobal(expectedGlobal);
    if (!runtime) throw new Error(`Runtime scripts loaded but expected global was not found: ${expectedGlobal}`);
    return { runtime, loadedScripts };
  }

  function resolveFixtureValue(value, fixtures) {
    if (Array.isArray(value)) return value.map(item => resolveFixtureValue(item, fixtures));
    if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 1 && keys[0] === '$fixture') {
        const name = String(value.$fixture);
        if (!Object.prototype.hasOwnProperty.call(fixtures, name)) throw new Error(`Unknown self-test fixture: ${name}`);
        return fixtures[name];
      }
      const output = {};
      for (const [key, nested] of Object.entries(value)) output[key] = resolveFixtureValue(nested, fixtures);
      return output;
    }
    return value;
  }

  function jsonComparable(value) {
    if (ArrayBuffer.isView(value)) return Array.from(value);
    if (Array.isArray(value)) return value.map(jsonComparable);
    if (value && typeof value === 'object') {
      const output = {};
      for (const [key, nested] of Object.entries(value)) output[key] = jsonComparable(nested);
      return output;
    }
    return value;
  }

  function deepEqual(left, right) {
    return JSON.stringify(jsonComparable(left)) === JSON.stringify(jsonComparable(right));
  }

  function valueAtPath(value, path) {
    const parts = String(path || '').split('.').filter(Boolean);
    let current = value;
    for (const part of parts) {
      if (current == null || !Object.prototype.hasOwnProperty.call(Object(current), part)) return undefined;
      current = current[part];
    }
    return current;
  }

  function assertExpectation(expect, result, thrown, fixtures, repeats) {
    if (expect?.throws === true) {
      if (!thrown) throw new Error('Expected the operation to throw, but it returned normally.');
      if (expect.messageIncludes && !String(thrown.message || thrown).includes(expect.messageIncludes)) {
        throw new Error(`Thrown message did not include expected text: ${expect.messageIncludes}`);
      }
      return;
    }
    if (thrown) throw thrown;
    if (Object.prototype.hasOwnProperty.call(expect || {}, 'equals') && result !== expect.equals) {
      throw new Error('Result did not equal expected scalar value.');
    }
    if (expect?.equalsFixture) {
      const expected = fixtures[expect.equalsFixture];
      if (result !== expected) throw new Error(`Result did not equal fixture ${expect.equalsFixture}.`);
    }
    if (expect?.deepEqualsFixture) {
      const expected = fixtures[expect.deepEqualsFixture];
      if (!deepEqual(result, expected)) throw new Error(`Result did not deep-equal fixture ${expect.deepEqualsFixture}.`);
    }
    if (expect?.pathEquals && typeof expect.pathEquals === 'object') {
      for (const [path, expectedRaw] of Object.entries(expect.pathEquals)) {
        const expected = resolveFixtureValue(expectedRaw, fixtures);
        const actual = valueAtPath(result, path);
        if (!deepEqual(actual, expected)) throw new Error(`Result path ${path} did not equal its expected value.`);
      }
    }
    if (Array.isArray(expect?.pathExists)) {
      for (const path of expect.pathExists) {
        if (valueAtPath(result, path) === undefined) throw new Error(`Expected result path is missing: ${path}`);
      }
    }
    if (expect?.repeatDeepEqual === true && Array.isArray(repeats) && repeats.length > 1) {
      for (let index = 1; index < repeats.length; index += 1) {
        if (!deepEqual(repeats[0], repeats[index])) throw new Error('Repeated deterministic invocation did not return a deep-equal result.');
      }
    }
  }

  function operationFunction(runtime, capability, contract, operation) {
    const invocation = capability.invocation || {};
    if (invocation.type === 'global-dispatch') {
      const allowedOperations = Array.isArray(invocation.allowedOperations) ? invocation.allowedOperations : [];
      if (!allowedOperations.includes(operation)) throw new Error(`Self-test operation is not allow-listed by the capability registry: ${operation}`);
      if (!contract.operations || !Object.prototype.hasOwnProperty.call(contract.operations, operation)) {
        throw new Error(`Self-test operation has no canonical operation contract: ${operation}`);
      }
    } else if (invocation.type === 'global-method') {
      const expectedOperation = String(invocation.method || contract.operation || '');
      if (!expectedOperation || operation !== expectedOperation) {
        throw new Error(`Self-test operation must match the registered global method: ${expectedOperation || '<missing>'}`);
      }
      if (contract.operation && contract.operation !== operation) throw new Error(`Self-test operation disagrees with canonical contract operation: ${contract.operation}`);
    } else {
      throw new Error(`Portable loader does not support invocation type: ${invocation.type || '<missing>'}`);
    }
    const fn = runtime?.[operation];
    if (typeof fn !== 'function') throw new Error(`Canonical runtime does not export declared operation: ${operation}`);
    return fn;
  }

  async function runSelfTests(runtime, capability, contract, selfTest) {
    const tests = Array.isArray(selfTest?.tests) ? selfTest.tests : [];
    if (!tests.length) throw new Error('Self-test document contains no tests.');
    const fixtures = selfTest.fixtures || {};
    const results = [];

    for (const test of tests) {
      const operation = String(test?.operation || '');
      const fn = operationFunction(runtime, capability, contract, operation);
      const args = resolveFixtureValue(Array.isArray(test.args) ? test.args : [], fixtures);
      const repeatCount = Math.max(1, Math.min(5, Number(test.repeat) || 1));
      const repeatedResults = [];
      let thrown = null;
      try {
        for (let index = 0; index < repeatCount; index += 1) repeatedResults.push(await fn(...args));
      } catch (error) {
        thrown = error;
      }
      const result = repeatedResults[0];
      try {
        assertExpectation(test.expect || {}, result, thrown, fixtures, repeatedResults);
        results.push({ id: test.id || operation, operation, repeatCount, passed: true });
      } catch (error) {
        results.push({ id: test.id || operation, operation, repeatCount, passed: false, error: error.message });
      }
    }
    return results;
  }

  function validateSelfTestRuntime(selfTest, resolved) {
    const declaredScripts = Array.isArray(selfTest?.runtimeScripts) ? selfTest.runtimeScripts.map(String) : [];
    if (declaredScripts.length) {
      if (!sameStringArray(declaredScripts, resolved.runtimePaths)) throw new Error('Self-test runtime script set does not match the companion package runtime scripts.');
      return;
    }
    if (selfTest?.runtimePath) {
      if (resolved.runtimePaths.length !== 1 || String(selfTest.runtimePath) !== resolved.runtimePaths[0]) {
        throw new Error('Self-test runtime path does not match the single-script companion runtime.');
      }
    }
  }

  async function inspect(skillName, options = {}) {
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    const [skillIndex, capabilityRegistry, operationContracts] = await Promise.all([
      fetchJson('skills/index.json', baseUrl),
      fetchJson('api/foundry-capabilities.json', baseUrl),
      fetchJson('api/operation-contracts.json', baseUrl)
    ]);
    const skill = findSkill(skillIndex, skillName);
    const manifestPath = manifestPathForSkill(skill);
    const manifest = await fetchJson(manifestPath, baseUrl);
    const capabilityId = manifest.skill?.capabilityId;
    const capability = findCapability(capabilityRegistry, capabilityId);
    const resolved = validatePackage(skill, manifest, capability, operationContracts);
    const selfTestPath = manifest.selfTest?.path || manifest.authorities?.selfTest;
    if (!selfTestPath) throw new Error('Companion manifest does not declare a self-test path.');
    const selfTest = await fetchJson(selfTestPath, baseUrl);
    if (selfTest.capabilityId !== capabilityId) throw new Error('Self-test capability does not match the package capability.');
    validateSelfTestRuntime(selfTest, resolved);
    return { baseUrl: baseUrl.href, skillIndex, operationContracts, skill, manifestPath, manifest, capability, contract: resolved.contract, selfTestPath, selfTest, resolved };
  }

  async function loadAndTest(skillName, options = {}) {
    const report = {
      skill: skillName,
      capabilityId: null,
      statuses: [],
      stages: [],
      tests: [],
      ready: false
    };
    try {
      const inspected = await inspect(skillName, options);
      report.capabilityId = inspected.resolved.capabilityId;
      report.statuses.push(STATUS.DISCOVERABLE, STATUS.ONBOARDABLE);
      report.stages.push({ id: 'discovery', passed: true }, { id: 'manifest-valid', passed: true }, { id: 'contract-resolved', passed: true });
      if (inspected.manifest.runtime?.family !== 'javascript' || inspected.manifest.runtime?.class !== 'browser-js') {
        report.statuses.push(STATUS.INCOMPATIBLE);
        report.stages.push({ id: 'runtime-compatible', passed: false, error: 'Current generic loader supports browser-js packages only.' });
        return report;
      }
      const loaded = await loadRuntime(inspected.resolved.runtimePaths, inspected.resolved.expectedGlobal, inspected.baseUrl);
      report.statuses.push(STATUS.RUNTIME_COMPATIBLE);
      report.stages.push({ id: 'runtime-loaded', passed: true, scripts: inspected.resolved.runtimePaths.slice() });
      report.tests = await runSelfTests(loaded.runtime, inspected.capability, inspected.contract, inspected.selfTest);
      const passed = report.tests.every(test => test.passed);
      report.stages.push({ id: 'self-test', passed });
      if (passed) {
        report.statuses.push(STATUS.SELF_TEST_PASSED, STATUS.READY);
        report.ready = true;
      }
      return report;
    } catch (error) {
      report.stages.push({ id: 'error', passed: false, error: error.message });
      report.error = error.message;
      return report;
    }
  }

  root.HBFoundrySkillLoader = Object.freeze({
    STATUS,
    inspect,
    loadAndTest,
    resolveFirstPartyUrl
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
