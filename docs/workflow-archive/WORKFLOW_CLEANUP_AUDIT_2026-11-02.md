# GitHub Actions workflow cleanup audit — 2026-11-02

## Scope and baseline
Repository: `mrcalzon02/HB-TTRPG-tools`, single `main` branch.
Before cleanup: **121 active workflow YAML files**; **57 Factorio-related** and **64 other** including the malformed one-time Charles integration.
After the cleanup: **84 active workflow YAML files** (63 non-Factorio; 21 Factorio).
Historic R41–R93 recipes are archived below, **not deleted from version history or source**. Their Python source, saved GitHub Actions run records, and any unexpired artifacts remain unchanged. R94–R107 and primary source/runtime environment workflows stay active. This archive is intentionally OUTSIDE `.github/workflows` so GitHub does not schedule it.

## Actual trigger errors and remedies
1. `.github/workflows/one-time-charles-js-integration.yml` contained syntactically broken YAML (embedded Python triple-quoted JS text was indented out of the literal YAML run block); recent unrelated pushes generated a failed workflow with **zero jobs**. Original full content preserved verbatim in `docs/workflow-archive/one-time-charles-js-integration.yml.txt`, including a warning. Not marked as successfully integrated or completed.
2. `factorio-render-pipeline-validation.yml` had a recursive wildcard triggering a procedure run on every markdown research note. Replaced with scoped Python, shell, JSON, requirements and UI triggers, retaining both pull-request and push validation. Newer pushes supersede obsolete queued procedure checks through **concurrency cancel-in-progress**, but do **not** alter the standalone native Blender candidate experiments.
3. `factorio-cut-rear-fin-extension-r107.yml` incorrectly pointed to `output/r103` inside R104 download even though its source Blender artifact actually stores `output/r104`. Fixed to `output/r104`. Both R106 and R107 remain enabled.
4. Generic GitHub `pages build and deployment` is associated with Pages automation and cancelled predecessors. **Preserved unchanged**: do not disable site publishing to quiet a dashboard.

## Archived historic one-off workflows (36)
All 36 were inspected by filename and path, and their own YAML controls were sampled/reviewed. Their historical tests can be recovered by moving an archived `.yml` recipe back to `.github/workflows/` in a new normal commit. They were NOT active queue members at the audit and archiving them is primarily **Actions UI decluttering**, NOT a claim that runner capacity is restored. No artifact contents are uploaded into archive.

- `factorio-authentic-source-hinge-remesh-r89.yml`
- `factorio-existing-baffle-section-r76.yml`
- `factorio-hinge-mesh-ownership-r88.yml`
- `factorio-native-nozzle-isolation-r75.yml`
- `factorio-original-bespoke-cast-contours-r87.yml`
- `factorio-original-blunt-fin-tips-r81.yml`
- `factorio-original-hinge-roll-isolation-r93.yml`
- `factorio-original-left-right-cast-mix-r92.yml`
- `factorio-physical-refractory-lap-r74.yml`
- `factorio-r41-occlusion-diagnostic.yml`
- `factorio-r42-shell-preview.yml`
- `factorio-r51-mount-fast.yml`
- `factorio-r56-mounted-fins.yml`
- `factorio-r59-bell-visibility.yml`
- `factorio-r60-refractory.yml`
- `factorio-r61-inward-refractory.yml`
- `factorio-r62-real-refractory.yml`
- `factorio-real-combined-cast-optimization-r85.yml`
- `factorio-real-independent-center-ears-r79.yml`
- `factorio-real-refractory-form-r71.yml`
- `factorio-real-source-fin-taper-r80.yml`
- `factorio-real-source-hinge-knee-combinations-r91.yml`
- `factorio-real-source-knee-guard-sweep-r90.yml`
- `factorio-refractory-first-hit-r73.yml`
- `factorio-source-fin-mount-ears-r77.yml`
- `factorio-speculative-source-cast-sweep-r84.yml`
- `factorio-straight-fin-side-sweep-r83.yml`
- `factorio-straight-real-fin-spines-r82.yml`
- `factorio-thruster-appearance-r70.yml`
- `factorio-thruster-cast-exposure-r65.yml`
- `factorio-thruster-full-cycle-r67.yml`
- `factorio-thruster-mount-loadpath-r63.yml`
- `factorio-thruster-native-two-page-r68.yml`
- `factorio-thruster-saved-cast-r66.yml`
- `factorio-thruster-source-motion-r69.yml`
- `factorio-thruster-upper-hull-r64.yml`

## Retained on purpose
- The current fin-end geometry verification jobs **R106** and **R107** and their original Blender source input chain **R94–R105**.
- The shared Factorio render procedure validation, Blender workstation smoke, official reference library, public sample import, capture batch.
- All production Pages, deployment, package, Barotrauma, Blacklight, portfolio and other unrelated project workflows.
- No scheduled workflow, in-progress test, or production release job intentionally disabled.
- Release-blocking criteria remain limited to objective build/install/launch/runtime functionality; source-image fidelity and aesthetic comparisons remain diagnostics.

## Verification policy
* Read back the final `main` branch and both the archived workflow byte-content/SHAs and removal from `.github/workflows`.
* Check the next relevant CI runs rather than assuming success.
* In case of long GitHub runner queues, do not reinterpret `queued` as `passed`, and do not disable retry/watch schedules.
