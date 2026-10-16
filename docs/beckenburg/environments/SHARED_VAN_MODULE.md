# Standard Van Staging Module — Implementation Authority

The van is an **identical reusable equipment/briefing/extraction module**, instantiated once per location. Do not produce nine independent vans or game behaviors.

## Placement and shared contracts
A site supplies `VanStaging.Placement(worldX, worldZ, yawRadians)`. The van supplies fixed local coords and world transforms, collision and four station IDs. The authored safe approach must connect the van's front cargo opening to the map's main entry via a traversable route (current test house requires opening an exterior door). The van stays hunter-only: ghost movement and manifestation cannot occur inside its designated safe zone. Location-specific exterior assets (road, parking lot, forest, yard, bus pull-in) surround the standard van and never change its authoritative internal tool placement.

| Station | ID | Actual current behavior |
| --- | --- | --- |
| Case board | `BRIEFING` | Toggle compact in-game mission instructions, role, evidence and health |
| Equipment rack | `EQUIPMENT` | Cycle selected usable evidence instrument |
| Evidence relay | `RELAY` | Toggle live evidence journal and show evidence/ping counts |
| Extraction console | `EXTRACTION` | Attempt authoritative local extraction at van; applies the existing case-resolution and saved payout rules |

Use `E` to interact in reach, otherwise `E` operates the nearest ordinary door. Stations validate local proximity and finite coordinates; an out-of-range call does nothing. `X` remains the accessible extraction shortcut within the existing validated van marker. The module is not a shop yet; ward refills, carried inventory, teams' individual standing positions, directional proximity audio and network events must be implemented against the eventual host rather than faked locally.

## Art/geometry and performance
The current van uses actual low-polygon textured geometry: side panels, rear wall, open front, roof, raised cargo floor, side lockers, monitors, utility panel and loading step. It shares the existing 16-material 128px atlas. The 2D overhead field map marks the van staging zone; later an authored van interior schematic can be added. Placement uses one transform for both mesh geometry and station hit positions. No special case for a location name may appear in the van class.

## Test gates to reuse for each new map
Place van, ensure collision and rotated station alignment; test clean spawn and front exit, open/close building door, no spawn inside a blocker, locate all four service stations, complete or retreat case at console, confirm AI ghosts cannot enter staging, and validate location-specific exterior navigation. In a future 3v1 match, all interactions become host-validated commands with per-player equipment state and event replication. A visual model alone does not satisfy the module.
