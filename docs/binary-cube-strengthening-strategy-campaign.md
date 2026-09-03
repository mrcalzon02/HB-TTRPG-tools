# Cube Strengthening Strategy Campaign

Status: implemented experimental research surface; runtime evidence required.

## Purpose

This campaign extends the single-payload strengthening strategy comparison across the same representative payload corpus owned by `binary-cube-acceptance-campaign.js`. It exists to prevent an aggregate or single convenient payload from hiding strategy failures on low-entropy, alternating, repeated, mixed, boundary-length, or multi-block data.

## Authority and composition

`binary-cube-strengthening-strategy-campaign.js` owns campaign orchestration only. It does not reproduce Cube encryption, subcube indexing, chaining, or payload-family definitions. It delegates each family to `binary-cube-strengthening-strategy-comparison.js` and obtains the default corpus from `binary-cube-acceptance-campaign.js`.

The human laboratory, conventional API/Node caller, and AI tool projection all converge on this same authority.

## Evidence

For every payload family the report preserves exact round-trip status, normalized pre-Cube diffusion, normalized ciphertext diffusion, representation expansion, and runtime-local timing for baseline Cube, subcube fan-out, and reversible data-dependent chaining. Aggregate evidence includes means and the worst observed family ciphertext diffusion so a favorable mean cannot completely hide a weak family.

## Descriptive ordering

Only strategies that exact-round-trip every configured family are eligible for descriptive ordering. Ordering uses mean ciphertext diffusion first, then lower representation expansion, then lower observed runtime. This is deliberately not a cryptographic security ranking and is not a promotion decision. Runtime timing is environment-specific.

## Promotion boundary

A strategy does not enter ordinary encryption because it ranks first here. Promotion remains controlled by the acceptance authorities and requires observed runtime evidence across their required gates. A strategy that improves diffusion but fails exact recovery, integrity, corruption handling, portability, or justified cost remains unfit for promotion.

## Next decision point

Once runtime evidence exists, compare the corpus-wide shape rather than only the mean. If chaining improves diffusion consistently at 1x expansion, prioritize deeper chaining analysis. If subcube provides distinct recovery/integrity value despite expansion, retain it for that purpose rather than calling redundancy itself diffusion. If neither produces useful evidence, investigate a new strengthening mechanism instead of weakening acceptance criteria.