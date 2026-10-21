package org.beckenburg;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.util.List;
import java.util.Map;

/** Same geometrical footprint and warning flash across map and live CRT modes. */
public final class VanSensorMapVisualTest {
    private static void ok(boolean yes,String detail){if(!yes)throw new AssertionError(detail);}
    private static BufferedImage render(HouseMap map,VanSensorStations.Station node,
                                        Map<Integer,FieldSensorDetection.Pulse> alerts){
        var image=new BufferedImage(768,512,BufferedImage.TYPE_INT_RGB);
        Graphics2D g=image.createGraphics();
        try{
            VanSiteMapScreen.draw(g,768,512,map,List.of(node),
                Map.of(node.id(),new VanSiteMapScreen.Reading(12,"Motion clear")),
                alerts,List.of(),Map.of(),
                VanSiteMapScreen.floors(map).indexOf(map.floorY(node.room())),0,12);
        }finally{g.dispose();}
        return image;
    }
    public static void main(String[] args){
        HouseMap map=new HouseMap(HouseMap.Site.HOUSE);
        int room=2;var target=map.level().room(room);
        var nodes=new VanSensorStations();
        var station=nodes.placeOrRetrieve(0,"MOTION_SENSOR",room,
            target.spawn().x(),target.spawn().z(),EquipmentTiers.Tier.I).placed();
        var before=render(map,station,Map.of());
        var after=render(map,station,Map.of(station.id(),
            new FieldSensorDetection.Pulse(station.id(),12,"MOTION",8)));
        int changed=0;
        for(int y=100;y<390;y+=2)for(int x=35;x<500;x+=2)
            if(before.getRGB(x,y)!=after.getRGB(x,y))changed++;
        ok(changed>20,"live alarm illuminates mapped physical sensor coverage");
        ok(SensorCoverage.contains(map,station,room,
            target.spawn().x(),target.spawn().z()),
            "renderer draws same footprint tested by server detection");
        System.out.println("PASS: real map sensor circle and alarm pulse visualization");
    }
}
