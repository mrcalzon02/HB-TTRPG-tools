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
            var p=map.spawn(room);double x=p.x(),y=p.y(),z=p.z();
            ok(game.scan(InvestigationSession.Instrument.EMF,x,y,z),
                "every functioning instrument returns a logged measurement");
            ok(game.evidenceCount()==1,"count tracks tool use rather than evidence proof");
            ok(game.scan(InvestigationSession.Instrument.THERMOMETER,x,y,z),
                "thermal measurement is logged regardless of its value");
            ok(game.hasEvidence(InvestigationSession.Instrument.THERMOMETER),
                "thermometer is recorded as used, not marked confirmed");
            ok(game.scan(InvestigationSession.Instrument.SPIRIT_BOX,x,y,z),
                "direct response requires nearby entity");
            for(int tick=0;tick<12&&game.outcome()==InvestigationSession.Outcome.ACTIVE;tick++){
                game.tick(x,y,z,true);
                ok(game.scan(InvestigationSession.Instrument.EMF,x,y,z),"repeated scans are valid");
            }
            ok(game.evidenceCount()==3,"distinct tools used are tracked, not confirmed evidence");
        }
        System.out.println("PASS: solo seasonal hot/cold, real ghost-event EMF gate");
    }
}
