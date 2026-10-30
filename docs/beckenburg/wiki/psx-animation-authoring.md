# PSX Animation Authoring — Curated Engineering Reference

**Source:** owner-supplied **PSX animations gold-1.pdf**, 8 pages, SHA-256 `e23ca682ac405dec241b256aabf484ce541554aac56065f733749e7895a549e7`. **Status:** selectively adopted for Beckenburg's Java 17 PSX-styled runtime and portable editor kit. [Machine source/disposition ledger](https://mrcalzon02.github.io/HB-TTRPG-tools/api/psx-reference-ingestion-2026-10-30.json). This is a source-informed reference, not a promise that all historical PlayStation techniques are in game.

## What has actually been wired
**ANIMATE** on the Beckenburg developer editor toolbar opens the portable `EditorAnimationLab`. `EditorAnimationClip` provides named, independent rigid-part pose tracks, 15/30 FPS keyframe timelines, stepped and optional linear authoring previews, a distinct root-displacement track, bounded 8,192-key clips, first/last-preserving pruning of redundant stepped poses, and an atomic, diffable `.anim` document. A local XY puppet preview and key editing afford direct authoring without installing Blender. Automated `EditorAnimationClipTest` covers playback, key pruning, root-motion separation, format round-trip and bounds.

**Scope boundary:** the editor lab does not yet animate an actor in gameplay, import Blender/FBX/glTF animations, drive the ghost controller, bind collision boxes, alter multiplayer authority, or produce a compressed runtime binary. An authored file is a *clip source* only; those integrations need real adapters and test cases.

## Selective adoption, with source pages

| Source pages | Guidance to adopt | Implementation and caveat |
| --- | --- | --- |
| 1 | Rigid segmented mesh hierarchy vs vertex-keyframe morphing; independent parts; keyframe reduction | Rigid-part named pose authoring exists; morph vertex streams and joint hierarchy parenting are planned |
| 1–2 | Low-resolution preview, vertex snap, cycle/memory estimates | Existing game renderer offers retro profile; animation lab has a 2D projection, not true render-parity 3D animation preview. Profiling integration planned |
| 2 | Hierarchical transform reuse, offline constraint bake, interleaved clip data | Architecture targets; no claims of full hierarchy or pre-bake yet |
| 2–3 | 15/30 Hz sampling, separate locomotion root from local mesh motion, UV swaps | Implemented discrete sampling and isolated root track; UV-animated faces planned |
| 3–4 | Readable extreme key poses, optional stepped interpolation, one-frame impact, texture palette | Recommended **style profile**; not mandatory for every game, animation, cutscene or accessibility mode |
| 4–5 | Detect disconnected joint gaps, broken limb pivots, atlas bleeding, excessive key density | Diagnostics/rig structural tests planned; do not turn intentional visual tricks into broken collision or invisible entities |
| 5–7 | Dialogue gesture injection, optional portrait mouth swaps, hit-stall poses, genre-specific locomotion | Game-specific authoring templates planned; Beckenburg ghosts must remain host-controlled and telegraph abilities fairly |
| 7–8 | Track camera shots separately; avoid decoupled camera/actor poses | Camera track support planned; only apply deliberate low-frame styling where legible and comfortable |

## High-priority next acceptance tasks
1. Register actual rigid-part hierarchy and pivot validation (parent-loop rejection, joint-gap preview, protected head/hand/feet sockets). Keep scene collision independent from visual animation.
2. Add true 3D pose preview with the **same** renderer, materials and lighting as gameplay; bind imported GLB submesh identifiers without destructive conversion. The current GLB geometry-regression importer loses part identities on reduction: fix before moving character rigs across.
3. Add keyframe timeline channels for UV/texture swap, event markers and telegraphed strike moments. Never let an animator grant visibility or a strike independent of game rules.
4. Add an optional, non-destructive fixed-point/15-bit/nearest-neighbor visual profile, not forced true-PS1 CPU restrictions. Profile clip memory/CPU and warn without blocking releases for stylistic issues.
5. Define `AnimationRuntimeAdapter` to map validated clips to existing `LanGhostAnimation` phase messages, preserving host authorization and preexisting visibility rules. Test solo/LAN parity **before** calling runtime integration complete.

## Rejected hardware-era mandates
The document presents historical PS1 limitations as absolutes. Beckenburg is **not** a native PS1 executable: do not require fixed-point GTE, intentional input lag, broken Z behavior, disabled modern collision, disabled dynamic lighting, visible limb gaps, floor clipping, 320×240-only readable UI, or obsolete RAM caps. The source itself contains inconsistent Z-buffer claims; preserve its art-direction idea rather than treating that as a runtime specification. A true retro look should remain a chosen rendering/animation profile, without making UI text, navigation, tools, or ghost fairness worse.

**Release rule:** visual style, clip density and silhouette differences are *diagnostic*. Only game functionality/build/launch/essential multiplayer breakage may block a release.
