# HB-TTRPG-tools workflow purge — 2026-11-02

## Follow-up cleanup — 2026-11-08

The repository had grown to **65 workflow definitions**. This cleanup removes
**28 obsolete definitions**, leaving **37**, with no new workflow added:

- Retire the 27 historical numbered Factorio R94–R126 declarations. Keep the
  existing R127 workflow, which also executes R128, plus the four shared render
  and reference pipelines. Factorio definitions decrease from 32 to 5.
- Retire `spr-promote-neural-passages.yml`: its two exact destination WAVs are
  already committed, so its fixed artifact-import operation is complete.
- Keep `homebrew-local-worker.yml` as the existing single-job runner. Status
  reporting and its diagnostic mode remain inside that workflow.
- Preserve current product builds, releases, scoped validators, source scripts,
  saved models, run history, and artifacts. No scheduled workflows are present.

The retired render declarations do not call one another. They import fixed
historical run IDs and artifact names. In particular, retained R127/R128 uses
run `41595863349` and artifact
`factorio-r126-source-square-edge-one-round-fin-real-3d-candidates`; that artifact
was verified available during cleanup and is not deleted. Artifact retention
and eventual expiration remain separate from workflow-definition cleanup.

The complete pre-cleanup definitions are recoverable from commit
`f1c886f9caf120135e69e56b020b034c8cef66e6`. Reuse maintained workflows for further
iterations; do not add a new executable workflow for each render revision or
completed one-off import. Preserve required outputs when consolidating jobs.

The November 2 counts and retained list below describe that earlier cleanup,
not the current inventory.

## Original cleanup record — 2026-11-02

**Purpose:** Execute the user's explicit instruction to **purge inactive GitHub Actions workflows** while preserving workflows that serve current, user-authorized original creative and game tasks, source-fidelity Blender development, and working site/release delivery.

**Repository:** `mrcalzon02/HB-TTRPG-tools`, `main`. Prior to 2026-11-02 cleanup there were 121 executable workflow files; first conservative pass reduced to 84. This purge removes **49 more** active workflow declarations, leaving **35**. Total reduction from original 121 is **86 workflows (71.1%)**.

**Separately:** Remove 36 inert archived historical Factorio R41–R93 workflow YAML copies plus the retired Charles one-off workflow backup and superseded audit. They exist in the Git commit history, but no longer consume current repository tree space or create workflow clutter. The source code, prior commits, already-produced Actions run history and available build artifacts are **not** deleted. Do not confuse deletion of a *definition* with cancellation of previously queued jobs or removal of past history.

## Retained executable workflows (35)

- `.github/workflows/barotrauma-desktop.yml`
- `.github/workflows/barotrauma-observer-pr.yml`
- `.github/workflows/beckenburg-full-round-e2e.yml`
- `.github/workflows/beckenburg-release.yml`
- `.github/workflows/daysha-royal-gallery.yml`
- `.github/workflows/exo-renderer-check.yml`
- `.github/workflows/factorio-baffle-source-profile-r101.yml`
- `.github/workflows/factorio-cut-rear-fin-extension-r106.yml`
- `.github/workflows/factorio-cut-rear-fin-extension-r107.yml`
- `.github/workflows/factorio-merge-original-forgings-baffle-r103.yml`
- `.github/workflows/factorio-merge-original-forgings-baffle-r104.yml`
- `.github/workflows/factorio-official-reference-library.yml`
- `.github/workflows/factorio-original-r11-source-geometry-r101.yml`
- `.github/workflows/factorio-render-environment.yml`
- `.github/workflows/factorio-render-pipeline-validation.yml`
- `.github/workflows/factorio-source-asymmetric-sidewalls-r97.yml`
- `.github/workflows/factorio-source-eight-frame-geometry-r105.yml`
- `.github/workflows/factorio-stitched-source-bell-panels-r94.yml`
- `.github/workflows/factorio-upper-source-owner-r104.yml`
- `.github/workflows/factorio-wube-public-sample-import.yml`
- `.github/workflows/foundry-api.yml`
- `.github/workflows/nutbuster-remote-voice.yml`
- `.github/workflows/pages.yml`
- `.github/workflows/portfolio-directory.yml`
- `.github/workflows/software-catalog.yml`
- `.github/workflows/validate-barotrauma-static.yml`
- `.github/workflows/validate-blacklight-equipment.yml`
- `.github/workflows/validate-blacklight-mission-generator.yml`
- `.github/workflows/validate-blacklight-random-character.yml`
- `.github/workflows/validate-blacklight-veteran-reintroduction.yml`
- `.github/workflows/validate-main-page-performance.yml`
- `.github/workflows/vessel10-command-deck.yml`
- `.github/workflows/voicebox-nutbuster-batch.yml`
- `.github/workflows/warhammer-diegetic-language-integrity.yml`
- `.github/workflows/warhammer-navis-system-reference.yml`

This retains current R106/R107 fin-end source-geometry workflows AND their essential R94/R97/R101/R103/R104 upstream model-build and comparison path, original proprietary-source isolation tools, the shared Factorio procedure/workstation checks, the production Pages deployment, Beckenburg testing/release, current Barotrauma desktop/static coverage, Blacklight EXO/character modules, original Daysha gallery/story/site continuity checks, Warhammer comprehensive continuity, NUTBUSTER voice integration, the portfolio directory and catalog consumed by the creative dispatcher, and working site performance/API checks.

## Purged formerly executable definitions (49)

- `.github/workflows/apply-cubic-worker-benchmark-v2.yml` (former blob `7832d92f9602697223d27e10d8f0b4b9affaeed7`)
- `.github/workflows/apply-live-signals-mirror.yml` (former blob `e71adb8aae9ae0bf0d361c1f9b0532a0ac138fb5`)
- `.github/workflows/apply-site-interaction-quality-fixes.yml` (former blob `c057c9b1d8b4006482441187d94aa4536eea7264`)
- `.github/workflows/apply-site-secret-traversal.yml` (former blob `afe73e269e8f6248739d3056710bcdb662b7e3d8`)
- `.github/workflows/apply-spatial-occupied-deck-fix.yml` (former blob `2f40d2805514fd75154575411fc5cde1214b59c9`)
- `.github/workflows/archive-spatial-site-batch.yml` (former blob `803d86a7cc3df123b7313ae9520e8ecb5891b38e`)
- `.github/workflows/binary-cube-baseline.yml` (former blob `0d083c9efb496001e61d80ccc60e702c01eee84f`)
- `.github/workflows/binary-cube-desktop.yml` (former blob `03076b453706e5ca2e7be5e3b808dc264b9238ce`)
- `.github/workflows/binary-cube-v12-complete.yml` (former blob `bc552165b6339c413381d5d3364cc39d29c5ab90`)
- `.github/workflows/binary-cube-v12-lifecycle.yml` (former blob `756d705b1838b1b3166472c9cf0ea7421b4931c1`)
- `.github/workflows/binary-cube-v12-pages.yml` (former blob `308e88123b28432e42c647dfa7def5a54a446dd7`)
- `.github/workflows/binary-cube-v13-launch.yml` (former blob `adc6587e8feac39a5270044254a15c7df086a157`)
- `.github/workflows/capture-game-menu-archive.yml` (former blob `2ad5d2771cbc80b5a7728c8275308f951e3feb58`)
- `.github/workflows/cubic-decryptor.yml` (former blob `5decf9e8aa329cab10af97d1d776d55458f761d2`)
- `.github/workflows/deploy-wod-spatial-pages.yml` (former blob `827d531a7c41ddf8fa6464553bbc31269f2a6022`)
- `.github/workflows/diagnose-spatial-connector-regressions.yml` (former blob `c109ae505256a88e5c2933d5e09fa4be219cf977`)
- `.github/workflows/diagnostic-raster-evidence-routing.yml` (former blob `b61802d3196bb1a1889e440ac6801b4c4d50314c`)
- `.github/workflows/factorio-blender-capture-batch.yml` (former blob `23741fde95fd85df9aa4601717b39c47d83fa050`)
- `.github/workflows/factorio-nozzle-native-ownership-r100.yml` (former blob `a87fabc270dbea561792fa92d57b16e0115139d7`)
- `.github/workflows/factorio-physical-source-refractory-flare-r98.yml` (former blob `2b19c5b50a08939cd1a82de0ceb01652a7a3833f`)
- `.github/workflows/factorio-source-discrete-cast-facets-r96.yml` (former blob `bf709f430384bfd403f1d5070dd1732d72e9a590`)
- `.github/workflows/factorio-source-forty-flute-liner-r102.yml` (former blob `9774802bcc47da63cf24ddbfc1306a3599e9db84`)
- `.github/workflows/factorio-source-physical-shell-sectors-r99.yml` (former blob `8f67adb8928661f032991742bdfe79d793f583d3`)
- `.github/workflows/factorio-stitch-original-hinge-planes-r95.yml` (former blob `644ce31461fb562e138e7f74e034e83dcb4e11f1`)
- `.github/workflows/ingest-wod-poi.yml` (former blob `d5d65d6a29e095480735a23480b0e9daafef6b8a`)
- `.github/workflows/local-hub-desktop.yml` (former blob `8a2fffc4b5b1b3b7554c52503bb2f30e07087c0f`)
- `.github/workflows/network-investigator-windows.yml` (former blob `c3f1397c5c513b1453143355f38a90e4977d4e9e`)
- `.github/workflows/publish-master-world-release.yml` (former blob `011f0280a34d5340daf35938acd450a16f6251e4`)
- `.github/workflows/raster-unresolved-evidence-research.yml` (former blob `5e3f8d35ae988dc77fe502cc8e1bd275b7a5a52e`)
- `.github/workflows/repair-spatial-rng-return.yml` (former blob `6fcd7a263faf7cb12f455514e0d9dfb16e74a4da`)
- `.github/workflows/review-spatial-site-batch.yml` (former blob `174430c0b17dd0ff0cc5120e37add85b066de584`)
- `.github/workflows/scientific-tools-extraction.yml` (former blob `edf9fb853a7f3d84a27c8ca5652656d3aaa873a3`)
- `.github/workflows/shadowrun-binary-cube.yml` (former blob `56bca60a59180ce6f8ffa9c1a1f0aa30430dde6e`)
- `.github/workflows/steganalysis-evidence-profile.yml` (former blob `bce7daa1d593d49b50c6a3ee8c67911594ea346a`)
- `.github/workflows/validate-barotrauma-dashboard-auth.yml` (former blob `3844ec5691b0e1261188573213dcccbc904d678c`)
- `.github/workflows/validate-barotrauma-dashboard-login-repair.yml` (former blob `1df6be9554b57c4da4dec16a7737510009f93afd`)
- `.github/workflows/validate-barotrauma-incremental-world-viewer.yml` (former blob `f9f5d5090fb9e430ed4ff64ead7edfb6938a1389`)
- `.github/workflows/validate-barotrauma-local-station-topology.yml` (former blob `5d48668af4807e48c83500360d85c4ab5ac37b49`)
- `.github/workflows/validate-barotrauma-management-file-initialization.yml` (former blob `1e1817f407897e23a0cce0cab6e59ab9638e71d0`)
- `.github/workflows/validate-barotrauma-runtime.yml` (former blob `54efaa2954ac034bfdf5a81f82cebef90898fb38`)
- `.github/workflows/validate-barotrauma-world-depth.yml` (former blob `068e201e4b50bb0451602e43a3a9b2dc2dc1409b`)
- `.github/workflows/validate-barotrauma-world-economy.yml` (former blob `5e6d8b79738fd1cb3cd8597d445938fe8453b793`)
- `.github/workflows/validate-environment-production.yml` (former blob `72f92d032f8981ed38f7c360a9075f00f72f980b`)
- `.github/workflows/validate-live-signals-android-bridge.yml` (former blob `655c2c731321c3cac4c9c826fc8152080a49e563`)
- `.github/workflows/validate-wod-world-scan-overlay.yml` (former blob `4995da79fa08e0f38c1d9690c05317b2c4b803ab`)
- `.github/workflows/warhammer-chronology-integrity.yml` (former blob `3069f5e8cb5daec7aae4687223bc8ab6b60700fd`)
- `.github/workflows/warhammer-dramatis-personae-integrity.yml` (former blob `6cd569a85a61efa245b4d22e98f70f6963521456`)
- `.github/workflows/warhammer-mercatura-house-integrity.yml` (former blob `469764c5836b379b19431d4f17311bd4430b5b85`)
- `.github/workflows/warhammer-personnel-biography-integrity.yml` (former blob `261ef3379b2d702b94d5ca8a7372910f72b04f10`)

The purged set comprises one-shot self-committing patchers, completed Binary Cube version gates, superseded site/spatial experiments, duplicate specialized Barotrauma and Warhammer stage checks, obsolete R95–R102 Blender variants not required as live upstream dependencies, older World of Darkness specialized deployment/ingestion and dormant unrelated utility packaging. Removing these workflows does not remove their test scripts or application source.

## Archived definitions also purged

36 previously archived R41–R93 workflows (under `docs/workflow-archive/factorio-r41-r93/`) and both prior archive metadata/Charles one-off files were removed as requested. To reproduce any historical test, recover the exact workflow file from the pre-purge repository history using the Git object SHA from commit history; never overwrite working code or fabricate source-art inputs.

## Protections and verification

1. No changes to `mrcalzon02/Tech-Priests` or any other repository; this purge is strictly `HB-TTRPG-tools`.
2. No edits to game code, Factorio Blender reconstruction scripts, sprites, private reference files, tests, or existing release assets.
3. No modifications to the **35 retained** workflow definitions. Release-deployment jobs and current R106/R107 tests remain active.
4. No blanket CI disable and no force-push. The purge is one regular main-branch commit, and final readback must confirm 35 workflows and the key active names.
5. Historical workflow-run entries remain visible in GitHub even after source definitions are deleted. This is not proof that GitHub Actions runner capacity increased or all previously queued tests executed.
6. Only objective function/build/runtime failures may block game releases. Visual/art source comparisons remain informative, non-blocking diagnostics.

**Recovery anchor:** the pre-purge `main` commit is `44ac5b26adaefa3eeae1608704b30b9f243e8dfb`. Exact deleted YAML can be obtained through Git history at that revision.
