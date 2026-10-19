package org.beckenburg;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.Set;

/** Regression for the ten Ancient variants: inherited AI, new evidence, green art
 * and precisely doubled ritual length, without extra D.O.T.S. species.
 */
public final class AncientGhostVariantsTest {
    private static void ok(boolean value,String reason){
        if(!value)throw new AssertionError(reason);
    }
    public static void main(String[] args){
        var roster=GhostIdentity.Type.values();
        ok(roster.length==23,"13 originals plus 10 Ancient variants");
        ok(Arrays.stream(roster).filter(GhostIdentity.Type::ancient).count()==10,
            "Exactly ten ancients must exist");
        var unique=new HashSet<Set<HardEvidenceQuota.Family>>();
        for(var species:roster){
            var triple=HardEvidenceQuota.signature(species);
            ok(triple.size()==3&&unique.add(triple),"Distinct three-evidence signature "+species);
            var easy=new HardEvidenceQuota(species,HardEvidenceQuota.Level.EASY,19);
            var medium=new HardEvidenceQuota(species,HardEvidenceQuota.Level.MEDIUM,19);
            var hard=new HardEvidenceQuota(species,HardEvidenceQuota.Level.DEATH_WISH,19);
            ok(easy.allowance()>=4&&medium.allowance()==3&&hard.allowance()==1,
                "Easy/Medium/Death Wish evidence guarantee for "+species);
            ok(medium.families().equals(triple),"Medium shows exactly the authored triple");
            ok(easy.families().containsAll(triple),"Every selected signal is producible");
            if(species.ancient()){
                var parent=species.baseType();
                ok(!parent.ancient(),"Ancient variant must have an original parent");
                ok(species.rite()==parent.rite()&&species.behavior()==parent.behavior(),
                    "Ancient shares parent's ritual and behavior identity");
                ok(GhostTraits.of(species).equals(GhostTraits.of(parent)),
                    "Inherited movement, recharge, UV and physical anatomy");
                ok(GhostBehavior.profile(species).equals(GhostBehavior.profile(parent)),
                    "Inherited action energy, threat and cadence");
                ok(GhostFrenzy.profile(species).equals(GhostFrenzy.profile(parent)),
                    "Inherited Frenzy cost, duration and attacks");
                ok(GhostTraits.movementPercent(species)==GhostTraits.movementPercent(parent),
                    "Inherited sprint movement");
                ok(!triple.equals(HardEvidenceQuota.signature(parent)),
                    "Ancient must not share its parent's evidence triple");
                ok(triple.stream().anyMatch(f->f.ordinal()>=HardEvidenceQuota.Family.ECTOPLASM.ordinal()),
                    "Ancient signature must use the additional modeled evidence instruments");
                ok(!GhostEvidenceProfile.dotsVisible(species),
                    "No extra D.O.T.S. species: original three only");
                var parentCase=new LanCase(4);
                parentCase.configure(parent,true);
                var ancientCase=new LanCase(4);
                ancientCase.configure(species,true);
                ok(ancientCase.requiredRitualTicks()==parentCase.requiredRitualTicks()*2,
                    "Ancient ritual takes exactly twice as many host ticks");
            }
        }
        ok(unique.size()==23,"All ghost triples globally distinct");
        ok(Arrays.stream(roster).filter(GhostEvidenceProfile::dotsVisible).count()==3,
            "Wraith, Shade and Specter remain the only D.O.T.S. ghosts");

        var renderer=new SceneRenderer();
        var map=new HouseMap();
        double gx=map.centerX(4),gz=map.centerZ(4);
        var normal=new SceneRenderer.Apparition(gx,gz,LanGhostAnimation.Phase.LURK,0,0,false);
        var ancient=new SceneRenderer.Apparition(gx,gz,LanGhostAnimation.Phase.LURK,0,0,false,true);
        ok(!normal.greenTint()&&ancient.greenTint(),"Ancient flag stored in sprite pose");
        ok(ancient.x()==normal.x()&&ancient.z()==normal.z(),
            "Tint reuses parent's identical physical apparition geometry");

        // Use the actual shipped directional alpha sprite to check rendering,
        // not a hand-drawn test shape or an additional Ancient texture file.
        int[] plain=new int[SceneRenderer.W*SceneRenderer.H];
        int[] green=new int[plain.length];
        double[] plainDepth=new double[plain.length],greenDepth=new double[plain.length];
        Arrays.fill(plainDepth,Double.POSITIVE_INFINITY);
        Arrays.fill(greenDepth,Double.POSITIVE_INFINITY);
        DirectionalSprites.draw(plain,plainDepth,0,0,0,0,0,4,0,
            "banshee",1.95,1.16,0,255,true,SceneRenderer.W,SceneRenderer.H,153.0,false);
        DirectionalSprites.draw(green,greenDepth,0,0,0,0,0,4,0,
            "banshee",1.95,1.16,0,255,true,SceneRenderer.W,SceneRenderer.H,153.0,true);
        long plainRed=0,greenRed=0,plainGreen=0,greenGreen=0;
        int opaque=0;
        for(int i=0;i<plain.length;i++)if(plainDepth[i]<Double.POSITIVE_INFINITY){
            opaque++;
            plainRed+=(plain[i]>>16)&255;
            greenRed+=(green[i]>>16)&255;
            plainGreen+=(plain[i]>>8)&255;
            greenGreen+=(green[i]>>8)&255;
        }
        ok(opaque>100,"Both forms draw the existing directional sprite");
        ok(greenRed<plainRed&&greenGreen>plainGreen,
            "Ancient sprite is visually green-tinted rather than duplicated");
        System.out.println("PASS 23 ghosts, 10 inherited Ancients, green sprites, unique triples and 2x rituals");
    }
}
