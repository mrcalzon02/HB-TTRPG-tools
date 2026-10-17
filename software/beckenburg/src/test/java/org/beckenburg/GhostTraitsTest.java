package org.beckenburg;

public final class GhostTraitsTest {
    private static void ok(boolean v,String why){if(!v)throw new AssertionError(why);}
    public static void main(String[] args){
        for(GhostIdentity.Type t:GhostIdentity.Type.values()){
            GhostTraits.Profile p=GhostTraits.of(t);
            ok(p.chargePeriod()>0,"charge period: "+t);
            ok(GhostTraits.harm(t,8)>=0,"safe harm: "+t);
        }
        ok(GhostTraits.of(GhostIdentity.Type.WRAITH).canPhase(),"Wraith can cross walls");
        ok(!GhostTraits.of(GhostIdentity.Type.BANSHEE).canPhase(),"floating Banshee still uses doors");
        ok(GhostTraits.of(GhostIdentity.Type.BANSHEE).locomotion()==GhostTraits.Locomotion.FLOAT,"Banshee floats");
        ok(!GhostTraits.saltAffects(GhostIdentity.Type.WRAITH),"Wraith ignores salt");
        ok(GhostTraits.saltAffects(GhostIdentity.Type.SPIRIT),"Spirit steps on salt");
        ok(GhostTraits.gained(GhostIdentity.Type.BANSHEE,6,0)>0,"lone Banshee charges");
        ok(GhostTraits.gained(GhostIdentity.Type.BANSHEE,6,1)==0,"Banshee cannot charge with company");
        ok(GhostTraits.gained(GhostIdentity.Type.DEVIL,6,1)>0,"Devil feeds in company");
        ok(GhostTraits.gained(GhostIdentity.Type.DEVIL,6,0)==0,"Devil cannot feed alone");
        ok(GhostTraits.passiveFear(GhostIdentity.Type.DEVIL,18,1)==1,"drain is observable");
        ok(GhostTraits.passiveFear(GhostIdentity.Type.DEVIL,18,0)==0,"no imaginary victim");
        ok(GhostTraits.harm(GhostIdentity.Type.SHADE,12)==0,"fear-only Shade cannot injure");
        ok(GhostTraits.fear(GhostIdentity.Type.BANSHEE,10)>GhostTraits.fear(GhostIdentity.Type.DEMON,10),"differentiated sanity threat");
        System.out.println("PASS: 13 species profiles, energy feeding, salt mobility and damage identities");
    }
}