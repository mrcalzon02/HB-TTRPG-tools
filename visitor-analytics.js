(() => {
  'use strict';

  const config = window.HB_ANALYTICS_CONFIG || {};
  const EVENT_KEY = 'hb-ttrpg-analytics-preview-v1';
  const state = { rangeDays: 7, snapshot: null, mode: 'local' };

  const byId = id => document.getElementById(id);
  const numberFormat = new Intl.NumberFormat();
  const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

  function readLocalEvents() {
    try {
      const value = localStorage.getItem(EVENT_KEY);
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function startOfDay(value = Date.now()) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  function dateKey(value) {
    const date = new Date(value);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function increment(map, key, amount = 1) {
    const safeKey = String(key || 'Unknown');
    map.set(safeKey, (map.get(safeKey) || 0) + amount);
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    if (total < 60) return `${total}s`;
    const minutes = Math.floor(total / 60);
    const remaining = total % 60;
    if (minutes < 60) return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const minuteRemainder = minutes % 60;
    return minuteRemainder ? `${hours}h ${minuteRemainder}m` : `${hours}h`;
  }

  function mapToRanking(map, limit = 10) {
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
      .slice(0, limit);
  }

  function buildLocalSnapshot(days) {
    const now = Date.now();
    const cutoff = startOfDay(now) - ((Math.max(1, days) - 1) * 86400000);
    const todayCutoff = startOfDay(now);
    const allEvents = readLocalEvents();
    const events = allEvents.filter(event => {
      const time = Date.parse(event.occurredAt || '');
      return Number.isFinite(time) && time >= cutoff;
    });

    const visitors = new Set();
    const todayVisitors = new Set();
    const sessions = new Set();
    const newVisitors = new Set();
    const returningVisitors = new Set();
    const repeatVisitors = new Set();
    const sessionActive = new Map();
    const workspaces = new Map();
    const devices = new Map();
    const referrers = new Map();
    const actions = new Map();
    const tools = new Map();
    const daily = new Map();
    const errors = [];

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const timestamp = startOfDay(now) - (offset * 86400000);
      daily.set(dateKey(timestamp), { date: timestamp, visitors: new Set(), sessions: new Set(), views: 0 });
    }

    for (const event of events) {
      const visitorId = event.visitorId || 'unknown-visitor';
      const sessionId = event.sessionId || 'unknown-session';
      const occurred = Date.parse(event.occurredAt || '') || now;
      visitors.add(visitorId);
      sessions.add(sessionId);
      if (occurred >= todayCutoff) todayVisitors.add(visitorId);
      if (event.returningVisitor) {
        returningVisitors.add(visitorId);
        repeatVisitors.add(visitorId);
      } else {
        newVisitors.add(visitorId);
      }

      const bucket = daily.get(dateKey(occurred));
      if (bucket) {
        bucket.visitors.add(visitorId);
        bucket.sessions.add(sessionId);
        if (event.type === 'page_view') bucket.views += 1;
      }

      if (event.type === 'engagement' || event.type === 'session_end') {
        const seconds = Number(event.details?.activeSeconds) || 0;
        sessionActive.set(sessionId, (sessionActive.get(sessionId) || 0) + seconds);
      }

      if (event.type === 'workspace_view') {
        increment(workspaces, event.details?.workspaceId || event.workspace || 'Unknown');
      }

      if (event.type === 'tool_open') {
        const name = event.details?.cardTitle || event.details?.moduleId || event.details?.label || 'Unnamed tool';
        if (!tools.has(name)) tools.set(name, { name, opens: 0, visitors: new Set(), sessions: new Set(), lastSeen: 0 });
        const tool = tools.get(name);
        tool.opens += 1;
        tool.visitors.add(visitorId);
        tool.sessions.add(sessionId);
        tool.lastSeen = Math.max(tool.lastSeen, occurred);
      }

      if (['generator_action', 'search_used', 'export_action', 'print_action', 'form_submit', 'control_click', 'navigation'].includes(event.type)) {
        increment(actions, event.type.replace(/_/g, ' '));
      }

      increment(devices, event.deviceClass || 'Unknown');
      increment(referrers, event.referrer || 'Unknown');

      if (event.type === 'client_error') {
        errors.push({
          signal: event.details?.message || 'Client error',
          occurredAt: event.occurredAt
        });
      }
    }

    const activeValues = [...sessionActive.values()];
    const totalActive = activeValues.reduce((sum, value) => sum + value, 0);
    const averageActive = activeValues.length ? totalActive / activeValues.length : 0;
    const engagement = new Map([['Under 1 minute', 0], ['1–5 minutes', 0], ['5–15 minutes', 0], ['15+ minutes', 0]]);
    for (const seconds of activeValues) {
      if (seconds < 60) increment(engagement, 'Under 1 minute');
      else if (seconds < 300) increment(engagement, '1–5 minutes');
      else if (seconds < 900) increment(engagement, '5–15 minutes');
      else increment(engagement, '15+ minutes');
    }

    const toolRows = [...tools.values()]
      .sort((a, b) => b.opens - a.opens || a.name.localeCompare(b.name))
      .slice(0, 20)
      .map(tool => ({
        name: tool.name,
        opens: tool.opens,
        uniqueVisitors: tool.visitors.size,
        activeSeconds: null,
        repeatUse: Math.max(0, tool.opens - tool.visitors.size),
        lastSeen: tool.lastSeen ? new Date(tool.lastSeen).toISOString() : null
      }));

    return {
      generatedAt: new Date().toISOString(),
      mode: 'local',
      rangeDays: days,
      metrics: {
        visitorsToday: todayVisitors.size,
        visitorsRange: visitors.size,
        sessions: sessions.size,
        repeatVisitors: repeatVisitors.size,
        workspaceOpens: [...workspaces.values()].reduce((sum, value) => sum + value, 0),
        toolLaunches: toolRows.reduce((sum, row) => sum + row.opens, 0),
        averageActiveSeconds: averageActive,
        errors: errors.length,
        newVisitors: newVisitors.size,
        returningVisitors: returningVisitors.size,
        pageViews: events.filter(event => event.type === 'page_view').length,
        events: events.length
      },
      trend: [...daily.values()].map(bucket => ({
        date: new Date(bucket.date).toISOString(),
        visitors: bucket.visitors.size,
        sessions: bucket.sessions.size,
        views: bucket.views
      })),
      workspaces: mapToRanking(workspaces, 12),
      tools: toolRows,
      engagement: mapToRanking(engagement, 8),
      actions: mapToRanking(actions, 12),
      countries: [],
      devices: mapToRanking(devices, 10),
      referrers: mapToRanking(referrers, 10),
      health: [
        { signal: 'Analytics events recorded', count: events.length, lastSeen: events.at(-1)?.occurredAt || null },
        { signal: 'Page views recorded', count: events.filter(event => event.type === 'page_view').length, lastSeen: events.filter(event => event.type === 'page_view').at(-1)?.occurredAt || null },
        { signal: 'Client errors', count: errors.length, lastSeen: errors.at(-1)?.occurredAt || null }
      ]
    };
  }

  function defaults(days) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'collector',
      rangeDays: days,
      metrics: {
        visitorsToday: 0, visitorsRange: 0, sessions: 0, repeatVisitors: 0,
        workspaceOpens: 0, toolLaunches: 0, averageActiveSeconds: 0,
        errors: 0, newVisitors: 0, returningVisitors: 0, pageViews: 0, events: 0
      },
      trend: [], workspaces: [], tools: [], engagement: [], actions: [], countries: [], devices: [], referrers: [], health: []
    };
  }

  function normalizeRemote(raw, days) {
    const base = defaults(days);
    if (!raw || typeof raw !== 'object') return base;
    return {
      ...base,
      ...raw,
      mode: 'collector',
      metrics: { ...base.metrics, ...(raw.metrics || {}) },
      trend: Array.isArray(raw.trend) ? raw.trend : [],
      workspaces: Array.isArray(raw.workspaces) ? raw.workspaces : [],
      tools: Array.isArray(raw.tools) ? raw.tools : [],
      engagement: Array.isArray(raw.engagement) ? raw.engagement : [],
      actions: Array.isArray(raw.actions) ? raw.actions : [],
      countries: Array.isArray(raw.countries) ? raw.countries : [],
      devices: Array.isArray(raw.devices) ? raw.devices : [],
      referrers: Array.isArray(raw.referrers) ? raw.referrers : [],
      health: Array.isArray(raw.health) ? raw.health : []
    };
  }

  async function loadSnapshot(days) {
    const dashboardUrl = String(config.dashboardUrl || '').trim();
    if (!dashboardUrl) {
      state.mode = 'local';
      return buildLocalSnapshot(days);
    }
    const url = new URL(dashboardUrl, location.href);
    url.searchParams.set('site', config.siteId || 'hb-ttrpg-tools');
    url.searchParams.set('days', String(days));
    const response = await fetch(url, { credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error(`Analytics request failed: ${response.status}`);
    state.mode = 'collector';
    return normalizeRemote(await response.json(), days);
  }

  function setText(id, value) {
    const node = byId(id);
    if (node) node.textContent = value;
  }

  function renderMetrics(snapshot) {
    const metrics = snapshot.metrics || {};
    setText('metric-visitors-today', numberFormat.format(metrics.visitorsToday || 0));
    setText('metric-visitors-range', numberFormat.format(metrics.visitorsRange || 0));
    setText('metric-sessions', numberFormat.format(metrics.sessions || 0));
    setText('metric-repeat', numberFormat.format(metrics.repeatVisitors || 0));
    setText('metric-workspaces', numberFormat.format(metrics.workspaceOpens || 0));
    setText('metric-tools', numberFormat.format(metrics.toolLaunches || 0));
    setText('metric-active-time', formatDuration(metrics.averageActiveSeconds || 0));
    setText('metric-errors', numberFormat.format(metrics.errors || 0));
    setText('new-visitors', numberFormat.format(metrics.newVisitors || 0));
    setText('returning-visitors', numberFormat.format(metrics.returningVisitors || 0));
  }

  function emptyState(message) {
    const node = document.createElement('div');
    node.className = 'empty-state';
    node.textContent = message;
    return node;
  }

  function renderTrend(items) {
    const target = byId('visitor-trend');
    if (!target) return;
    target.replaceChildren();
    if (!items.length) {
      target.appendChild(emptyState('No visitor trend data is available for this range.'));
      return;
    }
    const max = Math.max(1, ...items.map(item => Number(item.visitors) || 0));
    for (const item of items) {
      const column = document.createElement('div');
      column.className = 'chart-column';
      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      bar.style.height = `${Math.max(2, ((Number(item.visitors) || 0) / max) * 100)}%`;
      const value = document.createElement('span');
      value.textContent = numberFormat.format(Number(item.visitors) || 0);
      bar.appendChild(value);
      const label = document.createElement('div');
      label.className = 'chart-label';
      label.textContent = dateFormat.format(new Date(item.date));
      column.title = `${label.textContent}: ${value.textContent} visitors, ${numberFormat.format(Number(item.sessions) || 0)} sessions`;
      column.append(bar, label);
      target.appendChild(column);
    }
  }

  function renderRanking(id, items, emptyMessage) {
    const target = byId(id);
    if (!target) return;
    target.replaceChildren();
    if (!items?.length) {
      target.appendChild(emptyState(emptyMessage));
      return;
    }
    const max = Math.max(1, ...items.map(item => Number(item.value) || 0));
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'rank-row';
      const label = document.createElement('span');
      label.className = 'rank-label';
      label.textContent = item.label || 'Unknown';
      const track = document.createElement('div');
      track.className = 'rank-track';
      const fill = document.createElement('div');
      fill.className = 'rank-fill';
      fill.style.width = `${Math.max(1, ((Number(item.value) || 0) / max) * 100)}%`;
      track.appendChild(fill);
      const value = document.createElement('span');
      value.className = 'rank-value';
      value.textContent = numberFormat.format(Number(item.value) || 0);
      row.append(label, track, value);
      target.appendChild(row);
    }
  }

  function renderTools(items) {
    const body = byId('tool-table-body');
    if (!body) return;
    body.replaceChildren();
    if (!items?.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.appendChild(emptyState('No tool-launch events have been recorded in this range.'));
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }
    for (const item of items) {
      const row = document.createElement('tr');
      const values = [
        item.name || 'Unnamed tool',
        numberFormat.format(Number(item.opens) || 0),
        numberFormat.format(Number(item.uniqueVisitors) || 0),
        item.activeSeconds === null || item.activeSeconds === undefined ? 'Not attributed' : formatDuration(item.activeSeconds),
        numberFormat.format(Number(item.repeatUse) || 0)
      ];
      for (const value of values) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      }
      body.appendChild(row);
    }
  }

  function renderHealth(items) {
    const body = byId('health-table-body');
    if (!body) return;
    body.replaceChildren();
    if (!items?.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 3;
      cell.appendChild(emptyState('No operational health data is available.'));
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }
    for (const item of items) {
      const row = document.createElement('tr');
      const lastSeen = item.lastSeen ? `${dateFormat.format(new Date(item.lastSeen))} ${timeFormat.format(new Date(item.lastSeen))}` : '—';
      for (const value of [item.signal || 'Signal', numberFormat.format(Number(item.count) || 0), lastSeen]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      }
      body.appendChild(row);
    }
  }

  function renderStatus(snapshot) {
    const local = snapshot.mode !== 'collector';
    setText('analytics-source', local ? 'Local browser preview' : 'Connected collector');
    setText('analytics-refreshed', timeFormat.format(new Date(snapshot.generatedAt || Date.now())));
    setText('analytics-retention', `${Number(config.retentionDays) || 90} days`);
    const banner = byId('analytics-mode-banner');
    if (!banner) return;
    if (local) {
      banner.innerHTML = '<strong>Local preview mode.</strong> These figures represent activity saved by this browser only. Configure a collector and dashboard endpoint to combine visitors, country-level origin, and sitewide usage.';
    } else {
      banner.innerHTML = '<strong>Collector connected.</strong> The dashboard is displaying aggregate sitewide data returned by the configured analytics service.';
    }
  }

  function render(snapshot) {
    state.snapshot = snapshot;
    renderStatus(snapshot);
    renderMetrics(snapshot);
    renderTrend(snapshot.trend || []);
    renderRanking('workspace-ranking', snapshot.workspaces || [], 'No workspace activations have been recorded.');
    renderTools(snapshot.tools || []);
    renderRanking('engagement-ranking', snapshot.engagement || [], 'No active-time sessions have been recorded.');
    renderRanking('action-ranking', snapshot.actions || [], 'No generator, search, export, or print actions have been recorded.');
    renderRanking('country-ranking', snapshot.countries || [], snapshot.mode === 'collector' ? 'No country data is available for this range.' : 'Country data requires the server-side collector.');
    renderRanking('device-ranking', snapshot.devices || [], 'No device-class data is available.');
    renderRanking('referrer-ranking', snapshot.referrers || [], 'No referrer data is available.');
    renderHealth(snapshot.health || []);
  }

  async function refresh() {
    const banner = byId('analytics-mode-banner');
    if (banner) banner.textContent = 'Refreshing analytics…';
    try {
      render(await loadSnapshot(state.rangeDays));
    } catch (error) {
      state.mode = 'local';
      const snapshot = buildLocalSnapshot(state.rangeDays);
      render(snapshot);
      if (banner) banner.innerHTML = `<strong>Collector unavailable.</strong> ${String(error.message || error)} Local browser preview is shown instead.`;
    }
  }

  document.querySelectorAll('[data-range]').forEach(button => {
    button.addEventListener('click', () => {
      state.rangeDays = Number(button.dataset.range) || 7;
      document.querySelectorAll('[data-range]').forEach(candidate => candidate.classList.toggle('active', candidate === button));
      void refresh();
    });
  });

  byId('analytics-refresh')?.addEventListener('click', () => void refresh());
  byId('analytics-export')?.addEventListener('click', () => {
    if (!state.snapshot) return;
    const blob = new Blob([JSON.stringify(state.snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hb-ttrpg-analytics-${state.rangeDays}d.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  void refresh();
})();
