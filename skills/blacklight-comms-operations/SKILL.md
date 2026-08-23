---
name: blacklight-comms-operations
description: Use the Blacklight EXO Crew Operations Comms station for link mode, carrier path, channel/frequency tuning, transmit power, crypto state, transmit keying, squelch, array availability, signal clarity, and communications procedures. Activate for Blacklight EXO communications-console, hailing, secure-link, distress, and signal-routing tasks.
compatibility: Requires the canonical Blacklight EXO Crew Operations browser runtime; Comms is a distinct station workflow inside the shared simulator.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-station: comms
---

# Blacklight Comms Operations

Use the **Comms** station in `blacklight-exo-crew-operations.html` and the shared Crew Operations runtime. Station code: `COM`.

## Workflow

1. Select Comms and choose the canonical procedure matching the requested hail, secure link, distress, carrier, array, or transmission task.
2. Use the runtime's link-mode, carrier-path, channel/frequency, TX power, crypto, transmit-key, squelch, confirmation, authorization, and execution controls as prescribed.
3. Preserve array availability, tuning error, signal clarity/noise/lock state, recorded input sequence, and DM Relay guidance when the runtime exposes them.
4. Coordinate with Science for signal/contact information and with Navigation/Helm/command context where communications procedures depend on vessel geometry or mission state.
5. Treat console metrics as the simulator's procedural/model state, not independent proof that an external transmission succeeded.

## Hard rules

- Do not invent frequencies, crypto success, or remote responses outside the canonical procedure/scenario.
- Do not convert signal-lock visualization into automatic character success.
- Do not copy Comms signal-state calculations into this skill.
- Keep Comms distinct from the general Signals Laboratory; this station is an in-setting Crew Operations role-play console.
