package org.beckenburg;

import java.util.List;

/** Real in-engine render projection: only visible hunter bodies receive a label anchor. */
public final class LanHunterNameplateTest {
    private static void ok(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    public static void main(String[] args){
        HouseMap map=new HouseMap();SceneRenderer r=new SceneRenderer();
        double x=map.centerX(4),z=map.centerZ(4);
        r.x=x;r.z=z-2.4;r.yaw=0;r.pitch=-.04;
        var hunter=new SceneRenderer.RemoteBody(x,z,1,0);
        r.drawNetwork(map,List.of(hunter),(SceneRenderer.Apparition)null,1);
        ok(r.teammateNameplate(map,hunter)!=null,"visible teammate has projected head anchor");
        ok(r.teammateNameplate(map,new SceneRenderer.RemoteBody(x,z+19,1,0))==null,
            "distant or obstructed player name suppressed");
        r.yaw=Math.PI; r.drawNetwork(map,List.of(hunter),(SceneRenderer.Apparition)null,1);
        ok(r.teammateNameplate(map,hunter)==null,"off-screen teammate name suppressed");
        r.x=4.5;r.z=4.5;r.yaw=0;r.pitch=0;
        var throughDoor=new SceneRenderer.RemoteBody(4.5,8.5,2,0);
        r.drawNetwork(map,List.of(throughDoor),(SceneRenderer.Apparition)null,1);
        ok(r.teammateNameplate(map,throughDoor)==null,"closed physical door occludes name");
        // No ghost type, apparition state, or ghost input is accepted by the nameplate function.
        System.out.println("PASS: teammate name anchors obey camera frustum, depth and doors");
    }
}
