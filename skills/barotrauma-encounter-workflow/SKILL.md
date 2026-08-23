---
name: barotrauma-encounter-workflow
description: Discover and use the Barotrauma general encounter and lethality data for Europa operations, encounter templates, danger interpretation, and canonical runtime guidance. Activate for Barotrauma encounter-generation requests or when a user needs the repository's encounter/lethality authorities.
compatibility: Encounter data are remotely searchable; the current authoritative encounter-generation runtime remains UI/state-coupled and is not yet a portable headless capability.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-resource: barotrauma.encounter-index
---

# Barotrauma Encounter Workflow

Use `barotrauma.encounter-index` as the authoritative encounter-data collection.

## Workflow

1. Retrieve or expand `barotrauma.encounter-index` to identify the canonical encounter-template and lethality files.
2. Search the collection for environment, creature, station, route, mission, hazard, or lethality terms relevant to the request.
3. When the canonical Barotrauma operations runtime is available, use that runtime to perform generation/stateful selection.
4. When only static-resource access is available, retrieve and explain the authoritative templates and lethality records, but do not pretend a headless encounter-engine call occurred.
5. Preserve source paths and lethality/probability context in outputs.

## Runtime boundary

The encounter engine is currently assembled into the Barotrauma operations UI/runtime. This skill deliberately does not copy its closure/state logic into a second generator. Promotion to fully headless status should happen by extracting the existing runtime into a canonical pure core, then updating the Foundry capability manifest.

## Hard rules

- Do not invent an encounter-generator algorithm in the skill.
- Do not confuse template retrieval with canonical generated output.
- Do not discard lethality metadata when evaluating encounter severity.
- Use the registered encounter index rather than searching arbitrary repository text first.
