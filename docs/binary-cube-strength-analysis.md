# Binary Cube Perturbation Strength Analysis

Status: implemented research analysis surface; runtime acceptance still required.

## Authority and scope

This record defines the first strengthening-analysis layer for the Binary Cube Laboratory. It does not change the canonical transformation in `shadowrun-binary-cube-engine.js` and does not claim production cryptographic security. The implementation authority is `binary-cube-strength-analysis.js`.

The purpose is to identify weak configurations before introducing additional transforms such as nested/sub-cube stages. Strengthening work must be evidence-driven: first measure where diffusion remains localized or predictable, then design a strengthening method against an observed weakness, then run the same measurements again.

## Analysis model

For a supplied binary payload and canonical key configuration, the analyzer creates one baseline package through the canonical engine. It then samples source-bit positions, flips one source bit at a time, re-encrypts with the same key, and measures ciphertext Hamming change. It separately creates a deterministic alternate key by perturbing the seed and measures the resulting ciphertext change.

Ciphertext is also partitioned into `gridSize²` diagnostic windows. These are called diagnostic subcube windows because they correspond to a face-sized region for the active grid. They are analysis regions only; they are not an alternate cipher and do not create a second implementation of Binary Cube encryption.

The structured result includes baseline configuration, sampled plaintext perturbations, overall Hamming ratios, per-window diffusion, deterministic key perturbation, summary statistics, and explicit findings. Current warning thresholds flag mean plaintext perturbation diffusion below 25%, any sampled plaintext bit that causes zero comparable ciphertext change, and deterministic key-seed perturbation diffusion below 25%.

## Three access surfaces

Human: `binary-cube-strength-laboratory.html` exposes payload, grid size, mask density, seed, face pair, and sample count, then displays mean/min/max plaintext diffusion, key-seed diffusion, diagnostic-window size, findings, and full structured evidence.

Software/API: `binary-cube-strength-analysis.js` is UMD/CommonJS compatible and exports `runPerturbationAnalysis(request)`, `hamming(left,right)`, and `windowDiffusion(left,right,windowSize)`. It depends only on the canonical Binary Cube engine.

AI/LLM: `skills/binary-cube-laboratory/tool-projection.json` exposes `binary_cube_strength_analysis` with the same request semantics and binds directly to `binary-cube-strength-analysis.js` rather than reimplementing the analysis in a prompt or tool wrapper.

## Strengthening decision gate

Do not add nested/sub-cube encryption merely because it sounds stronger. A candidate strengthening method should enter implementation only after the perturbation suite identifies a concrete weakness it is intended to address. Candidate methods can then be compared using the same payload/key configuration and the same metrics. This keeps complexity proportional to demonstrated benefit and prevents an unmeasured stack of transforms.

## Verification state

Repository writes and read-back can establish that the module, human surface, AI projection, and this record exist on `main`. Runtime acceptance requires executing the analyzer against the canonical engine in a JavaScript host and recording the resulting evidence. Until that occurs, the feature is implemented but not runtime-accepted.

## Next development target

Run a systematic matrix across grid size, mask density, legal face pairs, rotations, low-entropy payloads, repeated payloads, and block-boundary lengths. Use the observed weakest configurations to decide whether the first strengthening experiment should be a nested/sub-cube diffusion stage, a block-to-block chaining stage, a key-schedule change, or another targeted mechanism. Any candidate must preserve exact three-state recovery and remain exposed consistently through human, API, and AI surfaces.
