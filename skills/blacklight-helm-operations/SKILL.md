---
name: blacklight-helm-operations
description: Use the Blacklight EXO Crew Operations Helm station for flight-mode selection, thruster-bank control, translation thrust, attitude correction, maneuver confirmation, docking alignment, evasive maneuvering, pursuit, braking, and damaged-drive procedures. Activate for Blacklight EXO piloting and helm-console tasks.
compatibility: Requires the canonical Blacklight EXO Crew Operations browser runtime; Helm is a distinct station workflow inside the shared simulator, not a standalone headless engine.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-station: helm
---

# Blacklight Helm Operations

Use the **Helm** station in `blacklight-exo-crew-operations.html` and its canonical Crew Operations runtime. Station code: `HEL`.

## Canonical implementation

- `blacklight-exo-crew-operations.html`
- `blacklight-exo-crew-operations.js`
- `blacklight-exo-crew-auxiliary.js`
- `blacklight-exo-helm-autonav.js`

## Workflow

1. Open/select the Helm station in the canonical Crew Operations simulator.
2. Select the procedure that matches the requested maneuver rather than inventing a control sequence.
3. Read the procedure's usage/tier, recommended difficulty, cue, required hardware sequence, and auxiliary requirements from the runtime.
4. Execute/record player inputs through the simulator controls when browser context is available.
5. Return the DM Relay guidance and recorded input sequence as **DM-facing World of Darkness-derived d10 guidance**, not as an automatic success/failure result.
6. Keep Helm consequences coordinated with Navigation, Engineering, Gunnery, Science, or Comms when the selected procedure creates dependencies.

## Hard rules

- Do not reproduce Helm procedure tables in the skill; the simulator is authoritative.
- Do not bypass required authorization/execution steps.
- Do not roll for the player or declare success/failure from the console guidance.
- Do not collapse Helm into a generic Crew Operations skill when Helm-specific activation is appropriate.
