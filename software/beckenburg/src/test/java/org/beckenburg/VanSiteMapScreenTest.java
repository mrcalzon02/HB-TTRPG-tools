package org.beckenburg;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.util.Map;

/** Map-level graphics smoke: actual authored rooms, active stations, and floors. */
public final class VanSiteMapScreenTest {
    private static void ok(boolean yes,String msg){if(!yes)throw new AssertionError(msg);}
    public static void main(String[] args){
        HouseMap map=new HouseMap();
        var rooms=map.level().rooms().stream().filter(r->!r.outside()).toList();
        ok(!VanSiteMapScreen.floors(map).isEmpty(),"authored elevations available");
        var r=rooms.get(0);
        VanSensorStations nodes=new VanSensorStations();
        var thermal=nodes.placeOrRetrieve(0,"THERMAL_BEACON",r.id(),
            r.spawn().x(),r.spawn().z(),EquipmentTiers.Tier.I).placed();
        var emf=nodes.placeOrRetrieve(0,"EMF_ARRAY",r.id(),
            r.spawn().x()+1,r.spawn().z(),EquipmentTiers.Tier.I).placed();
        BufferedImage image=new BufferedImage(768,512,BufferedImage.TYPE_INT_RGB);
        Graphics2D g=image.createGraphics();
        try{
            VanSiteMapScreen.draw(g,768,512,map,nodes.all(),Map.of(
                thermal.id(),new VanSiteMapScreen.Reading(50,"Air 4.1 deg C"),
                emf.id(),new VanSiteMapScreen.Reading(50,"EMF 9/10")
            ),0,0,50);
        }finally{g.dispose();}
        int nonBlank=0,first=image.getRGB(0,0);
        for(int y=80;y<450;y+=8)for(int x=40;x<740;x+=8)
            if(image.getRGB(x,y)!=first)nonBlank++;
        ok(nonBlank>1000,"real monitor renders map and dynamic sensor readouts");
        ok(image.getWidth()==768&&image.getHeight()==512,"large map texture");
        System.out.println("PASS: large architectural van map and live station readouts");
    }
}
