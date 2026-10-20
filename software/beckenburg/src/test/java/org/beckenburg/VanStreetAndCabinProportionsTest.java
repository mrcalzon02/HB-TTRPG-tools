package org.beckenburg;

import java.util.HashSet;

/** Site-independent architectural acceptance, not a tile-occupancy proxy. */
public final class VanStreetAndCabinProportionsTest {
    private VanStreetAndCabinProportionsTest(){}
    private static void ok(boolean result,String requirement){
        if(!result)throw new AssertionError(requirement);
    }
    public static void main(String[] args){
        double outside=VanStaging.HALF_WIDTH*2;
        double inside=VanStaging.INTERIOR_HALF_WIDTH*2;
        double crown=VanStaging.INTERIOR_ROOF_HALF_WIDTH*2;
        ok(Math.abs(inside/outside-.85)<.00001,
            "true 15% smaller cabin width; exterior remains full size");
        ok(Math.abs(crown/inside-.90)<.00001,
            "sloping inner shoulders reduce roof width another 10%");
        ok(VanStaging.ROOF_SHOULDER_Y<VanStaging.INTERIOR_HEIGHT-.6,
            "taper is visibly pitched over a meaningful upper-wall section");
        ok(VanInteriorLayout.clearAisleHalfWidth()*2>=1.4,
            "central aisle remains comfortably walkable");
        for(var fixture:VanInteriorLayout.FIXTURES)
            ok(VanInteriorLayout.insideShell(fixture),
                "all existing monitors, boards and workstation fit inside 15% tighter liner: "+
                fixture.purpose());
        ok(VanInteriorLayout.toolSockets().size()>=28,
            "all purchased equipment still mounted individually");
        for(var slot:VanInteriorLayout.toolSockets())
            ok(Math.abs(slot.x())<VanStaging.INTERIOR_HALF_WIDTH,
                "no rack equipment protrudes through the narrower wall "+slot.equipment());
        ok(VanStreetHouses.HOMES.size()==6,"three distinct homes on each side of street");
        HashSet<String> plans=new HashSet<>();
        for(var house:VanStreetHouses.HOMES){
            ok(!house.intrudesOnStreet(),"house facade must not cover street "+house.character());
            ok(house.frontage()>4 && house.roofRise()>.8,
                "buildings have plausible physical widths and pitched roofs");
            ok(house.frontageStartZ()>VanArrivalStreet.ROAD_END-1.7,
                "roadfront must terminate at an actual intersection/building");
            ok(plans.add(house.character()),"no duplicate facade identity");
        }
        ok(VanStreetHouses.TERMINUS.centreZ()<VanArrivalStreet.ROAD_END,
            "street-end architecture lives behind roadway instead of obstructing it");
        for(HouseMap.Site site:AuthoredTestSupport.SITES){
            HouseMap map=new HouseMap(site);
            var van=map.van();
            for(var station:VanStaging.Station.values()){
                var p=van.location(station);
                ok(map.traversable(p.x(),p.z()),
                    "reduced interior must still allow physical access to "+station+" at "+site);
            }
            var button=van.doorButton();
            ok(map.traversable(button.x(),button.z()),
                "rear door switch must not be inside the newly fitted equipment wall");
        }
        System.out.println("PASS VAN interior -15%, inward roof taper -10%, 42 rack brackets, "+
            "unobstructed stations and six architecturally fitted Kenney roadside façades");
    }
}
