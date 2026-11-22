# Fictional scene knowledge, memory and theory of mind

This portable source-annotated importer extends the existing Character Information System and interpersonal-theory-of-mind skill. It does not replace canon, the directional theory-of-mind record schema, the BDO workbook or the Nowhere King episode ledger.

A model/writer must extract dialogue turns and review them against canon. For each utterance, record speaker, recipient, **actual listeners**, text, claim attribution, source and any explicit presence observations. For subjective beliefs, supply a separate holder-specific belief update. A character may hear a claim without believing it; an absent character learns nothing. The correction record preserves the earlier false assumption and identifies who corrected whom.

Run offline: 
```bash
python skills/interpersonal-theory-of-mind-modeling/scene_memory.py apply --scene skills/interpersonal-theory-of-mind-modeling/autumn-conversation.json --output scene-ledger.json
python skills/interpersonal-theory-of-mind-modeling/scene_memory.py recall --ledger scene-ledger.json --actor C --cue "natural curls"
python -m unittest discover -s skills/interpersonal-theory-of-mind-modeling -p 'test_scene_memory.py' -v
```

Subsequent scenes use `--ledger PREVIOUS.json --output NEW.json`; never overwrite historical snapshots. Replay of identical source is idempotent; reusing the scene ID for altered material fails closed. Original utterances, sources, belief transitions, recall hooks and observed participants remain in the ledger. Recall search returns **candidates**, not perfect or scientifically predicted human memory.

The synthetic autumn scene includes A, B and C conversing and D absent. A likes the cold, assumes B curls hair deliberately, B corrects the assumption and likes sweaters, C hears and remembers the correction. A and C receive *separate*, explicitly annotated beliefs; D receives none. The importer does not conclude from B's claim alone that the objective biological cause has been independently proven.

## Workbook / episode mapping (read-only)

| Scene ledger | Beneath Dappled Oaks | Nowhere King |
| --- | --- | --- |
| actors, explicit visible attendees | Characters; Memorie(s)_Events, witnesses | ensemble knowledge and witness evidence |
| memories and recall hooks | `Memories_Events` (Memory ID, Character ID, Chapter, Linked People, Emotional Valence, Endurance, Freshness, Reinforcement, Trigger) | `11-ACTIVE-CONTINUITY-STATE.md` episode diff |
| speaker-attributed claims | `Secrets_Warnings` (Source Person, Witnesses, Information, Credibility, Belief, Secrecy) | observed, reported, suspected, believed and misinformed states |
| holder-specific belief updates | `Personality_Web` (Observer→Subject, prior state, confidence, evidence) | directional person-model |
| record lineage and changes | `Chapter_Touch_Log` (old/new, why it matters) | active state + rolling horizon |

The original `Beneath_Dappled_Oaks_Character_Continuity_Catalog.xlsx` and its formulas/validation are left untouched. Its available coverage may lag the canon. Do not overwrite it or claim a successful round-trip without an authorized adapter and an actual verification. Likewise the Nowhere King continuity ledgers remain authoritative. This is a reusable **normalized scene-event reducer**, not yet a qualified LCI/Windows native tool or an automatic natural-language prose extractor. A model should build annotations, a continuity reviewer should approve them, and only then should the reducer produce a candidate long-memory delta. The parent skill's provenance and terms apply.
