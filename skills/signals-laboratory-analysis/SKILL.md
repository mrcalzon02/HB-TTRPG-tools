---
name: signals-laboratory-analysis
description: Use the Foundry Signals Laboratory for RF, antenna, RLC, propagation, environment-map, heterodyne, interfrequency, range-scenario, and experiment analysis. Activate when a user asks for Signals Laboratory calculations or interpretation and the canonical solver should be used instead of hand-reimplementing formulas.
compatibility: Requires access to HBFoundryAPI or the canonical signals-laboratory.js runtime. Live sensor capture remains a separate browser/device-context capability.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capabilities: "signals.configuration.analyze signals.utilities"
---

# Signals Laboratory Analysis

Use the canonical capabilities `signals.configuration.analyze` and `signals.utilities`.

## Workflow

1. Identify whether the request needs the full configuration analyzer or one focused utility operation.
2. Retrieve the exact operation contract before constructing arguments. Units matter; preserve documented Hz, meters, dBm, dB, H, F, ohm, and other units.
3. For a focused calculation, call `HBFoundryAPI.invoke('signals.utilities', { operation, args })` with positional arguments in the documented order.
4. For a complete model run, call `HBFoundryAPI.invoke('signals.configuration.analyze', config)`.
5. Distinguish configured inputs, model-derived outputs, inferred candidates, and actual measurements. Simulation output is not physical measurement evidence.
6. Preserve assumptions, resolution warnings, propagation-model limitations, and experiment provenance when interpreting results.

## Physical boundary

Do not claim the laboratory reconstructs information or RF energy that never coupled into the modeled/observed system. Receiver-local intermodulation products are not automatically propagating fields; use the engine's own mechanism classification.

## Live Signals

The live sensor laboratory is browser/device-context only. This skill may identify it, but must not claim remote headless access to physical sensors.

## Hard rules

- Use `api/operation-contracts.json`; never guess dispatcher arguments.
- Do not duplicate the RF solver in skill instructions.
- Keep units explicit.
- Preserve the distinction between simulation, inference, and measurement.

## Discovery links

- `https://mrcalzon02.github.io/HB-TTRPG-tools/api/foundry-capabilities.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/api/operation-contracts.json`
