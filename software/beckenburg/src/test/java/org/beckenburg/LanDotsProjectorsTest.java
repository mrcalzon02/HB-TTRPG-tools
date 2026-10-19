package org.beckenburg;

/** D.O.T.S. uses a real mounted emitter and real ghost action, never a random pass. */
public final class LanDotsProjectorsTest {
    static void ok(boolean good,String reason){if(!good)throw new AssertionError(reason);}
    public static void main(String[] args){
        LanDotsProjectors field=new LanDotsProjectors();
        HouseMap house=new HouseMap();
        double x=house.centerX(4),z=house.centerZ(4);
        var model=field.placeOrRemove(0,4,x,z,EquipmentTiers.Tier.I);
        ok(model.frame().startsWith("DOTS|PLACE|0|4|"),"host sends real physical projector");
        ok(field.all().size()==1,"one deployed projector");
        var pose=new LanGhostSpatial.Pose(4,x+.45,z+.30,90);
        var manifestation=new GhostDomain.Resolution(true,"accepted",
            GhostDomain.Action.MANIFEST,4,50,0,0,true);
        ok(field.passages(GhostIdentity.Type.SPIRIT,manifestation,pose,20).isEmpty(),
            "non-D.O.T.S. ghost cannot produce a false positive");
        ok(field.passages(GhostIdentity.Type.YOKAI,manifestation,pose,20).size()==1,
            "eligible ghost actually manifests inside projector and is recorded");
        ok(field.passages(GhostIdentity.Type.YOKAI,manifestation,pose,21).isEmpty(),
            "same event cannot be spammed as repeated passes");
        var voice=new GhostDomain.Resolution(true,"accepted",GhostDomain.Action.WHISPER,
            4,50,0,0,false);
        ok(field.passages(GhostIdentity.Type.YOKAI,voice,pose,55).isEmpty(),
            "ordinary whispers never create optical silhouettes");
        var otherRoom=new LanGhostSpatial.Pose(5,house.centerX(5),house.centerZ(5),0);
        ok(field.passages(GhostIdentity.Type.YOKAI,manifestation,otherRoom,55).isEmpty(),
            "ghost event outside projector field cannot register");
        boolean denied=false;
        try{field.placeOrRemove(0,4,x+9,z+9,EquipmentTiers.Tier.I);}
        catch(IllegalArgumentException expected){denied=true;}
        ok(denied,"cannot retrieve remote device");
        ok(field.placeOrRemove(0,4,x,z,EquipmentTiers.Tier.I)==null,
            "nearby physical retrieval stops projection");
        ok(field.all().isEmpty(),"light grid cleared after removal");
        System.out.println("PASS: true Tier I D.O.T.S., authored manifestations, no false events and physical retrieval");
    }
}
