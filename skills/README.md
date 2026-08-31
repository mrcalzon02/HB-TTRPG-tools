# HB Foundry Agent Skills

This directory packages selected repository capabilities as portable Agent Skills.

Each skill follows the Agent Skills open format: a directory whose `SKILL.md` begins with YAML frontmatter containing a lowercase hyphenated `name` and a descriptive activation-oriented `description`.

## Architecture rule

**Mirrored calls, not mirrored logic.** Skills are workflow/adaptation layers. They must use the authoritative Foundry capability manifest, operation contracts, API facade, campaign indexes, and canonical browser/runtime code. They must not reproduce generator, laboratory, calculator, rules, or campaign algorithms in skill instructions.

Canonical discovery surfaces:

- `/api/ai/status-vocabulary.json` — shared availability and host-execution status meanings.
- `/api/foundry-capabilities.json` — capability identity, runtime, status, and invocation.
- `/api/operation-contracts.json` — exact operation argument and return contracts.
- `/api/resource-collections.json` — indexed campaign/lore/resource retrieval contracts.
- `/foundry-api.js` — same-origin discovery/invocation facade.
- `/skills/index.json` — machine-readable skill registry.
- `/llms.txt` — lightweight agent discovery entrypoint.

## Status classes

Skill registry status values use `/api/ai/status-vocabulary.json`. The important static declarations are:

1. **`onboardable`** — the skill can be loaded and understood, but that alone does not claim the current host can execute every referenced capability.
2. **`runtime-required`** — the authoritative engine exists and requires the declared JavaScript/runtime host before execution can be attempted.
3. **`page-context`** — execution requires the canonical page/runtime state and its declared dependencies.
4. **`ui-bound`** — authoritative behavior remains tied to human UI/state; the skill may discover resources and guide use of the canonical page but must not invent a replacement headless algorithm.
5. **`live-device-context`** — the capability requires live sensor, microphone, radio, hardware, or other device context.

`runtime-compatible`, `self-test-passed`, `ready`, `incompatible`, and `degraded` are host-observed states. They must not be published as unconditional facts about an arbitrary external LLM environment.

## Adding a skill

Create `skills/<skill-name>/SKILL.md`, keep the frontmatter name identical to the parent directory, add the skill to `skills/index.json`, and associate it with stable capability/resource IDs. Prefer concise workflow instructions and link back to the self-describing contracts instead of copying long schemas into the skill.

The repository validator checks naming/frontmatter rules, index coverage, declared capability/resource references, and skill-path existence.
