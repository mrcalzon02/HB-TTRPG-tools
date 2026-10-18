# Shops, Currency, Prices and Progression

[Wiki home](README.md) · [Equipment](equipment.md) · [Rules](rules.md)

The current expedition store is a **small medicine counter**, not a complete 42-item storefront. Source supports purchases at the van equipment rack. Prices below are exact constants from [FieldSupplies.Tier](../../../software/beckenburg/src/main/java/org/beckenburg/FieldSupplies.java); restoration amounts depend on whether the player buys the health or sanity variant.

## Field medicine — presently priced

| Tier | Price | Health version restores | Sanity version restores |
| --- | ---: | ---: | ---: |
| Basic | £50 | +20 health | +18 sanity |
| Improved | £115 | +40 health | +36 sanity |
| Advanced | £230 | +70 health | +65 sanity |

Each combination is a separate purchase: **Basic Health** and **Basic Sanity** are distinct consumables. Purchase cap: **4 of each kind/tier**. Use consumes one item only if the hunter actually needs treatment. Health cannot exceed its normal maximum, and sanity treatment cannot improve an already-full state. In LAN, press **K** at the van equipment station to buy, **T** for the best owned health treatment or **Y** for the best owned sanity treatment. Host validates credits, seat, world mode, station position and stock.

**Display discrepancy:** the game's solo/LAN shop screens label credits with **£**, while one FieldSupplies string formatter uses **$**. This wiki follows actual shop UI: **£**. Currency formatting should be unified before shipping.

## Solo permanent equipment unlocks

| Solo gear | Price | Current ownership |
| --- | ---: | --- |
| EMF reader | £0 | Included |
| Thermometer | £0 | Included |
| Spirit box | £0 | Included |
| Photo camera | £0 | Included |
| UV lamp | £150 | Purchasable/unlockable |
| Salt pouch equipment | £80 | Purchasable/unlockable |

The zero-price items are **included**, not checkout purchases. Once owned, UV and salt are selectable from the van equipment inventory. Solo stock, owned gear, currency and experience live in the local [ProfileStore](../../../software/beckenburg/src/main/java/org/beckenburg/ProfileStore.java). A new ProfileStore initializes currency to **0** until a prior balance is loaded or a mission awards money. Save import preserves a separate local installation ID.

## LAN versus solo wallets

In LAN, each of the six possible hunter seats receives a **session-only wallet of 400 credits** in [FieldSupplies.java](../../../software/beckenburg/src/main/java/org/beckenburg/FieldSupplies.java). This current source is *not* evidence of persistent LAN cash progression. Solo uses a locally persisted profile starting at zero. The same price list is used, but do not combine the balances or assume purchases synchronize across those two modes.

The implemented solo case payout in [InvestigationSession.java](../../../software/beckenburg/src/main/java/org/beckenburg/InvestigationSession.java) is:

- **Cleansed:** £220 + £40 per distinct measured principal instrument + half remaining health (integer) + £45 if an apparition was photographed.
- **Retreated:** £30 per distinct measured principal instrument + £25 if an apparition was photographed.
- **Lost:** £0.
- **Solo XP:** +100 for cleansing, +20 for other resolved outcomes, with a unique mission ID guarding against duplicate payouts.

Those are **solo prototype formulas**, not the final thirteen-species contract economy. In the fuller product, risk, evidence documentation, ghost identity, correct rite, survivors, repair costs, consumables, insurance and difficulty are planned contributors; final multiplayer payouts and individual prices for other gear are **not fixed in live source**.

Sources: [ProfileStore.java](../../../software/beckenburg/src/main/java/org/beckenburg/ProfileStore.java), [FieldSupplies.java](../../../software/beckenburg/src/main/java/org/beckenburg/FieldSupplies.java), [InvestigationSession.java](../../../software/beckenburg/src/main/java/org/beckenburg/InvestigationSession.java), [LanHost.java](../../../software/beckenburg/src/main/java/org/beckenburg/LanHost.java), [economy design](../hunters-equipment-rituals.md), [stage P20](../RELEASE_PRODUCTION_PLAN.md).
