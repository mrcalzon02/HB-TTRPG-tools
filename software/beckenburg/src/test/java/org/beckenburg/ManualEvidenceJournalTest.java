package org.beckenburg;

import java.util.Arrays;

/** Player checkmarks filter a fixed ghost roster, never a hidden host species. */
public final class ManualEvidenceJournalTest {
    static void ok(boolean condition,String why){if(!condition)throw new AssertionError(why);}
    public static void main(String[] args){
        FieldJournal journal=new FieldJournal();
        ok(GhostFieldGuide.shortlist(journal).size()==13,"all 13 ghost names initially possible");
        var emf=GhostFieldGuide.Clue.EMF_OVER_SIX;
        var zero=GhostFieldGuide.Clue.EMF_SUPPRESSION;
        journal.set(emf,FieldJournal.Status.SEEN,0,1);
        ok(!GhostFieldGuide.remainsPossible(GhostIdentity.Type.SHADE,journal),
           "high EMF manually greys Shade");
        ok(GhostFieldGuide.remainsPossible(GhostIdentity.Type.SPIRIT,journal),
           "high EMF leaves other matching ghosts visible");
        journal.set(emf,FieldJournal.Status.UNKNOWN,0,2);
        ok(GhostFieldGuide.shortlist(journal).size()==13,
           "unticking restores ghosts without rerunning a scan");
        journal.set(zero,FieldJournal.Status.SEEN,1,3);
        ok(GhostFieldGuide.shortlist(journal).size()==1
            &&GhostFieldGuide.shortlist(journal).contains(GhostIdentity.Type.SHADE),
            "suppressed field narrows to Shade by published profile");
        journal.set(emf,FieldJournal.Status.SEEN,0,4);
        ok(GhostFieldGuide.shortlist(journal).isEmpty(),
            "contradictory ticks show zero possible ghosts without correcting player");
        ok(journal.status(zero)==FieldJournal.Status.SEEN
            &&journal.status(emf)==FieldJournal.Status.SEEN,
            "contradictions never delete the user's conclusions");
        journal.clear();
        journal.set(GhostFieldGuide.Clue.EXTREME_HEAT,FieldJournal.Status.SEEN,2,5);
        ok(!GhostFieldGuide.remainsPossible(GhostIdentity.Type.SPIRIT,journal)
            &&GhostFieldGuide.remainsPossible(GhostIdentity.Type.DEMON,journal),
            "heat checklist uses same polarity as live ghost simulation");
        journal.clear();
        journal.set(GhostFieldGuide.Clue.WRITING_CHILD,FieldJournal.Status.SEEN,2,7);
        ok(GhostFieldGuide.remainsPossible(GhostIdentity.Type.BANSHEE,journal)
           &&!GhostFieldGuide.remainsPossible(GhostIdentity.Type.DEMON,journal),
           "childlike drawings have defined candidate ghost families");
        journal.set(GhostFieldGuide.Clue.WRITING_RITUAL,FieldJournal.Status.SEEN,2,8);
        ok(GhostFieldGuide.remainsPossible(GhostIdentity.Type.POSSESSIVE,journal),
           "multiple writing styles can overlap without magical one-species codes");
        journal.clear();
        journal.set(GhostFieldGuide.Clue.GHOST_WRITING,FieldJournal.Status.SEEN,0,15);
        ok(GhostFieldGuide.remainsPossible(GhostIdentity.Type.SHADE,journal)
            &&!GhostFieldGuide.remainsPossible(GhostIdentity.Type.YOKAI,journal),
            "generic ghost-writing tick actually greys non-writer species");
        journal.clear();
        for(GhostIdentity.Type type:GhostIdentity.Type.values()){
            boolean writer=GhostEvidenceProfile.availableWriting(type).length>0;
            ok(GhostEvidenceProfile.compatible(type,GhostFieldGuide.Clue.GHOST_WRITING)==writer,
                "manual checklist and physical writing producer agree for "+type);
            ok(GhostEvidenceProfile.compatible(type,GhostFieldGuide.Clue.EXTREME_COLD)
                !=GhostEvidenceProfile.compatible(type,GhostFieldGuide.Clue.EXTREME_HEAT),
                "each species has one consistent thermal tendency "+type);
        }
        ok(Arrays.stream(GhostFieldGuide.activeClues()).noneMatch(c->c.name().startsWith("COLD_ANCHOR")),
           "rejected synthetic evidence subtypes remain hidden");
        ok(GhostFieldGuide.activeClues().length>=18,
           "manual checklist covers equipment, writing subtypes and behavior");
        System.out.println("PASS: manually ticked evidence greys ghost names; undo/contradiction never verifies");
    }
}
