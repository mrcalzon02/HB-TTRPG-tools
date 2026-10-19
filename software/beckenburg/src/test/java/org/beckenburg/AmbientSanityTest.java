package org.beckenburg;

/** Environmental stress follows world state and remains distinct from ghost powers. */
public final class AmbientSanityTest {
    static void ok(boolean passed,String description){
        if(!passed)throw new AssertionError(description);
    }
    static int total(AmbientSanity drain,int seat,int occupancy,boolean lit,boolean ghost,
            GhostTraits.Charge type){
        int result=0;
        for(int tick=0;tick<300;tick++)
            result+=drain.advance(seat,true,occupancy,lit,ghost,type);
        return result;
    }
    public static void main(String[] args){
        int lit=total(new AmbientSanity(),0,1,true,false,GhostTraits.Charge.AMBIENT);
        int dark=total(new AmbientSanity(),0,1,false,false,GhostTraits.Charge.AMBIENT);
        int haunted=total(new AmbientSanity(),0,1,false,true,GhostTraits.Charge.PRESENCE);
        int together=total(new AmbientSanity(),0,2,true,false,GhostTraits.Charge.AMBIENT);
        ok(lit>0&&dark>lit&&haunted>dark,"solitude, darkness and ghost pressure stack");
        ok(together==0,"company in lit room averts ambient isolation pressure");
        AmbientSanity reset=new AmbientSanity();
        for(int i=0;i<299;i++)reset.advance(1,true,1,true,false,GhostTraits.Charge.AMBIENT);
        reset.advance(1,false,0,false,false,GhostTraits.Charge.AMBIENT);
        ok(reset.advance(1,true,1,true,false,GhostTraits.Charge.AMBIENT)==0,
            "leaving an investigation room clears residual dread");
        int alone=total(new AmbientSanity(),2,1,false,true,GhostTraits.Charge.ISOLATION);
        ok(alone>dark,"isolation-feeding ghost increases solitary darkness pressure");
        System.out.println("PASS: per-seat isolation, darkness, proximity, and baseline sanity");
    }
}
