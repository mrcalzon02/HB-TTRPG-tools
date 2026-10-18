package org.beckenburg;
import java.util.Random;
/** Host-only indirect sensor. Never discloses true ghost energy to hunters. */
public final class VanTelemetry {
    public static final int HUNTERS=6;
    private final Random rng;
    private int lastSample=-100000,activity;
    private double filtered=3;
    public VanTelemetry(long seed){rng=new Random(seed);}
    public int sample(int tick,int energy){
        if(tick<0||energy<0||energy>100||tick<lastSample)throw new IllegalArgumentException("bad activity input");
        if(tick-lastSample>=12){
            double target=energy/10.0+(rng.nextDouble()-.5)*3.2;
            if(rng.nextInt(15)==0)target+=(rng.nextBoolean()?1:-1)*1.5;
            filtered=filtered*.48+target*.52;
            activity=Math.max(0,Math.min(10,(int)Math.round(filtered)));
            lastSample=tick;
        }
        return activity;
    }
    public record Display(int tick,int activity,int[] sanity){
        public Display{
            if(tick<0||activity<0||activity>10||sanity==null||sanity.length!=HUNTERS)
                throw new IllegalArgumentException("bad display");
            sanity=sanity.clone();
            for(int value:sanity)if(value< -1||value>100)throw new IllegalArgumentException("bad sanity");
        }
        @Override public int[] sanity(){return sanity.clone();}
        public String frame(){
            StringBuilder b=new StringBuilder("VANMETERS|").append(tick).append('|').append(activity);
            for(int v:sanity)b.append('|').append(v);
            return b.toString();
        }
        public static Display decode(String text){
            var p=LanProtocol.parts(text);
            if(p.size()!=9||!p.get(0).equals("VANMETERS"))throw new IllegalArgumentException("bad meters frame");
            int[] values=new int[HUNTERS];
            for(int i=0;i<HUNTERS;i++)values[i]=LanProtocol.integer(p.get(i+3),-1,100);
            return new Display(LanProtocol.integer(p.get(1),0,99999999),
                LanProtocol.integer(p.get(2),0,10),values);
        }
    }
}