# Centre-screen interaction and held-device pass — 20 October 2026

## Contract

A single `InteractionFocus.Target` drives the hand, E keycap and friendly item name next to the crosshair. E acts on that exact target. Cast from actual eye height along camera yaw and pitch, with a two-metre reach. Transform the ray into the actual native model's space, reject by bounds, then intersect original triangles. Preserve source pivots, rigid shelf rotations, all original UVs, and the canonical van CRT transform. Pick the nearest visible surface; decorative furnishings, closets, shelf boards and other stock occlude it. Window targets use their actual sash rails rather than an imaginary filled rectangle.

World walls, closed doors, floors and furnishings also occlude through the existing map sight contract. A selected door alone can be hit through its own conservative collision thickness; this exception does not open it or bypass another door/wall. The centre ray does not select a nearby item beside or behind the player. Hiding, incapacitation and modal interfaces suppress world interactions. Loose clutter is taken into the real physics hand, retaining the existing drop, examine and throw controls. Event fixtures use the same exact-mesh selection before toggling. Wall switches operate their authored room; breakers, doors and van controls retain their existing authoritative state.

Rack targets refer to actual remaining units, with model/tier/unit identity. Equipping retains private hunter ownership and returns the previous carried tool to shared storage. A different investigator's upgraded instrument is rejected. Pointed medicine uses that specific owned tier and deducts actual purchased stock only when treatment is useful. Counter stocks retain the existing Z/G/H deployment controls; they are not falsely presented as another slotted pickup.

## LAN authority

`INTERACT` sends a bounded kind, object ID, yaw, pitch and monotonic sequence. The client sends its rounded body heading first. The host checks active hunter state, cooldown, heading agreement and the centre ray from its own body position and current stock, then compares the exact target. There are no accepted client coordinates, invented item stocks or client-reported successful pickups. Forged, stale, hidden and ghost-seat interactions fail. Closing doors rolls back when a hunter occupies the threshold. Interface opening is acknowledged by the host.

The map opens a real authored floor plan with Page Up/Down floor selection. Objectives show host-issued daily assignments and actual completed tasks. The computer opens the existing case file; telemetry remains actual hunter-only van data. E or Escape closes the targeted panel. Open panels clear movement and release pointer capture.

## Held tools and measurements

Held meshes use rigid rotations with positive determinant. Cameras, torches and thermal pistol optics face forward, away from the player; control/display faces face the operator. The K2 source lies along Z and requires an X rotation. The thermal camera's display lies on +X and its optical head on -X. The original torch emits along -Z, while authored later torches emit +Z. Do not apply one blind orientation to every source. The old recorder reflection has been removed.

Foreground texture sampling compensates the legacy sampler's reversed V so the original glTF image atlas reaches its intended faces. Runtime source meshes and image bytes remain unchanged. Device screens are rastered in the mesh depth buffer, so text cannot paint across a casing or empty background. Thermometer source LCD rectangles and the recorder's single-atlas LCD are explicitly measured; authored digital materials use their actual face extents. EMF values drive the K2 LEDs and analog needles. Solo saves the actual successful scan's numeric reading for its held display; LAN uses actual host measurements and recorder status. An instrument with no digital display, such as the analog spirit-box radio, retains its audio response and case-log record. Do not add a floating screen to that radio.

Keep the bottom equipment bar clear of the held device. Retain case-log readings as a record; on-device output complements them. Source camera rear artwork is preserved; this pass does not add an invented live video monitor to camera models whose authored display faces away from the operator.

## Reproduce and verify

1. Compile/package with `development/levels/verify_levels.py --java-home <JDK17>`. The focused suite has 24 checks, including InteractionFocusTest, InteractionNetworkTest and HeldDeviceReadoutTest; these are also in both normal build entry points and regression-tests.txt.
2. InteractionFocusTest enumerates actual visible loose objects, mounted event meshes, switches, door leaves, window rails and native-sized rack units in all three sites. It checks reverse aim, concealment and exact unit identity. InteractionNetworkTest uses actual local sockets for the pickup and forged/stale/ghost-seat rejection.
3. HeldDeviceReadoutTest checks that different real values change the on-device pixels without changing the silhouette, that every held pose remains a proper rigid rotation, that optical tools face away, and that solo retains the real scan result.
4. Run InteractionUiCapture and VanFitCapture against the packaged jar plus test classes. Captures are actual game camera/render output, not concept artwork. The held-device sheet uses explicitly supplied verification values, not fabricated evidence presented as a live case.
5. Inspect the preview page, record the result, commit the functional milestone, fetch/reconcile concurrent development, push and verify remote HEAD. Only rerun changed checks or a required broader gate after further edits.

At the first completed focused checkpoint, 24/24 passed. The earlier wider compatibility run remained 30/32, with the two already documented unrelated GhostDomainTest/AncientGhostVariantsTest failures. The full game release gate is not claimed green. The van implementation was already uploaded in 22ca2988/8cc7ff4d; online documentation commit 6634645b was merged normally. Saved complete Blender sources from the preceding scene checkpoint still need the separately recorded van regeneration/review step; this UI commit does not mislabel those older scene hashes as new exports.

## Final synchronization checkpoint

The UI checkpoint f88065e9 was reconciled with online campaign/castle commits 7edaea3a, 3fa96500 and de68a225 in merge d03b7854. The combined package passed 24/24 focused checks. The final E key press guard suppresses key auto-repeat and input through help/modal panels. The expanded real-socket check also picks a native shelf unit, verifies the exact equipped tool and decrements its count by one. The final packaged socket check and both new online campaign/castle checks passed; their actual output is saved in verification/interaction-ui-merged-results.json. No force push or replacement of concurrent work was used.
