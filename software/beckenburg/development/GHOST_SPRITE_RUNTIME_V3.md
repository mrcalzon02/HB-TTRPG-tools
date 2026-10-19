# Ghost sprite runtime v3 — 2026-10-19

## Shipped contract

The 23 implemented ghost identities have 184 8-facing PNG atlases (8 animation rows x 4 frames = 5,888 cells), extracted from the author's Beckenburg concept art and ten existing green-tinted Ancient derivatives. The new compact build archive is 6,868,626 bytes; SHA-256 `8cdbe69101a951c0862b81a4b3b9a7555e9be8068f735466c2c77b5cd33a876d`. The uncompressed artistic source/archive stays in the Beckenburg Google Drive asset collection; the commercial runtime is 64x112 per frame. The nine source-controlled binary parts concatenate in ascending lexical order to exactly that ZIP.

Drive runtime source: https://drive.google.com/file/d/1mefrVqZwRmqmhxsYE5IlQGT5U6Nfz6Zr/view

Actual loader: `GhostSpriteAtlas.java`, `DirectionalSprites.java`; visible apparition renderer: `SceneRenderer.java`; host-authorized motion: `LanGhostAnimation.java`, `LanHost.java`; client packet dispatch: `LanWorldPanel.java`. The build packages the merged archive into the game JAR on both Windows and Unix, then executes `GhostSpriteAtlasIntegrationTest`. Ordinary cases retain the legacy observer/Banshee fallback if launched without a v3 archive; presence of a broken/incomplete v3 archive fails deterministically.

### Source art and quality limitations

These are 2D derived animation states from the original approved concept sheet cutouts. They are **not** hand-keyed articulated attack/sprint poses, and the source concept sheets provide only four distinct original viewpoints; mirrored/side substitutes are still in some of the eight directions. The compact frames require visual acceptance at real game scale, especially dark sprites and background matte cleanup. They are a functional first-pass runtime sprite library, not final approved animation art.

Three newly proposed Elder entities (Blade Demon, Plague Demon, Elder Nothic) do **not** have approved canonical four-view concept sheets and are not counted among the existing 23 ghost identities or packaged v3 sprites.

### Host and privacy behavior

A client only sees visible cosmetic apparition packets after host-side line-of-sight and manifestation checks; no hidden entity coordinates or unseen sprites are broadcast. Ancients have green-tinted atlases; legacy green tint still applies when an Ancient-specific atlas is absent. The eight atlas states are idle, walk, sprint, attack, signature, manifest, recover and dissipate. WALK/SPRINT are driven by accepted ghost movement, ATTACK by an accepted windup and SIGNATURE by a real accepted ghost action. These image frames never create evidence states or drive collision/damage.

### Validation levels

- Remote GitHub commit + nine binary parts: accepted/verified.
- ZIP checksum/CRC, 23 x 8 file count, PNG dimensions/transparency and Java 17 ImageIO decoding: verified in isolated asset checks.
- Full current Java project build, networked rendering playtest and Windows installer launch: **not verified** in this execution environment; do not claim a working published build without them.
- The accompanying integration test asserts exact reassembled SHA, all 184 directions, 8 states x 4 frames, preserved transparency, Ancient differentiation and legacy compatibility.

No GitHub Actions added.
