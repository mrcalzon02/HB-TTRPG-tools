# Warhammer 40K Fiction Archive — Governing Continuity, Era, Tone, and Expansion Rules

**Status:** Mandatory operating document for automated and manual Warhammer 40K fiction-archive work in `mrcalzon02/HB-TTRPG-tools`.

**Purpose:** This file exists to preserve story rules that are easy to lose through conversation compaction, long-running automation, model context limits, or repeated continuation work. Every automated fiction run must read this document before recovering, extending, indexing, or cross-linking a story.

This is not a second story archive and not a replacement for the Dramatis Personae, Lore index, long-form corpus, or expansion circuit. It is the governing layer that tells the automation **how to use those sources without drifting**.

---

## 1. Mandatory load order before any story work

Every run must reconcile `main` and load, in this order:

1. `api/resources/warhammer-40k-fiction-governance.md` — this governing document.
2. `api/resources/warhammer-40k-lore-index.json` — what the archive currently exposes.
3. `api/resources/warhammer-40k-story-expansion-circuit.json` — recovery state, active rotation, next dependency-valid slice.
4. `assets/warhammer-40k/imperial-dramatis-personae-v1.js` — authoritative character/personage registry.
5. The relevant committed story file(s), recovered source file(s), or matching record inside `assets/warhammer-40k/lore/reddit-story-archive.json`.
6. Relevant location, vessel, chronology, logistics, personnel, medicae, or event cross-indexes if the story touches them.
7. Prior conversation history or connected source documents when the circuit says recovery is incomplete.
8. External Warhammer 40K setting research only where the above sources do not settle an era/canon question.

Do not begin drafting prose before the era, source story, active cast, and unresolved continuity locks are known.

---

## 2. Source authority and contradiction hierarchy

When sources disagree, use this priority:

1. **The user's newest explicit instruction or correction.**
2. **Recovered original prose or an identified surviving source document** such as a Google working draft.
3. **Committed story prose on `main`.**
4. **The migrated long-form Reddit story corpus.**
5. **The expansion circuit's explicit continuity constraints and recovery boundary.**
6. **The Dramatis Personae and other archive cross-indexes.**
7. **This governance document's default rules.**
8. **External Warhammer setting references.**

Never silently choose a lower-priority source over a higher-priority one.

If two high-authority sources genuinely conflict, preserve the contradiction, mark it for reconciliation, and avoid building additional dependent lore until the conflict is resolved. Do not "fix" historical prose merely because a later summary differs.

---

## 3. Recovery-first rule

Conversation-created or source-document prose that exists but is not committed has priority over new fiction.

When recovery material exists:

- Restore it before generating a continuation.
- Preserve exact wording when exact wording is available.
- If only fragments survive, clearly mark the recovery boundary and distinguish conservative connective reconstruction from verbatim source recovery.
- Never invent a replacement for prose that can still be recovered from chat history, Google Drive, Reddit archive material, or another identified source.
- Do not repeatedly classify the already migrated 86-story Reddit corpus as missing after it has been verified.
- A story remains `recovery-in-progress` or `recovery-incomplete` until the identified source backlog is exhausted or explicitly abandoned by the user.

---

# PART I — ERA AWARENESS

## 4. Era-lock rule

**Every story must have an era lock before new prose is written.**

The run must identify, as specifically as the source allows:

- approximate millennium/century or historical era;
- whether the Imperium exists yet;
- whether the Emperor is publicly active, absent, enthroned, mythologized, or not yet relevant;
- which military institutions exist in that era;
- which religious institutions exist in that era;
- what technologies and names are normal for that era;
- what historical events have already happened;
- what historical events have **not** happened yet;
- what an ordinary viewpoint character could realistically know.

A narrator may know more than a character, but the prose must not casually leak later-era vocabulary, institutions, slang, titles, equipment names, or historical hindsight into a period where they do not belong.

### Hard rule

**Do not write modern 40K backwards into the deep past.**

A pre-Imperial human story is not simply M41 with fewer skulls.

---

## 5. Era matrix

The dates below are operating anchors, not permission to overwrite a story's own established dating.

### A. Early / Deep Human Past — before the Age of Technology

Examples include near-future or early-spaceflight human stories long before the Imperium.

Default vocabulary and technology should grow naturally from human historical/near-future terminology.

**Do not import by default:**

- Imperium of Man;
- Imperial Aquila;
- Adeptus anything;
- Administratum;
- Astra Militarum / Imperial Guard;
- Imperial Navy;
- Space Marines / Adeptus Astartes / Legiones Astartes;
- Primarchs;
- Custodes as a public Imperial institution;
- Inquisition;
- Ecclesiarchy / Adeptus Ministorum;
- Mechanicum / Adeptus Mechanicus / Tech-Priest culture;
- Cult of the Machine God;
- God-Emperor worship;
- servitors as an Imperial social institution;
- vox as the universal term for radio;
- cogitator as the universal term for computer;
- dataslate as the universal term for tablet/computer;
- lasrifle/lasgun as standard military vocabulary;
- bolters, chainswords, Imperial-pattern weapons, or STC-derived pattern nomenclature unless the source explicitly requires an anachronistic artifact;
- High Gothic / Low Gothic as casual labels;
- Traitor Legions;
- Chaos Space Marines;
- Black Ships, Commissars, Arbites, Schola Progenium, or other later Imperial institutions.

Use period-appropriate terms: computers, networks, radios, drones, spacecraft, rifles, directed-energy weapons if independently established, laboratories, corporations, governments, militaries, colonies, and other language appropriate to the specific historical stage.

For this archive, **even where a later Warhammer technology may have ancient roots, do not use the later Imperial name in a deep-past story unless the original source explicitly did so.**

### B. Age of Technology — approximately M15 to M25

Humanity has reached extraordinary scientific and interstellar capability. Warp-capable human interstellar civilisation develops during this broad era. The later Imperium does not yet exist.

Era-appropriate concepts may include advanced automation, artificial intelligence, sophisticated robotics, genetic engineering, interstellar colonisation, Standard Template Construct technology where source-appropriate, and technology far beyond later Imperial replication.

**Still do not default to modern Imperial vocabulary.**

There is no reason for an ordinary Age of Technology engineer to speak like an M41 Enginseer. A powerful machine is not automatically a "machine-spirit." A computer is not automatically a "cogitator." A robot is not automatically a "servitor." A human military is not automatically the Imperial Guard.

The later Cult Mechanicus and Imperial theology must not be projected backward into this era.

### C. Age of Strife — approximately M25 to late M30

Human civilisation fractures. Warp travel becomes unreliable, polities become isolated, psykers emerge in destabilising numbers, and technology/culture diverges dramatically.

This era is **not culturally uniform**. A local civilisation may have extremely advanced technology, degraded technology, techno-barbarian systems, isolated machine cultures, or something stranger.

Mars develops the religious-technological culture that becomes the Mechanicum during this broad pre-Imperial period. **That does not make the Cult Mechanicus universal human culture.** Use Martian Machine Cult terminology only when geography, chronology, or source continuity justifies it.

There is still no galaxy-wide Imperium.

### D. Unification era — late M30

Terra is being unified under the Emperor.

Era-specific institutions may include the Emperor's early forces, Custodes, Thunder Warriors, proto-Imperial administration, and—late enough in the sequence—the first Astartes.

Do not casually import the mature bureaucracy, military branches, theology, or slang of M41.

Space Marines must not appear before their actual creation window. If the story is early enough that the Thunder Warriors are the relevant transhuman force, do not substitute Astartes because they are more recognizable.

### E. Great Crusade — M30 into early M31

The Imperium exists and expands.

Appropriate terms include:

- Emperor of Mankind;
- Imperial Truth;
- Great Crusade;
- Expeditionary Fleets;
- **Legiones Astartes / Space Marine Legions**, not modern Chapter assumptions;
- Imperial Army rather than automatically calling ordinary soldiers the Astra Militarum;
- Mechanicum / Mechanicum of Mars as the period-appropriate Martian institution;
- Primarchs only when source continuity actually requires them;
- Compliance as a major political/military term.

The Emperor created the Space Marine Legions for the Great Crusade, and the Mechanicum supported Imperial expansion after alliance with Terra.

**Do not describe future Traitor Legions as "Traitor Legions" before their betrayal is known.** Before the Heresy, they are Imperial Legions with their contemporary names and reputations.

The official ideological program is the atheistic Imperial Truth. Do not write normal Great Crusade officials as casual God-Emperor worshippers unless the story specifically concerns a dissident/exceptional religious tradition such as the pre-Heresy Word Bearers or another explicitly established group.

### F. Horus Heresy / Age of Darkness — early M31

The category "Traitor Legion" becomes valid only as betrayal occurs and knowledge spreads.

Era awareness must remain local:

- characters on one front may not yet know which Legion has betrayed the Emperor;
- a remote garrison may know only that orders have stopped making sense;
- "Horus Heresy" may be a later historical label rather than what every character calls the war in its opening days;
- Dark Mechanicum terminology belongs to the actual fracture of the Mechanicum, not centuries earlier;
- Imperial institutions are in violent transition.

The Horus Heresy ends the Great Crusade, wounds the Emperor, and drives the Traitor Legions into the Eye of Terror.

### G. Scouring / early post-Heresy Imperium — M31 onward

Do not assume every mature M41 institution appears fully formed the day Horus dies.

The Second Founding and post-Heresy reorganisation create the Chapter system that later defines the Adeptus Astartes. Before that reorganisation, the Legions are the correct frame.

Military, religious, inquisitorial, and bureaucratic structures should be checked against the specific date before being used.

### H. Mature Imperium — M32 through M40

The setting increasingly resembles recognisable "modern" Imperial institutions, but still verify the era of any institution, Saint, crusade, technology pattern, or office that matters to the plot.

Ten thousand years of Imperial history are not culturally static.

### I. Late M41 / M42

Modern familiar 40K vocabulary is generally available where appropriate:

- Adeptus Astartes Chapters;
- Astra Militarum;
- Imperial Navy;
- Adeptus Mechanicus;
- Ecclesiarchy / Imperial Cult;
- Inquisition;
- Commissariat;
- Administratum;
- Arbites;
- established Forge Worlds, hive culture, common Imperial technology, etc.

Even here, do not turn every sentence into franchise terminology. People still think about hunger, fatigue, money, family, weather, machinery, rank, cargo, pain, jealousy, fear, maintenance, and survival.

---

## 6. Vocabulary contamination rule

Before using a strongly recognisable 40K term, ask:

1. Does the institution/object exist in this era?
2. Does **this culture** use that term?
3. Does **this viewpoint character** know that term?
4. Did the source story already use it?
5. Is the term necessary, or is it being added merely to make prose "sound more 40K"?

If any answer is uncertain, research before inserting it.

Common drift examples to reject:

- pre-Imperial radio becoming "vox" for flavour;
- pre-Imperial computers becoming "cogitators";
- pre-Imperial soldiers suddenly carrying standard-pattern lasguns;
- ancient technicians becoming Tech-Priests;
- Great Crusade Imperial Army units becoming Astra Militarum;
- Great Crusade Space Marine Legions being treated as Codex Chapters;
- calling a future traitor force a Traitor Legion before treachery occurs;
- God-Emperor worship appearing as normal state doctrine during the Imperial Truth;
- modern Inquisitorial bureaucracy appearing before the Inquisition exists;
- M41 slang or devotional formulas being spoken tens of thousands of years earlier.

---

## 7. Point-of-view knowledge is also era-locked

Canon truth is not the same as character knowledge.

The automation must separate:

- what the reader may infer;
- what the narrator states;
- what the viewpoint character knows;
- what the Imperium officially teaches;
- what has been censored, mythologised, or forgotten.

Example: by M41, the Horus Heresy is ancient and often distorted or mythologised for ordinary citizens. Detailed historical knowledge should belong to characters or institutions with a reason to possess it, not every dockworker or Guardsman.

Do not use omniscient canon knowledge to make ordinary characters unrealistically well informed.

---

# PART II — CHARACTER GOVERNANCE

## 8. Authoritative character index

The authoritative character/personage register is:

`assets/warhammer-40k/imperial-dramatis-personae-v1.js`

It currently contains 53 sealed personae and must be loaded before adding, renaming, killing, promoting, transferring, resurrecting, biologically altering, or materially changing an established character.

Do **not** copy the full register into this document. This document governs use; the registry owns detailed biography and cross-index data.

When a story introduces a durable new named character, update the registry only when that character is important enough to recur or materially affects archive continuity. Do not flood the registry with every bartender, deckhand, clerk, or casualty.

---

## 9. Famous / named canon character gate

**Default rule: do not introduce famous or named Warhammer canon characters.**

A canon character may appear only when at least one of the following is true:

1. that character already appears in the original/recovered story line being continued;
2. the user explicitly instructs that character to appear;
3. the next source-backed segment requires the character because the existing story already established the encounter.

A famous character appearing in one chronicle is **not globally whitelisted**.

Examples:

- If Commissar Yarrick is already part of the Project VIGILANT SHADE source line, he may remain in that line where continuity requires him.
- That does **not** authorize adding Yarrick to Broussard, Antegra, Galladin, Tenelja, Drenal, or another story just because the dates could overlap.
- A Primarch, named Chapter Master, famous Inquisitor, famous Saint, or named canonical villain should never be dropped into an original story as a cameo, rescue device, authority stamp, or "cool connection" without source/user authorization.

### No canon gravity

Do not let famous canon characters pull an original story away from its own cast.

If a canon figure is already present, keep the focus on the established original viewpoint characters unless the source story explicitly does otherwise.

### No retroactive bloodlines

Do not invent ancestors, descendants, secret relatives, gene-lines, mentors, clone-lines, or hidden connections to famous canon characters unless the user or original story established them.

### No accidental replacement

Do not replace an original role with a famous canonical equivalent.

A competent Commissar does not need to become Cain, Yarrick, Gaunt, or a relative of one. An Inquisitor does not need to be Eisenhorn-adjacent. A Space Marine force does not need to belong to a famous First Founding Chapter unless the source requires it.

---

## 10. Active cast locks most likely to drift

These are compact anchors only. The full story files and personae register remain authoritative.

### The Long Patrol of Broussard

Core recurring cast and named personnel already established include Captain Broussard, Commissar Gabriel Hamden Jalesthesian, Captain Derrovan Kelm, Lieutenant-Major Ruschin, Second Bridge Officer Holt, Sella, Jerrik, Dalen Voss, Kell Orro, Vella Marr, and Josef Arlen in Jalesthesian's Schola history.

Key lock: the crew of the *Hesperant Vale* is secretly compromised by Genestealer influence; hybrids are concealed among loose produce bins. The short near-impact telemetry irregularity is not the central mystery. Deep indexing of older telemetry reveals deliberate falsification intended to conceal the freighter's true port of origin. Broussard's detachment later fights additional High Presidio predators and successfully escorts the damaged freighter back to the convoy while the reader is allowed to see that the Xenos infiltration has survived.

Do not assume Broussard or Jalesthesian understands the full Genestealer truth until recovered prose proves it.

Google-source recovery remains ahead of fresh continuation while the expansion circuit says so.

### House Vallimere's Sons

Prite, Darcelle, and Renault are the three former simulation technicians elevated into House Vallimere and strategic teaching authority. Preserve their collective history and the unresolved mapping between individual men and older Three Admirals identities unless source text resolves it.

Iral Vane's protective/monitoring role and the Academy Headmaster's institutional role should not be casually rewritten.

### Matron Lagas Atrovald

Lagas Atrovald is an S-Rank Matron of the Interlocutum whose defining conflict is custodial authority versus historical truth.

Lord Inquisitor Predulum Crystallumtra von Termuth IV already belongs to this line. His existence does not authorize importing other famous Inquisitors.

Arthus Pell is an established supporting archivist even if not separately sealed in the current personae register.

The Interlocutum's discovery that its own Authorized Original of *The Precipice of Thought* was historically harmonized is an active continuity fact.

### Project VIGILANT SHADE

Established original cast includes Reinhold, Doc Finkey, Atwell Zavoner, Hendrick Laar, Elebendentis Zabrin, and Hans.

Canon-character use in this story is bounded by the original VIGILANT SHADE source material. Do not propagate those canon relationships into unrelated stories.

### Tenelja Station

Arbentia, Abraxas 8207, and Bethany Pradaxa are already established and cross-indexed.

Preserve the station's existing technological/religious language rather than genericising it into interchangeable Mechanicus prose.

### House Drenal

Mulvane Cressard Altruceau Drenal is established. Preserve the story's existing house, bloodline, and Warp-born framing. Do not attach the Drenal family to famous canon bloodlines without explicit source authority.

### Antegra Station

Antegra is a bureaucratic/ontological horror line. Talbor Varik, Dren Solvik, Selene Marr, Edrin Vale, Lysa Nineteen, Old Varik, Respondent Prior, the Collector, ORIGIN, and the unresolved adjudicatory venue belong to that continuity.

Do not collapse its contradictions into a simple daemon/warp explanation merely because that is familiar 40K language.

The three-named historical location remains unidentified unless recovered prose establishes the names.

The original New Presidio broadcast contents must not be invented.

---

# PART III — TONE AND NARRATIVE AUTHORITY

## 11. Grimdark tone

The target is **grimdark, not grimderp**.

Grimdark should come from:

- enormous institutions with human beings trapped inside them;
- sacrifice that has consequences;
- war and logistics grinding against ordinary lives;
- bureaucracy that can be both necessary and monstrous;
- religious certainty colliding with practical reality;
- technology maintained beyond the understanding of its users where era-appropriate;
- moral compromise;
- survival under systems too large to care;
- competence that still cannot guarantee safety;
- victories that cost something;
- horror that survives paperwork, gunfire, faith, and good intentions.

Do not make every scene a torture chamber. Contrast matters. Warm food, competent colleagues, jokes, professional pride, loyalty, affection, routine maintenance, boredom, and small mercies make the darkness heavier when it arrives.

---

## 12. Dry wit

Dry wit is an accent, not the genre.

Preferred sources of humour:

- procedural absurdity;
- regulations colliding with physical reality;
- experienced soldiers describing catastrophe with understatement;
- tired clerks weaponising paperwork;
- technical people resenting impossible orders;
- institutions having a form for something no sane civilisation should need a form for;
- characters remaining professionally polite while everyone knows the situation is appalling.

Avoid:

- Marvel-style quipping;
- meme dialogue;
- knowingly quoting fandom jokes;
- everyone speaking in punchlines;
- breaking character for the reader;
- comedy that removes consequences.

The joke should usually reveal character, institution, or pressure.

---

## 13. Franchise-language restraint

Do not "40K-ify" prose by replacing every ordinary word with a setting term.

A door may be a door.

A mechanic may call a broken pump a broken pump.

A soldier may say he is hungry rather than invoking the Emperor every third sentence.

Use setting vocabulary where it carries actual cultural, institutional, technological, or religious meaning.

Too much franchise vocabulary makes every planet, era, class, and character sound identical.

---

## 14. Preserve story-specific voice

Each story owns its own narrative authority.

Before continuing a story, sample enough source prose to determine:

- sentence length;
- dialogue density;
- viewpoint distance;
- humour level;
- brutality level;
- descriptive density;
- pacing;
- whether the narrator is omniscient, close-third, first-person, epistolary, archival, procedural, or another form.

Do not flatten every line into the Antegra style, the Atrovald style, military action prose, or generic "grimdark."

The archive contains different voices on purpose.

---

## 15. Approximate segment length and bounded advancement

One automated run should materially advance **one bounded dependency-valid slice**.

Preserve the approximate scale of the story's existing installments. Do not replace a 4,000-word chapter tradition with a 600-word synopsis, and do not inflate a compact vignette into a novella merely because token budget permits it.

End at a real narrative boundary:

- completed scene;
- revealed clue;
- arrival;
- decision;
- battle phase;
- hearing phase;
- investigation phase;
- chapter boundary.

Do not manufacture a cliffhanger merely to create a next task.

---

# PART IV — TECHNOLOGY, INSTITUTIONS, AND LANGUAGE

## 16. Technology must belong to the era and culture

Before adding a named technology, verify:

- era;
- faction;
- manufacturing base;
- whether it is common, rare, experimental, ancient, or locally invented;
- whether the source story already establishes something different.

Never assume "older" means "more primitive" in Warhammer history. Age of Technology systems can surpass M41 technology. Conversely, a pre-spaceflight or early-spaceflight human story should not automatically possess later Imperial weapons merely because they exist in the franchise.

### Deep-past guardrail

In a human story set before the Imperium and before the relevant later institutions exist, prefer era-native technological language.

Do not casually use:

- cogitator;
- dataslate;
- vox;
- auspex;
- lasgun;
- bolter;
- chainsword;
- power armour;
- servitor;
- machine-spirit;
- STC "pattern" naming as ordinary consumer/military nomenclature;
- Mechanicus rites;
- Imperial ship class names;
- Imperial rank structures.

unless the original story explicitly establishes a justified exception.

---

## 17. Institution-name transition guardrails

Use period-correct institutions.

- **Great Crusade:** Imperial Army, Legiones Astartes / Space Marine Legions, Mechanicum, Expeditionary Fleets.
- **Post-Heresy mature Imperium:** Astra Militarum / Imperial Guard, Imperial Navy as distinct mature service, Adeptus Astartes Chapters, Adeptus Mechanicus, modern Administratum structures, etc., subject to date.
- **Pre-Imperial:** do not use Imperial institutions at all unless the scene specifically depicts their birth.

Do not use a modern institution name simply because readers will recognize it faster.

---

## 18. Religion and ideology guardrails

Religion changes across the timeline.

- Deep human past: no Imperial Cult.
- Age of Technology: no Imperial Cult and no galaxy-wide Machine Cult.
- Age of Strife: local religions vary wildly; the Martian Cult Mechanicum may exist in the correct Martian/forge context, but it is not universal human culture.
- Great Crusade: official Imperial Truth is secular/atheistic; Emperor-worship is politically and ideologically exceptional.
- Heresy and aftermath: religious transformation accelerates.
- Mature Imperium: Imperial Cult becomes dominant and institutionally embedded.

Do not make every era sound like an Ecclesiarchy sermon.

---

# PART V — SETTING CANON RESEARCH

## 19. Project-designated external lore reference

When internal archive material does not answer a general Warhammer canon/era question, use:

**Warhammer 40k Wiki (Fandom):**  
https://warhammer40k.fandom.com/wiki/Warhammer_40k_Wiki

This is the project's designated default quick-reference source for era chronology, faction history, technology, institutions, terminology, and named canon background.

Useful anchor pages include:

- Age of Technology: https://warhammer40k.fandom.com/wiki/Age_of_Technology
- Great Crusade: https://warhammer40k.fandom.com/wiki/Great_Crusade
- Horus Heresy: https://warhammer40k.fandom.com/wiki/Horus_Heresy
- Adeptus Mechanicus / Mechanicum history: https://warhammer40k.fandom.com/wiki/Adeptus_Mechanicus
- Space Marine Foundings / Chapter transition: https://warhammer40k.fandom.com/wiki/Founding

External lore research **does not override this archive's established original continuity** unless the user explicitly asks for a canon correction.

When an external canon point is uncertain or conflicting, do not guess. Research it.

---

## 20. No future hindsight leakage

Do not describe a person, institution, or event using a future historical label before that label exists unless the narrator is explicitly retrospective.

Examples:

- do not call a Great Crusade Legion "Traitor" before the betrayal;
- do not call a pre-Heresy warrior a "Chaos Space Marine" because the reader knows his future;
- do not describe a technological discovery as an STC relic if contemporaries do not know it as one;
- do not have a pre-Imperial engineer compare something to the Adeptus Mechanicus;
- do not let a M30 citizen speak of "ten thousand years of Imperial tradition";
- do not let characters know the future fate of the Emperor, Primarchs, Legions, institutions, or worlds.

---

# PART VI — CONTINUITY SAFETY

## 21. No silent retcons

If a new instruction corrects an existing file:

1. update the authoritative story/circuit/cross-index;
2. mark recovery status if source prose is still missing;
3. do not silently rewrite historical source material unless the user requests an edited edition;
4. preserve earlier wording when it is itself an artifact worth keeping;
5. distinguish "source recovery", "authorial correction", and "new continuation".

The Broussard telemetry correction is the model case: the short telemetry irregularity remains a surface clue, while the deeper falsification is the actual plot mechanism.

---

## 22. Do not over-resolve mysteries

A continuing mystery is not a defect.

Do not reveal:

- hidden identities;
- unknown locations;
- source-unrecovered broadcasts;
- secret allegiances;
- unexplained technology;
- ontological mechanisms;
- future betrayals;

merely because the automation needs a satisfying end to a run.

If the source deliberately withholds an answer, preserve the withholding.

---

## 23. Originality over franchise cameos

When a story needs:

- a commander;
- a Commissar;
- an Inquisitor;
- a governor;
- a Magos;
- a ship captain;
- a Space Marine;
- a noble;
- a Saint;
- an enemy officer;

prefer the established original cast or create a new local original character **only if necessary**.

Do not solve narrative needs by reaching for a famous canon name.

---

## 24. New characters

Before creating a new named character, ask:

- Can an existing established character perform this function?
- Does naming this person matter for future continuity?
- Does the name fit the culture, planet, faction, and era?
- Will this person require a personae entry?
- Does this accidentally duplicate an existing name or role?
- Is this an unnecessary new branch in an already crowded story?

Named characters should earn their permanence.

---

## 25. New ships, worlds, stations, and organisations

Apply the same restraint.

Do not create a new named vessel, noble house, regiment, Forge World, Chapter, station, cult, or agency merely to decorate a scene.

If an existing location or organisation can logically serve, use it.

If a new one is necessary, cross-index it when it becomes continuity-bearing.

Do not casually name a new Space Marine Chapter when an unnamed force or existing source faction is sufficient.

---

# PART VII — AUTOMATED RUN CONTRACT

## 26. Required execution sequence

Every hourly run follows:

### INTENT

State internally what one bounded thing this run will recover or advance.

### EXECUTE

- reconcile `main`;
- read this governance file;
- read Lore index;
- read expansion circuit;
- read relevant personae/cross-indexes;
- recover source backlog first;
- otherwise choose one rotation-eligible story;
- establish era lock;
- verify famous-character gate;
- write/recover one bounded slice;
- update index/circuit/personae/location records only as justified.

### OBSERVE

Inspect what actually changed. Do not rely on intended patch state.

### VERIFY

- verify commit SHA;
- read back changed story;
- read back index/circuit;
- syntax/validation-check any touched JS/JSON registry;
- confirm no file truncation;
- confirm no accidental duplicate archive surface;
- confirm story appears in the Stories index system.

### CLAIM

Only then report completion.

Never claim "committed", "indexed", "recovered", "deployed", or "verified" without the corresponding evidence.

---

## 27. Rotation rule

Recovery backlog outranks rotation.

Once recovery backlog is clear, alternate between distinct existing story lines rather than repeatedly extending the most recent arc.

Do not let Antegra, Broussard, Atrovald, Vallimere, VIGILANT SHADE, or any other line monopolize the automation simply because its recent context is easiest to recall.

The expansion circuit determines eligibility.

---

## 28. No GitHub Actions or parallel archives

Do not create GitHub Actions.

Do not create a second story database, second personae database, alternate lore index, or shadow expansion queue.

Use the established:

- Lore index;
- story expansion circuit;
- long-form archive;
- Dramatis Personae;
- existing cross-index registries;
- standalone Stories reader.

---

## 29. Story-index discoverability

Every committed recovered or continuation story must be directly discoverable under the Warhammer 40K **Stories** reader/index.

A Markdown file existing somewhere in the repository is not sufficient.

The Lore resource index is the authoritative feed for continuing/recovered Markdown chronicles. When a new story file is committed, ensure it is entered there so the Stories page can surface it.

---

# PART VIII — PRE-WRITE CHECKLIST

## 30. Before writing a single new paragraph, answer these questions

- What story am I in?
- What is the exact source/recovery endpoint?
- What era is this?
- What institutions exist?
- What institutions do not exist yet?
- What technology names are era-appropriate?
- What franchise vocabulary would be anachronistic here?
- What does the viewpoint character actually know?
- Which named characters are already established?
- Is any famous canon character already source-authorized in this exact story line?
- Am I about to add a famous character merely because the setting makes it possible?
- What mysteries must remain unresolved?
- What tone does the source actually use?
- How long is a normal installment?
- What is the one bounded narrative job of this run?

If any of these answers are unclear, **do not improvise through the uncertainty**. Reconcile or research first.

---

# PART IX — PRE-COMMIT DRIFT AUDIT

## 31. Reject the draft if any of the following occurred

- modern Imperial terms leaked into a pre-Imperial era without source justification;
- a future institution appeared early;
- a future event was referenced as though already known;
- a famous canon character was newly introduced without authorization;
- a famous canon character hijacked an original-cast story;
- a new Chapter/Legion/Forge World/house/ship was invented unnecessarily;
- characters know secret canon history they have no reason to know;
- grimdark became random cruelty without consequence;
- dry wit became comedy dialogue;
- the story voice changed into the style of another archive line;
- source prose was replaced by a reconstruction even though recovery was available;
- a mystery was resolved merely because the run needed closure;
- the prose used "40K words" as decorative substitutions rather than cultural facts;
- the segment is radically shorter/longer than its source without reason;
- the file was committed but not made discoverable through the Stories index.

---

# PART X — ERA RESEARCH NOTES FOR AUTOMATION

The following canon anchors were verified against the project-designated Warhammer 40K Wiki during creation of this governance file:

- The Age of Technology broadly spans M15 to the onset of the Age of Strife in M25 and predates the Imperium.  
  https://warhammer40k.fandom.com/wiki/Age_of_Technology
- The Great Crusade uses Space Marine **Legions**, the Imperial Army, Expeditionary Fleets, and cooperation with the Martian Mechanicum.  
  https://warhammer40k.fandom.com/wiki/Great_Crusade
- The Horus Heresy ends the Great Crusade and creates the historical category of the Traitor Legions through actual rebellion.  
  https://warhammer40k.fandom.com/wiki/Horus_Heresy
- The Martian machine religion predates the Imperium in its Mechanicum/Cult Mechanicum form, but the presence of that Martian culture must never be projected onto unrelated deep-past human civilisations.  
  https://warhammer40k.fandom.com/wiki/Adeptus_Mechanicus
- The familiar Space Marine **Chapter** framework belongs to the post-Heresy Founding structure rather than being the default organisation of Great Crusade Astartes.  
  https://warhammer40k.fandom.com/wiki/Founding

These anchors are guardrails, not an excuse to force every story into external-canon exposition.

---

## Final governing principle

**Preserve the story that exists before writing the story that could exist.**

Then preserve the era.

Then preserve the people.

Then preserve the mystery.

Only after those obligations are satisfied should the automation make the universe larger.
