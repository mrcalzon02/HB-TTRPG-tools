# Items, Equipment and Van Systems

[Wiki home](README.md) · [Evidence](evidence.md) · [Shop prices](shops-and-costs.md)

**Catalog count: 42** = 8 starter, 13 optional, 7 van systems and 14 Beckenburg-original tools. This is the [EquipmentRegistry](../../../software/beckenburg/src/main/java/org/beckenburg/EquipmentRegistry.java) design-source list. The **PARTIAL** status says a code slice exists; **PLANNED** means the registry describes a desired item without functional source. Neither status is a guarantee of full multiplayer equipment placement, upgrade tiers, pricing or shipped visuals.

## Currently represented in the field loadout

The solo [EquipmentLoadout](../../../software/beckenburg/src/main/java/org/beckenburg/EquipmentLoadout.java) supports **four carried slots**, selected with keys **1–4** and replaced at the van rack. The loadout starts with **EMF**, **Thermometer**, **Spirit Box** and **Photo Camera**. The **UV lamp** and **Salt** are additional owned/unlockable solo instruments (prices in [Shop](shops-and-costs.md)). Photo camera starts with **6 exposures**, salt with **3 pouches**, and the rack refills those counts. A slot cannot contain the same gear twice.

In LAN, primary active tool hotkeys still select **EMF / Thermometer / Spirit Box**. Additional host-side actions include UV scan, placed writing book, crosses, wards, salt and van monitoring, but the 42-item equipment pipeline is not yet unified with purchasable loadout UI. **Do not confuse a journal checkbox with a physically usable tool.**

## Starter-equivalent equipment (8)

| Item | Intended use | Registry status, solo / LAN |
| --- | --- | --- |
| Pattern projector (D.O.T.S.-style) | Structured-light ghost passage | Planned / Planned |
| EMF reader | Numeric field measurement, 0–10 | Partial / Partial |
| Flashlight | Navigation and survey | Partial / Partial |
| Ghost writing book | Ghost-authored page marks | Planned / Planned* |
| Spirit box | Nearby ghost response | Partial / Partial |
| Thermometer | Room heat/cold against ambient | Partial / Partial |
| UV light | Traces from actual ghost passage | Partial / Partial |
| Video camera | Orbs and optical anomaly feed | Planned / Planned |

*The registry has not yet been reclassified for the newer [GhostWriting](../../../software/beckenburg/src/main/java/org/beckenburg/GhostWriting.java) and host placement/reading code; source for that slice exists, but it is not a completed commercial-equipment implementation.

## Optional field equipment (13)

| Item | Function | Registry status, solo / LAN |
| --- | --- | --- |
| Protective cross | Interrupt dangerous spectral attacks | Partial / Partial |
| Firelight / candle | Controlled illumination | Planned / Planned |
| Head gear | Light / point-of-view camera | Planned / Planned |
| Igniter | Light controlled fire sources | Planned / Planned |
| Incense | Suppression/dispersal | Planned / Planned |
| Motion sensor | Passage tracking | Planned / Planned |
| Parabolic microphone | Directional acoustic survey | Planned / Planned |
| Photo camera | Record spectral shape | Partial / Planned |
| Salt | Footprint/ghost passage survey | Partial / Partial |
| Sanity medication | Restore mental condition | Partial / Partial |
| Sound recorder | Capture supernatural voices | Planned / Planned |
| Sound sensor | Stationary acoustic reading | Planned / Planned |
| Tripod | Mounted camera position | Planned / Planned |

## Permanent van/truck monitoring systems (7)

| System | Purpose | Registry status, solo / LAN |
| --- | --- | --- |
| Task clipboards | Objectives and instructions | Planned / Planned |
| Camera computer | Video feeds, orbs | Planned / Planned |
| Objective board | Mission briefing | Partial / Partial |
| Sanity monitor | Team mental state | Planned / Partial |
| Site activity monitor | Host-derived activity index | Planned / Partial |
| Site map | Named rooms and navigation | Partial / Partial |
| Sound monitor | Remote audio channels | Planned / Planned |

The host can turn LAN **sanity** and **activity** monitors off through supported custom rules. Numbers shown by those active meters are host-generated readings, not direct confirmation of species.

## Fourteen original Beckenburg tools — future equipment program

| Item | Design job |
| --- | --- |
| Anchor triangulator | Combine bearings to narrow an attachment search zone |
| Ectoplasm swab/assay | Take and analyze physical supernatural residue |
| Resonance tuning forks | Provoke a repeatable harmonic supernatural response |
| Barometric anomaly probe | Compare anomalous pressure against HVAC and weather |
| Seismic floor recorder | Verify floors/structures vibrating or being struck |
| Spectral prism filter | Reveal unusual optical ghost silhouettes |
| Lidar displacement grid | Show ghost movement through real projected beam geometry |
| Deployable EMF array | Triangulate a genuine field event across several nodes |
| Remote thermal probes | Sample remote rooms over time |
| Ritual anchor meter | Measure proximity/affinity to ritual attachments |
| Ward stability probe | Read remaining protection integrity |
| Object imprint scanner | Detect residue on genuinely affected possessions |
| Chalk and portable sigils | Defensive placement and ritual preparation |
| Spectral frequency analyzer | Interpret recorded voice/resonance waveforms |

All fourteen are **planned** in the registry and have **no established retail prices**. The original tool designs must become usable source, world props, network paths, journal readings and verified player interactions before the wiki can call them available.

Other current field objects: two default wards per LAN investigator, cross charges and three salt pouches are represented in [HunterCounters.java](../../../software/beckenburg/src/main/java/org/beckenburg/HunterCounters.java). Only items that the appropriate active mode actually exposes should be called usable.

Sources: [EquipmentRegistry.java](../../../software/beckenburg/src/main/java/org/beckenburg/EquipmentRegistry.java), [EquipmentLoadout.java](../../../software/beckenburg/src/main/java/org/beckenburg/EquipmentLoadout.java), [VanEquipmentRack.java](../../../software/beckenburg/src/main/java/org/beckenburg/VanEquipmentRack.java) and [equipment roadmap](../EQUIPMENT_EVIDENCE_ROADMAP.md).
