# Iterative environment production kit

A portable record of the Beckenburg map and model production method, prepared 28 October 2026. It combines the workflow, measurable standards, actual failure investigations, a resumable map packet, an evidence validator and a GitHub Actions example. It is useful for another game or tabletop environment project after supplying that project's engine adapters and design constraints.

- **Read/share:** [complete illustrated-by-evidence guide](index.html), [workflow](references/WORKFLOW.md), [standards/math](references/STANDARDS.md), [worked investigations](references/CASE_STUDIES.md).
- **Agent entry:** [SKILL.md](SKILL.md), [machine manifest](manifest.json).
- **Execute:** Python 3.10+, no extra packages. Run from this directory:

```sh
python scripts/production.py init my-map --map-id example-site
python scripts/production.py validate my-map/packet.json
python scripts/production.py report my-map/packet.json --output my-map/review.html
python -m unittest discover -s tests -v
```

Initialization deliberately leaves gates open and a placeholder input revision. Replace `input_revision` with the exact 40-character input commit before validation; the initial placeholder correctly fails validation. `validate` checks record integrity and any claimed passes; `validate --require-complete` also refuses unfinished gates and unresolved defects. Neither mode constitutes an independent art or gameplay judgment. No engine or model generation is hidden inside the validator.

Read [PORTABILITY.md](references/PORTABILITY.md) before recording a passed gate. Use `examples/validate-environment.yml` as a CI adapter and `examples/HANDOFF.md` to resume work in another session. `scripts/build_package.py` regenerates the offline HTML guide and deterministic ZIP. `environment-production.zip` and its SHA-256 sidecar are downloadable from the public package page; the ZIP includes the full skill and tools, not external game assets.

Existing Foundry non-commercial terms apply; see [PROVENANCE.md](PROVENANCE.md). Publicly readable does not mean universally MIT licensed.
