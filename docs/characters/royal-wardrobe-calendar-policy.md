# Royal Wardrobe — Canon Calendar, Purchase Slots, and Artwork Matching

**Status:** Owner-established recurring pattern; original fiction source / historical slot reconciliation as of 2026-10-27.

## Dates and weekdays

Elaranth has **13 months of 28 days**, each with four seven-day weeks: Crownday, Ledgerday, Rootday, Forgeday, **Veilday**, Moonday, **Hearthday**. For the user's familiar weekday words in the royal shopping story, **Friday = Veilday**, and **Sunday = Hearthday**. This is a translation convention for contemporary readers, not a replacement for the nation's in-world weekday names.

**Regular acquisition intention:** On each Veilday (Friday), Daysha selects **exactly two new dresses**. **Optional additional acquisition:** On Hearthday (Sunday), she may acquire **one more**. Sunday is an opportunity, NOT a commitment: a blank Sunday is not a missing historical event, a dress not acquired, or a debt. Working start is 1 Thawcall 282 S.M. (royal wedding/accession), elapsed day 0; projected end is Estelle's sixteenth birthday, 15 Casktide 298 S.M., elapsed day 6090. The **870 complete seven-day weeks** have **1,740 regular Friday slots** and **870 optional Sunday slots**. This is the planning capacity, not proof of 1,740 completed purchases.

**Week 1, if boutique visits began immediately after the wedding:** Veilday 5 Thawcall 282 S.M. (two dresses), Hearthday 7 Thawcall 282 S.M. (optional pink gown), week 2 Veilday 12 Thawcall 282 S.M. (two dresses). This is an **illustrative earliest-compatible placement**; the novel does not yet prove the boutique opened its first visit exactly on the first Friday of the reign. All calendar dates for these entries must remain CONDITIONAL until the author supplies the first-visit week.

## Canon acquisition sequence / constraints

The full observed order from [Royal Dress Reservoir canon](royal-dress-reservoir-canon.md) is preserved in [Wardrobe Canon Matching CSV](../../data/royal-wardrobe-canon-matching.csv). Its first five gown entries correspond to two on first Friday, one optional following Sunday, and two the next Friday. Later pairs: powder-blue and unfinished white/rose on the Friday **after Daysha's own birthday**, pearlescent scale and teal filigree on a later Friday, and oceanic and black/teal after the visiting seamstress arrives. These have **relative** Friday positions, not absolute dates, because the Queen's birthday has never been dated in canon. One later weekend single gown is **not automatically** a Friday purchase.

**Specials:** The Queen's own birthday gown, Queen Mother's birthday commission, and gifts are separate commission records; whether any replaces one of the regular two Friday acquisitions is unresolved. A Sunday paid with the **royal purse** is still one purchase, not an extra unrelated royal-treasury expense. **Two queens with matching-design dresses mean two physical garments**; repeated Daysha illustrations in one physical dress mean only ONE physical garment. When the Queen Mother receives a gown, record her as the owner and do not automatically consume Daysha's scheduled Friday wardrobe slot.

## Mandatory record model

Each physically distinct dress is assigned one garment ID, a design-family ID if multiple garments share the same cut, a wearer/owner, material and jewels, a first demonstrated fitting, any distinct purchase/commission/gift event, later appearance(s), the supplier, original art provenance, and separate **confirmed payments** vs **estimated prices**. A design study without evidence of acquisition is a design, not a completed transaction. If two scene images depict the same gown, both references point to one garment ID. An outfit used in a humorous family scene does not prove a fresh purchase.

Never put unreviewed third-party reference images in the public GitHub gallery. The two verified independent gown **design studies** (G-001, G-002) do **not** currently match the descriptions of the first-Friday midnight-blue and ice-blue purchases with sufficient confidence to equate them. They remain unassigned; family scenes, color variations and corrections are appearance records, not more purchases. The 19 candidates in the pending image registry are not verified GitHub publications and their names alone are insufficient evidence of a match.

## Files and classification

- `data/royal-wardrobe-weekly-schedule.csv`: **870 weeks**, two Veilday and one *optional* Hearthday field per week; intentionally no fabricated purchases.
- `data/royal-wardrobe-canon-matching.csv`: **20** individually distinguishable wardrobe or appearance descriptions from the actual canon narrative; **19** refer to physical garments and **one** describes an appearance with an unproven new acquisition. Five have a candidate first/second-week date, none a confirmed exact date.
- `data/royal-artwork-placement.csv`: **13** verified generated originals and **19** candidate filenames, *no automatic dates assigned*. Family Estelle scenes belong after her birth.
- `data/royal-sixteen-year-timeline.csv`: birth-to-sixteenth-birthday history, while the wardrobe schedule additionally includes the earlier prebirth weeks.
- `data/daysha-royal-purchases.json`: immutable relationship between presently approved original artwork, garment design studies and scene clusters.
- `data/master-storybook.json`: cross-story event fact states.

**Mandatory checks:** Exactly 870 weeks = 52 weeks × 16 years + 38 before birth. Every week has two required planned-Friday **slots** and 0–1 optional planned-Sunday slot. Never automatically register them as real paid orders, create fabricated receipts, buy one illustrated gown multiple times, or force a child's scene into an age without established evidence.

**Open chronology questions:** actual wedding/accession day (working 1 Thawcall), actual first boutique visit week, Queen Daysha's birthday, Queen Mother's birthday, precise time of the foreign seamstress visit, exact year(s) of the later Estelle family scenes, confirmed bank/atelier receipts and whether special commissions replace weekly purchases.
