# The Beckenburg Project — Generated Artwork Inventory & Remote Archival Gate
Updated: 2026-10-15. **CURRENT STATE: full-resolution PNGs verified in a separate source archive, but NOT uploaded/committed to GitHub as image blobs.** This status must remain explicit until a GitHub remote tree read confirms all ten original images and their SHA-256 hashes.

## Artistic authority
The **first concept ensemble** (listed first below) is the user's selected style baseline. The second alternate ensemble is superseded as a reference; retain it for historical comparison, not as a visual mandate. The binding hard style guide is [VISUAL_DIRECTION.md](../../../software/beckenburg/art/VISUAL_DIRECTION.md): early-to-mid original PlayStation era, faceted low-poly 3D models, compact 64–128px diffuse atlases, muted textured grit, near-fog, low lighting complexity, functional compact UI. Concepts can be highly polished illustrations while *production models* stay in the listed triangle/texture budgets. Do not silently reinterpret them as high-poly meshes.

## Original generated PNG archival queue
The source bundle contains **10 distinct original PNG files (23,451,214 bytes)**. All were locally decoded and hashed. A duplicate `imagegen.png` matches the Possessive image bit-for-bit and is intentionally excluded. Source bundle name: `beckenburg-original-concept-art-v001.zip`.

| Target GitHub repository path | Source board | Original bytes | SHA-256 |
| --- | --- | ---: | --- |
| `assets/beckenburg/concept-art/v001/00-foundation/visual-direction-selected.png` | First concept ensemble — SELECTED style authority | 2284282 | `8f70daf4f2e802922df7406208db54b68b3ef885132f7fd7e7ed28bf7efc0412` |
| `assets/beckenburg/concept-art/v001/00-foundation/visual-direction-alternate.png` | Second ensemble — archived comparison, not style authority | 2356054 | `6d0d3778d37c31cbb3380d9f4f046ad54ef849ec25c29864f6f7950f2ddeacf6` |
| `assets/beckenburg/concept-art/v001/01-hunters/cleric-character-profile.png` | Cleric — character turnaround & ritual tools | 2293875 | `3b317eaa11116893d1f98e7df37d355f5ad7f4fe4c97b55b5b36fcb56e8f9a41` |
| `assets/beckenburg/concept-art/v001/01-hunters/observer-character-profile.png` | Observer — character turnaround & sensors | 2199246 | `ec8c6be769c473542701e9435f8a265a1b5792df6928f81e387ec22cdf5ba0eb` |
| `assets/beckenburg/concept-art/v001/01-hunters/demonologist-character-profile.png` | Demonologist — character turnaround & ritual tools | 2364360 | `3b074ecf8884a9190e593e7115befe02f520aaaf3d68dcef8882327bac9a8ca3` |
| `assets/beckenburg/concept-art/v001/02-equipment/investigation-field-kit.png` | Investigation equipment — instrument and ritual lineup | 2453488 | `6297af9b9f366f202c8be8b33b1c4d61dc457453e05b7d4a51758b4ec5604f81` |
| `assets/beckenburg/concept-art/v001/03-ghosts/possessive-ghost-profile.png` | Possessive — attachment and object possession | 2426796 | `021a6e0adf7a47b31bdedb41330db15f8f02192f63cc04c8ac569ae392d60327` |
| `assets/beckenburg/concept-art/v001/03-ghosts/poltergeist-ghost-profile.png` | Poltergeist — moving objects and kinetic disturbance | 2438672 | `d9271a263c07b025de5826749ea1323c481b9030a735a238851d29c9a4d43a4b` |
| `assets/beckenburg/concept-art/v001/03-ghosts/demon-ghost-profile.png` | Demon — ritual corruption and manifested threats | 2321027 | `43f9da2b88ddd6a360c6ee9a07fe6f92ef37c6323341f3bcaba379a4d467abb8` |
| `assets/beckenburg/concept-art/v001/03-ghosts/yokai-ghost-profile.png` | Yokai — sound, charms, thresholds | 2313414 | `eededdeb474df249af86abca0ac03694cd26dc53c2ff131eba9e134afe0cf513` |

The canonical asset path is `assets/beckenburg/concept-art/v001/`. Preserve original PNG bytes, never replace originals with thumbnails, drawings, links, or regenerated approximations. Additional optimized derivatives may live in a separate `previews/` tree. A proper Git object must exist for each filename; listing paths in Markdown is **not** proof of archival.

## Archival acceptance checks
1. Inspect actual source files and verify exact PNG dimensions, decoding, byte size and SHA-256; omit bitwise duplicate copies and retain approved original variations.
2. Import full-resolution PNGs under the exact paths listed above, along with the package manifest, without overwriting any divergent existing image.
3. Push the non-forced git commit to authoritative `mrcalzon02/HB-TTRPG-tools` **main**, using an authenticated authorized git workflow. Retry transient connector errors safely; do not force overwrite unrelated work.
4. Read back main HEAD and every new binary Git blob. Verify path presence and byte hashes. Only then change status from **pending original-image archival** to **archived/verified**, insert working image thumbnails in the project page, and report the commit SHA.
5. Record artwork's visual acceptance (approved first ensemble; other character/ghost boards remain concept references pending modeling), authorship/provenance, and the absence of production models. Do not confuse art-source archival with functioning game asset integration.

### Transport constraint observed on 2026-10-15
The connected GitHub file/commit methods accept text or Base64 strings for blobs, but do not accept a local binary file reference. The local execution sandbox has no authenticated git push transport. This is **not** a successful archive; it is a documented upload blocker. A locally verified package with an import-and-verify script is available in the associated conversation output; it must still be pushed to GitHub before this gate passes.

## Production art handoff
- Hunter sheets completed as *concepts*: Cleric, Observer, Demonologist (3/3 baseline profiles). Model/rig/UV/in-game validation: pending for all.
- Equipment: one combined field instrument / ritual kit study; additional silhouette, grip, screen readability and animation references pending.
- Ghost concepts: Possessive, Poltergeist, Demon, Yokai (4/13). Remaining: Banshee, Wraith, Shade, Specter, Spirit, Hantu, Devil, Mimic, Twins. Preserve the named behavioral and counterplay differences in [ghosts.md](../ghosts.md).
- Next per-profile sequence: Banshee, Wraith, Shade, Specter, Spirit, Hantu, Devil, Mimic, Twins, followed by specific room and location architecture sheets and deeper equipment/ritual studies.
- The submitted concept image is **not** a game-ready model, animated sprite, licensed texture atlas, or implemented ghost ability. Production acceptance requires actual meshes/textures/rigs or explicitly chosen billboard implementations, reviewed against the approved reference.
