# Reciprocal Charles engram / Agent Skill binding

The registered Foundry skill interface and the canonical `blacklight.charles` personality file are *mutual discovery companions*: every registered skill requires `docs/blacklight/charles-personality-engram.json`; the engram requires `skills/index.json`, an index of **optional** skills. This is not automatic permission to run them.

The index pins a SHA-256 of the exact raw engram bytes. The browser context loader verifies that checksum and the two-way reference before releasing a skill document, and the executable portable loader uses the context loader before loading any runtime scripts. Each registered `SKILL.md` carries required companion metadata and a visible fail-closed instruction. `scripts/validate-agent-skills.mjs` checks both contracts and includes negative tamper cases.

A package can be built with `python3 scripts/agent-skill-bundle.py pack --skill foundry-discovery --output dist/skill.zip` and verified with `python3 scripts/agent-skill-bundle.py verify dist/skill.zip --trusted-engram-sha256 <sha256>`. ZIPs contain engram resources, registry and selected skills, plus a locked inventory. Use `--all` for the registered family. Exports are **declarative**: separate runtime requirements remain authoritative.

This arrangement provides mandatory bootstrap and detectable integrity failures **for our compliant clients**. GitHub raw content is public: no instructions or packaging method can force a hostile executor to apply a downloaded engram. Registry and engram supplied by the same mutable origin can be swapped together, so a digest alone cannot authenticate the publisher. Stronger tamper resistance requires externally pinned digests or signed releases, trusted runtimes and scoped tool authorization. Do not claim that a model's personality overrides the host/system security policy.

See [expansion backlog](ai-access/engram-skill-expansion-backlog.md) for future memory, task-focus, FMPL pipette, MCP and runner-oriented skills.
