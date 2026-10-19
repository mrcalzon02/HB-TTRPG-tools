# Beckenburg contract difficulty and settlement

The contract editor now controls **Hard evidence** independently of the
weather **Fixed / Dynamic / Random** setting, weather severity, party
scaling, sanity and ghost action frequency.

- **Easy:** all evidence families genuinely compatible with the species.
- **Medium:** exactly **two** compatible hard-evidence families, selected
  once per host session and never re-rolled during instrument sampling.
- **Death Wish:** **zero guaranteed hard instrument families**.
  EMF baselines, natural temperature and no-response readings still work,
  as do ordinary ghost behavior and physical observation. Strong EMF 8–10,
  ghost-caused temperature extremes, spirit replies, authored book writing,
  and distinctive D.O.T.S. figure encounters cannot appear as hard proof.
  The hidden quota is never broadcast to the human ghost or hunter clients.

A Death Wish identification is an **unverified hypothesis**. The host
records the guess without revealing whether it is correct. Only a correct
hypothesis followed by the ghost's specific authored ritual can complete
the contract. Completing the rite is the **only investigator victory**;
retreat and team death resolve in favor of the entity.

## Money and objectives

The host observes accepted actions and counts unique optional tasks:
EMF sample, temperature sample, spirit-box test, ward placement,
photograph of a real manifestation, surviving a Frenzy, and inspecting
actual authored writing. Repeating one action cannot farm rewards.
Three globally rotating tasks are chosen from activities that do not
reveal a species' hidden evidence quota; they change each UTC day.
The hunter receives task status through host `OBJECTIVES` and `TASK`
packets, never client-authorized completion.

When the case terminates, the host creates one validated payout receipt.
A successful ritual gets the highest base, a **correctly identified
retreat** receives a smaller base, and an unidentified retreat or all
hunter deaths receives none. Optional/daily completions raise rewards
only for an eligible outcome. Medium and Death Wish offer greater payout
multipliers; bad weather severity adds a smaller multiplier independently.

Receipts are sent only to investigator seats after the ordinary `RESULT`
event and are applied to `ProfileStore`'s existing, atomic local
currency/experience save using the same UUID-based duplicate guard as
solo. They also update the session's host-authoritative field wallet.
The asymmetrical ghost seat sees the outcome, not private rewards.

`HardEvidenceQuotaTest` and `ContractRewardsTest` cover species
compatibility, real instrument masking, unverified Death Wish guesses,
ritual/retreat/death outcomes and persistent payout deduplication.

**Known limitations:** Solo currently retains the original evidence
count and payout model; this extended controller governs LAN contracts.
A disconnected player without a live connection at terminal settlement
still needs a durable reconnectable receipt handoff. Full Java
integration and real network playtests are required.
