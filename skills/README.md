# HB Foundry Agent Skills

This directory packages selected repository capabilities as portable Agent Skills.

Each skill follows the Agent Skills open format: a directory whose `SKILL.md` begins with YAML frontmatter containing a lowercase hyphenated `name` and a descriptive activation-oriented `description`.

## Architecture rule

**Mirrored calls, not mirrored logic.** Skills are workflow/adaptation layers. They must use the authoritative Foundry capability manifest, operation contracts, API facade, campaign indexes, and canonical browser/runtime code. They must not reproduce generator, laboratory, calculator, rules, or campaign algorithms in skill instructions.

Canonical discovery surfaces:

- `/api/foundry-capabilities.json` — capability identity, runtime, status, and invocation.
- `/api/operation-contracts.json` — exact callable argument and return contracts.
- `/api/resource-collections.json` — indexed campaign/lore/resource retrieval contracts.
- `/foundry-api.js` — same-origin discovery/invocation facade.
- `/skills/index.json` — machine-readable skill registry.
- `/llms.txt` — lightweight agent discovery entrypoint.

## Status classes

A skill may wrap one of three capability classes:

1. **Callable** — the authoritative engine has a portable invocation contract and may be executed in an appropriate JavaScript/browser runtime.
2. **Page-context** — the engine is callable only after its canonical page/runtime state is initialized.
3. **Guided/UI-bound** — the authoritative implementation remains tied to UI/state. The skill may discover resources and guide use of the canonical page, but must not invent a replacement headless algorithm.

## Adding a skill

Create `skills/<skill-name>/SKILL.md`, keep the frontmatter name identical to the parent directory, add the skill to `skills/index.json`, and associate it with stable capability/resource IDs. Prefer concise workflow instructions and link back to the self-describing contracts instead of copying long schemas into the skill.

The repository validator checks naming/frontmatter rules, index coverage, declared capability/resource references, and skill-path existence.
