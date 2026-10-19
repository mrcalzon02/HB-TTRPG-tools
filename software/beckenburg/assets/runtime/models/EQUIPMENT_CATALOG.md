# Equipment asset handoff

Use the exact assignments in `development/assets/equipment-catalog/equipment-assets.json`.
Do not derive filenames from equipment IDs or tier numbers.

The computer, sanity screen, activity screen, sound screen, site map, assignment
clipboard and objective board are **fixed van fixtures with no upgrades**. Their
three compatibility slots alias one physical asset. The computer uses the supplied
tower, CRT, keyboard and mouse with the original UVs and textures.

`HEALTH_SUPPLIES` separately maps to `FieldSupplies.Kind.HEALTH`: Basic bandage,
Improved dressing pouch and Advanced first-aid kit, with existing restoration
amounts 20/40/70 HP. Pouches are closed when carried and have separate open forms.
`SANITY_MEDICATION` separately maps to 18/36/65 sanity. Health items contain
bandages, gauze and scissors rather than sanity medicine.

All protective crosses have identical bounds: 180 x 20 x 280 mm. Materials and
construction change across tiers. Spirit boxes are radios. The resonance striker
is retained in a body-mounted dock. The incense bundle sits in the brazier's herb
bed. Writing leaves are blank.

For consumable material deposits, use the deployed model **instead of** the
carried model. Deployed salt is a continuous raised line, approximately 1 m long,
11 cm wide and 5 cm high. It contains no sack, shaker or dispenser. Deployed chalk
contains only markings, with no sticks, compass or stencil. Persistent instruments
such as projectors and sensor nodes retain their working hardware when placed.

## Review and production sources

- `development/assets/equipment-catalog/REVIEW.html`: searchable image gallery.
- `development/assets/equipment-catalog/previews/`: rendered GLB captures and
  available open, burning, lit, deployed and profile views.
- `development/assets/equipment-catalog/blender/`: editable packed Blender scenes.
- `development/assets/equipment-catalog/ASSET_INDEX.md`: compact filename index.
- `development/assets/equipment-catalog/REBUILD_PROVENANCE.json` and `rebuild-*.json`:
  selected original sources, hashes, materials and authored geometry.

Original archives remain unchanged. Matching source meshes retain original UVs
and texture artwork. New diffuse maps are packed into GLBs and Blender files.
Purchased packs are not redistributed as source collections. The prior sound
recorder asset family remains intact.

## Online integration

Register the JSON's exact paths in the renderer and packaging online. Fixed van
fixtures must not acquire store upgrades. Resolve health through `FieldSupplies`,
independently of the general equipment registry. Display corners and sockets are
included where authored; named source components and original screen materials
support the remaining integration. Live readings, writing, camera footage,
light, smoke, footprints and depletion remain runtime content.

Keep `TierModelForge` from overwriting selected assets. The rejected flat-swatch
generator and unused atlases have been retired. Reproduce the new asset pipeline
with `development/assets/rebuild_equipment_assets.py --blender PATH_TO_BLENDER`,
using Python with Pillow and the original local archive. This delivery includes
no local game build or game test.
