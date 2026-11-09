---
name: fmpl-asset-production
description: Reuse the versioned Factorio Modeling Production Library of approved PBR materials, candidate geometry, procedural Blender scripts and game sprite pipelines across authorized projects.
compatibility: Static FMPL discovery requires the public manifest. Native 3D operations require a pinned source checkout and authorized local Blender/Python or an existing self-hosted runner.
metadata:
  version: "1.0.0"
---

# FMPL asset production — cross-project skill

## Authorities

- Machine registry: `api/ai/fmpl-library.json` (read-only, immutable snapshot from the pinned canonical source)
- Human entrypoint: `ai-tools.html#fmpl-library`
- Canonical source: `mrcalzon02/Tech-Priests/tools/fmpl/FMPL.json` at the consumer's exact `module_commit`
- Consumer contract: `fmpl-consumer.json` (example in this repository)
- Runtime: existing host-local Python/Blender and authorized self-hosted GitHub runner; this website has **no remote modeling execution API**

## Procedure

1. Read the project's `fmpl-consumer.json`, acquire the exact 40-digit canonical commit and confirm the expected FMPL version with `fmpl_consumer.py`. If the consuming repo has no pin, first establish one using the verified canonical source; do not silently track a mutable main branch.
2. Query existing machine sources, candidate parts, procedural generators, materials and established Blender → four-direction sprite → Factorio export pipelines before creating geometry. Reuse approved standards, preserve the actual source ref/path, and minimize inference spent reconstructing existing geometry.
3. For the 320 de-atlased Greebles objects, distinguish geometry candidates from verified interchangeable components. Their original material slots are placeholders. The private native `Greebles.blend` requires the owner's authorized source cache, checksum, native reopen and visual review; do not mirror it publicly.
4. Treat fluid pipes, flange mating planes, pivots and 1×1 / 2×2 / 3×3 footprints as measured interface contracts. Do not infer Factorio fluid connection cells from visual-only mesh geometry or make a decorative fitting into a native functional port without prototype evidence.
5. Use the canonical material importer and existing scene build/render scripts. Preserve physical geometry, editable `.blend`, original-source hashes, fixed 45° camera setup, four orientations, standard/HR atlases, animation state and game registration evidence. Verify source, render, prototype and actual in-game integration separately.
6. Keep checkpoints recoverable, publish real visual evidence where authorized, and verify remote GitHub commits on the owning project. No unrelated workflows, no large-binary duplication, no force pushes, no fabricated Blender or Factorio runtime acceptance.

## Rights and status discipline

FMPL is reusable tooling, **not** blanket rights to Wube or third-party models, screenshots, textures or derivative assets. Official graphics and external sources may be valid reference material without being freely redistributable. The status of the canonical source governs promotions: a catalog listing, candidate GLB or exported image does not establish an owner-approved part or game-installed asset.

## Mandatory 45-degree camera capture contract (FMPL 0.4.0)

Before ANY production rendering, acquire the consumer-pinned FMPL and run the canonical capture_policy.py validator. Only one orthographic grid-aligned camera at elevation 45 degrees / zero azimuth may be persisted. Entity animations may use ONLY four 90-degree object rotations; an item icon gets ONLY one 45-degree view. The Blender camera guard removes all unapproved or temporary cameras from the in-memory derived master, records their names, and blocks source scenes where camera parenting would damage model geometry. Do not export arbitrary inspection stills or accept an unknown camera rig; the source .blend on disk is preserved.
