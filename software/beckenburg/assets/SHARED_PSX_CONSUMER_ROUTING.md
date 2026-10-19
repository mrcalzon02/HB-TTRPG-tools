# Shared PSX asset routing — 2026-10-18

Source authority: [living Beckenburg asset index](https://docs.google.com/document/d/18G144Qd0-L5rL7NdqxMykqkXaBHtu8-ytr_yYPol6rI/edit). Original archives stay in the shared Drive library. This file routes *selected use cases*, not entire packs. The game-specific native queue is [ReverieVR PSX adoption](https://github.com/mrcalzon02/ReverieVR/blob/main/docs/project/PSX_ASSET_ADOPTION_QUEUE.json).

## Source state reconciled against main

The V3 converted-asset sources CV-001 through CV-019 (eight exploration tools, four GGBot vehicles, seven Kenney environment pieces) are now all **file-present** under `software/beckenburg/assets/runtime/models/`. `ImportedEquipmentModelsTest` checks twelve additional imported PSX equipment models, model triangle/texture data and tiered first-person output. This is not proof that *all* 19 assets are placed in levels or that a fresh Windows GUI release passes. Use the existing Java `GlbProps` / `SceneRenderer` pipeline, not substitute billboards. Keep CV source ID and original license family with each placement.

| Priority | Beckenburg-specific next application | Candidate source | Explicit gate |
| --- | --- | --- | --- |
| P0 | Finish equipment visual/functional acceptance across Tier I–III and ghost evidence devices | Existing `exploration_*.glb`, `dosimeter_*.glb`, `monitoring_screen_mp_1.glb`, `vape_mp_1.glb` | Model shown in relevant hand/van/mission view; numerically correct evidence; interactive tests and actual Windows build |
| P0 | Place van physical shell without destroying van entrance/rack exit geometry | `ggbot_car08_van_shell.glb` (CV-012) | Source rights + conversion identity; visible scale/camera angle; independent van collision/exit and scene fidelity |
| P1 | Urban house maps, streets and environmental controls | CV-013–CV-019 barriers/bench/dumpster/light/roads | Rights/readme review for their **separate** Kenney archive; real placement, coherent scale, room/door collision, lighting and map navigation |
| P1 | Castle/exterior estate trees with distance-fog LOD | Retro Tree Pack v1.0 (AS-003) | Choose measured GLBs, source hash and CC0 provenance, player navigation and low-cost draw at distance |
| P2 | Additional authored interiors or institutions | Victorian Study (AS-017), URBAN (AS-012), Classic 64 (AS-004) | Inventory internal archive members first, avoid duplicates and verify rights for sources outside the purchased Mega Pack |

## External consumers — avoid duplicate source-pack insertion

* **ReverieVR / Breakwater Battery:** three `.bwm` files already present for ammunition, concrete and wooden crates. Next are actually visible game scene placements, then rear-facing coastal tree LOD. These are not replacements for naval/infantry models.
* **ReverieVR / Red Ledger:** source declarations for fourteen curated `.rlprop` objects and twenty-five renovation-gated placements exist; private conversions must be included in a signed game content pack and read by the native host before claiming runtime integration. Keep all twenty-four actual Unreal product SKUs primary.
* **ReverieVR / Omega Front:** shared 2D tactical PNG derivatives are already documented in `asset_sources.json`. Bake only *new*, materially different overhead sprites; do not transplant Java GLB rendering into the existing 2D tactics code.
* **ReverieVR / Test Chamber:** use a controlled three-mesh switch/lamp/door scene to prove independently delivered assets and signed-pack rollback.
* **Ministry of Intelligence:** trees and selected world structures only for historically consistent aerial photo terrain. Modern vehicles/electronics should not be used without justification.
* **Gumball Armada:** station/spaceport shell candidates only after deliberately candy-themed reshaping/retexturing; preserve bespoke enemy craft.
* **The Mechanist:** existing 2D tile atlas is authoritative; only bake matching original-source industrial overhead variants if a missing tile class is proven.
* **Minecraft modpacks, Continuity Works, Valheim Magenheim, DOS/OpenRA emulators, and native classic chess:** no generic PSX mesh replacement. Preserve their respective art/rendering specifications.

The owner-purchased PSX Mega Pack has one commercial game-use license for its contents. Expanded v2.9-preview files must not be passed off as the separate labeled v3.2.1 archive without proof. AS-012–AS-018, NOX SOUND and external shaders are **not** part of that one license. Never redistribute raw purchased archives as a free source library. Status words must distinguish Drive-only, checked-in geometry, compiled/rasterized, live playable, and device-accepted.
