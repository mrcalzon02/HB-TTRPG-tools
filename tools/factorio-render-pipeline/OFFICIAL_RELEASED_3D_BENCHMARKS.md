# Authentic released 3D Factorio references — verified 2026-10-29

## Important new OFFICIAL public resource

Wube Software **released 15 model sets / 65 individual 3D printable models / 247 STL variants on 2026-09-25**. The models and official discussions are available at:

- Wube official release: https://factorio.com/blog/post/fff-447
- Official Wube Printables profile, complete 15 sets: https://www.printables.com/@WubeSoftware/models
- Prusa independent corroboration: https://blog.prusa3d.com/factorio-has-arrived-on-printables_138519/
- Official Assembling Machine: https://www.printables.com/model/1801944-factorio-assembling-machine
- Official Transport Belts: https://www.printables.com/model/1801951-factorio-transport-belts
- Official Inserters: https://www.printables.com/model/1801917-factorio-inserters
- Official Electric Mining Drill: https://www.printables.com/model/1801935-factorio-electric-mining-drill
- Official Player Character: https://www.printables.com/model/1801957-factorio-player-character

All 15 Wube Printables sets as listed on 2026-10-29: Factorio Assembling Machine; Belt Items; Biter; Biter Spawner; Chests; Electric Mining Drill; Inserters; Player Character; Small Electric Pole; Spitter; Steel Furnace; Stone Furnace; Transport Belts; Walls; Worm.

**Not present:** the Space Age *thruster*. Its authoritative actual target remains the privately user-supplied 2.0.77 64-frame, 264×542-per-frame original sprite atlas and Wube 2.0.77 prototype. No source engine Blender model was released in the official 15-set printable catalogue. Never claim the printables are the original proprietary production .blend models.

## Scope and critical limitations

Wube's own Friday Facts #447 says that **in-game art starts as 3D**, yet isometric projection often depends on deliberately nonphysical geometry, distinct North/South versus East/West dimensions, free-floating production parts and dramatically exaggerated visual heights. The official September 2026 printable series was **reworked/redesigned for 3D printing**, reconstructed backs and invented dark-space geometry, altered supports, connectors, poses and tolerances.

Thus the STL releases are **developer-origin evidence for recognizable front silhouettes, separate-part assembly, proportions and 1-tile grid relationships**, but NOT ground truth for production camera, render lighting, shader roughness, unseen mechanisms, thruster dimensions or the source Blender coordinate system. In particular, do not calibrate the render camera from STL alone or apply the print scaling in millimeters directly to Factorio 2.0.77 tiles.

Official Printables models are displayed with **Creative Commons Attribution–NonCommercial** licensing on specific listed model entries. Before using any, verify that model's individual page/license. Keep the STL/3MF reference bytes and all converted meshes LOCAL/PRIVATE; do NOT add to GitHub, official game archives, exported mod assets, releases or public workflows; obtain explicit permission for any commercial or redistributed use. Our own JSON stats and comparison methodology are independent and may be committed.

## Priority comparison against the current Blender rig

| Priority | Official Wube set | Source geometry question | How to assess |
| --- | --- | --- | --- |
| 1 | Transport Belts | Scale of one Factorio tile / grid modules; orthographic projection and floor integration | Import a verified standard module, use game sprite at fixed 2.0.77 camera, compare silhouette and perceived height |
| 2 | Assembling Machine | 3×3 mechanical proportions, complex cast panels / thickness / overlap | Compare official STL visible silhouettes to in-game vanilla sprite, **not** unknown inside machinery |
| 3 | Inserters | Segment articulation, root mounts, opposed open/closed arm poses | Compare original source sprites and printable variants. Do not adopt print-join tolerances as in-game animation rig |
| 4 | Electric Mining Drill | Multiple layers, apparent exaggeration of height in original isometric asset | Flag Wube's explicit warning about orientation-dependent geometry |
| 5 | Stone/Steel Furnace, Chests | Shadows, baked industrial grime, sheet / cast surface mixing | STL only supplies geometry; game sprites remain sole material and lighting authority |
| 6 | Player Character | Independent reference for 3D source silhouette | Printable poses nonrigged; different target from stationary machines |

No official thruster STL in these fifteen sets. For the ongoing rocket work: continue direct comparison of source animation vs saved R58 candidate; use official machine STLs primarily to improve reusable camera/grid/projection calibration and source sprite matching methodology.

Other useful NON-OFFICIAL sources:

- https://github.com/lawlessc/factorio_base_model — a public 2022 Blender `factorio_basic.blend` with an orthographic camera, light/shadow and reference reflection. **No LICENSE file, no verified reuse grant**; inspect for ideas only unless permission obtained. Not an official benchmark.
- https://mods.factorio.com/mod/cma-graphics — independent CC0 animated Factorio-style sprites. The mod page says modelled in Blender, but the publicly listed materials are sprites and *no original Blender .blend source is verified there*. May be useful for rendering/pipeline tests, not canonical Factorio geometry or lighting.

## Actual files and acceptance gates

Download Wube models from official model pages on the user's own side, retain their model author/license metadata and keep files out of the public repository. Run `python tools/factorio-render-pipeline/audit_official_stl_references.py --stl-dir /private/wube-reference-stls --out /private/official-factorio-geometry-audit.json`. This reads STL geometry only, never calls third-party services or uploads assets, and records mesh counts, real raw STL units/bounds, inferred shape ratios and SHA256 for provenance. Optionally use `--include file_name` to audit one set.

**Not yet done:** actual STL files have not been downloaded or inspected in Blender; no rendered geometry has been compared or corrected based on an official STL, and no factorio camera/lighting change is justified by this source discovery alone. After downloading the verified models, convert standard STL millimeter/grid scale against Wube belt tiles and original sprites privately; then render under *unchanged* Factorio source camera/light and run same-camera silhouette/first-hit tests with the existing R58 workflow. Maintain the ordinary DEEFM execution evidence: imported real file → native capture → compare original sprite → only then adjust or claim success.
