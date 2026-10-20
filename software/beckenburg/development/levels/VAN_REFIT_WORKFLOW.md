# Human-scale van and exact physical stock

## Synchronized source

Fetched the published remote main and checked every remote head and open PR. Published online work was already contained in `c879aff5`; no other branch or open PR existed. The separate durable task could not be read, so unpublished changes there are not claimed as synchronized. Preserve the street façades, parked GGBot cars and original Kenney asphalt/concrete materials.

## Dimensional contract

Reference: Ford Transit L4/H3 manufacturer specifications, https://www.ford.co.uk/content/dam/guxeu/uk/documents/brochures/cars/BRO-transit_van_25.5MY.pdf . The manufacturer's dimensional table gives a 4.256m cargo length and 1.784m maximum load width; its large-van envelope supplies the scale reference, not copied art. The game vehicle is an original fitted investigation van.

The old body was 4.10m wide with a 7.30m cargo bay and 3.05m interior height. The revised body is 2.059m wide and 6.704m overall, with a 4.256 × 1.784 × 2.125m cargo envelope. VanStaging is authoritative. The 0.50m raised deck, continuous 1.50m loading ramp, tapered roof, cab, doors, wheels, sockets, physics and camera feet share those measurements. The protected room is only the actual cargo bay; the ramp stays exterior. Room/handshake revisions change when the dimensional contract changes.

Furniture is reflowed independently. The actual workstation and computer retain native metre scale; the screen assembly is straightened from its real screen plane, rather than scaling the entire old room. The usable aisle is approximately one metre, with conservative collision margins. Six 0.44m capsules occupy two local columns and three rows, and each must physically reach every station and the street. Never spread six spawns across global X; rotate each local pad with the van.

## Screens and furniture

Read source bounds and actual screen-face triangles. The monitoring mesh has baked yaw and pitch; UV-aligned orthogonal axes remove those rotations. Keep the whole source assembly and source buffers unchanged. Mount its canonical back against the wall, screen upright toward the aisle. Correct the dynamic screen's V orientation during face construction so the live text is readable. Wall screens use compact rear mounting plates; there are no shelves beneath them. The command screen rests on the measured desk top.

Check all transformed bounding-box corners against liner, roof and bulkhead, including asymmetric source pivots. A passing origin-only insideShell test is insufficient. Keep the keyboard on the actual desk and the tower beneath it. Cargo control geometry mounts on the jamb; its clear standing point is a separate coordinate.

## Actual inventory on shelves

VanRackStock aggregates each present/reserved hunter's real ownership. An instrument in any carried slot is removed from storage; returning or swapping it adds it back. One camera remains one camera regardless of its film count. Internal battery/sample charges do not create duplicate instruments. Purchased health/sanity supplies and the separate unused cross/ward/salt stocks use their actual unit counts. Exhausted expendable packs are removed. No stock means no model.

Every hunter sees the same aggregate shelf inventory, not a private catalog of all owned types. Host RACKBEGIN/RACKUNIT/RACKEND snapshots are bounded and applied atomically. Equip/return, purchases, consumption, disconnection/reservation and late view entry update counts. Ghost clients receive no inventory snapshot. Solo shelves use the saved profile minus the actual carried loadout, including purchased medicines.

Lay every individual item on a broad face using a rigid axis permutation with positive determinant. Preserve its native dimensions, UVs and identity; do not miniaturize it to fit a grid. Six supported shelves use deterministic spatial packing, with no gray per-item hooks or boxes. Larger items are placed first, ordinary shelves are preferred over overhead storage, and additional units remain distinct meshes. The maximum six-player inventory with every medicine tier fully stocked is checked as 330 native-sized objects. No overflow item may be silently discarded.

## Repeatable gates and delivery

Run verify_levels.py with Java 17. VanHumanScaleTest walks six capsule pads through the ramp and all stations, checks real fixture bounds and the closed threshold. VanRackStockTest checks exact quantities, equip/return/consumption, atomic replay, upright screen geometry, all-tier maximum packing, native dimensions and non-overlap. VanRackNetworkTest verifies actual socket stock changes, identical hunter views, late entry and ghost privacy. Keep these in build.cmd/build.sh/regression-tests.txt.

Run verify_compatibility.py. Old truck-sized assertions are replaced by the measured dimensional contract; old ground-level fixtures use actual deck/ramp heights. Do not disable collision or make extraction work beneath the floor. Road tile lengths are derived through the retained ROAD_END, including partial end panels; shortening the van must not leave a gap in the street.

Capture VanFitCapture from actual player eye height, with a concrete counted stock fixture. Inspect fronts, readable text, support, wall attachment, clear aisle and road-vehicle proportions. Save the stock JSON alongside the captures. Regenerate LevelSceneSource and build_scene.py for all three maps, reopen them with validate_level_scenes.py, and record the actual hashes with record_verification.py. Commit and push the functional milestone, then the reviewed scene/artifact milestone. Verify remote HEAD; keep the two previously audited broader ghost-suite failures explicit.
