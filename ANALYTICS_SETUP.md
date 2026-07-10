# Visitor Analytics Activation

The foundry now contains:

- `site-analytics-config.js` — collector and dashboard endpoint configuration.
- `site-analytics.js` — first-party event tracker for the main foundry workspace.
- `visitor-analytics.html` — aggregate visitor operations dashboard.
- `visitor-analytics.js` — dashboard loader, local preview aggregator, filters, and export.

## Current operating mode

With empty endpoint values, the system runs in **local preview mode**. Events are stored only in the current browser under `hb-ttrpg-analytics-preview-v1`. This verifies workspace switches, tool opens, searches, generator actions, exports, print actions, form submissions, navigation, engagement time, and client errors without pretending the data is sitewide.

## Collector configuration

Edit `site-analytics-config.js`:

```js
collectorUrl: 'https://analytics.example.com/collect',
dashboardUrl: 'https://analytics.example.com/dashboard',
```

The collector must allow requests from:

```text
https://mrcalzon02.github.io
```

## POST `/collect`

The browser sends one JSON event at a time. Representative fields:

```json
{
  "eventId": "event-...",
  "siteId": "hb-ttrpg-tools",
  "type": "workspace_view",
  "occurredAt": "2026-07-10T21:30:00.000Z",
  "visitorId": "visitor-...",
  "sessionId": "session-...",
  "returningVisitor": true,
  "page": "index.html",
  "path": "/HB-TTRPG-tools/",
  "title": "Calzon’s TTRPG Foundry",
  "workspace": "generators",
  "referrer": "direct",
  "language": "en-US",
  "timezone": "America/Anchorage",
  "deviceClass": "desktop",
  "viewport": "1920x1080",
  "campaign": {},
  "details": {
    "workspaceId": "generators"
  }
}
```

The collector should:

1. Validate `siteId`, event type, field lengths, JSON size, and allowed origin.
2. Derive country from the request at the edge.
3. Hash the source IP with a secret, rotating daily salt for anonymous network uniqueness estimates.
4. Discard the raw source IP immediately.
5. Store country only; do not store city, coordinate, postal code, or exact location.
6. Apply rate limiting and a finite retention period.
7. Never log form values, search text, character-sheet contents, campaign notes, or generated records.

## GET `/dashboard`

Request:

```text
/dashboard?site=hb-ttrpg-tools&days=7
```

Return JSON matching this shape:

```json
{
  "generatedAt": "2026-07-10T21:35:00.000Z",
  "metrics": {
    "visitorsToday": 12,
    "visitorsRange": 48,
    "sessions": 71,
    "repeatVisitors": 19,
    "workspaceOpens": 126,
    "toolLaunches": 309,
    "averageActiveSeconds": 482,
    "errors": 2,
    "newVisitors": 29,
    "returningVisitors": 19,
    "uniqueNetworks": 43,
    "pageViews": 95,
    "events": 1480
  },
  "trend": [
    { "date": "2026-07-10T00:00:00.000Z", "visitors": 12, "sessions": 18, "views": 26 }
  ],
  "workspaces": [
    { "label": "generators", "value": 42 }
  ],
  "tools": [
    {
      "name": "NPC Profile Generator",
      "opens": 31,
      "uniqueVisitors": 18,
      "activeSeconds": 6210,
      "repeatUse": 13,
      "lastSeen": "2026-07-10T21:31:00.000Z"
    }
  ],
  "engagement": [
    { "label": "1–5 minutes", "value": 20 }
  ],
  "actions": [
    { "label": "generator action", "value": 140 }
  ],
  "countries": [
    { "label": "United States", "value": 31 }
  ],
  "devices": [
    { "label": "desktop", "value": 51 }
  ],
  "referrers": [
    { "label": "direct", "value": 38 }
  ],
  "health": [
    { "signal": "Client errors", "count": 2, "lastSeen": "2026-07-10T20:20:00.000Z" }
  ]
}
```

## Public-dashboard boundary

`visitor-analytics.html` is a public GitHub Pages document. It must receive aggregate results only. Do not return raw IP addresses, full user-agent strings, exact locations, individual browsing histories, or directly identifying records from the dashboard endpoint.
