package org.beckenburg;
public final class LanDotsProjectorsTest {
    static void ok(boolean b,String text){if(!b)throw new AssertionError(text);}
    public static void main(String[] args){
        HouseMap map=new HouseMap();
        LanDotsProjectors dots=new LanDotsProjectors();
        double x=map.centerX(4),z=map.centerZ(4);
        dots.placeOrRemove(0,4,x,z,EquipmentTiers.Tier.I);
        var ghost=new LanGhostSpatial.Pose(4,x+.4,z+.3,180);
        ok(dots.illuminate(ghost,20).get(0).frame().startsWith("DOTS|ILLUMINATE|4|"),
            "host-projected geometry, not evidence");
        ok(dots.illuminate(ghost,21).isEmpty(),"bounded network cadence");
        ok(dots.illuminate(ghost,22).size()==1,"stationary entity still interrupts light");
        ok(dots.illuminate(new LanGhostSpatial.Pose(5,map.centerX(5),map.centerZ(5),0),24)
            .isEmpty(),"out-of-room ghost cannot interrupt light");
        ok(dots.illuminate(new LanGhostSpatial.Pose(4,x+5,z+4,0),26).isEmpty(),
            "out-of-range entity not depicted");
        ok(dots.illuminate(null,28).isEmpty(),"no fabricated entity");
        ok(!GhostFieldGuide.Clue.DOTS_PATTERN.exclusionSafe,
            "D.O.T.S. cannot automatically eliminate ghost species");
        for(GhostIdentity.Type type:GhostIdentity.Type.values())
            ok(GhostEvidenceProfile.compatible(type,GhostFieldGuide.Clue.DOTS_PATTERN),
                "no species qualification gate");
        boolean remote=false;
        try{dots.placeOrRemove(0,4,x+8,z+8,EquipmentTiers.Tier.I);}
        catch(IllegalArgumentException e){remote=true;}
        ok(remote,"physical retrieval enforcement");
        dots.placeOrRemove(0,4,x,z,EquipmentTiers.Tier.I);
        ok(dots.illuminate(ghost,30).isEmpty(),"removed projector is dark");
        System.out.println("PASS: physical D.O.T.S. without automatic evidence gating");
    }
}
