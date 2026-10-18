# Locations, Headquarters and Ritual Installations

[Wiki home](README.md) · [Rules](rules.md) · [Ghosts](ghosts.md)

The [SiteCatalog](../../../software/beckenburg/src/main/java/org/beckenburg/SiteCatalog.java) lists **nine location categories**, but only **House** has authored navigable map geometry and can be selected for actual solo gameplay. Other menu categories are visibly locked/in production; their descriptions and ritual sites below are **planned layouts**, not ready-to-play maps or copied substitutes.

## The actual House

The [HouseMap](../../../software/beckenburg/src/main/java/org/beckenburg/HouseMap.java) has **12 interior** zones plus **rear garden, front porch and van staging** (15 named zones total), with a 25×31 tile footprint and room-connected doors. The source names are:

| 0–5 | 6–11 | 12–14 |
| --- | --- | --- |
| 0 Bathroom | 6 Library | 12 Rear Garden |
| 1 Master Bedroom | 7 Dining Room | 13 Front Porch |
| 2 Nursery | 8 Study | 14 Van Staging / extraction |
| 3 Living Room | 9 Storage Cellar | |
| 4 Main Hall | 10 Foyer | |
| 5 Kitchen | 11 Utility Room / breaker | |

The three house ritual installations are physically authored and checked by the server:

| Rite | House room | Installation | Channel |
| --- | --- | --- | --- |
| **Banishment** | 9 Storage Cellar | Sealed Iron Circle | 55 ticks / 5.5 s |
| **Cleansing** | 6 Library | Purification Font | 45 ticks / 4.5 s |
| **Absolution** | 10 Foyer | Memorial Lectern | 60 ticks / 6 s |

A source-level floor plan and ritual registration do not assert the existence of final textured assets, animations, inaccessible-space QA or final sound propagation on all operating systems. **Host validation** requires the correct room, authorized nearby station, correct ghost rite, identity and anchor ward.

## Planned map families and signature sites

| Location family | Distinctive investigation space | Banishment site | Cleansing site | Absolution site |
| --- | --- | --- | --- | --- |
| **Mansion** | Multiple wings, galleries, complex power circuits and attachments | Attic — chained iron circle | Library — marble basin | Ballroom — family memorial |
| **Prison** | Cells, gates, security and acoustic corridors | Isolation wing — suppression seal | Infirmary — wash font | Chapel/visitation — reconciliation memorial |
| **Asylum** | Treatment wards, seclusion and medical services | Treatment theatre — copper ring | Hydrotherapy — draining basin | Chapel — remembrance stand |
| **School** | Classrooms, science labs, halls and bell/audio systems | Gymnasium — anchor posts | Science classroom — water/salt wash | Library — remembrance desk |
| **Farmhouse** | Home, barns, outbuildings, wind and uneven warmth | Barn — chain ring | Kitchen — herb/wash basin | Living room — heirloom shrine |
| **Academy** | Esoteric libraries, lecture rooms and ritual history | Basement archive — seal grid | Laboratory — reagent station | Library — founder memorial |
| **College** | Departments, residence/classroom overlap and long routes | Maintenance tunnels — iron seal | Laboratory — distilled water | Library stacks — record memorial |
| **Church** | Nave, crypt, tower, vestry and graveyard | Crypt — stone binding dais | Altar/chancel — purification vessel | Side chapel — absolution altar |

These site names and room IDs are from [Three Ritual Sites](../environments/THREE_RITUAL_SITES.md), which also requires all three installations per finished map to be distinct, traversable and compatible with human/AI ghost interference. No map is considered finished without physical access, path testing, valid clue placements and multiplayer acceptance.

## Beckenburg Castle — Headquarters

The intended persistent headquarters is a medieval castle retrofitted for expeditions. Facilities include a great hall/briefing area, map and assignment office, armory and shop, mechanical/chemical workshop, occult archive, chapel, infirmary, relic vault, communications and restoration gallery. A navigable [castle hub prototype](../../../software/beckenburg/src/main/java/org/beckenburg/CastleHubPanel.java) exists. The longer-term reclamation campaign should gradually improve castle services and change mission availability. That wider persistent campaign remains planned.

## Conditions and level progression

The site's solo condition selector includes **Normal**, **Blackout** and **Heavy ground fog** in [SiteCatalog.java](../../../software/beckenburg/src/main/java/org/beckenburg/SiteCatalog.java). The LAN host currently configures its own climate state; full synchronized selectable weather and season variations are a separate production gate. Extra homes, multi-level variations and all eight named categories require distinct geometry, circulation, lighting, acoustics, props, ghost movement edges and valid ritual sites.

Sources: [SiteCatalog.java](../../../software/beckenburg/src/main/java/org/beckenburg/SiteCatalog.java), [HouseMap.java](../../../software/beckenburg/src/main/java/org/beckenburg/HouseMap.java), [RitualSites.java](../../../software/beckenburg/src/main/java/org/beckenburg/RitualSites.java), [location design](../locations-environments.md), [map/site plan](../environments/THREE_RITUAL_SITES.md), [room requirements](../environments/ROOM_AND_ASSET_REQUIREMENTS.md).
