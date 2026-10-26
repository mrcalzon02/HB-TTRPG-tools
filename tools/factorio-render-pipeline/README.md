# Factorio Render Pipeline — durable Blender/Codex production procedure

**Status (2026-10-25):** documented production plan and setup entrypoint. No Blender render, sprite pack or Factorio runtime acceptance is claimed.
Home: https://mrcalzon02.github.io/HB-TTRPG-tools/ai-tools.html#factorio-render-pipeline

## Scope

Foundry → Tools → AI Tools → Factorio Render Pipeline. This is local-first and reusable across game projects. The static website cannot install Blender, run Codex, render 3D models or access user files. The Machine / AI Access directory remains a separate capability discovery and integration authority.

First target: https://github.com/mrcalzon02/Tech-Priests, current authoritative main branch. Known sprite families observed under tech-priests_src/graphics/entity/: hydrogen-thruster idle/run, thetazine-thruster, void-fusion-thruster idle/run/wide-idle/wide-run. Existing art is the rough before-state, NOT a source of trustworthy physical measurements.

Factorio 2.0 uses 2D sprites. The durable source should be actual editable Blender models and parametric scripts; the output should be fixed-camera transparent animation frames, shadow/emission passes and packed spritesheets.

## Safe Codex Linux environment

Python 3.10+, Bash, Git and a verified Blender binary (Blender 4.5 LTS recommended). Image helpers Pillow and PyYAML install to a private user Python venv by request. Do not silently install system packages or download unverified Blender binaries.

~~~sh
# ONE command, Windows PowerShell or Linux shell, in the Foundry checkout:
python tools/factorio-render-pipeline/bootstrap.py install --evidence-dir art-readiness

# Later, verify the installed workstation without downloading:
python tools/factorio-render-pipeline/bootstrap.py verify --evidence-dir art-readiness
~~~

The installer is the **single deployment entrypoint** for Windows x64 and Linux x64 with Python 3.10+. It pins official Blender **4.5.15 LTS**, checks the downloadable archive against Blender's official SHA-256 manifest, unpacks into a per-user cache without administrator rights, installs local Python image tools, runs a **real Blender CPU headless 96×96 transparent PNG smoke render**, and emits `readiness.json` plus `smoke-frame.png`. A bad checksum, incomplete executable, missing Pillow/PyYAML, wrong Blender series or failed render **returns nonzero and records blocked**. `--no-download` can be used to require an already-installed Blender 4.5 LTS.

The historical `setup-codex-linux.sh --setup` entrypoint now delegates to this canonical Python command. There is no second independent installer, no background service, and no app startup task. Run the same Python command later tonight on the desired Windows/Linux workstation after pulling the latest repository. This installs the local **art workstation**, not a finished 3D source generator or game sprite packer.

Override BLENDER_BIN to point at an explicitly installed and verified executable. Record the actual Blender/Python versions, OS, SHA and evidence. A successful preflight does not prove headless rendering or Factorio load.

## Expected target game layout

~~~text
art/
  specs/                       # per-asset source-derived calibrated manifest
  blender/template.blend       # camera, world and mount jig
  blender/parts/               # reusable parametric component library
  blender/assets/              # editable per-asset blend files and generators
  renders/<asset>/<state>/     # fixed-canvas numbered RGBA frames
  packed/<asset>/              # spritesheets and generated prototype metadata
  evidence/<asset>/            # input SHAs, output hashes, screenshots, logs
~~~

These game-specific artifacts belong in Tech Priests or another target repo, not in the Foundry tools checkout. Keep generated render caches and Blender installations outside version control.

## Mandatory gates and procedures

**A. Prototype truth and mount calibration**

Inspect the current mod Lua and inherited Factorio 2.0.77 entity/prototype definitions. Record prototype type/name, animation and rendering fields, selection and collision geometry, space-platform edge attachment, sprite shifts and scale, frame_count, line_length, animation_speed, direction_count, idle/active mapping, fluid/pipe ports, exhaust clearance and shadow behavior. Capture a before screenshot at a known zoom. Do NOT use fictional values from a planning example: no assumed 3×3 footprint, south exhaust, 512×512 frames or zero pivot. The proposed modeling convention of 1 Blender unit = 1 Factorio tile must be aligned against real world/prototype measurements. Unknown fields stay null.

**B. Reusable 3D source generation**

Create a tile-and-platform mount jig, orthographic/isometric camera calibrated to Factorio's appearance, fixed lighting, shadows and separate emission passes. Parametric thruster geometry should share a mechanical kit: body, mounting frame, chamber, nozzle/bell, rings, armor plating, pipe/cable connections, vents and field/glow details. Hydrogen should appear industrial, thetazine more advanced, void fusion heavier/more elaborate; retain a coherent material and faction design language. Save editable blend files and the generator code, not only output PNGs.

**C. Deterministic animation**

Define physically coherent idle and run rigs; support wide/directional variants only when actual prototypes require them. Render numbered transparent RGBA frames plus shadow and optional emissive layers using one immutable camera, canvas and registration pivot. Do not independently auto-trim each frame. Reject alpha halos, clipping, silhouette shifts and sprite animation jitter.

**D. Atlas packing and validation**

Pack fixed-size image cells into sprite sheets. Derive real frame_count, line_length, directional frame mapping, render shift/scale and prototype edits from measured metadata. Produce hash manifest and a contact sheet. Fail closed if any frame, pass or orientation mismatches. The actual Blender renderer and packer remain to be implemented as a separate engineering milestone: this document and setup script do not claim them.

**E. Real Factorio 2.0.77 acceptance**

On an isolated game copy, validate graphics load, space-platform edge placement, body orientation, nozzle exhaust away from the platform, all supported directions, idle/run animation, shadow registration and zoomed-out readability. Compare old and new at identical zoom and location. Record unedited engine logs and before/after screenshots. Keep old assets as a rollback candidate. Only commit accepted art integration to Tech Priests after actual proof; runtime/gameplay logic is not part of the initial art task.

## Prioritized targets

1. Hydrogen thruster — first calibration jig and complete idle/run model/sprites.
2. Thetazine thruster — same camera/mount family with differentiated geometry.
3. Void fusion thruster — reactor core and actual supported wide variants.
4. Cogitator stations, assemblers, micro-machinery, pipes, specialized machinery, components, effects and icons.

## Evidence states

Documented → environment checked → editable mesh generated → images rendered → sheet/prototype validation → exact Factorio loaded → visually accepted in game. No state implies the next. Keep the user's art modernization workstream separate from unrelated runtime behavior; do not bypass game release gates.

## Deployment verification and evidence

CI source checks run `python3 -m unittest discover -s tools/factorio-render-pipeline -p 'test_*.py' -v` and lint the wrapper. The separate `.github/workflows/factorio-render-environment.yml` workflow executes the actual one-command install and repeat verify on Ubuntu 24.04 and Windows 2022 runners. It uploads machine-readable readiness JSON and the PNG proof when available. Only mark an OS **ready** after its particular job passes. A GitHub runner's success does not install Blender on an end-user's workstation.

## Provided reference image

A user-provided 375 × 200 image of **three armored humanoid figures on a sandy/tan top-down background** accompanies this work order and illustrates model silhouette, scale and legibility targets. The original image is in the user's Tech priests Library. It is a **style/visual reference**, not evidence for thruster mount geometry, actual Factorio prototype size, or a Blender render. The website's optional local reference selector can display that image without uploading it to GitHub Pages. Its original PNG file cannot be committed until authorized file bytes are available in the repository editing environment. No synthesized replacement is substituted.
