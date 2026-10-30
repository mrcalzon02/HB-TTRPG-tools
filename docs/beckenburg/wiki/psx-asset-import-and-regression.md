# PSX Asset Import, Reduction and Over-Regression

**Authority:** owner-supplied *Developing assets for the PlayStation 1 (PSX) architecture.pdf* (13 pages). This guide is a curated engineering adaptation for Beckenburg's Java 17 **PSX-style modern runtime**, not a claim that the game runs on original PS1 hardware. **Implementation checkpoint:** 2026-10-30. [Architecture](https://github.com/mrcalzon02/The-Beckenburg-Project/blob/main/docs/development/PSX_RUNTIME_AND_EDITOR_SUITE_ARCHITECTURE.md) · [Machine rules](https://mrcalzon02.github.io/HB-TTRPG-tools/api/psx-asset-import-reference.json).

## Core import workflow
1. Open the developer level editor and select **IMPORT MODEL** from the toolbar or Assets dock.
2. Choose **OBJ**, **STL** (ASCII/binary), or glTF 2.0 **GLB** with embedded PNG textures. These are the **implemented readers**. A text **.gltf**, FBX, DAE/Collada, PLY, USD/USDZ and Blender project files are **not** silently accepted as working native readers.
3. Preview the **source** and **reduced derivative** side by side with live triangle and named-part counts. Choose an advisory asset budget and geometry regression level 0–12. Level 0 retains geometry and an original GLB byte-for-byte; increased levels use deterministic spatial vertex clustering.
4. Review explicit warnings for excess source size, estimated CPU triangle memory, large decoded texture memory, vanishing parts and style-budget excess. Preset budgets are **advisory**, never game-release gates.
5. **OVER-REGRESSION** identifies a named OBJ group/part that loses nearly all its faces or unique positions. A head, arm, wheel or separate prop section may become a flat remnant or disappear entirely. If all drawable triangles collapse, **Publish** is disabled; partial collapse requires an explicit confirm. The source remains untouched.
6. **Publish** writes a bounded GLB derivative and original input to the user's own `~/.beckenburg/editor/imports` library, plus source hash, sizes, regression level and warnings. It uses the real `GlbProps.decode` before registration; the game/editor references the same `import_<hash>` ID in scene saves. Imported items appear under **Models / Imported**. Place using the normal PROP tool and save the Castle scene.

**Important limitation:** reduction currently clusters vertices; it is not curvature-aware, bone-aware, silhouette-aware or a production quadric-error-metric decimator. OBJ `o`/`g` names preserve analysis boundaries; the current GLB decoder flattens named mesh-node identity to one `GLB assembly` part for reduction analysis. A GLB imported at level 0 retains its original embedded textures. When reducing a GLB, the generated derivative currently uses an explicit checker fallback atlas and **does not retain original material/rig/named-node identity**; the UI warns and requires confirmation. OBJ material libraries/MTL links are not yet converted; STL has no material UVs. Neither format conversion nor LOD conversion grants a source model redistribution license. Source-copy policy is user-local by default, not a global repository upload.

## PSX source rules — selective adoption

| PDF section/pages | Adapt into modern editor | Do **not** import as literal runtime defect |
| --- | --- | --- |
| Core do/don't, pages 1–2 | Warnings for small texture atlases, palette/nearest-neighbor style, polygon/VRAM estimates, affine-warp simulation as an optional rendering profile | Force all art to 16–256px, remove modern depth testing, break textures, or require integer-space physics |
| Puppet characters, pages 2–3 | Preserve named head/arms/torso parts, origins, joint clearances, distinct facial/texture variants and multiple authoring LODs | Flatten animation rigs or destroy weights automatically during import |
| Vehicles, page 4 and page 9 | Keep roof/hood panels and independent wheels visually distinct; caution against over-aggressive reduction | Replace 3D wheels with 2D sprites as a required rule, or deliberately make van models look like cardboard |
| Visibility/LODs, pages 6–7 and 10–11 | Separate near/far variants; protect important silhouette edges. Far LOD can be cheap; near LOD must remain readable | Assume a single camera or hardcode historical PS1 draw-distance limits across Beckenburg |
| Genre assets, pages 7–10 | Distinguish weapons/pickups from architectural props; preserve gameplay-significant contours and mechanical attachment points | Automatically collapse first-person weapons to single planes regardless of functionality |
| Textures/lighting, pages 11–12 | Optional palettization, quantization, nearest-neighbor and baked-detail authoring in harmony with unified LightingModule | Make the game unlit or bypass authoritative dynamic occlusion/flashlights |
| Architecture, page 13 | Room/portal visibility cells, modular repeated surfaces and useful art-direction hints | Reinstate fog-as-mission-condition selector or artificially clip collision to mimic hardware |

The PDF's representative budgets are **style references**, not universal targets: under ~100 triangles for simple props; ~300–800 for characters; up to ~1,200 for particular close-up fighters. Level-of-detail variants can legitimately be far smaller. Other PSX source claims are historically framed and must be checked against actual modern rendering behavior before engineering decisions. We maintain collision fidelity, depth handling, memory safety, functionality, and accessibility.

## Safety and budget contracts
- Read only finite geometry from files of at most 32 MiB; cap raw triangle count (120,000). Use non-blocking SwingWorker ingestion and regression to avoid freezing the game editor.
- Export currently supports at most 16,000 triangle-soup triangles per model and 4,000,000 bytes per GLB, reflecting **the current real game decoder**, rather than arbitrary nominal PS1 budgets.
- Estimate CPU triangle storage separately from actual source file size and decoded image texture bytes; do not claim these are exact GPU/heap allocations. Profiler instrumentation is a separate next step.
- Preserve the source original and SHA-256 alongside output, with atomic file replacement, safe stable IDs, bounded local library scanning, and no executable authoring tool dependency.
- Don't fetch arbitrary remote URLs inside the importer, execute scripts embedded in source data, or treat source texture/asset licensing as automatic.
- Source and optimized mesh are compared in the UI; a regression warning is **editor diagnostic**, not a CI release blocker.
- Require a pre-publish real decoder check and a saved-level round trip. A successful build proves compilation, not visual parity or game balance.

## Implementation and verified-vs-planned scope

**Implemented source paths:** `editor/EditorMeshPipeline`, `editor/EditorGlbWriter`, `AssetImportDialog`, `ImportedAssetLibrary`, `GlbProps`, `CastleLevelEdits`, `CastleEditorProject`, `EditorPalettePanel`. Automated tests: `editor/EditorMeshPipelineTest` (portable), `AssetImportRuntimeTest` (native GLB decoder and persistent placement). Check the matching Actions jobs for actual outcome; do not infer success merely from an implementation commit.

**Next import upgrades:** native JSON glTF 2.0 + external buffer/image resolver constrained to an import sandbox; PLY support; material/texture MTL conversion; original GLB node/group-aware reduction; part locks and important-bone/socket protection; UV island/material seam preservation; silhouette/normal/rig integrity tests; faster quadric-error simplification; multiple LOD exports and draw-distance preview; texture quantization and atlas bake with exact estimated texture heap; automatic metadata/permissions provenance; asset repair and unreferenced cache cleanup. **Original high-resolution assets and approved low-poly sibling exports remain separate artifacts under the established asset archiving policy**, with their own verified storage destination.

**Release rule:** only objective build, launch, essential function and required multiplayer failures can block delivery. Model style, polygon count and over-regression thresholds are authoring warnings; the editor may disallow exporting an actually empty GLB because the current runtime cannot render it.
