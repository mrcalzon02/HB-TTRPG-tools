# Deployable equipment acceptance — 2026-10-20

Status: **source integration underway, runtime acceptance outstanding**. This document is a development gate, not a claim that every art asset is a functioning item. A named tier/model, purchased entry or inventory slot alone never counts as a deployed device.

## Current inspected behavior

| Device | Source behavior | Next acceptance gate |
| --- | --- | --- |
| D.O.T.S. projector | Host-authorized placed position, volume/grid and retrieval | World-view geometry, reconnect, power and real-event-only sightings |
| EMF array | Separate physical nodes, tier I/II/III limits 2/3/5, remotely sampled per room | End-to-end multi-client build, van-map update during ghost event, pickup and battery exhaustion |
| Thermal beacon array | Separate physical nodes, tier I/II/III limits 2/4/6, remotely sampled per room | Temperature history, weather/heating correctness, genuine extreme and battery exhaustion |
| Video camera | Physical placement and retrieval with real remote view | Camera-on-tripod mount and live camera receiver visual acceptance |
| Tripod | Source-backed physical stand, placement/retrieval, optional camera snap | Mounted lens height/appearance, distinct player installations and visual clip validation |
| Ghost writing book | Physical coordinates, inspect/retrieve reach checks, actual ghost-authored page | Model/page material and placement pickup across LAN reconnect; no magical room-centre books |
| Salt | Host-owned ground marker and effect/counter logic; approved deployed salt mesh now rendered at the actual floor | Visual tier/capacity, ghost tracks and depletion test |
| Incense | Consumed bundle emits replicated smoke; approved Tier I burning mesh now occupies the correct floor elevation | Complete Tier II/III geometry, reconnect smoke lifetime and ghost-effect checks |
| Firelight | Host-owned ground placement, retrieval, power state, room lighting/sanity effect and lit/unlit approved meshes | Complete multi-client visual, battery, wind/interference and persistence tests |
| Flashlight/headgear | Flashlight has both held mode and deliberate ground placement with retrieval; headgear remains worn only | Light falloff and pickup/drop visual tests; no remote headgear ownership |
| Motion and sound sensors | Catalogued; not functioning in the playable field inventory | Host-owned probes, shared outputs, van-side history, purchases and UI tests |
| Chalk/sigils/wards/crosses | Host has consumable deploy/counter logic | Approved placed meshes, finite charges, passage/collision and persistence tests |
| Ectoplasm and object-imprint kit | Host event-gated scan source | Genuine physical interaction points/samples rather than scanning the nearby ghost by proximity |
| Other equipment | Must be audited device-by-device against a real producer, placement, UI and host consumer | No fake evidence and no location-spawned purchasable tools |

## Blocking cross-cutting contract

Every deployable must have: an inventoried/owned physical item; an explicit in-world placement action and host-validated room/coordinates; a visible model/state; operation tied to that world position; optional retrieval/consumption with range and inventory rules; multiplayer snapshot/reconnect; a raw reading rather than automatic ghost identification; difficulty/energy semantics; and a runnable device-specific integration test. Host and investigator data must never leak to human ghost seats.

All actual placed sensors must appear on the correct floor/room of the van map; telemetry shows values, origin, timestamps and stale/disconnected state. The larger main CRT and full-size map show the same server-owned station network. Physical map resolution cannot replace the authored architectural floor-plan or create fake walls/rooms.

### Verification status

- The sensor and van map source was committed separately; direct branch/changed-file readback verified.
- Subsequent book/tripod source and regression registrations require a separate commit and remote readback.
- Java 17 full build, model import, Windows rendering, true connected LAN case and visual placement/retrieval screenshots are **not verified** here.
- Do not mark the overall deployable equipment roster as complete before those gates are exercised.

Priority after sensor/book/tripod/portable-light source: test real Windows rendering, then complete the sound/motion sensors, Tier II/III incense and salt cases, and physical object-imprint targeting. Older model-backed equipment remains unverified until world-view QA. Preserve the existing D.O.T.S. and camera producer rules rather than substituting cosmetic placeholders.
