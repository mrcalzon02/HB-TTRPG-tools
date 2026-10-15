# Hunter 01 — Cleric | Visual + Function Profile (concept stage)

Visual ID: charcoal coat; muted ash-grey shoulder cape/stole; tarnished bronze buckles; ivory Beckenburg chevron-seal over sternum; moss-stained knee boots; oxblood satchel for chalk and ward tokens. Never depicts real-world clergy as combat caricatures. Low-poly era goal: 450–850 triangles (first modeling target), 128² diffuse body atlas + 64² face, simplified 12–18-joint skeleton; actual count TBD by modeled mesh audit.

Silhouette: tall blocky coat hem, distinct shoulder profile, protective forearm emblem, compact brass object carried chest-high. Role must identify at a distance under fog; avoid a white robe becoming indistinguishable from a spectral apparition. Hold a lantern in one hand and ward token in the other during rites.

Orthographic requirements: FRONT (head, coat, clasp, token and boots alignment); SIDE (hood/cape projection, satchel profile, elbow and glove separation); BACK (fabric fold, pack, belt attachment and coat tail); separate small swatches and tool close-ups. See `cleric-01.svg`.

Animation list: relaxed hold, brisk investigation walk, sprint, raise focus, draw protective circle, kneel to stabilize an injured hunter, interrupted ritual flinch, stagger and incapacitated. Hide/holster items rather than clipping through the coat. Hand-held tools should align to a common grip pivot, waist satchel has anchor socket, and ward focus emits a cheap planar glyph only when active.

Gameplay link (planned): Cleric protection and warding from `../../docs/beckenburg/hunters-equipment-rituals.md`; no active Java gameplay code yet. All ward effects must eventually be host-validated and visible to ghost and hunter under the same world rules.

Approval checkpoints: silhouette readability at native 320×200; recognisable class at 10 m through fog; model front/side/back agree on equipment positions; texture palette not confused with Shade/Wraith; real modeled asset + rig + pixel atlas before implementation claim.