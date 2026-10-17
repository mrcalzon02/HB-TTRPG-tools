package org.beckenburg;

/** No guessed pattern may become a verified clue or forge the host's ghost identity. */
public final class FieldJournalTest {
    private static void check(boolean good,String msg){if(!good)throw new AssertionError(msg);}
    public static void main(String[] args){
        FieldJournal book=new FieldJournal();
        check(GhostFieldGuide.shortlist(book).size()==13,"all types initially possible");
        book.set(GhostFieldGuide.Clue.FLOATING,FieldJournal.Status.SEEN,0,9);
        book.set(GhostFieldGuide.Clue.DOOR_TO_TRAVEL,FieldJournal.Status.SEEN,1,12);
        var candidates=GhostFieldGuide.shortlist(book);
        check(candidates.contains(GhostIdentity.Type.BANSHEE),"floating door user includes Banshee");
        check(!candidates.contains(GhostIdentity.Type.WRAITH),"wall-phasing Wraith excluded by door-bound observation");
        book.set(GhostFieldGuide.Clue.PHASE_WALL,FieldJournal.Status.SEEN,2,18);
        check(GhostFieldGuide.shortlist(book).isEmpty(),"mutually exclusive clues are flagged, not silently reconciled");
        book.set(GhostFieldGuide.Clue.DOOR_TO_TRAVEL,FieldJournal.Status.UNKNOWN,1,19);
        check(GhostFieldGuide.shortlist(book).contains(GhostIdentity.Type.WRAITH),"corrected notes restore Wraith");
        book.clear();
        book.set(GhostFieldGuide.Clue.SOLO_ATTACK,FieldJournal.Status.SEEN,1,29);
        book.set(GhostFieldGuide.Clue.PASSIVE_DRAIN,FieldJournal.Status.SEEN,1,32);
        check(GhostFieldGuide.shortlist(book).size()==13,"circumstantial patterns never hard eliminate");
        check(GhostFieldGuide.ordered(book).get(0)==GhostIdentity.Type.DEVIL,
              "isolated attack plus feeding favors Devil in live species profiles");
        FieldJournal.Note n=new FieldJournal.Note(GhostFieldGuide.Clue.PHASE_WALL,FieldJournal.Status.SEEN,2,77);
        check(FieldJournal.Note.decode(n.frame()).equals(n),"bounded shared note roundtrip");
        for(GhostIdentity.Type t:GhostIdentity.Type.values())check(!GhostFieldGuide.reference(t).isBlank(),"reference entry "+t);
        System.out.println("PASS: 13 casebook profiles, hard exclusions, behavioral ranking and shared note frames");
    }
}