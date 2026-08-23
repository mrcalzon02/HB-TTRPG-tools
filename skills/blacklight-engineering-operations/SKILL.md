---
name: blacklight-engineering-operations
description: Use the Blacklight EXO Crew Operations Engineering station for rectifiers, bus transfer, voltage balancing, breakers, coolant valves, pump selection, power-map work, damage control, and ship-system recovery procedures. Activate for Blacklight EXO power, reactor, electrical, coolant, and engineering-console tasks.
compatibility: Requires the canonical Blacklight EXO Crew Operations browser runtime; Engineering is a distinct station workflow with a station-specific power-map module.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-station: engineering
---

# Blacklight Engineering Operations

Use the **Engineering** station in `blacklight-exo-crew-operations.html`. Station code: `ENG`.

## Canonical implementation

- `blacklight-exo-crew-operations.js`
- `blacklight-exo-engineering-power-map.js`
- `blacklight-exo-crew-auxiliary.js`

## Workflow

1. Select Engineering and the canonical procedure matching the power/coolant/damage-control task.
2. Follow the runtime's rectifier, bus, voltage, breaker, coolant, pump, confirmation, authorization, and execution requirements.
3. Use the engineering power-map surface when the procedure depends on electrical topology rather than guessing system connectivity.
4. Preserve the recorded input sequence, voltage/bus state, required auxiliary controls, and DM Relay difficulty guidance.
5. Coordinate with Helm, Gunnery, Science, Navigation, or Comms when engineering state changes their available systems.

## Hard rules

- Do not invent power-system topology outside the canonical power map.
- Do not treat a correctly entered console sequence as automatic task success.
- Do not bypass breaker/authorization state to force a procedure.
- Keep Engineering logic in the shared simulator and its station-specific module, not in the skill.
