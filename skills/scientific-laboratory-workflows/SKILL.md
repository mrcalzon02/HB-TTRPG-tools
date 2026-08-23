---
name: scientific-laboratory-workflows
description: Discover and correctly route work across the Foundry scientific laboratories, including Signals, Live Signals, Audio, Advanced Steganalysis, Double Slit, Interstellar Media Collisions, and Binary Cube research tools. Activate when a user asks which laboratory to use or needs a workflow that spans multiple lab surfaces.
compatibility: Some laboratories are portable solver engines, while others require browser UI, device sensors, or live page context. Respect the current laboratory status in the Foundry manifest.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-workspace: Scientific Tools
---

# Scientific Laboratory Workflows

Use the Foundry laboratory registry to route a request to the correct canonical lab.

## Laboratory classes

- Signals Laboratory — portable solver and self-documented utility API.
- Binary Cube Laboratory — portable experimental TTRPG obfuscation engine.
- Live Signals Laboratory — browser/device sensor context.
- Audio Laboratory — browser-context acoustic/ranging workflow.
- Advanced Steganalysis Laboratory — browser-context analysis workflow.
- Double Slit Laboratory — browser-context simulation/visualization workflow.
- Interstellar Media Collisions Laboratory — browser-context scientific simulation workflow.

## Workflow

1. Identify the scientific question and the laboratory whose scope actually matches it.
2. Check the laboratory status in `api/foundry-capabilities.json` before promising execution.
3. For portable Signals or Binary Cube work, activate their dedicated skills and use the self-describing operation contracts.
4. For browser/device-context laboratories, use their canonical UI/runtime when available and preserve the distinction between modeled output, inferred output, and physical measurements.
5. If no headless API exists, do not duplicate the scientific model in this routing skill merely to make it callable.

## Hard rules

- Never describe a live-sensor laboratory as remotely available without actual sensor/browser context.
- Never promote a UI-bound laboratory to callable status based only on the presence of an HTML page.
- Preserve physical/model limitations stated by the canonical laboratory.
- Prefer dedicated lab skills when one exists.
