package org.beckenburg;

import java.nio.file.*;
import java.util.*;

/** Castle is physically navigable and store purchases are a persisted van entitlement. */
public final class CastleHubIntegrationTest {
    static void ok(boolean passed,String label){if(!passed)throw new AssertionError(label);}
    public static void main(String[] args)throws Exception{
        CastleHubMap map=new CastleHubMap();
        double sx=13.5,sz=19.3;
        ok(map.traversable(sx,sz),"castle spawn on floor");
        // Breadth-first every accessible castle cell; the shop and contract areas must connect.
        boolean[][] visited=new boolean[CastleHubMap.HEIGHT][CastleHubMap.WIDTH];
        ArrayDeque<int[]> q=new ArrayDeque<>();q.add(new int[]{(int)sx,(int)sz});
        while(!q.isEmpty()){
            int[] cell=q.removeFirst();int x=cell[0],z=cell[1];
            if(x<0||x>=CastleHubMap.WIDTH||z<0||z>=CastleHubMap.HEIGHT||visited[z][x]||map.solid(x,z))continue;
            visited[z][x]=true;
            q.add(new int[]{x-1,z});q.add(new int[]{x+1,z});q.add(new int[]{x,z-1});q.add(new int[]{x,z+1});
        }
        for(CastleHubMap.Station s:CastleHubMap.Station.values())
            ok(visited[(int)s.z][(int)s.x],"reachable station "+s);
        CastleHubMap.Station dest=CastleHubMap.Station.CONTRACT;
        double px=dest.x,pz=dest.z+1.7;
        ok(map.traversable(px,pz),"contract interaction standing position accessible");
        ok(map.aimed(px,pz,Math.PI)==dest,"look-to-use targets contract");
        ok(map.aimed(px,pz,0)!=dest,"cannot interact while looking away");
        SceneRenderer scene=new SceneRenderer();scene.x=sx;scene.z=sz;scene.yaw=Math.PI;
        scene.drawCastle(map,1.2);
        int[] pixels=scene.pixels();Set<Integer> shades=new HashSet<>();
        for(int i=0;i<pixels.length;i+=37)shades.add(pixels[i]);
        ok(shades.size()>8,"real castle has textured 3D geometry / skybox");
        Path dir=Files.createTempDirectory("beckenburg-castle-check");
        try{
            Path props=dir.resolve("profile.properties");
            Files.writeString(props,"schema=1\ncurrency=300\nexperience=0\nawarded=\n");
            ProfileStore profile=new ProfileStore(props);profile.load();
            ok(profile.ownsEquipment(EquipmentLoadout.Item.EMF),"starter item issued");
            ok(!profile.ownsEquipment(EquipmentLoadout.Item.UV_LAMP),"UV requires purchase");
            ok(profile.purchaseEquipment(EquipmentLoadout.Item.UV_LAMP),"castle armory buy UV");
            ok(profile.currency()==150,"deduct exact purchase price");
            ProfileStore saved=new ProfileStore(props);saved.load();
            ok(saved.ownsEquipment(EquipmentLoadout.Item.UV_LAMP),"purchase survives restart");
            ok(!saved.purchaseEquipment(EquipmentLoadout.Item.UV_LAMP),"cannot buy duplicate");
            var kit=VanEquipmentRack.socket(new HouseMap().van(),EquipmentLoadout.Item.UV_LAMP);
            var van=new HouseMap().van();
            var spawn=van.spawn();
            double bearing=Math.atan2(kit.x()-spawn.x(),kit.z()-spawn.z());
            ok(VanEquipmentRack.aimed(van,spawn.x(),spawn.z(),bearing,saved.equipment())==
                EquipmentLoadout.Item.UV_LAMP,"purchased gear present in selectable rack");
            System.out.println("PASS castle navigation, live textured scene and persisted armory gear");
        }finally{
            try(var listing=Files.list(dir)){for(Path f:listing.toList())Files.deleteIfExists(f);}
            Files.deleteIfExists(dir);
        }
    }
}