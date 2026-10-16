package org.beckenburg;

import java.util.Arrays;
import java.util.List;

/** A moving apparition must redraw at actual coordinates, without room-center snapping. */
public final class LanApparitionRenderTest {
    private static void ok(boolean value,String msg){if(!value)throw new AssertionError(msg);}
    public static void main(String[] args){
        HouseMap map=new HouseMap();SceneRenderer r=new SceneRenderer();
        r.x=map.centerX(4);r.z=map.centerZ(4)-2.4;r.yaw=0;r.pitch=-.04;
        r.drawNetwork(map,List.of(),(SceneRenderer.Apparition)null,1);
        int[] none=r.pixels().clone();
        double z=map.centerZ(4),x=map.centerX(4);
        r.drawNetwork(map,List.of(),new SceneRenderer.Apparition(x,z),1);
        int[] center=r.pixels().clone();
        ok(!Arrays.equals(none,center),"visible ghost changes scene");
        r.drawNetwork(map,List.of(),new SceneRenderer.Apparition(x+.7,z),1);
        ok(!Arrays.equals(center,r.pixels()),"moving apparition rendered from host coordinates");
        r.drawNetwork(map,List.of(),(SceneRenderer.Apparition)null,1);
        ok(Arrays.equals(none,r.pixels()),"hidden state completely removes apparition");
        System.out.println("PASS: network renderer places moving specter at spatial host pose and clears hidden ghost");
    }
}
