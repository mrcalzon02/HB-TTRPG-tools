package org.beckenburg;

import java.util.List;
import java.util.Arrays;

/** Rendered scene must respond to real remote bodies and physical door updates. */
public final class LanWorldRenderTest {
    private static void ok(boolean b,String msg){if(!b)throw new AssertionError(msg);}
    public static void main(String[] args){
        HouseMap map=new HouseMap(); SceneRenderer render=new SceneRenderer();
        render.x=12.5;render.z=9.5;render.yaw=1.3;
        render.drawNetwork(map,List.of(),-1,0);
        int[] baseline=render.pixels().clone();
        render.drawNetwork(map,List.of(new SceneRenderer.RemoteBody(render.x+.88,render.z,1)),-1,0);
        ok(Arrays.equals(baseline,render.pixels()),"nearby teammate cannot occlude first-person camera");
        render.drawNetwork(map,List.of(new SceneRenderer.RemoteBody(14.0,10.3,1)),-1,0);
        ok(!Arrays.equals(baseline,render.pixels()),"teammate visible in perspective scene");
        ok(Arrays.stream(render.pixels()).distinct().count()>110,"real colored raster with materials");
        int[] withTeammate=render.pixels().clone();
        render.drawNetwork(map,List.of(new SceneRenderer.RemoteBody(14.0,10.3,1)),4,1);
        ok(!Arrays.equals(withTeammate,render.pixels()),"host-visible manifest appears");
        map.applyDoorSnapshot("162");
        ok(map.doorOpen(12,6),"remote door state appears in map");
        System.out.println("PASS: network first-person rendering includes 3D teammates, disclosed ghost and synced physical doors");
    }
}
