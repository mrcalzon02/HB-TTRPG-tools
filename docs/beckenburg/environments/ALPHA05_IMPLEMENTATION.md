# Beckenburg Solo Alpha 0.5 — Shared Van, House Layout & Contextual Communication

2026-10-15. **Local implemented gameplay; remote verification is required before claiming a GitHub commit.**

## Actual implementation
- Twelve connected interior rooms and three exterior zones in the **starter house**. Ghost anchors occur in interior rooms. The van staging zone remains hunter-only for early match safety. Doors, collision, route graph, field map, instruments, cleansing and extraction are integrated, but none of the other eight location families are playable.
- **Single re-usable expedition van module** (`VanStaging.java`) with a map-independent, rotatable `Placement`, standardized doorless cargo opening, collision shell and four actual service interactions: briefing panel, equipment cycling, evidence/callout relay and extraction console. Rendering instantiates its actual low-poly cargo surfaces, consoles and lockers. Other maps can use the same module without copying those behaviors; fitting it into each site remains a separate map-authoring step.
- Fixed thin-panel clipping with circle/AABB actor collision against the van. The front opening remains accessible and the shared extraction objective remains validated.
- **Hold Q** radial callout selection with eight phrases, contextual world-space ping, displayed message, line-of-sight/range validation, finite input checks, per-sender cooldown, age-out and bounded event list. No prerecorded voice files, skeletal pointing animation or network transport yet.
- Furniture changed to match real twelve-room design: bathroom, master bedroom, living room, kitchen, library and dining room have genre-appropriate models instead of mismatched prior-case props.
- Retained 320x200 textured PS-era rendering, all three roles, AI Spirit command parity, wards, evidence, rewards and safe local persistence.

## Test evidence
`sh build.sh` compiles with `javac --release 17` and executes `GameplaySmokeTest`, `GhostDomainTest`, `MaterialAtlasTest`, `TeamCalloutTest` and `VanStagingTest` under Java 21 running Java-17-targeted class files. `xvfb-run -a java -cp build/classes:build/test org.beckenburg.GuiSmokeTest` confirms Swing menu→first-person viewport on a Linux graphical display. `VanStagingTest` specifically covers 4 van orientations, each station, cargo collision, movement out front and real mission extraction. Tests are not a clean Windows installation or LAN test.

## Remaining gates
Windows runtime/installer, playable human ghost, LAN host/join, AI/ghost human parity *over the wire*, imported artist-approved PNG concept and texture assets, proper image gallery, other eight sites, actual room-aware navigation layouts and physical prop collision are incomplete. Warnings should remain in the project status ledger; do not mark P00, P03, P21 or a release milestone complete from this slice alone.
