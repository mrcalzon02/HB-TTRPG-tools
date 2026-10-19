# Beckenburg — mandatory source-adjacent LOD preservation

Owner requirement: **Every reduced-polygon derivative must be uploaded beside its original model** in the approved shared Google Drive library. This applies to the ReverieVR games, Red Ledger, Breakwater, Omega Front, Beckenburg and future projects.

## Required workflow
1. Locate the **actual original** in Beckenburg Drive and record its stable file ID, parent folder ID, filename, format, byte count and SHA-256; never assume a ZIP member path identifies the extracted file.
2. Produce an optimized **portable `.glb`** with the original author's actual mesh topology and UV/material provenance. Engine-specific `.bwm`/`.rlprop` derivatives are additional deliverables, never the only reusable LOD. Preserve source proportions unless a game-specific transform explicitly documents them. A static, unrigged model may never be called animated.
3. Name `<original-stem>_LOD1_<triangle-count>tris.glb` for the first reduced version. Further revisions use the next LOD level or an explicit version suffix; don't silently overwrite earlier accepted low-poly derivatives.
4. Upload that **individual GLB into the exact parent folder containing its original**; write `<lod-stem>.lod.json` beside it recording both file IDs, source SHA-256, LOD SHA-256, triangle counts, material/texture reductions, conversion parameters, rig state, targeted engines, and QA status. Keep originals in place and unchanged.
5. **Read back the Drive directory/metadata** and confirm that source and derivative are both present and share the exact original parent folder ID. Verify reported byte size against local file and file IDs against the registry. If any write/readback fails, classify/retry transient connector issues and **do not claim uploaded or accepted** until verified.
6. Add/update `owned-models-lod-registry.json` (source ID and LOD Drive ID) and the Beckenburg living index. Mark game runtime acceptance only after the corresponding source selection is loaded/drawn; verify actual device and frame budget separately.

This gate is additive: the shared Drive stores source + reusable GLB LOD side by side. Game repos contain only specifically selected runtime-usable assets. Do not dump paid asset packs, change a high-resolution original, use proxy primitives masquerading as imported art, or delete rigging source.

## Completed provenance-backed registrations

`owned-models-lod-registry.json` records the confirmed 2026-10-18 side-by-side uploads:
- `boat.glb` → `boat_LOD1_1180tris.glb`
- `APC.obj` → `APC_LOD1_1944tris.glb`
- `gopnickboss character 3d model.glb` → `gopnickboss character 3d model_LOD1_6792tris.glb`
- `woman in pink dress 3d model.glb` → `woman in pink dress 3d model_LOD1_6918tris.glb`

Source assets and LOD companions are static in the game runtime, with no skeletal animations claimed. These LOD files were opened as real glTF 2.0 meshes and their triangle counts checked. Galaxy S9 graphics performance is a separate pending gate.
