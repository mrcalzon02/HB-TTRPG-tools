# Daysha & Rome — DR-09 garment-identity review (2026-10-27)

**Disposition:** Source-backed correction of **three erroneous scene-to-garment links**. DR-09 remains the **Moonlit Ballroom Dress** with its sole primary illustration. No new garment, receipt, purchase, price, date, or expenditure is asserted.

## Source authority and comparison method

The authoritative source register is [`data/daysha-royal-purchases.json`](../../data/daysha-royal-purchases.json). This review compared the actual four **original PNGs**, not merely the hosted WebP thumbnails. The primary `originals/dr-09.png` was extracted from the original [CourtGowns archive](https://drive.google.com/file/d/1oxo7I4V6boahHPer5-fCcA1VZkLZZZWl/view); the ZIP member was 3,044,279 bytes and passed the archive CRC check. The three ballroom scenes were read as full original PNGs from their individual archived Drive files, matching the recorded byte counts. SHA-256 below identifies the exact inspected bytes.

For the family comparison, all **eight original PNGs** were read from the existing ChatGPT Library `/DAYSHA` (the earlier [family audit](2026-10-27-family-appearance-audit.md) also matched their Drive originals by recorded file sizes). These are original artwork sources, not invoices. `SC-09` remains a **scene-sequence**, never evidence that four different outfits are the same physical dress.

## Four formerly linked DR-09 images: original-image evidence

| Original source / immutable source ID | Original SHA-256 | Construction observed | Identity decision |
|---|---|---|---|
| [Moonlit Elven Ballroom Dance.png](https://drive.google.com/file/d/1oxo7I4V6boahHPer5-fCcA1VZkLZZZWl/view), ZIP `originals/dr-09.png`; `file_0000000011f48230affcb25a25e23bc1` | `dcacc80a5d39905395c10546a74fbea7fe5faa025ef114deb707b5fc599e3f9d` | Cobalt-blue fitted sweetheart bodice with white scrolling vine embroidery; blue floral attachments; white translucent draped sleeves; crossed blue floral waist sash; full blue-and-white skirt under broad translucent lace overskirts. | **Retain DR-09.** This is the garment's existing authoritative primary image. |
| [Enchanted Ballroom Dance of Daysha and Rome.png](https://drive.google.com/file/d/1eje5m0tRiXpQ1KOb4bXtsYgNUefSzxt3/view); `file_00000000808881f5aca910a9d6bd920e` | `54c6b17a9468f0fad02c4ba5b3a6a99652e23602e3b255b914051c360942e5e1` | Pink-and-ivory corseted gown with gold lattice/chainwork, pink sheer puff sleeves, gold ribbon and vertical pale-blue ruffled skirt panels; no cobalt floral-vine bodice. | **Detach from DR-09.** Distinct dress design; `wardrobeId: null` pending independent identification. |
| [Moonlit Elven Royal Dance.png](https://drive.google.com/file/d/1l_g52kPPWTx52kyw9aGBI5nnW7Lk6zTT/view); `file_00000000b488820cabd38989e4fedf43` | `c4e884073807f3ff930d92eaa3d4eef291e1304d6614e19cdc898b20f0928eb1` | Silver-lavender ornamental bodice with pearl-like chain drapes, airy off-shoulder puff sleeves and broad layered pale-lavender/silver skirt. The bodice and skirt construction do not match the primary blue vine gown. | **Detach from DR-09.** Distinct dress design; `wardrobeId: null`. |
| [Moonlit Elven Ballroom Dance(1).png](https://drive.google.com/file/d/1KVmQagzVNV5hVLuLiuwLHOWWeqap97Ju/view); `file_00000000165c81f598afdfa2c82302b4` | `86693badc9c76006bf3f3a531c9932a429e838d5a03f98b5831e32a81c0bddac` | Dark teal gathered halter-style bodice, silver jeweled waist structure, opaque billowing teal sleeves and dark teal skirt with central silver embroidery. | **Detach from DR-09.** Distinct dress design; `wardrobeId: null`. |

**Interpretation boundary:** The three detached images show visibly different garment constructions. They **do not** prove three new purchases, three dates or three separately paid gowns. No new `DR-*` identifiers were created. Each source's stable ID, original provenance, role, hosted image, and `SC-09` membership remain intact; the manifest's new `wardrobeReview.previousWardrobeId` preserves the historical association.

## Seven adult family appearances compared with DR-09

These seven are a recognizable **blue-and-white floral family-ensemble cluster**, but the illustration style varies, and a shared palette or floral motif alone cannot prove physical garment identity. The original primary DR-09 shows a particularly broad white-lace overskirt and blue floral corset; the family scenes often show a narrower white-floral bodice and skirt, and some only expose the torso. **All seven retain `wardrobeId: null`.**

| Original source (source ID suffix) | SHA-256 of inspected original PNG | Visible comparison and limitation |
|---|---|---|
| [Royal Council Glitter Prank](https://drive.google.com/file/d/1yHQxQ0YrCLiHXe5vn5yQYcNWm-FFs3-B/view) (`183881f5`) | `a62e7d9b96db93b9c1b9bfc9cdd10dec30636f8091c2b680a57282965a4f63fd` | Daysha's blue floral off-shoulder bodice is partially visible at the council table; the full skirt and DR-09 lace architecture cannot be confirmed. |
| [Glittery Royal Family Catroom Celebration](https://drive.google.com/file/d/1MrwbmMbO_Kw5Xkw5hgSMK0E0jkaDITwf/view) (`302481f5`) | `2ca921a5812d85710ea75436366310237af965e406c359d899352d349b28dc51` | Blue-and-white floral bodice and translucent sleeves recur, but the seated/crowded scene hides the skirt construction. |
| [Magical Family Cat Atelier](https://drive.google.com/file/d/14Hv9H9XLo2OAuHDk-49CtlXnMWHvsqe3/view) (`bc90820c`) | `d4b40021b508f6116989d8659e6bbbe3e01dfc837f60aed67be2149d406b3f43` | Blue bodice and white floral sleeves appear beside Rome; skirt is not sufficiently exposed to match DR-09. |
| [Royal Elf Garden Playtime](https://drive.google.com/file/d/1PJVPEeUkTOHLipmIA1x8zPpsRwriRgLK/view) (`a0748230`) | `c0ebe61015ff0bbb293ea275706a905f1cc902162458fd5bff1e0d6a14af7a92` | Blue floral adult bodice and some blue skirt visible amid children; floral motif recurs, exact panel/overskirt construction not proven. |
| [Royal Elf Family Tea in the Palace Garden](https://drive.google.com/file/d/10xYwpzGDz4IO86RnsY06zQTsYMP2L8tB/view) (`8ce08230`) | `2b038446b4943dc35288314fe6ee231c0275f2e8323152179b46f97d5cbca4fa` | Adult white-floral blue gown with sheer sleeves and blue-white skirt; visually near-identical composition to the other tea image, but a separate source, **not** another paid gown. |
| [Icy Blue-Haired Royal Garden Tea Party](https://drive.google.com/file/d/1g5uLXCSM8UIE57UzEE23T0hFkAFFdleh/view) (`0b78820c`) | `c46359b7a4160c4949b3a3cac9a4f7df632b541a036faaec3396c082a2fe779f` | Royal-blue off-shoulder white-floral corset and blue skirt with white floral panels; close to DR-09 in motif, not a verified exact construction match. |
| [Royal Family’s Sunlit Castle Stroll](https://drive.google.com/file/d/18BuTlVfE1_j830dFBsKqYiJfubPKHcrj/view) (`6e0881fd`) | `70f45493d1541b6930ee389613e5fc4e33fcb270109d4ecaabe929fa01c5fb15` | Adult blue floral gown and lace sleeves in a standing full-family scene; silhouette differs from the broad cascading primary DR-09 lace overskirt; no identity promotion. |

**Eighth family source — excluded from adult-gown comparison:** [Rafters Prank Over the Royal Council](https://drive.google.com/file/d/1uHlq0n6cqcGm-X2pTdxA6mmiFEpt58Rb/view), `file_00000000a96481f58a0a2bdfa0777b9b`, SHA-256 `4405dfd513cb528563a052d5c7b9f215f1923406a77a413dc716b2fc7ba8b6ee`. The clearly visible outfit belongs to **Estelle**, a child, and is **not** Daysha's adult DR-09. All eight family scenes show Estelle's separate short blue-and-white floral dress. Do not count it as a purchased adult gown.

## Conservation, gallery, and follow-up acceptance

- **27 garment records, 178 source records, 178 hosted-image paths, and all stable source IDs retained.** No source file, Drive master, WebP viewing copy or scene-sequence member was deleted or renamed.
- DR-09 linked sources changed from **four to one** (the actual primary). The other three remain visible and searchable in the source gallery as unmatched scenes, not as DR-09 purchases.
- Assigned `wardrobeId` links changed from **37 to 34**; unassigned sources from **141 to 144**. The derived `verification.unmatchedDressImages` field was synchronized to **144**.
- Every garment `cost` object, purchase status, date, and DR-09 primary source remained unchanged; `SC-09` still has all four original scene IDs.
- The seven adult family scenes and Estelle-only rafters scene remain **unassigned**; the two garden-tea sources are two distinct illustrations, not two transactions.
- This is a **source and manifest audit**. Live website gallery rendering, actual paid-gown identity for the three detached scenes, and a final physical match between the family ensemble and DR-09 remain **unverified**. Further assignments require additional authoritative original designs, not color matching or invented receipts.
