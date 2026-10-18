# Rigged PSX-style character bases — original source archives

These are the **actual downloaded mesh archives uploaded to the Beckenburg Project Google Drive folder**, not unrelated search-result artwork and not substitute placeholder silhouettes.

| Original archive | Bytes | SHA-256 | Native content |
| --- | ---: | --- | --- |
| `Female Lowpoly Mesh.7z` | 103235 | `9f26e0aeb754413e16cfb2ec002127aeb4c2c2f55604969422cdf1606cec664a` | `Female Lowpoly Mesh/Female Lowpoly Mesh.blend` (1,031,096 bytes; Blender 3.5); a matching `.blend1` backup; `Imp.png` |
| `Male lowpoly Mesh.7z` | 94063 | `3d2e9ecee9d0f241ee23aaddcdf539a8eddc709fe4d1f67aac1c6901b898f317` | `Male lowpoly Mesh/Male Lowpoly Mesh.blend` (623,524 bytes; Blender 4.0); an older `.blend1` backup; `Imp.png` |

## Provenance and reuse

- Creator: **Titanium Rat**, source: https://titaniumrat42.itch.io/lowpoly-female-mesh and https://titaniumrat42.itch.io/lowpoly-male-mesh .
- Both author-authored download pages identify these models as **Creative Commons Zero v1.0 Universal (CC0)**. Credit is appreciated but not required. The original archives contain no separate license file; the licensing evidence is the publisher's original asset pages, not a guess from archive content.
- The two pages explicitly describe the models as **already rigged**, with articulated head/neck rigs and (for the male) torso. The native scenes must be opened in Blender to verify rig anatomy, bone counts, mesh/material assignments and deformation before treating them as ready for player animation.
- Uploaded originals were retrieved from the **Beckenburg Project** Drive folder: https://drive.google.com/drive/folders/1IW8c_FO1YkkLkVWQyRqhKmRBd1S5Ql8R .
- Keep archives intact as immutable upstream source; changes belong in separately named derivatives. Do not mistake these CC0 base meshes for the fully dressed hunter designs or for the existing approved game concept art.

## Conversion to game-oriented 3D

Beckenburg's current Java software renderer draws its own triangles and uses approved directional PNG sprites for hunter/ghost depictions. **It cannot directly render `.blend`, `.7z` or `.glb` models yet.** The sources are staged and licensed, not secretly wired in as finished 3D character animations.

After extracting the `.7z` archives, run the reproducible Blender export tool from the repository:

```sh
blender -b --python software/beckenburg/tools/export_character_base.py -- --blend "Female Lowpoly Mesh/Female Lowpoly Mesh.blend" --out "female-base.glb"
blender -b --python software/beckenburg/tools/export_character_base.py -- --blend "Male lowpoly Mesh/Male Lowpoly Mesh.blend" --out "male-base.glb"
```

The exporter checks for actual mesh and armature objects and emits JSON sidecar statistics and a GLB. It **does not create or assert animations** that the source may not have. The GLB remains a review/export artifact until a real rigged-model runtime and animation path is implemented. Packaging these GLBs into the Java game requires a separate tested renderer/animation integration.
