# Binary Cube five-way strengthening campaign

Status: experimental; runtime evidence required; not production cryptography.

This campaign is the corpus-wide comparison authority for five pre-Cube strategies: baseline, standalone subcube fan-out, standalone data-dependent chaining, chaining then subcube, and subcube then chaining. It reuses the payload families defined by `binary-cube-acceptance-campaign.js`, the standalone comparison logic in `binary-cube-strengthening-strategy-comparison.js`, and the composition authority in `binary-cube-strengthening-composition.js`.

For every payload family the campaign records exact round-trip recovery, normalized pre-Cube diffusion, normalized ciphertext diffusion, expansion ratio, and runtime-local timing. Aggregates include both mean and worst-family ciphertext diffusion. Descriptive ordering prioritizes worst-family diffusion before mean diffusion, then lower expansion and lower observed runtime. This ordering is explicitly not a security ranking or promotion decision.

Both compositions pay their full subcube expansion cost. A composition must not receive credit for additional diffusion while its representation and runtime costs are hidden. Any strategy with a round-trip failure is excluded from descriptive ordering.

Human access is `binary-cube-strengthening-five-way-campaign-laboratory.html`. Conventional integrations use `describe()` and `runCampaign(request)` from `binary-cube-strengthening-five-way-campaign.js`. AI integrations use `skills/binary-cube-laboratory/five-way-campaign-tool-projection.json`. All three surfaces converge on the same campaign implementation.

Promotion into ordinary encryption remains prohibited until observed runtime evidence passes the broader acceptance gates. Repository presence, descriptive ranking, or favorable diffusion measurements do not establish cryptographic security.