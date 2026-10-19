package org.beckenburg;

import java.util.List;
import java.util.Arrays;

/** Rendered scene must respond to real remote bodies and physical door updates. */
public final class LanWorldRenderTest {
    private static void ok(boolean b,String msg){if(!b)throw new AssertionError(msg);}
    public static void main(String[] args){
        HouseMap map=new HouseMap(); SceneRenderer render=new SceneRenderer();
        render.x=map.centerX(4);render.z=map.centerZ(4);render.yaw=1.3;
        render.drawNetwork(map,List.of(),-1,0);
        int[] baseline=render.pixels().clone();
        render.drawNetwork(map,List.of(new SceneRenderer.RemoteBody(render.x+.88,render.z,1)),-1,0);
        ok(Arrays.equals(baseline,render.pixels()),"nearby teammate cannot occlude first-person camera");
        render.drawNetwork(map,List.of(new SceneRenderer.RemoteBody(render.x+1.50,render.z+.8,1)),-1,0);
        ok(!Arrays.equals(baseline,render.pixels()),"teammate visible in perspective scene");
        ok(Arrays.stream(render.pixels()).distinct().count()>110,"real colored raster with materials");
        // Host-supplied apparition must be in front of the camera, not at its
        // exact position; the old room-center fallback overlapped the viewpoint.
        render.x=map.centerX(4);render.z=map.centerZ(4)-2.4;render.yaw=0;
        render.drawNetwork(map,List.of(),(SceneRenderer.Apparition)null,1);
        int[] hidden=render.pixels().clone();
        render.drawNetwork(map,List.of(),
            new SceneRenderer.Apparition(map.centerX(4),map.centerZ(4)),1);
        ok(!Arrays.equals(hidden,render.pixels()),"host-visible manifest appears");
        ok(map.openDoorBetweenRooms(4,3),"host opens real parlour doorway");
        HouseMap remote=new HouseMap();
        remote.applyDoorSnapshot(map.doorSnapshot());
        ok(remote.doorOpen(18,30),"remote door state appears at architectural socket");
        System.out.println("PASS: network first-person rendering includes 3D teammates, disclosed ghost and synced physical doors");
    }
}
