# Search Indexing and Live Usage Activation

The repository now contains the public, crawlable portion of the search and analytics plan.

## Published search assets

- `index.html` — canonical homepage metadata, structured data, internal tool search, and static landing-page links.
- `search-index.json` — searchable titles, descriptions, workspace names, keywords, and stable URLs.
- `foundry-search.js` — internal search renderer. It records query length and result count, not the typed search text.
- `site-map.html` — human-readable workspace and tool directory.
- `sitemap.xml` — XML sitemap for search engines.
- `utilities.html`
- `generators.html`
- `modules.html`
- `barotrauma.html`
- `kaysender.html`
- `shadowrun.html`
- `world-of-darkness.html`
- `solanum-umbra.html`
- `blacklight.html`

Every new landing page contains:

- A unique title.
- A unique description.
- Visible keyword-rich explanatory text.
- A canonical URL.
- `index,follow` crawler instructions.
- Open Graph metadata.
- Schema.org structured data.
- Static links into the live workspace.
- First-party analytics scripts.
- Stable `data-analytics-workspace` and `data-analytics-tool` identifiers.

## Stage 1 — GitHub Pages publication

Wait for GitHub Pages to publish the latest `main` commit. Then verify these addresses:

```text
https://mrcalzon02.github.io/HB-TTRPG-tools/
https://mrcalzon02.github.io/HB-TTRPG-tools/site-map.html
https://mrcalzon02.github.io/HB-TTRPG-tools/sitemap.xml
https://mrcalzon02.github.io/HB-TTRPG-tools/generators.html
```

Confirm that:

1. The homepage search returns indexed tools.
2. Landing-page links open the correct live workspace.
3. The XML sitemap loads as XML rather than an HTML error page.
4. Browser developer tools show no missing `search-index.json`, CSS, or JavaScript requests.

## Stage 2 — Google Search Console verification

Create a URL-prefix property for:

```text
https://mrcalzon02.github.io/HB-TTRPG-tools/
```

Choose HTML tag verification. Google will provide a tag similar to:

```html
<meta name="google-site-verification" content="REPLACE_WITH_GOOGLE_TOKEN">
```

Add the real token to the `<head>` of `index.html`. Do not publish a placeholder token and do not remove the tag after verification.

After verification, submit:

```text
https://mrcalzon02.github.io/HB-TTRPG-tools/sitemap.xml
```

Use URL Inspection to request indexing for:

1. The homepage.
2. `site-map.html`.
3. `generators.html`.
4. `utilities.html`.
5. Each setting landing page.

## Stage 3 — Other search engines

Submit the same sitemap URL to Bing Webmaster Tools. Other crawlers can discover the sitemap through the homepage link and the human-readable site map, but direct submission provides status and error reporting.

A project-site repository cannot reliably control the host-level file at:

```text
https://mrcalzon02.github.io/robots.txt
```

Do not assume that a `robots.txt` file inside `/HB-TTRPG-tools/` controls the whole GitHub Pages host. Direct sitemap submission is the reliable path unless the root `mrcalzon02.github.io` Pages repository is also under your control.

## Stage 4 — Live analytics collector

The search pages already load `site-analytics-config.js` and `site-analytics.js`. They will remain in local-preview mode until the collector and dashboard URLs are configured.

Deploy the collector described in `ANALYTICS_SETUP.md`, then edit:

```js
collectorUrl: 'https://YOUR-COLLECTOR/collect',
dashboardUrl: 'https://YOUR-COLLECTOR/dashboard',
```

The collector must permit requests from:

```text
https://mrcalzon02.github.io
```

Once active, verify that the following events arrive:

- `page_view`
- `workspace_open`
- `workspace_view`
- `tool_open`
- `search_used`
- `generator_action`
- `export_action`
- `print_action`
- `engagement`
- `session_end`
- `client_error`

## Stage 5 — Search-to-usage measurement

Use Search Console for pre-arrival information:

- Search queries.
- Search impressions.
- Search clicks.
- Click-through rate.
- Average search position.
- Indexed landing pages.

Use the foundry analytics collector for post-arrival behavior:

- Landing page entered.
- Workspace opened.
- Tool launched.
- Generator action.
- Active time.
- Repeat visit.
- Export or print action.
- Client-side errors.

Do not expect the browser analytics tracker to reveal the visitor’s Google search phrase. Search query reporting belongs to Search Console.

## Stage 6 — Ongoing publication discipline

Whenever a major new workspace or standalone tool is added:

1. Give it a stable URL.
2. Add a unique title and description.
3. Add a canonical link.
4. Add visible explanatory content and natural keywords.
5. Add it to `search-index.json`.
6. Add it to `site-map.html`.
7. Add it to `sitemap.xml` if it should be indexed.
8. Add `data-analytics-workspace` or `data-analytics-tool` identifiers.
9. Load `site-analytics-config.js` and `site-analytics.js`.
10. Verify the page in Search Console after GitHub Pages publishes it.

## Privacy boundary

The search and analytics systems must not collect or publish:

- Character-sheet contents.
- Campaign notes.
- Form field values.
- Generated records.
- Typed internal search phrases.
- Raw IP-address lists.
- Precise visitor location.

The collector may use a source address transiently to derive country and a rotating anonymous network estimate, then discard the raw address immediately.
