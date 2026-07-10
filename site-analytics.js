(() => {
  'use strict';

  const config = window.HB_ANALYTICS_CONFIG || {};
  if (config.enabled === false) return;
  if (config.respectDoNotTrack !== false && navigator.doNotTrack === '1') return;
  if (config.respectGlobalPrivacyControl !== false && navigator.globalPrivacyControl === true) return;

  const EVENT_KEY = 'hb-ttrpg-analytics-preview-v1';
  const IDENTITY_KEY = 'hb-ttrpg-analytics-identity-v1';
  const SESSION_KEY = 'hb-ttrpg-analytics-session-v1';
  const MAX_LABEL = 120;
  const pageStartedAt = Date.now();
  const localLimit = Math.max(100, Number(config.localEventLimit) || 1500);

  function readJson(storage, key, fallback) {
    try {
      const value = storage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function makeId(prefix) {
    const value = crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}-${value}`;
  }

  const nowIso = new Date().toISOString();
  const identity = readJson(localStorage, IDENTITY_KEY, null) || {
    id: makeId('visitor'),
    firstSeen: nowIso,
    lastSeen: nowIso,
    visitCount: 0
  };

  let session = readJson(sessionStorage, SESSION_KEY, null);
  const newSession = !session;
  if (!session) {
    identity.visitCount = Number(identity.visitCount || 0) + 1;
    session = {
      id: makeId('session'),
      startedAt: nowIso
    };
    writeJson(sessionStorage, SESSION_KEY, session);
  }
  identity.lastSeen = nowIso;
  writeJson(localStorage, IDENTITY_KEY, identity);

  function cleanText(value, limit = MAX_LABEL) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
  }

  function currentView() {
    return document.querySelector('.view.active')?.id || decodeURIComponent(location.hash.replace(/^#/, '')) || 'page';
  }

  function deviceClass() {
    const width = Math.max(screen.width || 0, innerWidth || 0);
    if (width < 680) return 'mobile';
    if (width < 1100) return 'tablet';
    return 'desktop';
  }

  function referrerHost() {
    if (!document.referrer) return 'direct';
    try {
      const host = new URL(document.referrer).hostname;
      return host === location.hostname ? 'internal' : host;
    } catch (_) {
      return 'unknown';
    }
  }

  function campaignData() {
    const params = new URLSearchParams(location.search);
    const output = {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
      if (params.has(key)) output[key] = cleanText(params.get(key), 80);
    }
    return output;
  }

  function baseEvent(type) {
    return {
      eventId: makeId('event'),
      siteId: config.siteId || 'hb-ttrpg-tools',
      type,
      occurredAt: new Date().toISOString(),
      visitorId: identity.id,
      sessionId: session.id,
      returningVisitor: Number(identity.visitCount || 0) > 1,
      page: location.pathname.split('/').pop() || 'index.html',
      path: location.pathname,
      title: cleanText(document.title, 160),
      workspace: currentView(),
      referrer: referrerHost(),
      language: navigator.language || 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      deviceClass: deviceClass(),
      viewport: `${innerWidth}x${innerHeight}`,
      campaign: campaignData()
    };
  }

  function saveLocal(event) {
    if (config.localPreview === false) return;
    const events = readJson(localStorage, EVENT_KEY, []);
    events.push(event);
    if (events.length > localLimit) events.splice(0, events.length - localLimit);
    writeJson(localStorage, EVENT_KEY, events);
  }

  function transmit(event) {
    const url = cleanText(config.collectorUrl, 500);
    if (!url) return;
    const body = JSON.stringify(event);
    try {
      if (navigator.sendBeacon) {
        const sent = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        if (sent) return;
      }
      void fetch(url, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body
      }).catch(() => {});
    } catch (_) {
      // Analytics must never interrupt the tools.
    }
  }

  function track(type, details = {}) {
    const event = { ...baseEvent(type), details };
    saveLocal(event);
    transmit(event);
    document.dispatchEvent(new CustomEvent('hb:analytics-event', { detail: event }));
    return event;
  }

  function controlLabel(control) {
    return cleanText(
      control.getAttribute('aria-label') ||
      control.dataset.analyticsLabel ||
      control.textContent ||
      control.getAttribute('title') ||
      control.id ||
      control.tagName
    );
  }

  function nearestContext(control) {
    const card = control.closest('.module-card,.menu-card,.bli-card,article');
    return {
      sectionId: control.closest('section')?.id || '',
      moduleId: card?.dataset.moduleId || '',
      cardTitle: cleanText(card?.querySelector('h2,h3,h4')?.textContent || ''),
      controlId: control.id || '',
      label: controlLabel(control)
    };
  }

  function safeDestination(link) {
    try {
      const url = new URL(link.href, location.href);
      return {
        destinationHost: url.hostname,
        destinationPath: url.pathname,
        outbound: url.hostname !== location.hostname
      };
    } catch (_) {
      return { destinationHost: '', destinationPath: '', outbound: false };
    }
  }

  document.addEventListener('click', event => {
    const control = event.target.closest('a,button,[role="button"],summary');
    if (!control || control.closest('[data-analytics-ignore]')) return;
    const context = nearestContext(control);

    if (control.dataset.view) {
      track('workspace_open', { ...context, workspaceId: cleanText(control.dataset.view, 80) });
      return;
    }

    if (control.closest('.module-card')) {
      track('tool_open', context);
      return;
    }

    const label = context.label.toLowerCase();
    if (/generate|random|roll|create|build|draw|refresh|reroll/.test(label)) {
      track('generator_action', context);
      return;
    }
    if (/export|download|save json|copy/.test(label)) {
      track('export_action', context);
      return;
    }
    if (/print/.test(label)) {
      track('print_action', context);
      return;
    }

    if (control.tagName === 'A') {
      track('navigation', { ...context, ...safeDestination(control) });
      return;
    }

    track('control_click', context);
  }, true);

  const searchTimers = new WeakMap();
  document.addEventListener('input', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'search') return;
    clearTimeout(searchTimers.get(input));
    searchTimers.set(input, setTimeout(() => {
      const visibleResults = [...document.querySelectorAll('.module-card,.menu-card')]
        .filter(node => node.offsetParent !== null).length;
      track('search_used', {
        controlId: input.id || '',
        queryLength: input.value.length,
        visibleResults
      });
    }, 650));
  }, true);

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    track('form_submit', {
      formId: form.id || '',
      formName: cleanText(form.getAttribute('name') || form.getAttribute('aria-label') || '', 80)
    });
  }, true);

  document.addEventListener('hb:view-activated', event => {
    track('workspace_view', { workspaceId: cleanText(event.detail?.viewId || '', 80) });
  });

  window.addEventListener('error', event => {
    track('client_error', {
      message: cleanText(event.message, 180),
      sourceFile: cleanText((event.filename || '').split('/').pop(), 100)
    });
  });

  window.addEventListener('unhandledrejection', event => {
    track('client_error', { message: cleanText(event.reason?.message || event.reason || 'Unhandled promise rejection', 180) });
  });

  let visibleStarted = document.visibilityState === 'visible' ? performance.now() : null;
  let activeMilliseconds = 0;
  let reportedMilliseconds = 0;

  function accumulateActiveTime() {
    if (visibleStarted === null) return;
    const current = performance.now();
    activeMilliseconds += current - visibleStarted;
    visibleStarted = current;
  }

  function reportEngagement(final = false) {
    accumulateActiveTime();
    const delta = activeMilliseconds - reportedMilliseconds;
    if (delta < 750 && !final) return;
    if (delta > 0 || final) {
      track(final ? 'session_end' : 'engagement', {
        activeSeconds: Math.round(delta / 1000),
        totalActiveSeconds: Math.round(activeMilliseconds / 1000),
        elapsedSeconds: Math.round((Date.now() - pageStartedAt) / 1000)
      });
      reportedMilliseconds = activeMilliseconds;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      reportEngagement(false);
      visibleStarted = null;
    } else {
      visibleStarted = performance.now();
    }
  });

  const heartbeatSeconds = Math.max(15, Number(config.heartbeatSeconds) || 30);
  const heartbeat = window.setInterval(() => {
    if (document.visibilityState === 'visible') reportEngagement(false);
  }, heartbeatSeconds * 1000);

  window.addEventListener('pagehide', () => {
    clearInterval(heartbeat);
    reportEngagement(true);
  }, { once: true });

  if (newSession) track('session_start', { firstSeen: identity.firstSeen, visitCount: identity.visitCount });
  track('page_view', {});

  window.HBAnalytics = Object.freeze({ track, config, localEventKey: EVENT_KEY });
})();
