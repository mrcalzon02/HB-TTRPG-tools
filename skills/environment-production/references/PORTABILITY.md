# Running the method locally, remotely and in CI

## The portable boundary

The package contains one canonical Python evidence helper. Its HTML guide is a reading projection, not another implementation. Local agents, web agents with a Python sandbox and CI all invoke the same helper. Project adapters provide actual scene generation, rendering, movement, audio, multiplayer and hardware tests. No Beckenburg engine, Blender installation, purchased asset pack or private workstation path is required to read or validate a packet.

Use `python scripts/production.py init <new-directory> --map-id <stable-id>` to create a fresh packet and handoff. The command refuses an existing destination. All gates start open. Complete them in the order documented in WORKFLOW.md; preservation of existing work may mean auditing an already built stage rather than reconstructing it.

## Packet v1 contract

`packet.json` is UTF-8 JSON. Paths are relative to its directory. No absolute paths, `..`, backslashes, symlinks escaping the packet root or network URLs are accepted as local evidence paths. Remote sources belong in provenance documentation, not in the local hash slot.

| Field | Contract |
|---|---|
| `schema_version` | integer `1` |
| `map_id`, `lore_name` | nonempty strings |
| `input_revision` | exact 40-character lowercase Git SHA for the inputs being reviewed |
| `gates` | every gate from `manifest.json`, exactly once |
| `artifacts` | unique IDs; relative path, SHA-256, evidence kind, input revision |
| `defects` | unique IDs, summary, severity, status, affected scope, reproduction, regression |
| `handoff` | relative path to a real nonempty handoff file |

A gate has `id`, `status` (`open`, `blocked`, `passed`), `evidence` artifact IDs and `review`. A passed gate needs a nonempty reviewer, valid ISO date, scope, outcome `pass`, current input revision and at least the gate's required evidence kinds. Its manifest `depends_on` prerequisites must also be passed; for example architecture cannot pass before terrain. The human gate also requires `reviewer_type: human`; automated/agent review cannot substitute for it. This is an attestation field, not authentication: policy must identify who can write that record.

Artifacts have `id`, `path`, `sha256`, `kind`, `input_revision`. Evidence kinds are enumerated in `manifest.json`. A passed gate cannot cite an artifact from another input revision. The helper verifies bytes, reference integrity and required evidence types, but cannot decide whether a screenshot depicts the claimed engine or whether an attestation is truthful. Review the artifacts and the capture logs.

Defect severity is `critical`, `major` or `minor`; status is `open`, `fixed` or `accepted`. A fixed defect needs `fix_revision` equal to the current input revision and evidence IDs; an accepted defect needs a documented acceptance reason. Complete mode rejects every unresolved defect, including minor ones: explicitly accept a known limitation if project policy allows it. Accepted limitations must remain visible to the final reviewer.

Validation exits 0 for a structurally valid, honest in-progress packet. Open gates are printed as open, never green. `--require-complete` rejects any open/blocked gate or open defect. Malformed records, stale passed gates, missing files and hash mismatches fail in either mode. JSON and HTML reports make these states reviewable.

## Attach real results

1. Record the exact input commit and copy/export artifacts into the packet directory. Do not hash a mutable file while a renderer is still writing it.
2. Record successful process completion separately in the capture/test report. Include source/build hash, camera/state, command, tool versions and limitations.
3. Run `python scripts/production.py hash <artifact-file>` and insert that SHA-256 into the artifact record. The command hashes one file; it does not approve it.
4. Reference the artifact IDs from relevant gates. Add review records only after the corresponding inspection actually occurred.
5. Run `validate` and generate `report`. If any input changes, update the input revision and reopen or renew affected evidence. This v1 helper intentionally treats revision freshness conservatively.

Gate kinds represent minimum record coverage. For instance, a runtime image and a gameplay report are not interchangeable. Multiple screenshots of one corner do not cover every required room; the gate review scope must describe coverage and missing areas. A project should add more specific checks in its engine adapter instead of weakening the packet's meaning.

## Engine adapter examples

- **Blender/source:** generate or import geometry in declared units; export native bounds, world matrices, UV/normal counts and packed image hashes; reopen the saved source; capture overhead, underside and model inspection views.
- **Runtime renderer:** load the actual export, use fixed cameras/state and immutable binaries, save frame metadata and images, exit cleanly. Add animation sequences where motion matters. Do not publish native viewport images under this adapter's label.
- **Physics/gameplay:** sweep the actual player shape from canonical arrival through required spaces and controls; test door states, stairs, water barriers and supports. A graph-only path is insufficient.
- **Power/lighting:** on/off and independent-source cases; real production sampler; negative and positive controls; doorway/stair openness; cache invalidation; representative old-map regression matrix.
- **Network:** host/client state agreement for doors, power, object ownership and encounters, including reset and late join where supported.
- **Hardware:** measured installed gameplay and frame times on named hardware. A headless GPU capture can support a rendering claim but not this claim automatically.

The pinned source index links Beckenburg's implementation/tests/build tools so a developer can examine the concrete adapters. Commands and classes are source references, not a promise that they execute inside the Foundry repository. Adapt them to the current engine and installed toolchain.

## GitHub Actions

`examples/validate-environment.yml` is a manually dispatched example. Copy it to the target project's `.github/workflows/`, adjust the skill path and packet path, and run with ordinary read-only repository permissions. It validates a checked-in packet, requires complete gates and uploads the review report. It does not execute shell code from JSON, install game dependencies or claim to render anything.

For a real rendering pipeline, add explicit, reviewed commands before validation to build the target engine and collect evidence. Prefer pinned toolchain/action revisions according to the target repository's policy. Untrusted pull-request code must not receive publication secrets. Uploading artifacts is not Pages deployment or human approval.

The Foundry's own `validate-environment-production.yml` runs helper regression tests and checks that the packaged HTML/ZIP are current. Its success validates this tool package, not any map.

## Web and remote-model use

Start at the public skill HTML or `SKILL.md`; retrieve only relevant references. If the host can read text but cannot execute Python, use the guide to review/design and hand the packet to an authorized execution host. State that limitation. If a sandbox is available, download the ZIP, verify its sidecar hash and unpack it into a dedicated working directory before running tests.

Static Pages offers public reading/downloads only. Repository commits, workflow dispatch, engine execution and gallery publication require separate authorized transports. The skill must not imply that loading a manifest grants them.

## Preservation and publication

Use a scoped commit containing only this batch. Fetch/reconcile before push and never force away concurrent work. Preserve local artifacts if connectivity fails. Record publication as pending until the remote contains the commit; record website delivery separately after deployed bytes match expected hashes. Retry transient failures modestly through an already authorized transport.

For migration include the packet, source/export manifests, defect ledger, reproducible commands, actual logs, capture metadata and latest handoff. Keep exact local paths out of portable instructions. Preserve third-party licences and original source identities; a workflow archive is not permission to redistribute paid models.
