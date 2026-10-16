package org.beckenburg;

/** Real room-threshold material and open/closed-door regression tests. */
public final class LanAcousticsTest {
    static void check(boolean pass, String why) {if(!pass)throw new AssertionError(why);}
    public static void main(String[] args) {
        HouseMap map=new HouseMap();
        check(LanAcoustics.cost(map,4,4)==0,"co-location has no sound loss");
        check(LanAcoustics.cost(map,4,5)==3,"closed partition must attenuate sound");
        check(!LanAcoustics.audible(map,4,5,LanGhostPursuit.Sound.FOOTSTEP),
                "quiet footsteps must not pierce a closed door");
        check(LanAcoustics.audible(map,4,5,LanGhostPursuit.Sound.EQUIPMENT),
                "loud evidence tool may be heard through one closed door");
        check(map.toggleNearestDoor(15.3,9.5),"open the actual hall/kitchen door");
        check(map.doorOpen(16,9),"the intended portal opened");
        check(LanAcoustics.cost(map,4,5)==1,"open door must transmit footsteps");
        check(LanAcoustics.audible(map,4,5,LanGhostPursuit.Sound.FOOTSTEP),
                "quiet footsteps are now audible through the open threshold");
        check(map.toggleNearestDoor(15.3,9.5),"close threshold");
        check(LanAcoustics.cost(map,4,5)==3,"closing reestablishes attenuation");
        check(LanAcoustics.cost(map,7,10)>=4,"stone cellar absorbs more sound than normal doors");
        check(LanAcoustics.cost(map,4,10)>LanAcoustics.cost(map,4,5),
                "distance and masonry affect room-to-room audibility");
        check(LanAcoustics.cost(map,12,13)==1,"open exterior paths transmit sound directly");
        check(LanAcoustics.cost(map,13,14)==Integer.MAX_VALUE,"van safe zone must never be acoustically tracked");
        check(!LanAcoustics.audible(map,4,HouseMap.EXTRACTION_ROOM,LanGhostPursuit.Sound.RITUAL),
                "no sound reveals a hunter inside the safe van");
        check(LanAcoustics.edgeCost(map,4,10)==Integer.MAX_VALUE,"nonadjacent shortcut rejected");
        System.out.println("PASS: door-dependent, masonry and exterior acoustic attenuation");
    }
}
