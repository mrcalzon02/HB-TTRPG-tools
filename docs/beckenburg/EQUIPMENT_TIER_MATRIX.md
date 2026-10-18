# Beckenburg — complete three-tier equipment progression matrix

**Status:** authoritative source design, created 2026-10-18 from the 42 indexed source equipment types and the new `EquipmentTiers.java` registry. Each tool has Tier I, II and III = **126 specified upgrade stages**. These definitions are data/acceptance targets and **do not yet mean that buying the tiers, their models or their distinct effects is playable**. The existing host-shop medicine prices are already implemented. The other prices below are proposed balancing amounts, not live purchases.

**Four upgrade goals:** a larger or more informative physical readout; quicker response to **actual** ghost events; better field reach or coverage; and higher capacity/energy efficiency. Higher tiers do **not** increase the strength of a ghost event, fake an instrument anomaly, validate an evidence checkbox or reveal species. A Tier III EMF meter might sample faster, but it still reads ordinary **2–7** or true high **8–10** / suppression **0** using the same host value as a Tier I meter. Better thermometers sample air sooner and show trends; they do not force freezing or extreme heat into a ghost that cannot cause it.

**Shared numerical scaling (planning budget, applied only where applicable):**

| Stat | Tier I | Tier II | Tier III |
|---|---:|---:|---:|
| Relative physical detection reach | 100% | 135% | 175% |
| Sampling/refresh interval (lower = quicker) | 100% | 75% | 50% |
| Consumable charge or stored sample capacity | 100% | 150% | 220% |
| Battery/runtime duration | 100% | 150% | 225% |
| Diegetic readout size/legibility | Base | 125% | 150% |
| Draft equipment credit price | 1× | 2× | 4× |

Zero/unlimited fields stay zero/unlimited. Protective gear and consumables increase their area, useful charges or efficacy rather than acquiring meaningless electric screens. Van consoles gain live feed/graph channels and overview capabilities. **Sanity medication is already priced at 50 / 115 / 230 in `FieldSupplies.java`; these actual host prices override generic proposal multipliers.** No ghost-dependent threshold or evidence family is locked behind a higher tier; all tiers can theoretically find their assigned evidence.

## Starter investigation equipment (8)

| Equipment | Tier I | Tier II | Tier III |
|---|---|---|---|
| **Pattern projector** | Fixed sparse dot field | Wider fan and faster refresh | Full-room adjustable structured-light volume |
| **EMF reader (0–10; zero for suppression)** | Small segmented 0–10 scale | Larger numbered scale; faster polling | Backlit large digits and event-history strip |
| **Flashlight** | Narrow beam with small switch | Adjustable focused beam and stronger LED | Wide/focused modes and long-life battery |
| **Ghost writing book** | Small paper book; one writable surface | Wider pages and clearer ink visibility | Oversized high-contrast pages and angleable stand |
| **Spirit box** | Simple radio dial | Larger response display, quieter speaker | Broadband receiver, waveform and directional headset |
| **Thermometer (°C/°F)** | Slow handheld analog temperature | Responsive digital probe with unit switch | Large backlit readout, temperature trend history |
| **UV light** | Narrow UV inspection cone | Stronger UV beam and broader coverage | Wide UV flood with visible trace contrast |
| **Video camera / remote feed** | Low-resolution single lens | Wider optics, recording monitor | Wide-angle night imaging with larger clear display |

## Optional field equipment (13)

| Equipment | Tier I | Tier II | Tier III |
|---|---|---|---|
| **Protective cross** | Short-range simple cross | Larger protective reach and durability | Extended defense coverage and clear charge indicators |
| **Firelight / candle** | Small flame in lantern | Wind-shielded broad lantern | Long-burn adjustable brightness lantern |
| **Head camera / helmet light** | Simple strapped lamp | Hands-free camera and tilt mount | Lightweight wide-angle sensor and clear recorder status |
| **Igniter** | Disposable lighter | Refillable lighter with status window | Stormproof ignition with abundant uses |
| **Incense / smoke dispersal** | Brief localized smoke | Longer burn and larger protective cloud | Adjustable dispersal with clear depletion indicator |
| **Motion sensor** | Single narrow detection beam | Wider sweep and visible indicator | Multi-zone detector with positional log |
| **Parabolic microphone** | Single directional audio pickup | Better aiming cone and gain dial | Large spectrogram and precise directional controls |
| **Photo camera** | Small viewfinder and six shots | Wider viewfinder and longer film supply | Large framed preview and rapid capture |
| **Salt** | Three small piles | More salt per pouch and larger floor coverage | Greater capacity and high-visibility footprint contrast |
| **Sanity treatment** | Basic sanity restoration (18) | Improved sanity restoration (36) | Advanced sanity restoration (65) |
| **Sound recorder** | Short mono audio clips | Longer recording and stereo peaks | Multi-channel waveform history and export |
| **Sound sensor** | Single room sound pickup | Longer range and louder event annunciator | Multi-zone pickup with timed history |
| **Tripod / camera mount** | Fixed-height camera stand | Adjustable height and pan | Motorized pan/tilt with fine aiming |

## Fixed van and coordination equipment (7)

| Equipment | Tier I | Tier II | Tier III |
|---|---|---|---|
| **Task clipboards** | Paper assignment list | Editable clear task slate | Shared synchronized assignment board |
| **Camera console** | One small camera feed | Multiple feeds and larger display | Tiled live video and rapid switching |
| **Objective board** | Basic printed objectives | Larger writable board | Room-linked objectives and progress map |
| **Sanity monitor** | Slow numeric health/sanity list | Responsive color-coded chart | Large multi-investigator trend panel |
| **Site activity monitor** | Single activity trend | Faster graph and readable room ranges | Multi-sensor graph with event timestamps |
| **Location map** | Printed house map | Readable floor plan and placement marks | Zoomable map with sensor coverage overlays |
| **Sound monitor** | One-channel audio meters | Multiple live room inputs | Selectable waveform/spectrum array |

## Original Beckenburg equipment (14)

| Equipment | Tier I | Tier II | Tier III |
|---|---|---|---|
| **Anchor triangulator** | Single bearing needle | Dual-angle bearings and map overlay | Large multi-sensor triangle with position history |
| **Ectoplasm swab and assay** | Three small swabs and manual assay | Larger sample vials and readable vial labels | Field microscope and multiple sample wells |
| **Resonance tuning forks** | Handheld tone and pulse meter | Frequency readout with stronger response pickup | Spectral waterfall and precise tuning |
| **Barometric anomaly probe** | Dial pressure differential | Digital pressure trace and room baseline | Large differential trend display with station pairing |
| **Seismic floor recorder** | Single-channel vibration needle | Dual-axis floor pickup | Three-axis array with source direction |
| **Spectral prism filter** | Small optical sight | Wider polarized viewing pane | Full-width spectral overlay and recording |
| **Lidar displacement grid** | Single sparse beam plane | Dense fan projection and quicker updates | Volume-filling geometry mesh with visible occlusion |
| **Deployable EMF array** | Two sensor nodes with basic ticks | Three synchronized range sensors | Five-node coverage and readable event history |
| **Remote thermal probe array** | Two remote temperatures | Four stations and faster reporting | Six stations with continuous history |
| **Ritual anchor meter** | Small ritual-stability needle | Quicker ritual field sampler | Large ritual-load trend and distance indicator |
| **Ward stability probe** | Slow ward strength dial | Fast stability graph | Long-life ward timeline and clear warning |
| **Anomalous object imprint kit** | Single-object contact plate | Wider item contact mat and sample memory | Hands-free table scanner with serial archive |
| **Chalk and portable sigils** | Three short chalk wards | Larger chalk kit and stronger line contrast | Longer sigil paths and easily visible integrity |
| **Spectral frequency analyzer** | Single audio frequency needle | Responsive harmonic trace | Large multi-band spectrum and full session history |

## Concrete response/range targets for representative instruments

Measurements below are **planned hardware capabilities** derived from the source catalog's base values. They are not claims of current runtime implementation. Columns are reach in metres / nominal sample interval in seconds / consumable capacity / battery minutes; — means not applicable.

| Tool | Tier I metrics | Tier II metrics | Tier III metrics |
|---|---|---|---|
| EMF reader (0–10; zero for suppression) | 2.6m / 1.2s / — / 4m | 3.5m / 0.9s / — / 6m | 4.5m / 0.6s / — / 9m |
| Thermometer (°C/°F) | 3.4m / 1.3s / — / 5m | 4.6m / 1.0s / — / 7m | 6.0m / 0.7s / — / 11m |
| Spirit box | 2.1m / 1.2s / — / 3m | 2.8m / 0.9s / — / 5m | 3.7m / 0.6s / — / 7m |
| UV light | 2.8m / — / — / 3m | 3.8m / — / — / 5m | 4.9m / — / — / 8m |
| Ghost writing book | 1.2m / — / 1 / — | 1.6m / — / 2 / — | 2.1m / — / 2 / — |
| Photo camera | 4.5m / — / 6 / 3m | 6.1m / — / 9 / 4m | 7.9m / — / 13 / 6m |
| Sound sensor | 5.0m / 1.2s / 1 / 4m | 6.8m / 0.9s / 2 / 6m | 8.8m / 0.6s / 2 / 9m |
| Salt | 1.4m / — / 3 / — | 1.9m / — / 5 / — | 2.5m / — / 7 / — |
| Motion sensor | 4.0m / 0.8s / 1 / 4m | 5.4m / 0.6s / 2 / 6m | 7.0m / 0.4s / 2 / 8m |
| Ectoplasm swab and assay | 1.0m / 1.2s / 3 / — | 1.4m / 0.9s / 5 / — | 1.8m / 0.6s / 7 / — |
| Resonance tuning forks | 2.6m / 1.3s / — / 3m | 3.5m / 1.0s / — / 5m | 4.5m / 0.7s / — / 7m |
| Seismic floor recorder | 4.5m / 1.2s / 1 / 4m | 6.1m / 0.9s / 2 / 6m | 7.9m / 0.6s / 2 / 9m |
| Barometric anomaly probe | 2.4m / 1.3s / — / 5m | 3.2m / 1.0s / — / 7m | 4.2m / 0.7s / — / 11m |
| Deployable EMF array | 3.2m / 1.2s / 2 / 4m | 4.3m / 0.9s / 3 / 6m | 5.6m / 0.6s / 4 / 9m |
| Remote thermal probe array | 3.7m / 1.2s / 2 / 4m | 5.0m / 0.9s / 3 / 6m | 6.5m / 0.6s / 4 / 9m |
| Video camera / remote feed | 5.0m / — / — / 4m | 6.8m / — / — / 6m | 8.8m / — / — / 9m |

## Upgrade economy and implementation gates

The current four-slot solo loadout and three-instrument LAN scan selector do **not** yet equip independent device tiers. The production implementation needs a tier-owned inventory entry, validated van purchases, player-carry serialization, real sensor props with tier-appropriate model/screen/display, cooldowns, consumable stock, replicated host measurements and reconnect. Add tier pricing/unlocks at the authoritative van rack, not a client-only selector. Use the existing medicine shop transaction and four equipment slots as integration reference without pretending all gear is in that system already.

A standard instrument event should follow **real ghost action → real room/surface event → tier-limited detection reach/refresher → device display reading → automatic raw logbook entry → optional manually checked journal clue**. Lower tiers may have shorter practical range and slower response; **they must never produce bogus haunted-room numbers**. Higher tiers can show charts, bearings or subtypes, but never identify the ghost automatically or force the player's checkbox selection.

**Verification:** `EquipmentTiersTest` covers every cataloged device and all 126 stages, monotonic reach/response/charge/runtime/readability targets, specific equipment benefits, and unchanged existing sanity-treatment costs. `OptionalEvidenceReadingsTest` confirms every proposed ghost-specific extra instrument also has three planned tiers. GitHub source/test commits are not the same as completed in-game tiered purchasing or a passing Windows build.
