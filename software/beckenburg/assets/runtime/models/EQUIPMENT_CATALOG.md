# Equipment models — asset-only handoff

The missing equipment geometry is authored and committed as real `.glb` files in
this directory. There are **112 new canonical tier models and 35 additional
physical-state models**. Existing matching props and the three recorder models
remain unchanged. The complete asset map covers **42 equipment categories × 3
tiers**; repeated references reuse the same physical file rather than duplicate it.

- Asset map, dimensions, hashes, source/license references, display-surface
  corners and mounting/optical/contact points:
  `development/assets/equipment-catalog/equipment-assets.json`
- Compact category/tier filename index:
  `development/assets/equipment-catalog/ASSET_INDEX.md`
- Editable Blender scenes, one per new equipment family:
  `development/assets/equipment-catalog/blender/`
- Compact texture atlases and model reference images:
  `development/assets/equipment-catalog/textures/` and `previews/`
- Full-catalog visual overview:
  `development/assets/equipment-catalog/equipment-overview.jpg`

New files use `blender_<equipment_id>_<tier>.glb`, with lowercase IDs and tiers
`1`, `2`, `3`. Extra forms use `_open`, `_lit`, `_burning`, `_deployed`, `_folded`
or `_node`. The JSON map is authoritative for reused models and available forms.

New models use metres, glTF +Y up, front +Z. Their lowest physical point sits at
Y=0. Blender source scenes use +Z up/front -Y and arrange the tiers side by side.
Original reused assets retain their original transforms. Source objects are
joined for compact exports; component names remain as vertex groups in the
editable Blender scenes. Display corners and named sockets are provided in
glTF coordinates. Flame/ember forms include emissive surfaces; lantern windows
and spectral prisms use alpha materials. Actual projected light, smoke, camera
images and live measurements must come from the game.

New electronics reuse modified Exploration Objects shells and texture UVs
(CC0, creator: https://elbolilloduro.itch.io/exploration-objects). D.O.T.S. uses
the owner's approved PSX Mega Pack vape shell, with new emitter and mount
geometry; retain that pack's game-use license. Other new shapes are original
procedural geometry. The asset map records every source model and SHA-256.
Original archives and existing runtime models have not been replaced.

## Online integration

Java source, build scripts and game tests are unchanged by this delivery.
Register the new names in `GlbProps`, select them from `EquipmentTierVisuals`,
and package the map's GLBs in the Windows/Unix build scripts. Preserve runtime
display overlays and alpha/emissive materials where appropriate. Keep the
existing procedural `TierModelForge` from overwriting the selected Blender
assets during packaging. Gameplay implementation is a separate online task;
these files do not claim completed equipment behavior.

Production sources: `development/assets/prepare_equipment_catalog.py`,
`build_equipment_catalog.py`, and `finish_equipment_catalog.py`.
