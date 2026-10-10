# CubeChat — saved transit test packages

**Visible package archive, verified 2026-10-10.** These are the actual publicly reproducible **canonical Binary Cube output packages** saved for later inspection, not screenshots or descriptions. Each file contains the complete bitstring `ciphertext` and the cube packet's decode metadata. Original media bytes and key files are **not included in this folder**.

**Security caveat:** These packages use publicly published deterministic laboratory keys; they are reversible experimental scrambling, **not secret encryption or AES-GCM CubeChat transport envelopes**. Do not use them to protect sensitive information.

## Fixed-version package links

The links below target commit [`155ec7c`](https://github.com/mrcalzon02/HB-TTRPG-tools/commit/155ec7cf5ebc42d880f295d628b233ebe9c9a9c8) so you can compare against an **unchanging version** even if `main` advances. The Git blob SHA identifies the exact committed file contents.

| Media | Immutable package link | Original source bytes | Saved package bytes | Git blob SHA |
| --- | --- | ---: | ---: | --- |
| PDF | [`sample.pdf.cube.json`](https://github.com/mrcalzon02/HB-TTRPG-tools/blob/155ec7cf5ebc42d880f295d628b233ebe9c9a9c8/tests/fixtures/cubechat-transit-only/sample.pdf.cube.json) | 414 | 7300 | `b4d152379bbafb468bc4c5e9c6d2be12d403e553` |
| ZIP | [`sample.zip.cube.json`](https://github.com/mrcalzon02/HB-TTRPG-tools/blob/155ec7cf5ebc42d880f295d628b233ebe9c9a9c8/tests/fixtures/cubechat-transit-only/sample.zip.cube.json) | 140 | 2980 | `95a6648e9dfc6868c35381361a8bb312ac0d6f13` |
| GIF | [`tiny.gif.cube.json`](https://github.com/mrcalzon02/HB-TTRPG-tools/blob/155ec7cf5ebc42d880f295d628b233ebe9c9a9c8/tests/fixtures/cubechat-transit-only/tiny.gif.cube.json) | 45 | 1394 | `d1bf8369bd02ada88e6bbd0c18adf6e980a3eb62` |
| JPEG | [`tiny.jpg.cube.json`](https://github.com/mrcalzon02/HB-TTRPG-tools/blob/155ec7cf5ebc42d880f295d628b233ebe9c9a9c8/tests/fixtures/cubechat-transit-only/tiny.jpg.cube.json) | 633 | 5860 | `1f2052e5c265cf4916864fda94903f39f2d48bf5` |
| WebP | [`tiny.webp.cube.json`](https://github.com/mrcalzon02/HB-TTRPG-tools/blob/155ec7cf5ebc42d880f295d628b233ebe9c9a9c8/tests/fixtures/cubechat-transit-only/tiny.webp.cube.json) | 64 | 1250 | `2cc686ce20897469331ca6efcba8eb75c1eb3448` |

[**Browse the current folder**](https://github.com/mrcalzon02/HB-TTRPG-tools/tree/main/tests/fixtures/cubechat-transit-only) · [**Testing method and verification limits**](https://github.com/mrcalzon02/HB-TTRPG-tools/blob/main/docs/cubechat-transit-fixtures.md) · [**Canonical original test harness**](https://github.com/mrcalzon02/HB-TTRPG-tools/blob/main/scripts/cubechat-file-type-roundtrip.cjs)

**Verification record:** Each of these five saved files was fetched back from GitHub and checked to contain only the expected canonical package fields. Before publishing, all five underwent exact byte round-trip, wrong-key rejection, and one-bit package-mutation rejection against the repository's canonical engine in JavaScript. This **does not** demonstrate confidentiality or robustness to cryptanalysis.

## What's not in this archive

- PNG and WAV samples passed local transform checks, but upload was blocked; do **not** count either as saved here.
- **The strengthened subcube/chaining cryptanalysis packages have not yet been generated or committed.** When available, they must be placed in a separately labeled versioned archive with an explicit comparison manifest, fixture configuration, and verified read-back. The baseline packages above must not be relabeled as strengthened.
- Ciphertext-only here means no plaintext or keys **inside these saved packages**. Public preset definitions remain in the repository, so this is not a blind/key-secret challenge.

### Quick integrity check

When you clone this repository, `git hash-object tests/fixtures/cubechat-transit-only/<filename>` returns that file's Git blob SHA. Compare it to the SHA shown in the table. No CI or GitHub Actions are required.
