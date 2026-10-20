package org.beckenburg;

import java.util.*;

/** Pixel verification of the shipped geometry and actual switch/window rendering. */
public final class LevelRenderAcceptanceTest {
    private static void check(boolean ok,String message){if(!ok)throw new AssertionError(message);}
    private static long brightness(int[] pixels){long sum=0;for(int p:pixels)sum+=((p>>16)&255)+((p>>8)&255)+(p&255);return sum;}
    private static int changed(int[] a,int[] b){int n=0;for(int i=0;i<a.length;i++)if(a[i]!=b[i])n++;return n;}
    public static void main(String[] args){
        for(var site:List.of(HouseMap.Site.HOUSE,HouseMap.Site.FARMHOUSE,HouseMap.Site.SCHOOL)){
            HouseMap map=new HouseMap(site);SceneRenderer scene=new SceneRenderer();scene.roomLights=new RoomLighting();scene.lamp=false;
            for(var p:map.level().portals())if(p.door())map.openDoorBetweenRooms(p.a(),p.b());
            long time=System.nanoTime();int views=0;
            for(var r:map.level().rooms())if(!r.outside()){
                scene.x=r.spawn().x();scene.z=r.spawn().z();scene.eyeHeight=r.y()+1.62;
                scene.yaw=Math.atan2(r.x0()+.5-scene.x,r.z0()+.5-scene.z);scene.pitch=-.10;
                scene.drawNetwork(map,List.of(),-1,0);int[] on=scene.pixels().clone();
                scene.roomLights.toggle(r.id());scene.drawNetwork(map,List.of(),-1,0);int[] off=scene.pixels().clone();
                check(changed(on,off)>100,site+" room circuit has no visible effect "+r.id());
                check(brightness(off)<brightness(on),site+" circuit does not darken room "+r.id());
                scene.roomLights.toggle(r.id());views+=2;
            }
            var p=map.level().portals().stream().filter(w->w.kind().equals("window")).findFirst().orElseThrow();
            var r=map.level().room(p.a());scene.x=p.x()+(p.alongX()?0:Math.signum(r.cx()-p.x())*1.25);
            scene.z=p.z()+(p.alongX()?Math.signum(r.cz()-p.z())*1.25:0);scene.eyeHeight=p.y()+1.62;
            scene.yaw=Math.atan2(p.x()-scene.x,p.z()-scene.z);scene.pitch=0;
            scene.drawNetwork(map,List.of(),-1,0);int[] shut=scene.pixels().clone();
            check(map.toggleNearestWindow(scene.x,p.y(),scene.z),"window unreachable for visual check");
            scene.drawNetwork(map,List.of(),-1,0);check(changed(shut,scene.pixels())>20,site+" window sash does not visibly open");
            System.out.println("PASS "+site+": "+views+" lit/unlit views; hinged window; "+((System.nanoTime()-time)/1_000_000)+"ms total at320x200");
        }
        for(String id:LevelAssets.MODELS){
            var model=GlbProps.model(id);check(!model.triangles().isEmpty(),"missing scenery "+id);
            for(var t:model.triangles())GlbProps.sample(t.material(),t.a().u(),t.a().v());
        }
        System.out.println("PASS all curated environment meshes have textured runtime triangles");
    }
}
