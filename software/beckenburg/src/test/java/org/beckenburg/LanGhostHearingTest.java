package org.beckenburg;

/** Test real house thresholds, sound direction, ghost privacy and output synthesis. */
public final class LanGhostHearingTest {
    static void ok(boolean b,String label){if(!b)throw new AssertionError(label);}
    static void bad(String frame){
        try{LanGhostHearing.decode(frame);throw new AssertionError("accepted malformed frame");}
        catch(IllegalArgumentException expected){}
    }
    public static void main(String[] args){
        HouseMap map=new HouseMap();
        double x=map.centerX(4),z=map.centerZ(4);
        LanGhostSpatial.Pose ghost=new LanGhostSpatial.Pose(4,x,z,0);
        var event=LanGhostHearing.project(map,ghost,4,x,z+2,LanGhostPursuit.Sound.FOOTSTEP,10);
        ok(event!=null&&event.direction()==LanGhostHearing.Direction.AHEAD
            &&event.strength()==LanGhostHearing.Strength.LOUD,"forward loud footsteps");
        ok(LanGhostHearing.decode(event.frame()).equals(event),"bounded codec roundtrip");
        ok(LanGhostHearing.project(map,ghost,4,x+2,z,LanGhostPursuit.Sound.DOOR,11)
            .direction()==LanGhostHearing.Direction.LEFT,"left");
        ok(LanGhostHearing.project(map,ghost,4,x-2,z,LanGhostPursuit.Sound.DOOR,11)
            .direction()==LanGhostHearing.Direction.RIGHT,"right");
        ok(LanGhostHearing.project(map,ghost,4,x,z-2,LanGhostPursuit.Sound.DOOR,11)
            .direction()==LanGhostHearing.Direction.BEHIND,"behind");
        ok(LanGhostHearing.project(map,new LanGhostSpatial.Pose(4,x,z,90),4,x,z+2,
            LanGhostPursuit.Sound.DOOR,11).direction()==LanGhostHearing.Direction.RIGHT,"rotated listener");
        var door=AuthoredTestSupport.door(map,4,3);
        var listener=AuthoredTestSupport.side(map,door,4,.8);var source=AuthoredTestSupport.side(map,door,3,.8);
        var atDoor=new LanGhostSpatial.Pose(4,listener.x(),listener.y(),listener.z(),0);
        double nx=source.x(),nz=source.z();
        ok(LanGhostHearing.project(map,atDoor,3,nx,nz,LanGhostPursuit.Sound.FOOTSTEP,10)==null,
            "closed door attenuates a footstep");
        ok(map.toggleNearestDoor(listener.x(),listener.y(),listener.z()),"door can be opened");
        ok(LanGhostHearing.project(map,atDoor,3,nx,nz,LanGhostPursuit.Sound.FOOTSTEP,11)!=null,
            "open threshold permits faint footstep");
        ok(LanGhostHearing.project(map,ghost,HouseMap.EXTRACTION_ROOM,
            map.centerX(HouseMap.EXTRACTION_ROOM),map.centerZ(HouseMap.EXTRACTION_ROOM),
            LanGhostPursuit.Sound.RITUAL,11)==null,"safe van never leaks");
        ok(LanGhostHearing.project(map,ghost,4,Double.NaN,z,LanGhostPursuit.Sound.DOOR,11)==null,
            "invalid source rejected");
        ok(LanGhostHearing.project(map,ghost,4,nx,nz,LanGhostPursuit.Sound.DOOR,11)==null,
            "forged source room rejected");
        for(String s:new String[]{"GHEAR|FOOTSTEP|RIGHT|CLOSE|6","GHEAR|FOOTSTEP|NORTH|LOUD|6",
            "GHEAR|FOOTSTEP|LEFT|LOUD|-1","GHEAR|FOOTSTEP|LEFT|LOUD|2|PRIVATE"})bad(s);
        ok(event.frame().split("\\|").length==5,"no source location or hunter ID in packet");
        for(var cue:new LanSound.Cue[]{LanSound.Cue.DOOR,LanSound.Cue.EQUIPMENT,LanSound.Cue.RITUAL})
            ok(LanAudio.synthesize(new LanSound.CueEvent(cue,0,65,11)).length>3000,
                "distinct deterministic PCM for "+cue);
        System.out.println("PASS: door-sensitive human ghost hearing, direction, privacy, codec and audio");
    }
}
