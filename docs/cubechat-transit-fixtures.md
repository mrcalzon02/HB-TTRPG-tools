# CubeChat isolated experimental transit packages (2026-10-10)

**Experimental reversible obfuscation; NOT secure encryption.** These packages are deterministic Binary Cube laboratory samples made with **public test presets**. Anyone with the published presets can recover their original contents. They do not offer confidentiality or cryptographic authenticity, and they are not AES-GCM chat envelopes.

The [isolated transit-only fixture directory](../tests/fixtures/cubechat-transit-only/) contains **only canonical Binary Cube package JSON**: ciphertext bitstrings and necessary decode metadata; no original images, source files, or key files. Each was regenerated from the canonical engine and exact source fixtures in [the original harness](../scripts/cubechat-file-type-roundtrip.cjs), using the public [preset catalog](../skills/binary-cube-laboratory/test-packages.json).

| Transit package | Media | Original bytes | Test preset |
| --- | --- | ---: | --- |
| [`tiny.jpg.cube.json`](../tests/fixtures/cubechat-transit-only/tiny.jpg.cube.json) | image/jpeg | 633 | `full-mask-no-filler-capacity` |
| [`tiny.gif.cube.json`](../tests/fixtures/cubechat-transit-only/tiny.gif.cube.json) | image/gif | 45 | `repeated-byte-pattern` |
| [`tiny.webp.cube.json`](../tests/fixtures/cubechat-transit-only/tiny.webp.cube.json) | image/webp | 64 | `full-mask-no-filler-capacity` |
| [`sample.pdf.cube.json`](../tests/fixtures/cubechat-transit-only/sample.pdf.cube.json) | application/pdf | 414 | `repeated-byte-pattern` |
| [`sample.zip.cube.json`](../tests/fixtures/cubechat-transit-only/sample.zip.cube.json) | application/zip | 140 | `repeated-byte-pattern` |

**Verification performed in a JavaScript runtime against the canonical repository engine:** exact bit/byte recovery, package validation, wrong-key rejection, and single-bit corruption rejection all passed for each of the 5 packages. This is not a Node harness execution, nor proof of network transport, mobile compatibility, large-file streaming, or security. Source bits are deliberately absent from the exported packages, but remain derivable using the public keys.

**Repository upload limitation:** Some otherwise verified file types could not be published through the connected interface: tiny.png. The existing harness remains the source of those cases.

**WAV scope:** The WAV sample passed local engine checks but its blob was blocked by the GitHub upload interface. It has not been included in the set committed here.

The package filename and decoded file type are a human-readable test label, not a confidential or authenticated file-transfer header. The secure encrypted-file format is a separate future task.
