# Beckenburg castle — Kenney Retro Medieval Kit 2.0

**Authoritative source:** Owner's Beckenburg Project Google Drive archive `kenney_retro-medieval-kit.zip` ([source](https://drive.google.com/file/d/1yPE7La16Pje1VUyEq0tmYZO9oE-jFNZE/view)).

**Repo source:** `assets/source/kenney_retro-medieval-kit.zip`; source SHA-1 Git blob `b39647968831b6f09686c6296729da4d5d7ce3a1`.

**License:** The included `License.txt` explicitly states *Retro Medieval Kit (2.0)*, Kenney, Creative Commons Zero (CC0); permitted for commercial use. Credit to Kenney / www.kenney.nl is appreciated but not required. This pack is **not** assumed to share the independently purchased PSX Mega Pack license.

**Runtime integration:** `KenneyMedievalAssets` selects 15 real GLBs (fortified stone walls, window modules, gate, wood window, columns, towers, battlements, stairs, crates, barrels and beams). Its Java 17 build conversion embeds the actual source PNGs inside each curated GLB and removes the incompatible mandatory unlit extension; this allows the existing `GlbProps` textured software renderer to load them without external assets, Python, Blender, or internet access. The source ZIP stays outside the JAR; only 15 converted GLBs enter `build/classes/org/beckenburg/models`. Both `build.sh` and `build.cmd` execute this process before the existing tests.

**Castle geometry:** `CastleHubArchitecture.create(map)` authoritatively authors 3D wall modules for every solid castle tile, with special window modules, archways aligned to the three traversable passages, courtyard columns, exterior towers, and battlements. `SceneRenderer.drawCastle` replaces basic flat masonry wall faces with these real mesh faces; floors, roof, furniture, equipment desks, purchases, switches, and collision remain intact. Frustum/distance culling guards the 320×200 software renderer.

**Evidence:** Extractor was compiled with `javac --release 17` and run against the owner's original ZIP. All 15 output GLBs passed header, embedded-image, buffer-view, and index/vertex layout checks. This is **not** evidence of a complete Windows GUI playtest or packaged installer acceptance. Full `build.sh` / `build.cmd` and `CastleHubIntegrationTest` are the next build/runtime gates.

**Do not** replace the owner's approved hunter/ghost artwork with reference thumbnails or unrelated sample art.
