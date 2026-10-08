# Validation

Native Robust engine 292.0.0 loaded all four final ports, saved each before simulation, initialized them, and ran simulation checks. The final pass reports **0 loader, serializer, or fatal errors**. Earlier trial errors are preserved in the longer logs; `final-server-validation.log` contains the corrected pass.

| Map | Native objects | Tile geometry | World positions and rotations |
|---|---:|---|---|
| Tyson Station | 10,366 | identical after native save | identical after native save |
| Port Hamburg | 37,304 | identical after native save | identical after native save |
| SS Ourang Medan | 6,606 | identical after native save | identical after native save |
| Vapor Processing | 4,854 | identical after native save | identical after native save |

Native object counts also match exactly before and after saving. Checks include rotation units, coordinate reparenting, directional window edges, anchored space structures with lattice supports, and native water over ground. Results and saved-copy checksums are in `roundtrip-validation.json`.

Local Sandbox station loading succeeded for Vapor, Tyson, and Hamburg. Vapor’s client connected, loaded gameplay, and attached to a human character with **0 client errors**. Socket inspection confirmed the hosting test listened on **127.0.0.1:1212**. All four local game prototypes use the same standard station/job setup.

This verifies map serialization, initialization, station creation, and a real client/character connection. GUI tile placement, individual machine interfaces, long missions, mission balance, and multiplayer rounds have not been manually played. These are native SS14 Sandbox ports; TGMC-specific mission rules and specialized machinery are not recreated. Full independent power/atmos engineering needs redesign; the supplied sandbox powers APC devices independently for immediate editing and interaction.

The old laptop reports “Cannot keep up” warnings, especially on large maps. Begin with Vapor or Ourang, keep one map open, and use paused editing.

The normal mapping-server launcher was also tested with its new lightweight, breathable startup pad: station setup and Ready completed with no errors. The server was shut down cleanly after testing.
