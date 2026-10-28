# Standards, contracts and mathematics

These are engineering review contracts, not statutory construction standards. Numeric tolerances, capsule size, art budget and quality targets belong in each project's packet. Beckenburg examples explain decisions; they are not universal constants.

## Shared coordinates and physical identity

Use a declared unit and handedness. For Beckenburg-style metre, Y-up, yaw-only placement:

```
x_world = tx + cos(yaw) * x_local - sin(yaw) * z_local
y_world = ty + y_local
z_world = tz + sin(yaw) * x_local + cos(yaw) * z_local
```

Apply uniform scale before this transform. Apply it once to mesh, collider, support anchors, lamps and interactions. Rotate an offset collision centre too: an origin at the back of a sofa is not its collision centre. For arbitrary transforms use the full world matrix; transform normals with the inverse transpose of its linear part and renormalize. Record negative/nonuniform scale deliberately, including winding implications.

Keep `standingSurfaceY`, eye offset and asset mounting plane separate. Source mounting origins can be at the top of a ceiling lamp or the hinge of a leaf. Floor-centering normalization is appropriate only when the source contract allows it. Source hashes, units, axes, pivot, bounds, material slots and export transform are required asset metadata.

## Support and placement

At a placement `(x,z)`, query the actual supporting triangle/part and its height, not the maximum Y of an entire furniture bounding box. For a support plane with normal `n` and point `p0`, solve `n·(p-p0)=0` for Y where `|ny|` is sufficiently nonzero. A nearly vertical plane is not a tabletop.

Transform every relevant footprint vertex into world space. Test containment in the usable support polygon, account for intended overhang, and compare the object's bottom/contact points with the support surface within a recorded tolerance. Corners-only tests can miss concave gaps; use polygon intersection or triangulated support sampling as appropriate. Check clearances against actual neighboring parts, not just the parent's outer AABB.

For terrain, grade is `abs(deltaY) / horizontalDistance`; reject zero horizontal spans or handle them explicitly. Evaluate both ends, interiors, bends and cross-slope. Centreline samples alone do not prove a player-width path is supported. Validate a swept capsule/shape with the project's step, slope and clearance limits. Native triangle support, movement collision and rendered feet must agree.

## Walls, floors, stairs and doors

Author thickness, normals and openings as physical data. Give floors a downward-facing underside and closed edge where needed. Avoid duplicate coplanar finishes; frame, trim and decals need an intentional surface relationship. Beckenburg's historical 80 mm offset on each partition side is its construction convention, not a recommendation for every building.

For a stair ramp from horizontal endpoints `a` to `b`, calculate `t = dot(p-a,b-a)/dot(b-a,b-a)` in XZ, clamp only for the intended segment, and interpolate surface Y between endpoints. Test width, treads, headroom and both landing transitions. Cut the upper deck and lower ceiling using exact opening bounds, including fractional coordinates. Derive guards and their collision from the same aperture and leave the approach open.

Represent doors by hinge, leaf extent, elevation, frame and angular state. Compute swept collision and rendered vertices from the same data. Door state changes must invalidate relevant visibility and light caches. Test closed, intermediate and open poses, including upstairs doors. A pass at floor zero says nothing about elevated leaves.

## Light and power

Separate fixture geometry, emitter orientation/color/range and electrical state. Use explicit source/breaker/circuit dependencies; do not attach independent vehicle, battery or fire sources to site mains accidentally. Test reachable control poses with useful visibility in blackout conditions.

Occlusion queries must protect the receiving surface before applying prop self-shadow bias. A large bias can move a receiver through a thin wall. Cache identity must include every input that changes visibility: source, receiver context, geometry revision, relevant door/window state and any normal/endpoint assumptions. Invalidation is part of correctness, not merely performance.

Use quantitative checks only with a declared region, threshold and expected outcome. For leakage, compare light-on behind a closed boundary with source-off, and retain a same-side lit control. Include open-aperture controls so a blanket blocking repair fails. Probe corners, floor/roof joins and grazing camera angles. Native triangle scenes may need their own visibility adapter; do not invent room walls around outdoor meshes to satisfy an indoor helper.

## Materials and low-resolution visual quality

Check source UVs, image orientation, resolution, repeat mode, atlas boundaries, interpolation and normals before repainting. Preserve comparable texel density. Periodic wear must tile in both axes without a forced directional stripe dominating the object. Dirt should respond to use and material rather than uniformly darkening everything.

A material-only change should preserve geometry/UV/material identities and unaffected tiles where possible. Compare hashes of unchanged data, then inspect actual in-room frames under matched conditions. A metric such as stripe contrast proves one property, not overall art quality. Model silhouette, density, surface response and palette still need visual review against the project's approved reference quality.

## Water, transparency and projected evidence

Water should be a reusable surface module with defined shape, placement, wave parameters, flow direction/speed, transparency/depth absorption, edge behavior and editor handles. Multiple surfaces need compatible phase and boundary rules, not merely adjacent rectangles. Boat dry volumes should follow the inner hull and survive the full wave cycle, with a control showing surrounding water remains present.

For depth-driven effects use camera-forward distance: `d = dot(worldPoint-cameraPosition, cameraForward)`. Match water and opaque depth to the same completed camera frame and simulation time. Euclidean distance and raw hardware depth are not interchangeable. Render opaque geometry before dependent transparent layers; define sorting/compositing semantics explicitly.

A useful attenuation model is `T = exp(-absorption * pathLength)` with opacity `1-T`, optionally bounded by an authored range. This describes transmission, not necessarily physically accurate scattering. Foam from visible opaque depth/normals should discriminate shore contacts from submerged flat beds and lifted props. Screen-depth contacts cannot prove offscreen collision. Spray particles need declared lifetime, motion, depth tests and budget.

Projected dots should mark the first relevant beam intersections on the ghost surface, replacing hits that would otherwise land on room objects. Covering the whole ghost collider with arbitrary dots is a different effect. UV evidence needs a supported outward face offset or thin volume so it avoids surface burial/z-fighting; expose it through the actual UV light semantics. A planned effect remains unverified until its production renderer, photo/evidence rules and authority behavior are tested.

## Capture protocol and comparison

Record map ID, revision, runtime binary hash, asset manifest, camera position/orientation/FOV, resolution, preset, simulation time, lights, weather, door state and control scenario. Use immutable binaries during a capture session; rebuilding a JAR in use can break lazy loading even after screenshots were written.

Capture completion requires successful process exit and expected artifacts. Inspect the image, not only file size. For video also verify duration/frame count, actual decoded motion and browser playback time progression. Keep exact baseline and candidate camera matrices stable when comparing a repair. Include overview, standing/crouched route, changed detail, underside and adverse-angle views where relevant.

Classify evidence explicitly: planning; native geometry; runtime render; gameplay; multiplayer; hardware performance; human review; publication. No class implies the next. An offline 72-frame sequence sampled at 12 simulation frames/second establishes six simulated seconds, not achieved hardware FPS.

For performance report hardware, driver, build/preset/resolution, warm/cold state, sample duration and frame-time distribution (p50/p95/p99). Separate CPU/GPU/readback stalls where measured. Compare identical workloads; do not compare a software CI renderer with a real Windows GPU and call the difference an optimization.

## Required review matrix

| Change | Physical/runtime check | Visual check | Downstream recheck |
|---|---|---|---|
| Terrain or water height | support, grade, crossings, blockers | aerial silhouette, arrival, shore cross-section | foundations, van ramp, paths, props, rituals |
| Model shape or pivot | bounds, collider, mount, sweep | all sides, installed silhouette, supports | child props, interaction aim, occlusion |
| Material/importer | UV/normal/atlas invariants | matched close and in-room views | other users of importer/material family |
| Door/stair/opening | continuous traversal and state changes | below/above, both ends, open/closed | lighting, acoustics, host state |
| Lighting/camera | power, visibility/cache, finite camera bounds | on/off/torch, grazing joins, flyover handoff | materials, controls, evidence, old maps |
| Clutter/story | support, pickup ownership, access | coherent grouping and narrative | routes, hiding, photos, reset |

## Approval and evidence freshness

A passed test validates its stated property and inputs. Artifact hashes identify bytes, not truth. Review records need a reviewer, outcome, date, input revision and explicit scope. Human acceptance must be recorded by an actual human; an agent's inspection remains an agent review.

Evidence becomes stale when its dependencies change. The portable packet uses one exact `input_revision` for every passed gate; any revision change conservatively requires renewed gate records. Larger pipelines can replace this with a dependency DAG and per-input hashes, but must not preserve old green results without proving unchanged dependencies.

Keep critical unresolved defects open. Scope a partial milestone honestly instead of declaring a whole map complete. Production acceptance is a policy decision based on the recorded evidence and the project's quality benchmark; the supplied validator only enforces record integrity and declared gate requirements.
