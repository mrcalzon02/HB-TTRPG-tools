package org.beckenburg;
import java.util.Arrays;
/** Native PSX effects must be deterministic, bounded and opt-out capable. */
public final class PsxPipelineTest {
    private static void ok(boolean condition,String reason){
        if(!condition)throw new AssertionError(reason);
    }
    public static void main(String[] args){
        ok(PsxPipeline.snap(12.4,PsxPipeline.Preset.OFF)==12.4,"OFF precise");
        ok(PsxPipeline.snap(12.4,PsxPipeline.Preset.CLASSIC)==12,"CLASSIC snap");
        ok(PsxPipeline.snap(12.6,PsxPipeline.Preset.GRITTY)==12,"GRITTY snap");
        ok(PsxPipeline.uv(.25,.75,PsxPipeline.Preset.OFF)==.25,"OFF UV");
        ok(PsxPipeline.uv(.25,.75,PsxPipeline.Preset.GRITTY)==.75,"GRITTY affine");
        double mixed=PsxPipeline.uv(.25,.75,PsxPipeline.Preset.CLASSIC);
        ok(mixed>.25&&mixed<.75,"CLASSIC UV blend");
        int[] original=new int[64*64];
        for(int i=0;i<original.length;i++)
            original[i]=(((i*7)&255)<<16)|(((i*11)&255)<<8)|((i*13)&255);
        int[] off=original.clone();
        PsxPipeline.finishFrame(off,64,64,PsxPipeline.Preset.OFF);
        ok(Arrays.equals(original,off),"OFF bypass");
        int[] classic=original.clone();
        PsxPipeline.finishFrame(classic,64,64,PsxPipeline.Preset.CLASSIC);
        ok(!Arrays.equals(original,classic),"CLASSIC quantization");
        int[] repeat=original.clone();
        PsxPipeline.finishFrame(repeat,64,64,PsxPipeline.Preset.CLASSIC);
        ok(Arrays.equals(classic,repeat),"dither deterministic");
        for(int c:classic)for(int shift:new int[]{0,8,16}){
            int channel=(c>>>shift)&255;
            int index=(int)Math.round(channel*31.0/255);
            ok(Math.abs(channel-Math.round(index*255.0/31))<=1,
                "CLASSIC 5-bit channel");
        }
        boolean rejected=false;
        try{PsxPipeline.finishFrame(new int[1],64,64,PsxPipeline.Preset.CLASSIC);}
        catch(IllegalArgumentException expected){rejected=true;}
        ok(rejected,"buffer bounds");
        System.out.println("PASS PSX vertex snap, affine UVs, dithering, presets");
    }
}
