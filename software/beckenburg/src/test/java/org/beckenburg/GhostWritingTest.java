package org.beckenburg;

import java.util.EnumSet;

public final class GhostWritingTest {
    static void ok(boolean value,String reason){if(!value)throw new AssertionError(reason);}
    private static GhostDomain.Resolution event(GhostDomain.Action action,int room,boolean applied){
        return new GhostDomain.Resolution(applied,"test",action,room,80,0,0,false);
    }
    public static void main(String[] args){
        GhostWriting book=new GhostWriting();
        ok(!book.witness(1,11,event(GhostDomain.Action.DISTURB,4,true)),
            "cannot write in an undeployed book");
        book.place(0,4,10);
        ok(!book.witness(1,11,event(GhostDomain.Action.DISTURB,5,true)),
            "distant action cannot touch the book");
        ok(!book.witness(1,11,event(GhostDomain.Action.DISTURB,4,false)),
            "rejected action cannot author writing");
        ok(!book.witness(1,11,event(GhostDomain.Action.WHISPER,4,true)),
            "wrong action cannot write");
        ok(book.witness(4,15,event(GhostDomain.Action.DISTURB,4,true)),
            "authorized local disturbance marks the page");
        ok(book.page()!=null&&book.page().room()==4,"writing stays on correct physical book");
        ok(!book.witness(6,18,event(GhostDomain.Action.SIGNATURE,4,true)),
            "one event cannot overwrite existing subtype");
        ok(book.inspect(4).equals(book.page().description()),"visible page and record agree");
        ok(!book.remove(1,5)&&book.placed(),"remote retrieval denied");
        ok(book.remove(1,4)&&!book.placed(),"owner-independent same-room retrieval allowed");
        EnumSet<GhostWriting.Style> styles=EnumSet.noneOf(GhostWriting.Style.class);
        for(int seed=0;seed<180;seed++){
            book.place(0,4,10);
            ok(book.witness(seed,15,event(GhostDomain.Action.MANIFEST,4,true)),
                "all styles originate from real authorized interactions");
            styles.add(book.page().style());
        }
        ok(styles.size()==3,"child drawings, frantic scrawls and ritual circles all reachable");
        for(GhostIdentity.Type type:GhostIdentity.Type.values()){
            for(int seed=0;seed<25;seed++){
                book.place(0,4,10);
                ok(book.witness(seed,15,event(GhostDomain.Action.MANIFEST,4,true),type),
                    "ghost must be allowed to author its compatible styles");
                ok(GhostEvidenceProfile.writing(type,book.page().style()),
                    "journal compatibility must agree with actual rendered writing");
            }
        }
        System.out.println("PASS: genuine room-authored writing and all three readable variants");
    }
}
