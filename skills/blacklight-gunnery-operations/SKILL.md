---
name: blacklight-gunnery-operations
description: Use the Blacklight EXO Crew Operations Gunnery station for weapon safing, bank selection, track modes, range gating, capacitor state, arming, fire-control confirmation, engagement preparation, and combat fire-control procedures. Activate for Blacklight EXO weapons-console and gunnery tasks.
compatibility: Requires the canonical Blacklight EXO Crew Operations browser runtime; Gunnery is a distinct station workflow with station-specific fire-control confirmation support.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-station: gunnery
---

# Blacklight Gunnery Operations

Use the **Gunnery** station in `blacklight-exo-crew-operations.html`. Station code: `GUN`.

## Canonical implementation

- `blacklight-exo-crew-operations.js`
- `blacklight-exo-gunnery-fire-control-confirm.js`
- `blacklight-exo-crew-auxiliary.js`

## Workflow

1. Select Gunnery and choose the canonical procedure matching the requested engagement or fire-control task.
2. Use the runtime's weapon-safe, weapon-bank, track-mode, range-gate, capacitor, arming, confirmation, authorization, and execution controls exactly as required by that procedure.
3. Preserve any station dependencies, especially Navigation/Science targeting support and Engineering power constraints.
4. Return the recorded player input sequence and DM Relay guidance for adjudication.
5. Treat the simulator as an RP/procedural console: it does not independently determine whether an attack succeeds.

## Hard rules

- Do not bypass weapon safing/arming/confirmation states.
- Do not invent hit rolls, damage, or target outcomes from console state alone.
- Do not copy the fire-control state machine into the skill.
- Keep the canonical Crew Operations runtime as the single procedure authority.
