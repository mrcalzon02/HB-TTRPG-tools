package org.beckenburg;

/** Real solo scan loop: no fabricated EMF proof merely by standing in the ghost room. */
public final class SoloEnvironmentalEvidenceTest {
    static void ok(boolean good,String message){if(!good)throw new AssertionError(message);}
    public static void main(String[] args){
        HouseMap map=new HouseMap();
        for(long seed:new long[]{172L,173L}){
            InvestigationSession game=new InvestigationSession(map,
                InvestigationSession.Role.OBSERVER,seed);
            int room=game.anchorRoom();
            double x=map.centerX(room),z=map.centerZ(room);
            ok(!game.scan(InvestigationSession.Instrument.EMF,x,z),
                "anchor without an event cannot supply EMF >6");
            ok(game.evidenceCount()==0,"no phantom positive evidence");
            ok(game.scan(InvestigationSession.Instrument.THERMOMETER,x,z),
                "cold or hot paranormal extreme can be measured in solo");
            ok(game.hasEvidence(InvestigationSession.Instrument.THERMOMETER),
                "temperature instrument is a real positive");
            ok(game.scan(InvestigationSession.Instrument.SPIRIT_BOX,x,z),
                "direct response requires nearby entity");
            boolean peaked=false;
            for(int tick=0;tick<120&&game.outcome()==InvestigationSession.Outcome.ACTIVE;tick++){
                game.tick(x,z);
                if(game.scan(InvestigationSession.Instrument.EMF,x,z)){peaked=true;break;}
            }
            ok(peaked,"a real nearby ghost disturbance eventually creates >6 EMF");
            ok(game.evidenceCount()==3,"three positives from actual scans");
        }
        System.out.println("PASS: solo seasonal hot/cold, real ghost-event EMF gate");
    }
}
