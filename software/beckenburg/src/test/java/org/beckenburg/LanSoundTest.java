package org.beckenburg;

import java.util.Arrays;

/** Spatial audio projection, bounded frames, attenuation, and reproducible stereo synthesis. */
public final class LanSoundTest {
    static void ok(boolean b,String message){if(!b)throw new AssertionError(message);}
    static long[] energy(byte[] pcm){
        long[] power={0,0};
        for(int i=0;i<pcm.length;i+=4){
            short left=(short)((pcm[i]&255)|(pcm[i+1]<<8));
            short right=(short)((pcm[i+2]&255)|(pcm[i+3]<<8));
            power[0]+=Math.abs((int)left);power[1]+=Math.abs((int)right);
        }
        return power;
    }
    public static void main(String[] args){
        HouseMap map=new HouseMap();
        int room=4;
        double cx=map.centerX(room),cz=map.centerZ(room);
        LanWorld.Body facingNorth=new LanWorld.Body(cx,cz,0,room);
        LanSound.CueEvent ahead=LanSound.project(map,facingNorth,room,cx,cz+1.5,LanSound.Cue.WHISPER,15);
        ok(ahead!=null&&ahead.pan()==0,"source ahead centered");
        LanSound.CueEvent right=LanSound.project(map,facingNorth,room,cx-2,cz,LanSound.Cue.DISTURB,15);
        LanSound.CueEvent left=LanSound.project(map,facingNorth,room,cx+2,cz,LanSound.Cue.DISTURB,15);
        ok(right!=null&&right.pan()==100&&left!=null&&left.pan()==-100,"listener-relative stereo pan");
        ok(map.roomAt(cx,cz)==room,"valid origin");
        ok(LanSound.project(map,facingNorth,HouseMap.EXTRACTION_ROOM,cx,cz,LanSound.Cue.WHISPER,0)==null,"safe van not valid ghost source");
        LanWorld.Body van=new LanWorld.Body(map.centerX(HouseMap.EXTRACTION_ROOM),map.centerZ(HouseMap.EXTRACTION_ROOM),0,HouseMap.EXTRACTION_ROOM);
        ok(LanSound.project(map,van,room,cx,cz,LanSound.Cue.WHISPER,15)==null,"van is acoustically excluded");
        ok(LanSound.project(map,facingNorth,room,Double.NaN,cz,LanSound.Cue.STRIKE,15)==null,"reject non-finite source");
        ok(LanSound.decode(right.frame()).equals(right),"wire frame roundtrip");
        for(String invalid:new String[]{"SOUND|FOOTFALL|9|80|1","SOUND|WHISPER|-101|80|1",
                "SOUND|WHISPER|25|0|1","SOUND|WHISPER|25|80|-1","SOUND|MANIFEST|25|80|0|extra"}){
            boolean rejected=false;try{LanSound.decode(invalid);}catch(IllegalArgumentException e){rejected=true;}
            ok(rejected,"reject invalid host frame: "+invalid);
        }
        byte[] leftPcm=LanAudio.synthesize(left),rightPcm=LanAudio.synthesize(right);
        ok(Arrays.equals(leftPcm,LanAudio.synthesize(left)),"fixed audio output deterministic");
        ok(leftPcm.length==rightPcm.length && leftPcm.length>2000 && leftPcm.length%4==0,"valid stereo PCM frames");
        long[] l=energy(leftPcm),r=energy(rightPcm);
        ok(l[0]>l[1]*20 && r[1]>r[0]*20,"panned playback uses correct ear");
        byte[] quiet=LanAudio.synthesize(new LanSound.CueEvent(LanSound.Cue.DISTURB,0,10,15));
        byte[] loud=LanAudio.synthesize(new LanSound.CueEvent(LanSound.Cue.DISTURB,0,90,15));
        ok(energy(loud)[0]>energy(quiet)[0]*4,"volume controls PCM energy");
        System.out.println("PASS: listener-relative host sound projection, ghost privacy, bounded frames, stereo PCM and mute amplitude");
    }
}
