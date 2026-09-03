# Binary Cube Data-Dependent Chaining Experiment

Status: implemented experimental capability; runtime acceptance required.

## Purpose

This experiment diversifies Cube strengthening beyond subcube fan-out. It applies a reversible, length-preserving pre-cube transform in which each emitted bit updates state used to transform later positions. A source-bit perturbation can therefore affect subsequent pre-cube positions without multiplying input length.

## Authoritative implementation

`binary-cube-data-dependent-chaining.js` is the sole chaining authority. The human laboratory, conventional callers, and AI tool projection call that implementation rather than reproducing its logic.

Operations are `describe()`, `encode(bits, options)`, `decode(bits, options)`, `analyze(request)`, and `selfTest()`.

## Access surfaces

Humans use `binary-cube-data-dependent-chaining-laboratory.html`. Conventional software imports the module directly. AI hosts discover the same operations through `skills/binary-cube-laboratory/chaining-tool-projection.json`.

## Design boundaries

The transform has a 1.0 expansion ratio. It is reversible with the same seed. It is not authentication, a standardized cipher mode, or production cryptography. Its state mixer exists to test the fitness of data-dependent chaining as a Cube preconditioner, not to make an independent security claim.

## Promotion gates

Before ordinary encryption integration, runtime evidence must establish deterministic exact round-trip recovery across representative payload families; wrong-seed behavior; useful pre-cube and final-ciphertext diffusion relative to unchained Cube and subcube fan-out; boundary and multi-block behavior; runtime and memory cost; integrity interaction; and cross-interface parity. The existing acceptance campaign should be extended to compare strengthening strategies rather than weakening its current subcube gates.

## Next development target

Build a strengthening-strategy comparison authority that runs unstrengthened Cube, subcube fan-out, and data-dependent chaining under equivalent Cube conditions and reports diffusion, expansion, runtime, recovery, and acceptance evidence without treating unlike output lengths as directly equivalent.