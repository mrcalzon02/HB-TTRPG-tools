---
name: blacklight-navigation-operations
description: Use the Blacklight EXO Crew Operations Navigation station for reference selection, transfer and avoidance solutions, azimuth/elevation plotting, delta-v and timebase work, rendezvous, dead reckoning, debris corridors, gravity assists, and solution relay to Helm. Activate for Blacklight EXO navigation-console procedures.
compatibility: Requires the canonical Blacklight EXO Crew Operations browser runtime; Navigation is a distinct station workflow inside the shared simulator.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-station: navigation
---

# Blacklight Navigation Operations

Use the **Navigation** station in `blacklight-exo-crew-operations.html` and the shared `blacklight-exo-crew-operations.js` authority. Station code: `NAV`.

## Workflow

1. Select Navigation in the Crew Operations simulator.
2. Choose the canonical procedure matching the route/plotting problem: transfer, collision avoidance, rendezvous, formation work, dead reckoning, hazard corridor, or other registered Navigation procedure.
3. Use the displayed reference, solver, azimuth/elevation, delta-v, timebase, validation, and solution-latch controls in the prescribed sequence.
4. Preserve the recorded input sequence and DM Relay difficulty guidance.
5. Hand off validated maneuver solutions to Helm where the scenario calls for execution by the pilot station.

## Hard rules

- Do not substitute the separate EXO interstellar jump calculator for Crew Operations Navigation unless the request specifically concerns cluster/FTL jump routing.
- Do not invent navigation procedures or precomputed outcomes outside the canonical runtime.
- Do not roll for the character or convert DM Relay guidance into automatic success/failure.
- Keep Navigation and Helm separate: Navigation solves/relays; Helm executes vessel motion.
