package org.beckenburg;

/** Real room-threshold material and open/closed-door regression tests. */
public final class LanAcousticsTest {
    static void check(boolean pass, String why) {if(!pass)throw new AssertionError(why);}
    public static void main(String[] args) {
        HouseMap map=new HouseMap();
        check(LanAcoustics.cost(map,4,4)==0,"co-location has no sound loss");
        check(LanAcoustics.cost(map,3,4)==3,"closed partition must attenuate sound");
        check(!LanAcoustics.audible(map,3,4,LanGhostPursuit.Sound.FOOTSTEP),
                "quiet footsteps must not pierce a closed door");
        check(LanAcoustics.audible(map,3,4,LanGhostPursuit.Sound.EQUIPMENT),
                "loud evidence tool may be heard through one closed door");
        var door=AuthoredTestSupport.door(map,3,4);var p=AuthoredTestSupport.side(map,door,3,.7);
        check(map.toggleNearestDoor(p.x(),p.y(),p.z()),"open the actual hall/dining door");
        check(map.doorOpen(door.id()),"the intended portal opened");
        check(LanAcoustics.cost(map,3,4)==1,"open door must transmit footsteps");
        check(LanAcoustics.audible(map,3,4,LanGhostPursuit.Sound.FOOTSTEP),
                "quiet footsteps are now audible through the open threshold");
        check(map.toggleNearestDoor(p.x(),p.y(),p.z()),"close threshold");
        check(LanAcoustics.cost(map,3,4)==3,"closing reestablishes attenuation");
        check(LanAcoustics.cost(map,7,10)>=4,"stone cellar absorbs more sound than normal doors");
        check(LanAcoustics.cost(map,3,10)>LanAcoustics.cost(map,3,4),
                "distance and masonry affect room-to-room audibility");
        check(LanAcoustics.cost(map,12,1)>=2,
            "rear garden sound crosses the physical drawing-room doorway");
        check(LanAcoustics.cost(map,13,14)==Integer.MAX_VALUE,"van safe zone must never be acoustically tracked");
        check(!LanAcoustics.audible(map,4,HouseMap.EXTRACTION_ROOM,LanGhostPursuit.Sound.RITUAL),
                "no sound reveals a hunter inside the safe van");
        check(LanAcoustics.edgeCost(map,7,10)==Integer.MAX_VALUE,
            "nonadjacent cellar-stair shortcut rejected");
        System.out.println("PASS: door-dependent, masonry and exterior acoustic attenuation");
    }
}
