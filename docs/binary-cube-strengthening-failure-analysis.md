# Binary Cube Strengthening Failure Analysis

Status: implemented experimental; runtime evidence required.

## Purpose

This authority tests how the five current strengthening strategies behave when their stored or transmitted pre-Cube representation is damaged. It complements perturbation/diffusion experiments by asking what happens after representation corruption rather than what happens when source plaintext changes.

Strategies are baseline, subcube, chaining, chaining then subcube, and subcube then chaining. All transformation work delegates to the existing authoritative subcube and chaining modules.

## Damage model

The experiment flips equivalent counts of representation bits using two bounded patterns: localized contiguous damage and dispersed damage spread across the representation. The requested maximum damage depth is applied independently to each strategy's actual encoded representation, so expansion cost remains visible.

## Recovery dispositions

Each case is classified as one of four relevant outcomes: exact recovery with independent integrity verification, decoder rejection, wrong recovery detected by integrity, or critical undetected wrong recovery. Decoder rejection and integrity rejection are deliberately kept distinct because they answer different questions.

Damage propagation is reported as Hamming distance between the original source and any returned recovery. Tolerant subcube diagnostics are retained when applicable.

## Integrity boundary

The existing experimental integrity authority is used as independent instrumentation over the original source and strategy context. Its `experimental-keyed-hash128-v1` tag is not a standardized MAC and must not be presented as production authentication. A zero count of undetected wrong recovery is a necessary laboratory result, not a security proof.

## Corpus campaign

`runCampaign()` reuses the authoritative seven-family acceptance corpus: low-entropy zero, low-entropy one, alternating, repeated, mixed, boundary-length, and multi-block. Aggregate counts are preserved per strategy, including critical undetected wrong recovery and mean expansion ratio.

## Access surfaces

Human: `binary-cube-strengthening-failure-laboratory.html`.

API/Node: `binary-cube-strengthening-failure-analysis.js` exports `describe()`, `analyze(request)`, and `runCampaign(request)`.

AI: `skills/binary-cube-laboratory/failure-analysis-tool-projection.json` exposes matching discovery, single-payload analysis, and seven-family campaign operations.

## Promotion boundary

This authority does not promote any strengthening strategy into ordinary encryption. Promotion still requires observed runtime evidence across the broader acceptance gates, justified expansion/runtime cost, cross-interface parity, and a standardized authentication construction before any production-security claim.
