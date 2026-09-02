# Binary Cube Bounded Tolerant Subcube Decoding

**Status:** Experimental strengthening/fault-tolerance layer; not promoted to ordinary encryption.

## Purpose

This cycle adds a bounded recovery experiment to subcube multi-input indexing. The strict decoder remains authoritative for exact validation. The tolerant decoder is a separate opt-in operation used to determine whether fan-out redundancy can recover localized share damage without introducing silent corruption.

## Method

`decodeSubcubeInputsTolerant(encodedBits, plan, options)` compares each observed physical codeword with the deterministic logical-zero and logical-one codewords. It chooses only a unique nearest codeword. Equal-distance observations are rejected as ambiguous. A candidate farther than `maxCorrections` from the nearest codeword is rejected. The safe default is `floor((fanOut - 1) / 2)`, yielding 0, 1, 2, and 3 corrected shares per codeword for fan-outs 1, 3, 5, and 7.

The result reports total corrected shares, corrected logical codewords, and per-codeword distances to both valid states. This makes recovery observable rather than silently normalizing damaged input.

## Damage-analysis integration

`binary-cube-subcube-damage-analysis.js` v2 now runs both decoders after flipping every share assigned to one indexed region at a time. It records strict detection/recovery separately from tolerant recovery/rejection and counts any tolerant decode that returns a wrong source as `tolerantSilentCorruption`.

Acceptance for the damage experiment requires zero silent-corruption cases. Exact tolerant recovery is useful evidence; explicit rejection is safe evidence; a wrong accepted plaintext is a failure.

## Access-surface parity

- Human: `binary-cube-subcube-damage-laboratory.html` exposes mode, fan-out, region count, seed, correction bound, single analysis, and fan-out comparison.
- API/CommonJS: `binary-cube-subcube-indexing.js` exports `decodeSubcubeInputsTolerant`; `binary-cube-subcube-damage-analysis.js` exports `run` and `compare`.
- AI/tool: `skills/binary-cube-laboratory/subcube-damage-tool-projection.json` exposes the same damage-analysis parameters and safe correction semantics.

## Promotion gates

Do not use tolerant decoding in ordinary encryption/decryption until runtime tests demonstrate deterministic exact recovery for undamaged data, bounded correction for all supported fan-outs and both indexing modes, rejection beyond the configured correction radius, ambiguity rejection, wrong-plan rejection, zero silent corruption in localized-region tests, and acceptable expansion/runtime costs.

## Next target

Build a corruption matrix that varies the number and pattern of damaged shares rather than only whole indexed regions. Test single-share, multi-share, contiguous, dispersed, region-loss, and adversarial near-codeword mutations across fan-outs 1/3/5/7. The purpose is to map the actual correction boundary and identify any silent-corruption surface before considering workflow promotion.