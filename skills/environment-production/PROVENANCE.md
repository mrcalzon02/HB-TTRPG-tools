# Provenance, authorship and governing terms

Prepared 28 October 2026 for **mrcalzon02**, under the user's direction to preserve and share the map-production process before conversation migration. The package is maintained in **Calzon's TTRPG Foundry**, `mrcalzon02/HB-TTRPG-tools`.

Human location concepts, creative direction, quality expectations and acceptance authority belong to the project owner. OpenAI ChatGPT assisted with implementation, analysis, documentation, tests and GitHub integration. Neither the tool provider nor an automated report supplies human art acceptance.

## Source boundary

The process was distilled from committed Beckenburg instructions, workflows and verification reports at exact revision `db6c5b6a93d00426d8cc7b2c0f69515b824e0e75`. `source-index.json` contains 25 original paths, pinned GitHub URLs, byte sizes and SHA-256 identities. Three original JSON investigation reports are bundled byte-for-byte in `references/evidence/`; their capture paths refer to the source game repository, not to files inside this kit. Follow their pinned source paths to retrieve the historical image bytes.

Concurrent uncommitted Castle development was excluded. Case studies are historical observations from those records, not reruns by this package. Source snapshots and review pages may describe incomplete work. The package's own tests validate the portable helper and distribution, not the maps.

This distribution contains newly authored guidance, a small evidence-record helper, test fixtures and CI examples. It does **not** include game executables, paid model libraries, external reference photography or the water module implementation. Referenced source tools remain authoritative in their original repository and retain their existing rights and dependencies. The water module's own MIT/upstream notices do not apply to the entire Foundry or this archive.

## Usage agreement

Existing [Foundry Terms of Service & Usage Agreement](TERMS-OF-SERVICE.md), last updated July 10, 2026, govern this package. Section 3 permits personal/private/non-commercial use and adaptation, and prohibits commercial exploitation and incorporation of the Platform's source or proprietary lore into commercial products. Attribution is appreciated. These are custom terms, not a standard OSI licence. No licence change is made by this packaging work.

Keep this notice and the terms with copies. Third-party software, systems, trademarks, references and assets retain their respective rights. Sharing the workflow does not grant rights to redistribute separately licensed game assets.

## Reproduction

Python 3.10+ and its standard library are sufficient for helper tests, packet validation, HTML generation and deterministic ZIP assembly. Target-engine adapters require their own runtimes. See `references/PORTABILITY.md` and `VALIDATION.md`. Static hosting provides documents and downloads; no remote rendering or privileged execution service is claimed.
