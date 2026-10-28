# Worked investigations: why the gates exist

The examples below are recorded project observations, not new tests executed by this portable package. Their source reports are pinned in `source-index.json` at Beckenburg revision `db6c5b6a93d00426d8cc7b2c0f69515b824e0e75`. Review pages provide the actual images; source reports preserve hashes and limitations. No example establishes final acceptance of every map.

## A lighting helper passed while the real game leaked light

The 28 October investigation found that a tested architectural visibility helper was not called by production `FixtureLighting`. A prop self-shadow endpoint bias could also move the receiver across a thin wall. Ordinary face-on views hid the problem; a grazing camera revealed it.

The repair connected the receiving-side check before bias and scoped cache entries by receiver context. A controlled synthetic light on actual Blackpine geometry produced sample energy 4.8 before the repair and 0.187 afterward, equal to ambient. The grazing diagnostic counted 2,260 bright leak pixels before and zero after. Same-side illumination remained as a positive control. Geometry was held constant, so this was not a wall thickening disguised as a lighting fix.

Production-path regressions covered 6,789 closed wall/floor/corner probes across nine indoor maps, plus 1,784 clear stair rays that had to remain clear. Eighteen actual OpenGL diagnostic images and successful before/after process exits were recorded. The result is targeted lighting evidence. Native mesh joins, every portal state, animated route pans, installed performance and human acceptance remained open.

**Method gained:** test the real sampler, use receiving-side bias logic, include adverse views and positive controls, and preserve the distinction between broad probes and whole-map art acceptance.

[Runtime diagnostic review](https://mrcalzon02.github.io/The-Beckenburg-Project/development/levels/fixture-join-diagnostic/REVIEW.html)

## Metal looked bandaged because the texture contained a stripe generator

The 27 October material investigation traced black/gray banding to the procedural IRON tile: every eighth X pixel was darkened by 17 levels. UV repetition stamped those grooves across broad surfaces. Adding geometry or changing exposure would have hidden the symptom without addressing its source.

The tile changed to bounded two-dimensional wear, fine grain and sparse pits. The other fifteen atlas tiles remained byte-identical, as did renderer, fixture-lighting and vehicle-layout classes in the comparison binaries. Groove phase contrast fell from about 16.652 to 0.0569. Twelve actual OpenGL van frames used six matched cameras, vehicle supply on, site breaker and torch off. Exact runtime atlas/tile exports accompanied the result.

That proves this tile's targeted repair under those conditions. Roof/interpolation behavior and native GLB metal families were still separate work. It does not mean every metal material in the game was approved.

**Method gained:** inspect procedural texture code, compare actual runtime pixels, hold unrelated systems constant, and measure the suspected defect without promoting that metric to total visual quality.

[Matched metal review](https://mrcalzon02.github.io/The-Beckenburg-Project/development/levels/metal-refinement/REVIEW.html)

## A broad camera audit exposed indoor assumptions on an outdoor map

The 26 October compatibility pass recorded 64 scripted actual OpenGL samples across ten investigation sites and Castle, covering camera/light conditions. An outdoor flyover had assumed room bounds and failed on Hollow Creek. Framing changed to finite site-owned anchors, excluding the long approach and van from the main site frame where appropriate. A software fallback no longer invented rectangular buildings to represent outdoor space.

Six prototype long halls also had single fittings outside useful entry range. Repeated physical fittings addressed their entrances while refined House/Farmhouse/School layouts were preserved. Broad camera and entry-power tests were useful, but the report explicitly excluded whole-map, LAN, human and real-time performance acceptance. Twenty-eight planning packets remained planning rather than becoming runtime maps because a gallery existed.

**Method gained:** test every current map family when changing shared camera or lighting code; preserve map maturity states; use real site identity rather than room-count assumptions.

[All-map compatibility review](https://mrcalzon02.github.io/The-Beckenburg-Project/development/levels/lighting-camera-audit/REVIEW.html)

## Boat, water and the danger of repairing the wrong layer

Hollow Creek review exposed water inside the rowboat, seats crossing the hull, oars intersecting its sides, and broken-looking texture/lighting. These needed separate diagnoses. Hull-shaped dry sections addressed water exclusion; seats and oars needed measured model fit; the GPU texture path had an extra V flip and downsampling that damaged atlas appearance. Repainting the boat would not have repaired the importer.

The water work developed into an independent module with shape/placement and parameter controls, geometric wave motion, depth absorption, shoreline contact foam and spray. Review cameras were moved to beach, banks and dock because an aerial view could not show these effects adequately. Texture travel, geometric displacement and contact effects were reviewed independently.

Recorded sequences used deterministic simulation time and multiple views. Browser playback was checked because an earlier video delivery showed a still poster but did not play. The water report and original module retain their own implementation and licence records; the portable workflow does not bundle that engine or claim its shader can execute on static Pages.

**Method gained:** separate source mesh, importer, lighting, transparency and capture failures; inspect contact geometry; verify animation and playback rather than assuming a video container proves motion.

[Water runtime review](https://mrcalzon02.github.io/The-Beckenburg-Project/development/levels/hollow-creek/WATER_RUNTIME_REVIEW.html)

## The standards became stricter through specific observations

Several decisive requirements began as visual catches: a sawmill cutter that served the wrong scale of work; light under a loft; square terrain surviving beneath decorative boundaries; crude statues and uniform tent orientation; distant greens mismatching near grass; a culvert blocked by uncut terrain; decorative foliage accidentally implying extra hiding capacity.

The response was to make each observation a reproducible check and an older-map audit obligation. Terrain became a prerequisite to structure refinement. Desquareification had to affect physical terrain and materials. Model fitness included purpose, scale, support, joint continuity and installed appearance. Remote sites required power distribution compatible with ordinary ghost breaker behavior. Hiding budgets became explicit across indoor and outdoor candidates. Final storytelling became a distinct stage after functional fit-out.

These are improvements to the production process, not evidence that all historical content already meets the improved standard. The ledger and per-map acceptance matrix are what make that difference actionable.
