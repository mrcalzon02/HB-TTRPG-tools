(function installCharlesResourceGateway(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CharlesResourceGateway = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCharlesResourceGateway(root) {
  'use strict';

  const VERSION = '1.0.0';
  const POLICY_PATH = 'api/charles-interactive-resource-gateway.json';
  const MAX_DELAY_MS = 5000;
  const MAX_CUMULATIVE_PENALTY_MS = 15000;
  const MAX_HONEY_BYTES = 16384;
  const MAX_HONEY_CONCURRENCY = 2;
  const HUMAN_GRANT_TTL_MS = 120000;
  const ENGAGEMENT_DEDUPE_MS = 300000;
  const PUBLIC_OPERATIONS = new Set(['status', 'attestation', 'policy']);

  const state = {
    configuredVerifier: null,
    policy: null,
    policyPromise: null,
    humanGrants: new Map(),
    buckets: new Map(),
    strikes: new Map(),
    cumulativePenalty: new Map(),
    engagement: new Map(),
    activeHoney: 0,
    sessionId: randomToken(16)
  };

  function now() { return Date.now(); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
  function normalize(value) { return String(value ?? '').trim().toLowerCase(); }
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, clamp(ms, 0, MAX_DELAY_MS))); }

  function randomToken(bytes) {
    const length = Math.max(8, Math.min(64, Number(bytes) || 16));
    const data = new Uint8Array(length);
    if (root?.crypto?.getRandomValues) root.crypto.getRandomValues(data);
    else for (let index = 0; index < data.length; index += 1) data[index] = Math.floor(Math.random() * 256);
    return Array.from(data, value => value.toString(16).padStart(2, '0')).join('');
  }

  function sameOriginUrl(path) {
    const base = root?.document?.baseURI || root?.location?.href || 'https://mrcalzon02.github.io/HB-TTRPG-tools/';
    const url = new URL(String(path || ''), base);
    const expectedOrigin = new URL(base).origin;
    if (url.origin !== expectedOrigin) throw new Error('[CharlesResourceGateway] Cross-origin access denied.');
    return url;
  }

  async function guardedFetch(path, options = {}) {
    if (typeof root?.fetch !== 'function') throw new Error('[CharlesResourceGateway] fetch is unavailable in this runtime.');
    const url = sameOriginUrl(path);
    const response = await root.fetch(url, {
      method: options.method || 'GET',
      headers: options.headers || undefined,
      body: options.body,
      cache: options.refresh ? 'reload' : 'no-store',
      credentials: 'same-origin',
      redirect: 'error',
      referrerPolicy: 'no-referrer'
    });
    return response;
  }

  async function loadPolicy(options = {}) {
    if (!options.refresh && state.policy) return clone(state.policy);
    if (!options.refresh && state.policyPromise) return clone(await state.policyPromise);
    state.policyPromise = guardedFetch(POLICY_PATH, { refresh: options.refresh })
      .then(async response => {
        if (!response.ok) throw new Error(`[CharlesResourceGateway] Policy returned HTTP ${response.status}.`);
        const policy = await response.json();
        state.policy = policy;
        return policy;
      })
      .finally(() => { state.policyPromise = null; });
    return clone(await state.policyPromise);
  }

  function configure(options = {}) {
    if ('trustedClientVerifier' in options && options.trustedClientVerifier != null && typeof options.trustedClientVerifier !== 'function') {
      throw new TypeError('trustedClientVerifier must be a function or null.');
    }
    state.configuredVerifier = options.trustedClientVerifier || null;
    return getStatus();
  }

  function cleanExpiredHumanGrants() {
    const timestamp = now();
    for (const [token, grant] of state.humanGrants.entries()) {
      if (!grant || grant.expiresAt <= timestamp || grant.used) state.humanGrants.delete(token);
    }
  }

  function registerHumanPresence(event) {
    cleanExpiredHumanGrants();
    if (!event || event.isTrusted !== true) {
      return Object.freeze({ ok: false, reason: 'trusted-browser-event-required' });
    }
    const token = randomToken(24);
    const issuedAt = now();
    const grant = {
      token,
      sessionId: state.sessionId,
      issuedAt,
      expiresAt: issuedAt + HUMAN_GRANT_TTL_MS,
      used: false,
      eventType: String(event.type || 'trusted-event')
    };
    state.humanGrants.set(token, grant);
    return Object.freeze({ ok: true, token, issuedAt, expiresAt: grant.expiresAt, ttlMs: HUMAN_GRANT_TTL_MS });
  }

  function verifyHumanGrant(token, consume = true) {
    cleanExpiredHumanGrants();
    const grant = state.humanGrants.get(String(token || ''));
    if (!grant || grant.sessionId !== state.sessionId || grant.used || grant.expiresAt <= now()) return false;
    if (consume) {
      grant.used = true;
      state.humanGrants.delete(grant.token);
    }
    return true;
  }

  function automationSignals(input = {}) {
    const context = input.clientContext || {};
    const signals = [];
    if (root?.navigator?.webdriver === true) signals.push('navigator.webdriver');
    if (normalize(context.clientType).includes('automation') || normalize(context.clientType).includes('bot')) signals.push('declared-automation');
    if (context.synthetic === true) signals.push('declared-synthetic');
    if (!root?.document && context.humanInteractive !== true) signals.push('no-browser-human-context');
    return signals;
  }

  async function isTrustedAutomation(input, signals) {
    if (!signals.length && input?.clientContext?.trustedAutomation !== true) return false;
    if (typeof state.configuredVerifier !== 'function') return false;
    try {
      return (await state.configuredVerifier(clone(input))) === true;
    } catch (_) {
      return false;
    }
  }

  function bucketKey(input, protectedOperation) {
    const operation = normalize(input?.operation) || 'unknown';
    return `${state.sessionId}:${protectedOperation ? 'protected' : 'general'}:${operation}`;
  }

  function consumeBucket(input, protectedOperation) {
    const key = bucketKey(input, protectedOperation);
    const capacity = protectedOperation ? 5 : 30;
    const refillPerMinute = protectedOperation ? 1 : 10;
    const refillPerMs = refillPerMinute / 60000;
    const timestamp = now();
    const bucket = state.buckets.get(key) || { tokens: capacity, updatedAt: timestamp };
    const elapsed = Math.max(0, timestamp - bucket.updatedAt);
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerMs);
    bucket.updatedAt = timestamp;
    if (bucket.tokens < 1) {
      state.buckets.set(key, bucket);
      const retryAfterMs = Math.ceil((1 - bucket.tokens) / refillPerMs);
      return { ok: false, retryAfterMs: clamp(retryAfterMs, 1000, 60000) };
    }
    bucket.tokens -= 1;
    state.buckets.set(key, bucket);
    return { ok: true, remaining: Math.floor(bucket.tokens) };
  }

  function strikeKey(input) {
    return `${state.sessionId}:${normalize(input?.operation) || 'unknown'}`;
  }

  async function applyBoundedPenalty(input) {
    const key = strikeKey(input);
    const strikes = (state.strikes.get(key) || 0) + 1;
    state.strikes.set(key, strikes);
    const requested = 250 + Math.max(0, strikes - 1) * 500;
    const already = state.cumulativePenalty.get(key) || 0;
    const remaining = Math.max(0, MAX_CUMULATIVE_PENALTY_MS - already);
    const delayMs = Math.min(MAX_DELAY_MS, requested, remaining);
    state.cumulativePenalty.set(key, already + delayMs);
    if (delayMs > 0) await sleep(delayMs);
    return { strikes, delayMs, cumulativePenaltyMs: already + delayMs };
  }

  function resetPenalty(input) {
    const key = strikeKey(input);
    state.strikes.delete(key);
    state.cumulativePenalty.delete(key);
  }

  function safeJsonSize(value) {
    try { return new TextEncoder().encode(JSON.stringify(value)).length; }
    catch (_) { return Infinity; }
  }

  async function boundedHoneyResponse(input = {}) {
    if (state.activeHoney >= MAX_HONEY_CONCURRENCY) {
      return Object.freeze({ status: 'denied', reason: 'honey-concurrency-cap' });
    }
    state.activeHoney += 1;
    try {
      const delayMs = clamp(input.delayMs ?? 1250, 0, MAX_DELAY_MS);
      await sleep(delayMs);
      const decoy = {
        status: 'deferred',
        requestId: randomToken(8),
        retryAfterMs: Math.min(MAX_DELAY_MS, delayMs + 500),
        resource: 'local-synthetic-placeholder',
        data: []
      };
      if (safeJsonSize(decoy) > MAX_HONEY_BYTES) return Object.freeze({ status: 'denied', reason: 'honey-byte-cap' });
      return Object.freeze(decoy);
    } finally {
      state.activeHoney = Math.max(0, state.activeHoney - 1);
    }
  }

  function publicOperation(operation) {
    return PUBLIC_OPERATIONS.has(normalize(operation));
  }

  async function requestAccess(input = {}) {
    const operation = normalize(input.operation);
    if (!operation) return Object.freeze({ allowed: false, decision: 'deny', reason: 'operation-required' });

    if (publicOperation(operation)) {
      const bucket = consumeBucket(input, false);
      if (!bucket.ok) return Object.freeze({ allowed: false, decision: 'deny', reason: 'rate-limit', retryAfterMs: bucket.retryAfterMs });
      if (operation === 'status') return Object.freeze({ allowed: true, decision: 'allow', operation, status: getStatus() });
      const policy = await loadPolicy();
      if (operation === 'attestation') return Object.freeze({ allowed: true, decision: 'allow', operation, attestation: clone(policy.attestation) });
      return Object.freeze({ allowed: true, decision: 'allow', operation, policy });
    }

    const bucket = consumeBucket(input, true);
    if (!bucket.ok) {
      const penalty = await applyBoundedPenalty(input);
      return Object.freeze({ allowed: false, decision: 'deny', reason: 'rate-limit', retryAfterMs: bucket.retryAfterMs, penalty });
    }

    const signals = automationSignals(input);
    const trustedAutomation = await isTrustedAutomation(input, signals);
    const human = verifyHumanGrant(input.humanGrant, false);

    if (!human && !trustedAutomation) {
      const penalty = await applyBoundedPenalty(input);
      if (signals.length && penalty.strikes >= 3 && input.honeyEligible !== false) {
        const honey = await boundedHoneyResponse({ delayMs: Math.min(MAX_DELAY_MS, penalty.delayMs + 500) });
        return Object.freeze({ allowed: false, decision: 'bounded-honeypot', reason: 'untrusted-automation-or-no-human-grant', signals, penalty, honey });
      }
      return Object.freeze({ allowed: false, decision: 'deny', reason: 'human-presence-or-trusted-tool-grant-required', signals, penalty });
    }

    if (human && !verifyHumanGrant(input.humanGrant, true)) {
      return Object.freeze({ allowed: false, decision: 'deny', reason: 'human-grant-expired-or-consumed' });
    }

    resetPenalty(input);
    return Object.freeze({
      allowed: true,
      decision: 'allow',
      operation,
      authorization: human ? 'human-presence' : 'trusted-automation-verifier',
      remaining: bucket.remaining,
      constraints: {
        sameOriginOnly: true,
        noOutboundHoneyTraffic: true,
        noRetaliation: true,
        noUnboundedDelay: true
      }
    });
  }

  function recordEngagement(event, key) {
    const id = String(key || '').trim();
    if (!id) return Object.freeze({ accepted: false, reason: 'engagement-key-required' });
    if (!event || event.isTrusted !== true) return Object.freeze({ accepted: false, reason: 'trusted-user-event-required' });
    const timestamp = now();
    const previous = state.engagement.get(id) || 0;
    if (timestamp - previous < ENGAGEMENT_DEDUPE_MS) return Object.freeze({ accepted: false, reason: 'deduplicated' });
    state.engagement.set(id, timestamp);
    return Object.freeze({ accepted: true, localOnly: true, recordedAt: timestamp });
  }

  function privacyHeaders() {
    return Object.freeze({
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff'
    });
  }

  function getStatus() {
    cleanExpiredHumanGrants();
    return Object.freeze({
      version: VERSION,
      capabilityId: 'charles.interactive-resource-gateway',
      authority: 'Charles',
      projectAttestation: 'This Interactive Resource Gateway is a Charles capability of Calzon\'s TTRPG Foundry.',
      staticOrigin: true,
      networkEnforcement: 'gateway-mediated-only',
      humanGrantsActive: state.humanGrants.size,
      trustedAutomationVerifierConfigured: typeof state.configuredVerifier === 'function',
      activeHoneyResponses: state.activeHoney,
      safeguards: Object.freeze({
        sameOriginGatewayFetch: true,
        boundedDelay: true,
        boundedHoneypot: true,
        noRetaliation: true,
        noAdTech: true,
        noAdBlockerPunishment: true,
        noFingerprinting: true
      })
    });
  }

  function initGatewayPage() {
    const document = root?.document;
    if (!document) return;
    const statusNode = document.querySelector('[data-charles-gateway-status]');
    const grantButton = document.querySelector('[data-charles-human-grant]');
    const grantNode = document.querySelector('[data-charles-grant-status]');
    const policyNode = document.querySelector('[data-charles-policy-json]');
    if (statusNode) statusNode.textContent = JSON.stringify(getStatus(), null, 2);
    if (policyNode) loadPolicy().then(policy => { policyNode.textContent = JSON.stringify(policy, null, 2); }).catch(error => { policyNode.textContent = error.message; });
    if (grantButton) grantButton.addEventListener('click', event => {
      const grant = registerHumanPresence(event);
      if (grantNode) grantNode.textContent = grant.ok ? `Human-presence grant issued until ${new Date(grant.expiresAt).toLocaleTimeString()}.` : `Grant denied: ${grant.reason}.`;
    });
  }

  if (root?.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', initGatewayPage, { once: true });
    else initGatewayPage();
  }

  return Object.freeze({
    version: VERSION,
    policyPath: POLICY_PATH,
    configure,
    getStatus,
    loadPolicy,
    registerHumanPresence,
    requestAccess,
    guardedFetch,
    boundedHoneyResponse,
    recordEngagement,
    privacyHeaders
  });
});
