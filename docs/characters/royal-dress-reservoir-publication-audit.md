# Royal Dress Reservoir — publication and provenance audit

**Repository:** `mrcalzon02/HB-TTRPG-tools`, `main`.
**Scope:** Generated artwork only, with canon text and exact provenance. The user forbids publishing supplied third-party dress-reference images.

## Verified pre-update repository state (2026-10-28 UTC)

- `data/daysha-royal-purchases.json`: `archiveStatus=approved_generated_subset`, **13** sources (each requiring a Git blob SHA); **2** garment designs and **4** scene-sequence groupings.
- `assets/daysha/royal-purchases/`: **13** allowlisted image files, matching the published manifest.
- Historic count recorded in the manifest: **178** artworks, with **166** still withheld from public restoration, even where old commits may contain temporary copies.
- `scripts/validate-daysha-royal-gallery.mjs` checks exact image counts, Git blob hashes, header formats, absence of unreviewed image files, and the no-fabricated-receipts rule.
- Earlier commit `fbce73331940a61abb865566540f69bdb0fa7967` published ten elemental gowns, but these **are not present on the current main branch** and must not be counted as currently published.
- This turn **does not verify a full re-upload of the historical catalog**; prior recovery statements alone do not constitute proof.

## New current-conversation collection

The separate current-conversation working directory contains original, image-generation-produced PNGs for the Nobles' District fittings, birthdays, Garrick, Queen Mother, and Lexi. It also contains user-supplied third-party **reference images** and red-marked correction previews. The generated and supplied assets are **not interchangeable**, and generic overwritten filenames mean final provenance/image review is mandatory.

New generated scene **binary uploads have not yet been verified in GitHub**. These new canon documents are published as **text**; they do not pretend that the images are live. Once eligible images are actually transferred, update the approved gallery's image paths, individual content hashes, scene/garment records, and validator atomically. Never weaken the validator by silently increasing its count or disabling SHA checks.

## Exclusion rules

1. Never publish source dress photos, other artists' illustrations, watermarked references, red annotations, or supplied comparison inputs as generated portfolio artwork.
2. Do not publish superseded renderings with blonde/green-eyed Daysha, a pale-furred imitation of Lexi, Rome/Garrick identity merges, inappropriate ear proportions, or the unwanted collage as **canon final scenes**.
3. Distinguish **canon dress designs** from repeated colorways, corrections, alternate compositions, and distinct invoices.
4. Preserve the existing thirteen-image allowlist until replacement/addition bytes are authenticated and linked in the actual repository.
5. Do not claim an image or historical collection is restored unless its actual bytes and current-main Git blob SHA are verified.
