# Software project showcase

The `software.html#software-showcase` section exposes a **functional, mouse-scrollable project carousel** backed by `software-catalog-data.js`, `software-catalog.js` and `software-catalog.css`.

## Operating contract
- Catalog entries represent original mrcalzon02 repositories only. They are independent from the existing Sound Manager, CubeChat and Beckenburg in-site navigation tabs. Do not present forked repos as original work.
- Each image path was selected from a file observed in the corresponding GitHub repository tree. Images are labeled as source art, design sheets, title graphics or app icons; **none are represented as captured running gameplay unless documented**. Projects without source preview art receive a text-only cover rather than generated artwork.
- Clicking an item selects its details, GitHub source, most recent published release (including prereleases), and direct download assets. The carousel supports mouse horizontal movement, wheel-to-horizontal over the gallery, touch swipes and keyboard arrows.
- Latest known releases are stored as a clearly dated *fallback* only. JavaScript attempts live GitHub `repos/:owner/:repo` metadata and `releases?per_page=30&page=1` on page load. It ignores drafts and orders by published timestamp. `/releases/latest` is intentionally not used, since it can omit prereleases.
- Select a project under **Complete published release history** for its first 30 published releases and use **Load older releases** to fetch later pages. Every asset link comes directly from GitHub's `browser_download_url` and is constrained to its corresponding repository's release download prefix. There are no synthetic download links or files.
- Asset platform filter uses conservative filename inference (Windows/macOS/Linux/Android; remaining files stay in Other). Source packages and cross-platform artifacts must not be mislabeled as Windows installers.
- Public activity comes from GitHub's `users/mrcalzon02/events/public`. The public feed refreshes only at a measured interval when visible to avoid overwhelming unauthenticated rate limits. A failed API request leaves dated fallback metadata and external GitHub links available.
- No JavaScript framework, tracking, authentication, unofficial GitHub proxy, cloud account or remote execution is required. GitHub Pages remains static.

## Verifying core functionality
```sh
node scripts/validate-software-catalog.mjs
```

Check the served page in a desktop browser: mouse-wheel gallery movement, card selection, keyboard controls, initial release hydration, asset download links, category filters, older-release pagination, refresh errors and feed rendering. A passing source-only contract test is **not** proof that the GitHub API, third-party binaries or browser/network all work. Do not use cosmetic screenshot assertions as release blockers.

## Maintenance
Update the source snapshot only after verifying repository identity, latest published timestamp, tags and asset paths. Use a real repo image or a text cover; never replace an image merely because a screenshot comparison failed. Preserve non-blocking behavior when GitHub returns `403` rate limits or network failures. Older release histories are intentionally fetched on demand rather than claiming all historical GitHub releases are already loaded.
