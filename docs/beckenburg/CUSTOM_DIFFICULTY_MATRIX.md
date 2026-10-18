# Beckenburg custom contract controls

The option catalog below is derived from the current [Phasmophobia custom difficulty reference](https://phasmophobia.fandom.com/wiki/Difficulty/Custom), adapted to the **Beckenburg** original game systems. It is a feature-by-feature production ledger, not a claim that unfinished systems work. Do not copy Phasmophobia branding or its visual interface. All settings are host authoritative.

| Group | Contract option | State | Implementation |
|---|---|---|---|
| Party | Hunter count 1–6 | Active | Host connection cap, six bodies and ghost socket |
| Party | +1 difficulty per hunter | Active | +1…+6 rating and actual fear/harm scaling |
| Player | Starting sanity | Active | Initial host stress per seat |
| Player | Sanity medicine strength | Partial | Purchasable three grades; custom global medicine scalar pending |
| Player | Passive sanity drain speed | Active | Host rate 0–200% |
| Player | Sprint allowance | Active | Disabled/limited/unlimited server movement |
| Player | Walking speed | Active | 50–150% physical body speed |
| Player | Sprint speed | Active | 100–200% relative sprint multiplier |
| Player | Flashlight availability | Pending | Sync lighting availability to server |
| Player | Lose consumables on death | Pending | Current LAN shop is session-scoped; permanent insurance absent |
| Ghost | Ghost movement speed | Active | 50–150% host spectral movement |
| Ghost | Energy recharge speed | Active | 50–200% species energy recovery |
| Ghost | Roaming frequency | Partial | AI event period adjustable; route roaming bias pending |
| Ghost | Favourite-room change | Pending | Authoritative ghost anchor currently fixed |
| Ghost | Overall activity frequency | Active | Favoured AI event interval |
| Ghost | Signature event frequency | Partial | Species action cooldowns; configurable independent multiplier pending |
| Ghost | Friendly ghost / disable hunts | Pending | Harm gating / reward restrictions absent |
| Ghost | Strike grace period | Pending | 8-tick telegraph fixed |
| Ghost | Hunt duration | Pending | No full timed hunt phase |
| Ghost | Kill extends hunt | Pending | Hunt phase absent |
| Ghost | Evidence count 0–3 | Pending | Three confirmed evidence states required |
| Ghost | Ultraviolet trace chance | Pending | Current wall traces deterministic for UV-leaving species |
| Ghost | Ultraviolet trace duration | Pending | Current trace expiry fixed |
| Contract | Setup protection period | Pending | Domain strike window fixed |
| Contract | Weather | Partial | Solo conditions normal/blackout/fog; LAN variants pending |
| Contract | Initial open doors | Pending | Current doors default closed |
| Contract | Hiding spot density | Active | 0–100% controls generated cupboard sockets; L hides, movement exposes |
| Contract | Sanity monitor operational | Active | Host-enforced van setting |
| Contract | Activity monitor operational | Active | Host-enforced van setting |
| Contract | Starting breaker state | Partial | Solo utility breaker implemented; LAN config pending |
| Contract | Breaker shown on floor map | Pending | Not drawn as toggleable marker |
| Contract | Haunted special objects count | Pending | Original cursed-object equivalents not authored |
| Contract | Haunted special object selection | Pending | Not authored |
| Contract | Ghost response to isolated players hint | Pending | Traits exist but no briefing toggle |
| Economy | Difficulty payout multiplier | Pending | Party difficulty changes harm/sanity, but reward curve pending |

**UI rule:** Only Active settings may be editable. Partial settings must show the supported subset, never a fabricated switch. Every pending row needs authoritative simulation code, in-world interaction where relevant, regression tests, and observed multiplayer results before activation.
