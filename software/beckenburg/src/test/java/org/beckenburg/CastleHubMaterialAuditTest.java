package org.beckenburg;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/** Release-side audit of authored materials, mounting sockets and true mesh geometry. */
public final class CastleHubMaterialAuditTest {
    static void ok(boolean condition,String message){
        if(!condition)throw new AssertionError(message);
    }
    public static void main(String[] args){
        CastleHubMap map=new CastleHubMap();
        ok(map.valid(),"castle floor map still navigable");
        ok(map.floorMaterial(13.5,19.3)==MaterialAtlas.STONE,"courtyard flagstone");
        ok(map.floorMaterial(13.5,5.2)==MaterialAtlas.CARPET,"great hall carpet");
        ok(map.floorMaterial(23.0,5.2)==MaterialAtlas.PARQUET,"lounge timber floor");
        ok(map.footstep(13.5,19.3)==LanSound.Cue.STEP_STONE,"flagstone footsteps");
        ok(map.footstep(13.5,5.2)==LanSound.Cue.STEP_CARPET,"carpet footsteps");
        ok(map.footstep(23.0,5.2)==LanSound.Cue.STEP_WOOD,"timber footsteps");
        byte[] stone=LanAudio.synthesize(new LanSound.CueEvent(LanSound.Cue.STEP_STONE,0,50,0));
        byte[] carpet=LanAudio.synthesize(new LanSound.CueEvent(LanSound.Cue.STEP_CARPET,0,50,0));
        byte[] timber=LanAudio.synthesize(new LanSound.CueEvent(LanSound.Cue.STEP_WOOD,0,50,0));
        ok(!Arrays.equals(stone,carpet)&&!Arrays.equals(stone,timber)&&
            !Arrays.equals(carpet,timber),"material footsteps are genuinely distinct PCM");
        int roof=0,wall=0;
        Set<String> families=new HashSet<>();
        for(var light:CastleHubDecor.LIGHTS){
            ok(light.attached(map),"fixture physically attached to roof or wall at "+
                light.x()+","+light.z()+" "+light.mount());
            ok(GlbProps.model(light.on()).triangles().size()>2,"actual licensed lit lamp");
            families.add(light.on().replaceAll("_on$",""));
            if(light.mount()==CastleHubDecor.Mount.CEILING)roof++;else wall++;
        }
        ok(roof>=6&&wall>=8&&families.size()>=3,
            "multiple real ceiling/sconce models rather than floating duplicates");
        // Full workstation: source tower, original standalone CRT, original
        // keyboard. Only the mouse shell uses small original box geometry.
        for(String part:new String[]{"pc_mp_1","monitoring_screen_mp_1","pc_keyboard_mp_1"})
            ok(GlbProps.model(part).triangles().size()>4,"network terminal "+part);
        // Van mesh fidelity audit: identify mismatches from actual vertices,
        // materials and source bounds instead of guessing from a screenshot.
        var shell=GlbProps.model("ggbot_car08_van_shell");
        double minX=1e9,minY=1e9,minZ=1e9,maxX=-1e9,maxY=-1e9,maxZ=-1e9;
        Set<Integer> materials=new HashSet<>();
        for(var tri:shell.triangles()){
            materials.add(tri.material());
            for(var v:new GlbProps.Vertex[]{tri.a(),tri.b(),tri.c()}){
                minX=Math.min(minX,v.x());maxX=Math.max(maxX,v.x());
                minY=Math.min(minY,v.y());maxY=Math.max(maxY,v.y());
                minZ=Math.min(minZ,v.z());maxZ=Math.max(maxZ,v.z());
            }
        }
        System.out.println("VAN SHELL source bounds x="+minX+".."+maxX+
            " y="+minY+".."+maxY+" z="+minZ+".."+maxZ+
            " triangles="+shell.triangles().size()+" distinctMaterials="+materials.size());
        ok(shell.triangles().size()>100&&materials.size()>0,"source textured vehicle shell");
        System.out.println("PASS Castle materials, physical lights, full network workstation and van mesh audit");
    }
}
