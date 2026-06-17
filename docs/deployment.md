# Deployment Guide

HB TTRPG Tools is a static site. The published application does not require a package manager, bundler, database, or server runtime. Node and Playwright are used only inside GitHub Actions to validate the repository and exercise the browser runtime before deployment.

## Current deployment target

Use GitHub Pages with GitHub Actions.

The workflow file is:

- `.github/workflows/pages.yml`

The workflow publishes the repository root as the Pages artifact only after every validation step and the integrated P0 browser gate pass.

## Required GitHub repository setting

In the repository settings:

1. Open **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Save the setting.
5. Push to `main` or run the workflow manually.

The project uses `main` as its only active development branch.

## Deployment pipeline

A push to `main`, or a manual workflow dispatch, runs the following sequence:

1. Validate crafting data and the main-line editor roadmap.
2. Validate the shared editor kernel, versioned migrations, adapter integration, pinned inheritance, and browser-runtime structure.
3. Validate the P0 browser-verification contract.
4. Run the remaining registered project validators.
5. Check JavaScript syntax, including all shared editor modules and validators.
6. Install Playwright `1.60.0` and Chromium with required system dependencies.
7. Start a local static server and run the integrated Island → Settlement → Airship smoke path in headless Chromium.
8. Validate the generated P0 verification receipt.
9. Upload browser evidence as the `p0-browser-verification` workflow artifact.
10. Remove test-only browser dependencies from the Pages payload.
11. Upload and deploy the static site.

The browser gate fails the deployment job directly. The workflow does not use `continue-on-error`, does not stash installed dependencies, and does not create proof commits in `main`.

## P0 verification artifact

Every non-cancelled run attempts to upload an artifact named:

```text
p0-browser-verification
```

A successful run contains:

```text
artifacts/p0-browser-verification.json
```

The receipt identifies:

- P0 and the `shared-editor-kernel` stage.
- The browser user agent and test time.
- The exact editor chain: Floating Island, Settlement, Airship.
- Passing stage results.
- Stable profile IDs and revisions for all three records.
- Pinned inheritance from Settlement to Island and from Airship to both Island and Settlement.

A failed browser run may also contain:

```text
artifacts/p0-browser-verification-failure.json
artifacts/p0-browser-verification-failure.png
```

The failure JSON includes the smoke result, page errors, console errors, and the URL under test. The screenshot captures the browser state at failure.

## P0 promotion rule

A code review or static inspection is not enough to close P0.

P0 may be marked complete, and P1 may become `required-next`, only after a workflow run on `main`:

- passes all validators and syntax checks;
- completes the integrated Chromium smoke path;
- produces a receipt accepted by `scripts/validate-p0-browser-verification.mjs`; and
- reaches the GitHub Pages deployment step successfully.

Until then, `data/kaysender/editors/p0-implementation-status.json` remains `framework-implementation-complete-pending-runtime-gate`, and the roadmap must keep P0 as the sole active stage.

## Local testing

Do not rely on opening `index.html` directly from disk. Browser file restrictions may block JSON loading and do not reproduce the deployment environment.

Run a local static server from the repository root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

The automated browser gate can also be run locally after installing Playwright and Chromium:

```bash
npm install --no-save --package-lock=false playwright@1.60.0
npx playwright install --with-deps chromium
node scripts/run-p0-browser-verification.mjs \
  artifacts/p0-browser-verification.json \
  artifacts/p0-browser-verification-failure.png \
  artifacts/p0-browser-verification-failure.json
node scripts/validate-p0-browser-verification.mjs artifacts/p0-browser-verification.json
```

## Manual deployment smoke review

After a successful deployment, confirm:

- The main navigation shows **Tools**, **Utilities**, **Generators**, and **Kaysender**.
- The Kaysender dashboard loads module cards from `data/kaysender-tools-registry.json`.
- The shared editor shell launches the separate Floating Island, Settlement, and Airship editors.
- The Saved Record Library displays profile ID, profile type, schema version, revision, and library state.
- **Update Existing Record** preserves the current profile ID.
- **Save as New Clone** creates a different profile ID.
- Settlement can load a saved Island parent directly.
- Airship can load saved Island and Settlement parents directly.
- Parent references display current, stale, unavailable, or locally older states as appropriate.
- **Refresh to Latest Parent** changes inherited revision only when deliberately invoked.
- **New Blank Record** warns about unsaved work, clears the form, and explicitly clears that editor's recovery draft.
- Canonical JSON, wiki draft, provenance, inheritance, locks, diagnostics, and recovery actions remain available.
- The character sheet still autosaves locally and prints through the browser print dialog.

## Current deployment caveats

The Kaysender tools remain campaign-operation and playtest utilities. Generated prices, difficulty values, structural values, and ship effects still require campaign testing before publication-ready balance.

The existing Island, Settlement, and Airship editors remain alpha domain implementations running through the P0 framework. P1 is the stage that promotes the Floating Island editor into a complete production editor after P0 passes its runtime gate.
