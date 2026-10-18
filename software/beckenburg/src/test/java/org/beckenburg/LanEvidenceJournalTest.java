package org.beckenburg;

/** Every sample, tool provenance, replay bounds and protocol guards. */
public final class LanEvidenceJournalTest {
    static void ok(boolean yes,String reason){if(!yes)throw new AssertionError(reason);}
    static void reject(Runnable operation){
        try{operation.run();throw new AssertionError("invalid casefile accepted");}
        catch(IllegalArgumentException expected){}
    }
    public static void main(String[] args){
        LanEvidenceJournal journal=new LanEvidenceJournal();
        var weak=new LanCase.Report(true,"INCONCLUSIVE EMF in 14 - EMF baseline");
        var first=LanEvidenceJournal.Entry.decode(journal.record(1,0,14,LanCase.Tool.EMF,weak));
        ok(first.seat()==0&&first.room()==14&&first.finding()==LanEvidenceJournal.Finding.INCONCLUSIVE,"source retained");
        ok(journal.record(2,0,14,LanCase.Tool.EMF,weak)!=null,"repeated measurement must be logged");
        ok(journal.snapshot().size()==2,"no silently discarded repeat");
        var uv=LanEvidenceJournal.Entry.decode(journal.recordDevice(4,0,4,"UV_LAMP",
            LanEvidenceJournal.Finding.INCONCLUSIVE,"No trace under UV"));
        ok(uv.tool().equals("UV_LAMP"),"supplementary instrument visible in the log");
        var book=LanEvidenceJournal.Entry.decode(journal.recordDevice(8,0,4,"GHOST_WRITING_BOOK",
            LanEvidenceJournal.Finding.CONFIRMED,"Childlike figures on the page"));
        ok(book.tool().equals("GHOST_WRITING_BOOK"),"book observation logged");
        var strong=new LanCase.Report(true,"CONFIRMED EMF in 4 - EMF level 5");
        ok(LanEvidenceJournal.Entry.decode(journal.record(11,1,4,LanCase.Tool.EMF,strong)).finding()
                ==LanEvidenceJournal.Finding.CONFIRMED,"confirmation preserved");
        ok(LanEvidenceJournal.Entry.decode(journal.record(12,5,4,LanCase.Tool.EMF,strong)).seat()==5,
                "sixth hunter is a legitimate evidence author");
        reject(()->journal.record(12,6,4,LanCase.Tool.EMF,strong));
        reject(()->journal.record(12,0,4,LanCase.Tool.EMF,new LanCase.Report(false,"rejected")));
        reject(()->LanEvidenceJournal.Entry.decode("CASEFILE|5|0|1|EMF|CONFIRMED|spoof|extra"));
        reject(()->LanEvidenceJournal.Entry.decode("CASEFILE|5|6|1|EMF|CONFIRMED|spoof"));
        for(int i=0;i<LanEvidenceJournal.CAPACITY+12;i++)
            journal.record(i*12+24,2,i%HouseMap.ROOM_COUNT,LanCase.Tool.SPIRIT_BOX,
                    new LanCase.Report(true,"INCONCLUSIVE SPIRIT_BOX scan "+i));
        ok(journal.snapshot().size()==LanEvidenceJournal.CAPACITY,"ring bounded");
        ok(LanEvidenceJournal.Entry.decode(journal.snapshot().get(0)).tick()==24+12*12,"oldest notes evicted");
        System.out.println("PASS: bounded casefile provenance and protocol");
    }
}
