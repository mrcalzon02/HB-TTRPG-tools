# Binary Cube Strengthening Acceptance

**Status:** Implemented experimental acceptance orchestration; runtime evidence required.  
**Authority:** `binary-cube-acceptance-runner.js`  
**Security classification:** Experimental TTRPG obfuscation research, not production cryptography.

## Purpose

The strengthening program now has several independent experimental authorities. This acceptance runner prevents repository presence, isolated self-tests, or one favorable metric from being mistaken for promotion readiness. It executes the required evidence in one runtime and emits one structured report.

## Required gates

1. `indexing-self-test` — deterministic plans, exact recovery, tolerant single-share recovery, collision freedom, expansion accounting, and distinct-region coverage from the authoritative indexing module.
2. `integrity-self-test` — exact/corrected recovery verification plus wrong-key and wrong-plaintext rejection from the independent integrity module.
3. `corruption-integrity` — bounded share-corruption campaign with strict/tolerant decoder dispositions and independent integrity disposition. Wrong plaintext that verifies blocks promotion.
4. `comparative-diffusion` — identical-source/key comparison of candidate fan-out against fan-out 1. The candidate must exact-round-trip and improve mean normalized ciphertext diffusion.

All required gates must pass in the same executing runtime for `promotionReady=true`. This result is evidence for promoting an experimental strengthening configuration inside the laboratory; it is not a claim of production cryptographic security.

## Access parity

Humans use `binary-cube-acceptance-laboratory.html`. Conventional integrations call `describe()` or `runAcceptance(request)` from the shared module. AI hosts use `skills/binary-cube-laboratory/acceptance-tool-projection.json`. These surfaces call the same authority rather than implementing their own acceptance rules.

## Promotion boundary

Until a runtime report has `summary.promotionReady=true`, subcube indexing, tolerant recovery, and experimental integrity remain outside ordinary Cube encryption. Even after a pass, standardized authentication and substantially broader cryptanalytic review are required before any production-security claim could be considered.

## Next work

Run the consolidated report across representative low-entropy, repeated, alternating, mixed, and multi-block payload families. If the comparative-diffusion gate fails, preserve the result and investigate strengthening mechanisms rather than weakening the acceptance criterion.