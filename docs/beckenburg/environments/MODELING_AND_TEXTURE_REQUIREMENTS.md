# Beckenburg PS-era Asset Modeling & Texture Requirements
These are production handoff specifications, not completed mesh or atlas assets.

## Required content format
Versioned mesh/texture asset package with stable name, intended scale, forward/up axis, pivot, bounding box, collision proxy, instance count, UV atlas ID and source concept refs. Mesh file should be importable by the selected Java renderer; asset validation must reject missing atlas or collision. Do not select a proprietary DCC format as the *only* source. Author target exports in glTF2/glb if renderer path accepts it; verify engine compatibility before requiring that pipeline.

## Cohesive materials
Stone masonry: 3 variations for exterior, interior and damp basement; wood: dark hardwood planks, weathered outdoor boards, painted boards; walls: plaster, wallpaper, cracked painted institutional; floors: worn tile, parquet, concrete, soil/grass. Props: glass, oxidized brass, blackened wrought iron, old linen/leather and spectral paint highlights. Reuse palettes across sites with site-specific trim rather than making nine unrelated art styles.

## Model acceptance categories
- Structural: 3m wall panels, interior/exterior corners, floor tiles, ceiling and pitched roofs, doors/frames, stairs, gate, fence, window; collision and occlusion required
- Interactable: doors, cabinets, drawers, electrical breakers, lights, switches, furniture, equipment placement sockets; stable server IDs required
- Dynamic: movable chairs, vases, books, tools, dishes, loose debris; bounded mass/impulse and predictable restitution
- Investigative: EMF instrument, thermometer, spirit receiver, ward tokens, camera, UV lamp and ritual vessel; recognizable first-person silhouettes
- Occult: site-specific ritual altars, mirror, funerary belongings, possessed props and spirit trails with sensory and gameplay markers

## Deliverable acceptance for each model
Reference approved original art ID; front/side/back visual confirmation at 320×200 internal game resolution; triangle count measured; UV atlas and scale correct; collision tested; in-engine screenshot matches reference silhouette; no missing dependencies; committed model source/export/image with remote SHA verification.
