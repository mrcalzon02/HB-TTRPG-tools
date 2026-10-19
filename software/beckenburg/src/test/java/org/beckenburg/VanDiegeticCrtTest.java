package org.beckenburg;

import java.util.HashSet;

/** Physical owner CRT material changes with actual host monitor data. */
public final class VanDiegeticCrtTest {
    static void ok(boolean good,String message){if(!good)throw new AssertionError(message);}
    private static long checksum(int material){
        long result=1;
        for(int y=0;y<64;y++)for(int x=0;x<64;x++){
            int pixel=GlbProps.sample(material,(x+.5)/64.0,(y+.5)/64.0);
            result=result*31+pixel;
        }
        return result;
    }
    public static void main(String[] args){
        var model=GlbProps.model("monitoring_screen_mp_1");
        HashSet<Integer> materials=new HashSet<>();
        for(var triangle:model.triangles())materials.add(triangle.material());
        ok(materials.size()==2,"real screen has its own independent CRT material");
        int screen=materials.stream().mapToInt(Integer::intValue).max().orElseThrow();
        GlbProps.updateVanCrt(new VanTelemetry.Display(100,1,
            new int[]{95,90,84,-1,-1,-1}));
        long first=checksum(screen);
        GlbProps.updateVanCrt(new VanTelemetry.Display(145,8,
            new int[]{23,41,63,58,72,100}));
        long second=checksum(screen);
        ok(first!=second,
            "host-updated activity/sanity visibly changes actual authored CRT material");
        ok(GlbProps.model("pc_mp_1").triangles().size()>5,
            "actual source PC shell is usable alongside van screen");
        System.out.println("PASS: original 3D CRT material displays live replicated activity/sanity");
    }
}
