# Warhammer 40K Character Continuity Catalog Control

**Status:** ACTIVE CONTINUITY CONTROL  
**Applies to:** all recovered, continuing, and newly expanded Warhammer 40K fiction in `mrcalzon02/HB-TTRPG-tools`.

The character continuity catalog exists to answer a different question from the Dramatis Personae register.

The Dramatis Personae register answers:

> **Who is this person in the archive?**

The continuity catalog answers:

> **What does this person still remember, know, believe, want, fear, prefer, owe, hide, distrust, know how to do, and carry forward after earlier chapters have ended?**

The authoritative temporal catalog is:

`api/resources/warhammer-40k-character-continuity-catalog.json`

The authoritative identity/biography register remains:

`assets/warhammer-40k/imperial-dramatis-personae-v1.js`

Do not create a second biography database. The catalog references Dramatis Personae identities and records evolving story state.

---

## 1. Long-memory rule

Important character state does not expire merely because the story moved on.

If a character learns something in Chapter II, that knowledge is still available in Chapter VIII unless a later event explicitly changes, suppresses, erases, falsifies, or makes it inaccessible.

Track durable state including:

- memories and witnessed events;
- knowledge;
- beliefs and doubts;
- secrets known;
- secrets personally held;
- warnings received;
- evidence seen;
- lies told;
- lies believed;
- plans and long-term goals;
- fears;
- loyalties;
- suspicions;
- professional doctrine;
- faith;
- political or factional allegiance;
- skills;
- weapons and equipment familiarity;
- languages and codes;
- investigative knowledge;
- technical knowledge;
- Warp/psyker/xenos knowledge actually demonstrated;
- security clearances and restricted access;
- injuries;
- augmetics;
- illness;
- corruption or contamination concerns;
- fatigue and recovery;
- trauma and emotional aftermath;
- habits;
- preferences;
- aversions;
- recurring irritations;
- social performance;
- deception ability;
- interrogation resistance;
- violence tolerance;
- willingness to kill;
- remorse afterward;
- command habits;
- risk tolerance;
- relationships;
- trust;
- resentment;
- fear;
- affection;
- obligations;
- oaths;
- orders;
- debts;
- leverage;
- classified duties;
- unresolved promises.

A later chapter should be allowed to **build on accumulated state** rather than reintroducing the same discovery as though nobody remembers it.

---

## 2. Temporal layering — never flatten history

Do not rewrite a character into whatever the newest scene implies.

Old states remain historically true even after they change.

Examples:

- a character once trusted an officer, later became suspicious, and finally learned the officer betrayed them;
- a Guardsman feared a weapon, trained with it, and later became competent;
- an Inquisitor believed a report false, then saw corroborating evidence;
- a Commissar distrusted a crew member but still relied on their technical competence;
- a character suffered an injury, recovered function, but retained pain or changed behavior;
- a character was once naive about Genestealers, later knew enough to recognize signs.

The catalog records the **sequence**, not merely the newest conclusion.

When a state changes:

- preserve the earlier entry;
- mark it superseded, contradicted, cooled, resolved, completed, or transformed as appropriate;
- create the new state;
- record the chapter/segment that caused the change.

---

## 3. Knowledge, belief, certainty, and action are separate

Never reduce all epistemic state to "knows X."

For important information, track separately:

- **fact/information received**;
- **source**;
- **witnesses**;
- **how the character encountered it**;
- **credibility assigned**;
- **belief state**;
- **certainty**;
- **trust in the source**;
- **contradictory evidence**;
- **classification/restriction**;
- **action taken**;
- **whether later evidence changed the interpretation**.

A character may know that someone accused the crew of contamination while believing the accusation false.

A character may possess two contradictory reports and trust neither.

A character may correctly suspect something without having proof.

A character may know the truth but deliberately conceal it.

All of these are different continuity states.

### Allowed epistemic statuses

Use statuses such as:

- `observed`
- `reported`
- `suspected`
- `believed`
- `doubted`
- `disbelieved`
- `confirmed`
- `misinformed`
- `classified`
- `forgotten-explicitly`
- `memory-altered`
- `superseded`
- `unresolved`

Do not treat model inference as character knowledge.

---

## 4. Secrets

Track both directions:

### Secrets known by the character

What hidden information have they learned?

### Secrets held by the character

What do they personally conceal from others?

For each important secret track:

- content;
- who else knows;
- who the character believes knows;
- origin;
- current risk of exposure;
- whether they have lied about it;
- whether they intend to reveal it;
- consequences if exposed.

Do not automatically propagate a secret to other characters because the reader knows it.

**Reader knowledge is not character knowledge.**

This is especially important for dramatic irony such as *The Long Patrol of Broussard*: the reader may know the *Hesperant Vale* is compromised while Broussard or Jalesthesian may not yet possess enough evidence to name the threat.

---

## 5. Skills and competence continuity

Once a skill is demonstrated or source-established, retain it unless an explicit cause removes access.

Track:

- skill/domain;
- training source;
- theoretical vs practical competence;
- proficiency;
- context;
- equipment/faction specificity;
- last demonstrated use;
- limitations;
- stress performance;
- whether the character knows their own limitation.

Examples:

- lasgun familiarity;
- voidship command;
- convoy logistics;
- tactical simulation;
- archival provenance analysis;
- interrogation;
- battlefield medicine;
- xenobiology;
- Mechanicus systems;
- court procedure;
- Administratum procedure;
- astropathic protocol;
- navigation;
- maintenance;
- forensic accounting;
- disguise;
- deception;
- close-quarters fighting;
- demolitions;
- leadership;
- political negotiation.

Do not grant practical ability merely because a character has heard terminology.

Knowing what a Genestealer is does not automatically make someone competent at identifying hybrid generations.

Knowing Mechanicus doctrine does not make a person a Tech-Priest.

---

## 6. Performance is contextual

Do not turn traits into universal numbers.

A character may be:

- calm while commanding troops but poor at private confrontation;
- an excellent liar under interrogation but transparent to a sibling;
- intimidating to subordinates but awkward with nobles;
- courageous in battle but terrified of psykers;
- technically brilliant and politically naive;
- deeply faithful but skeptical of one specific priest;
- capable of killing instantly while suffering severe remorse afterward.

Track demonstrated performance by context.

Recommended fields include:

- `domain`
- `context`
- `demonstratedLevel`
- `evidence`
- `limitations`
- `emotionalAftermath`

Never fill blank traits merely because the character archetype suggests them.

Use `unknown`, `unrated`, `unresolved`, or `needs-prose-evidence`.

---

## 7. Violence and trauma are multi-axis state

Track separately:

- technical combat skill;
- willingness to initiate violence;
- ability to act during crisis;
- physiological reaction;
- emotional compartmentalization;
- remorse;
- grief;
- nightmares;
- avoidance;
- anger;
- recovery time;
- willingness to repeat the act;
- whether violence changes later decision-making.

A veteran can be highly functional during combat and still suffer afterward.

A hardened character can show little immediate distress without being immune to consequences.

Do not infer PTSD, sociopathy, cowardice, or emotional resilience without source evidence.

---

## 8. Relationships are directional

A relationship is not a single shared number.

If Broussard trusts Jalesthesian, that does not automatically mean Jalesthesian trusts Broussard to the same degree or for the same reasons.

Track each character's state toward the other:

- trust;
- affection;
- respect;
- fear;
- resentment;
- suspicion;
- dependency;
- authority;
- loyalty;
- attraction where actually relevant;
- obligation;
- leverage;
- current conflict;
- last major change.

Relationships may be asymmetric.

---

## 9. Goals, plans, and intentions persist

Characters should retain plans across chapters.

Track:

- immediate objective;
- medium-term goal;
- long-term ambition;
- private goal;
- public stated goal;
- hidden agenda;
- contingency plans;
- abandoned plans;
- blockers;
- dependencies;
- deadlines where relevant.

A plan should not vanish because the next chapter changes viewpoint.

If a character abandons a plan, record why.

---

## 10. Obligations, orders, debts, and chain of command

Warhammer stories often turn on obligations more than preferences.

Track:

- current orders;
- issuing authority;
- expiration/completion condition;
- oath;
- debt;
- command responsibility;
- family obligation;
- institutional duty;
- classified mandate;
- favor owed;
- promise made;
- leverage held over the character;
- leverage the character holds over others.

A character should not conveniently forget orders that remain active.

---

## 11. Physical and medical continuity

Track when materially relevant:

- current injuries;
- permanent injuries;
- scars;
- augmetics;
- organ replacement;
- disease;
- radiation;
- poison;
- Warp exposure;
- psychic effects;
- contamination concerns;
- sleep deprivation;
- hunger;
- fatigue;
- medication;
- rejuvenat status;
- mobility limits;
- recovery progress.

Do not reset a wounded character to full capability in the next scene without recovery or explanation.

---

## 12. Faith, ideology, faction loyalty, and doctrine

Track these separately.

A person can:

- be loyal to the Imperium but skeptical of a local governor;
- be devout but contemptuous of one priest;
- obey the Mechanicus without understanding its theology;
- follow orders while believing the strategy foolish;
- love their regiment while hating the Munitorum;
- be doctrinally loyal while privately frightened by what doctrine requires.

Do not flatten every Imperial into identical belief.

Era awareness from `warhammer-40k-fiction-governance.md` still applies: characters cannot hold institutions, doctrines, or terminology that do not yet exist in their era.

---

## 13. Preferences, habits, and personality traits

Track recurring demonstrated preferences such as:

- food/drink;
- sleep habits;
- clothing;
- weapons;
- working style;
- planning style;
- cleanliness;
- patience;
- ritual;
- music;
- reading;
- machinery;
- solitude/company;
- command style;
- humor;
- risk tolerance;
- recurring annoyances;
- prejudices/assumptions;
- things they notice first;
- things they consistently neglect.

Traits evolve but should not reset.

A character who repeatedly plans carefully should not become recklessly impulsive for one scene without pressure, development, deception, or another explanation.

---

## 14. Baseline personae versus temporal catalog

The Dramatis Personae register owns:

- identity;
- title/rank;
- role;
- broad biography;
- baseline temperament;
- doctrine;
- established relationships;
- major story beats;
- source authority.

The continuity catalog owns:

- evolving knowledge;
- memories;
- beliefs;
- secrets;
- active plans;
- demonstrated skill state;
- contextual performance;
- injuries;
- relationships as they change;
- obligations;
- current emotional state;
- durable preferences;
- chapter-by-chapter consequences.

If the catalog establishes a permanent identity-level fact, update Dramatis Personae too.

If the change is temporal or evolving, the catalog is the primary home.

---

## 15. Catalog ledgers

Every character record provides these ledgers:

- `memoriesEvents`
- `knowledgeBeliefs`
- `secretsKnown`
- `secretsHeld`
- `plansGoals`
- `skillsCompetence`
- `relationshipsTrust`
- `temperamentPerformance`
- `preferencesAversions`
- `faithIdeologyLoyalty`
- `ordersObligationsLeverage`
- `physicalMedicalState`
- `equipmentResources`
- `chapterTouchLog`

Empty ledgers are meaningful. They mean the archive has not yet established temporal state there.

Do not fill them with guesses.

---

## 16. Required entry provenance

Every non-baseline catalog entry must identify where it came from.

Use fields such as:

- story/chapter/segment;
- repository path;
- source type: `source-prose`, `recovered-prose`, `authorial-correction`, `continuation`, or `user-explicit`;
- first established date/sequence;
- last reinforced date/sequence;
- status.

A continuity fact without provenance should be treated as suspect.

---

## 17. Chapter Touch Log

After every recovered or newly written substantial story slice:

1. identify every established character materially touched by the segment;
2. add a touch-log entry;
3. record what changed;
4. update any affected ledgers;
5. preserve old state;
6. update Dramatis Personae only for durable identity-level changes.

A touch log entry should answer:

- What did this character learn?
- What did they newly believe or stop believing?
- What did they witness?
- What memory now matters?
- What plan changed?
- What skill was demonstrated?
- What injury or recovery changed?
- What relationship changed?
- What obligation/order arose or ended?
- What secret became known, hidden, exposed, or reinterpreted?
- What durable trait was demonstrated strongly enough to matter later?

---

## 18. Pre-write continuity read

Before writing a continuation involving a recurring character, the automation must read:

1. that character's Dramatis Personae record;
2. that character's continuity-catalog record;
3. the previous relevant story segment;
4. any active relationship counterpart records relevant to the scene.

The next chapter must respect accumulated state.

A character who already knows a fact must not rediscover it as new.

A character who has never learned a fact must not act on it merely because the reader knows it.

---

## 19. Update threshold

Not every line deserves a catalog entry.

Add state when it is likely to matter later because it changes or establishes:

- knowledge;
- interpretation;
- relationship;
- competence;
- injury;
- resource;
- goal;
- order;
- obligation;
- secret;
- durable preference;
- demonstrated trait;
- emotional aftermath;
- decision-making.

Do not turn the catalog into a transcript.

---

## 20. Anti-invention rule

Unknown is valid.

Prefer:

- `unknown`
- `unrated`
- `unresolved`
- `needs-prose-evidence`

over fabricated detail.

The catalog is an authority **because it refuses to guess**.

---

## 20A. Legacy backfill-on-first-touch

The catalog was introduced after many stories already existed.

Therefore, when an established story line is selected for recovery or continuation and its recurring characters do not yet have sufficient temporal state recorded, the automation must **backfill current state from the authoritative source before writing new prose**.

Backfill in this order:

1. recovered/original source prose;
2. committed continuation prose;
3. migrated long-form archive text;
4. Dramatis Personae story beats and source-authority notes;
5. explicit user corrections.

Backfill only what the source actually establishes.

At minimum, reconcile any state that is likely to affect the next segment:

- knowledge and suspicions;
- active secrets;
- current plans;
- current orders;
- injuries and recovery;
- demonstrated skills;
- relationship trust/conflict;
- unresolved promises or debts;
- emotional aftermath;
- important equipment/resources;
- current location and immediate objective.

Mark backfilled entries with source type `legacy-backfill` plus the actual story/prose provenance they were derived from.

Do not generate new fiction until the active recurring cast has enough catalog state to prevent obvious rediscovery, knowledge leakage, forgotten injuries, reset relationships, or abandoned plans.

## 21. Automated run completion requirement

A story run that materially changes a recurring character is incomplete until the catalog is reconciled.

The hourly 40K automation must:

- read the catalog before writing;
- update it after writing;
- validate JSON syntax;
- preserve all untouched character records;
- append or status-change rather than erase historical state;
- update the Chapter Touch Log;
- verify the committed catalog after the story commit;
- report the catalog update in the run's final claim.

If no durable character state changed, record that conclusion rather than inventing an update.
