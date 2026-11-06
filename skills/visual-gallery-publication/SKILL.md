---
name: visual-gallery-publication
description: Publish newly generated project art, rendered model GIFs, screenshots and approved reference sheets into a genuine, verifiable GitHub project gallery as part of visual-content delivery. Use when creating or revising game visuals, models, textures, turntables or promotional concepts for a user's project.
compatibility: Requires a writable repository plus readable generated image files. GitHub verification requires a connected GitHub API or equivalent git push/readback; optional Python 3 for hashing. A text-only host cannot pretend to upload binary media.
metadata:
  version: 1.0.0
---

# Visual gallery publication — default production gate

Whenever the current task generates **project visual assets**, publish the approved results as Git-tracked gallery media in the owning repository **within the same work iteration**, not merely as conversation images, sandbox links or a private Drive document. This portable skill records the user-approved cross-project policy, originally applied to the Sitka boat progression gallery.

## Mandatory execution sequence

1. Identify the actual owning project/repo, its current main HEAD, gallery convention, accepted visual source and distribution rights. Never publish unrelated art, private user images or third-party material without permission. Current authoritative project instructions can narrow scope, but do not erase the explicit visual-publication requirement.
2. Generate or export the **real requested asset**. Distinguish screenshots, geometry renders, concept images, external references, and edited source art. Never substitute an unrelated generated picture for an actual model render. Keep original scene/mesh/texture/source instructions and original high-resolution file available for audit where permitted.
3. Create GitHub-friendly preview files (small JPG/PNG/WebP review sheets and full-frame animated GIFs where requested), preserving enough resolution to judge model silhouettes and progress. Archive full-resolution originals in existing authorized Drive/Git storage where appropriate.
4. Publish **actual binary media files into the repository** in its review gallery, preferably `docs/gallery/<project>/<collection>/<date-or-batch>/`, with a `README.md` displaying/linking every file, a `gallery.json` with source commit, rights/provenance, each file byte count and SHA-256, and GIF dimensions/frame counts. Link the gallery in `docs/gallery/README.md` and the project's development record.
5. Run the project's model/render validations plus gallery-integrity checks; verify file hashes, real GIF frames, correct links and no missing files. If an image export changes, regenerate the index/hash manifest. Avoid labeling model-only previews as running-game captures or verified hardware results.
6. **Commit and push to the authorized `main` branch with no force push**, read the resulting SHA and confirm files are present on GitHub. Supply a clickable public gallery link and exact commit. If a connector cannot upload binary files, do not claim the gallery is published; use a supported binary upload or clearly identify the blocker.
7. Carry forward open model-refinement defects and mark whether visuals are planning assets, source-only models, or already integrated into playable game runtime. Only actual released/runtime evidence can change these statuses.

## Reusable verification and publisher

The implementation reference lives in [ReverieVR's repository](https://github.com/mrcalzon02/ReverieVR/tree/main/scripts/gallery). The default commands in an authorized checkout are:

```sh
python3 scripts/gallery/publish_generated_images.py --help
python3 scripts/gallery/verify_generated_gallery.py
```

The publisher stages images locally and validates them; it does **not** authenticate, push, or prove a remote commit on its own. The git/connector step and remote readback are mandatory after staging. Existing repositories with their own gallery structure should adapt this schema instead of duplicating images into unrelated paths.

## Evidence example

[The 18 real-geometry Sitka boat turntables](https://github.com/mrcalzon02/ReverieVR/tree/main/docs/gallery/sitka/boats/2026-11-05) were published as **18 GIFs and four static review sheets**, independently verified by a GitHub Actions gallery job. Their full-resolution originals remain on Drive. The physical models are rough blockouts, not 18 registered in-game vessels; the synthetic boat-navigation tests are not actual Sitka boating telemetry.

## Boundaries

This is a repeatable authoring/checklist skill, **not an autonomous service or background publisher**. It grants no provider credentials, repository write permissions, GitHub release authority, image-generation capability, engine integration, or rights to publish private images. If GitHub connectivity is disabled, provide the local outputs and report the unsatisfied upload gate instead of falsely saying the work is complete.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

Origin: Requested by the project owner for generated development images on 2026-11-05. First verified GitHub implementation: ReverieVR Sitka gallery commit `6708b2a27e3341977b8b50c6a97d0096f96e0860`. Inherit the canonical `blacklight.charles` persona from the shared registry; do not replicate or modify the engram.
