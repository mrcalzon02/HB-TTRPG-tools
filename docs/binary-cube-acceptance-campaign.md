# Binary Cube Strengthening Acceptance Campaign

**Status:** Implemented experimental runtime gate.  
**Security classification:** Experimental TTRPG obfuscation research, not production cryptography.

## Purpose

`binary-cube-acceptance-campaign.js` prevents strengthening promotion from depending on one convenient payload. It composes `binary-cube-acceptance-runner.js` and runs the same required gates across a representative payload family set.

The default campaign covers all-zero, all-one, alternating, repeated-byte, mixed, boundary-length, and multi-block inputs. Each case must independently pass indexing self-test, integrity self-test, integrity-aware corruption analysis, and positive comparative-diffusion evidence.

## Interfaces

Humans use `binary-cube-acceptance-campaign-laboratory.html`. Conventional software calls `listFamilies()`, `describe()`, or `runCampaign(request)`. AI hosts use `acceptance-campaign-tool-projection.json` and the `binary_cube_list_acceptance_families` / `binary_cube_run_acceptance_campaign` tools. All surfaces converge on the same campaign authority.

## Promotion rule

Every configured payload family must pass every required acceptance gate in the same executing runtime. A failed or errored family blocks promotion. Repository presence, individual self-tests, or a single passing payload are insufficient.

The campaign aggregates per-family disposition and gate-failure counts while retaining the underlying gate evidence. Passing remains experimental evidence only and is not a production cryptography claim.

## Next gate

Execute the campaign in a compatible runtime. If keyed-codeword fan-out repeatedly fails comparative diffusion, investigate a genuinely data-dependent chaining/diffusion mechanism instead of weakening this gate.