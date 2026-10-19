package org.beckenburg;

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.DataLine;
import javax.sound.sampled.LineUnavailableException;
import javax.sound.sampled.SourceDataLine;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.prefs.Preferences;

/** Short synthesized PS-era paranormal effects, no proprietary sound files required.
 * Runs off the Swing EDT; bounded queue, clean shutdown, silent hardware fallback.
 */
public final class LanAudio implements AutoCloseable {
    static final int SAMPLE_RATE=16000;
    private static final Preferences PREFS=Preferences.userNodeForPackage(LanAudio.class);
    public static int effectsVolume(){return Math.max(0,Math.min(100,PREFS.getInt("effects_volume",80)));}
    public static void effectsVolume(int value){
        if(value<0||value>100)throw new IllegalArgumentException("Effects volume 0-100");
        PREFS.putInt("effects_volume",value);
    }
    private static final AudioFormat FORMAT=new AudioFormat(SAMPLE_RATE,16,2,true,false);
    private record Playback(LanSound.CueEvent cue,byte[] pcm) { }
    private final BlockingQueue<Playback> queue=new ArrayBlockingQueue<>(8);
    private final Thread worker;
    private volatile boolean closed;
    private boolean hardwareUnavailable;

    public LanAudio(){
        worker=new Thread(this::run,"beckenburg-positional-audio");
        worker.setDaemon(true);worker.start();
    }
    public void play(LanSound.CueEvent cue){
        if(cue==null||closed||Boolean.getBoolean("beckenburg.audio.mute"))return;
        // Never grow an unbounded backlog of stale paranormal noises.
        Playback sound=new Playback(cue,null);
        if(!queue.offer(sound)){queue.poll();queue.offer(sound);}
    }
    /** Recorded silence and overlapping source events retain their exact PCM timing. */
    public void playRecording(FieldSoundRecorder.Clip clip){
        if(clip==null||closed||Boolean.getBoolean("beckenburg.audio.mute"))return;
        byte[] pcm=RecorderAudio.pcm(clip);
        if(clip.tier()==EquipmentTiers.Tier.I){
            byte[] stereo=new byte[pcm.length*2];
            for(int i=0;i<pcm.length;i+=2){
                stereo[i*2]=pcm[i];stereo[i*2+1]=pcm[i+1];
                stereo[i*2+2]=pcm[i];stereo[i*2+3]=pcm[i+1];
            }
            pcm=stereo;
        }
        Playback sound=new Playback(null,pcm);
        if(!queue.offer(sound)){queue.poll();queue.offer(sound);}
    }
    private void run(){
        while(!closed){
            try{
                Playback sound=queue.take();
                if(closed||hardwareUnavailable)continue;
                byte[] samples=sound.pcm();
                if(samples==null){
                    samples=RecordedSfx.render(sound.cue(),effectsVolume());
                    if(samples==null)samples=synthesize(sound.cue());
                }
                SourceDataLine line=null;
                try{
                    line=(SourceDataLine)AudioSystem.getLine(new DataLine.Info(SourceDataLine.class,FORMAT));
                    line.open(FORMAT);line.start();
                    int pos=0;
                    while(pos<samples.length&&!closed){
                        int count=line.write(samples,pos,Math.min(2048,samples.length-pos));
                        if(count<=0)break;
                        pos+=count;
                    }
                    if(!closed)line.drain();
                }catch(LineUnavailableException|IllegalArgumentException|SecurityException missing){
                    hardwareUnavailable=true; // caption-only fallback; no repeated attempts to open a broken device
                }finally{if(line!=null){line.stop();line.close();}}
            }catch(InterruptedException stop){Thread.currentThread().interrupt();break;}
        }
    }
    /** Pure deterministic stereo 16-bit PCM. Useful for audio quality and pan regression tests. */
    public static byte[] synthesize(LanSound.CueEvent event){
        if(event==null)throw new IllegalArgumentException("event required");
        int samples=switch(event.cue()){
            case WHISPER->5600; case DISTURB->3200; case MANIFEST->7200;
            case STRIKE->3800; case FOOTFALL->2400;
            case DOOR->3400; case EQUIPMENT->3000; case RITUAL->7300;
            case SIGNATURE->18000;
            case STEP->2100; case SWITCH,SELECT,UI_CLICK,UI_BACK->1250;
            case BREAKER,VAN_DOOR->6800; case PICKUP,BOOK->3900;
            case DEVICE_ON,DEVICE_OFF,SCANNER->4500;
            case CAMERA->2600; case WARD->9500; case POTION->5100;
            case RITUAL_START,RITUAL_END->12000;case IMPACT->7500;
            case GHOST_DRIFT->9300;
            case DOTS_MOTOR->6800;case DOTS_STOP->2400;
            case SPARK->1600;case INCENSE_BURN->5500;
            case FIRELIGHT_IGNITE->3400;case FIRELIGHT_OUT->2600;
            case TENSION_BUILD->24000;case LOCKED_DOOR_RATTLE->12400;
            case HORROR_STING_A,HORROR_STING_B,HORROR_STING_C->14800;
        };
        byte[] output=new byte[samples*4];
        double pan=event.pan()/100.0;
        double left=Math.sqrt((1-pan)/2.0),right=Math.sqrt((1+pan)/2.0);
        double gain=event.volume()/100.0*effectsVolume()/100.0;
        int hash=0x51b07 + 37*event.cue().ordinal();
        for(int i=0;i<samples;i++){
            double t=i/(double)SAMPLE_RATE;
            double env=Math.pow(Math.sin(Math.PI*(i+.5)/samples),.7);
            hash^=hash<<13;hash^=hash>>>17;hash^=hash<<5;
            double noise=((hash&65535)/32767.5)-1;
            double wave=switch(event.cue()){
                case WHISPER->.48*noise*Math.sin(2*Math.PI*48*t)+.28*Math.sin(2*Math.PI*(110+25*Math.sin(t*24))*t);
                case DISTURB->.70*Math.sin(2*Math.PI*(85-45*t)*t)+.30*noise*Math.exp(-t*22);
                case MANIFEST->.55*Math.sin(2*Math.PI*(90+140*t)*t)+.18*noise;
                case STRIKE->.58*Math.sin(2*Math.PI*(100+50*t)*t)+.25*noise;
                case FOOTFALL->.68*Math.sin(2*Math.PI*(70-110*t)*t)+.16*noise;
                case DOOR->.52*Math.sin(2*Math.PI*(88-30*t)*t)+.35*noise*Math.exp(-t*16);
                case EQUIPMENT->.50*Math.sin(2*Math.PI*840*t)+.22*Math.sin(2*Math.PI*420*t);
                case RITUAL->.40*Math.sin(2*Math.PI*(122+13*Math.sin(t*15))*t)+.27*noise*Math.sin(2*Math.PI*27*t);
                case SIGNATURE->.30*Math.sin(2*Math.PI*(67+160*t*t)*t)
                    +.29*Math.sin(2*Math.PI*(97+22*Math.sin(t*21))*t)
                    +.23*noise*Math.sin(2*Math.PI*31*t);
                // Intentionally different mechanical envelopes and spectra for every action.
                case STEP->.38*noise*Math.exp(-t*35)+.49*Math.sin(2*Math.PI*(73-36*t)*t)*Math.exp(-t*28);
                case SWITCH->.73*noise*Math.exp(-t*90)+.18*Math.sin(2*Math.PI*480*t)*Math.exp(-t*45);
                case BREAKER->.6*noise*Math.exp(-t*31)+.42*Math.sin(2*Math.PI*75*t)*Math.exp(-t*12);
                case VAN_DOOR->.38*Math.sin(2*Math.PI*(81+28*t)*t)+.23*noise*Math.sin(2*Math.PI*28*t);
                case UI_CLICK->.30*Math.sin(2*Math.PI*890*t)*Math.exp(-t*48)+.22*noise*Math.exp(-t*95);
                case UI_BACK->.25*Math.sin(2*Math.PI*(560-290*t)*t)*Math.exp(-t*34);
                case PICKUP->.3*Math.sin(2*Math.PI*(390+200*t)*t)*Math.exp(-t*20)+.2*noise*Math.exp(-t*35);
                case SELECT->.23*Math.sin(2*Math.PI*540*t)*Math.exp(-t*44)+.17*Math.sin(2*Math.PI*730*t)*Math.exp(-t*37);
                case DEVICE_ON->.42*Math.sin(2*Math.PI*(280+250*t)*t)*Math.exp(-t*10)+.2*noise*Math.exp(-t*22);
                case DEVICE_OFF->.35*Math.sin(2*Math.PI*(510-320*t)*t)*Math.exp(-t*14);
                case SCANNER->.35*Math.sin(2*Math.PI*(750+Math.sin(t*47)*145)*t)+.1*noise;
                case CAMERA->.72*noise*Math.exp(-t*105)+.25*Math.sin(2*Math.PI*140*t)*Math.exp(-t*37);
                case BOOK->.52*noise*Math.exp(-t*12)*Math.sin(2*Math.PI*35*t);
                case WARD->.42*Math.sin(2*Math.PI*(170+580*t)*t)*Math.exp(-t*6)+.18*noise*Math.sin(2*Math.PI*29*t);
                case POTION->.25*Math.sin(2*Math.PI*160*t)*Math.exp(-t*12)+.34*noise*Math.exp(-t*22);
                case RITUAL_START->.36*Math.sin(2*Math.PI*(70+210*t)*t)+.19*Math.sin(2*Math.PI*111*t)+.15*noise;
                case RITUAL_END->.3*Math.sin(2*Math.PI*(240-180*t)*t)+.25*Math.sin(2*Math.PI*70*t)+.12*noise;
                case IMPACT->.62*noise*Math.exp(-t*30)+.49*Math.sin(2*Math.PI*(102-83*t)*t)*Math.exp(-t*8);
                case GHOST_DRIFT->.39*Math.sin(2*Math.PI*(67+160*t)*t)+.22*noise*Math.sin(2*Math.PI*23*t);
                case DOTS_MOTOR->.34*Math.sin(2*Math.PI*(155+25*Math.sin(t*26))*t)
                    +.19*Math.sin(2*Math.PI*320*t)+.12*noise;
                case DOTS_STOP->.44*Math.sin(2*Math.PI*(440-300*t)*t)*Math.exp(-t*15)
                    +.18*noise*Math.exp(-t*22);
                case SPARK->.68*noise*Math.exp(-t*34)
                    +.24*Math.sin(2*Math.PI*94*t)*Math.exp(-t*18);
                case INCENSE_BURN->.48*noise*Math.sin(2*Math.PI*42*t)
                    +.14*Math.sin(2*Math.PI*83*t);
                case FIRELIGHT_IGNITE->.43*noise*Math.exp(-t*14)
                    +.22*Math.sin(2*Math.PI*(89+24*t)*t);
                case FIRELIGHT_OUT->.42*noise*Math.exp(-t*19)
                    +.22*Math.sin(2*Math.PI*(135-62*t)*t);
                case TENSION_BUILD->.30*Math.sin(2*Math.PI*(67+34*t)*t)
                    +.27*Math.sin(2*Math.PI*(91+56*t)*t)
                    +.18*noise*(.3+Math.min(1,t*4));
                // A repeated mechanical handle strike, never played for ordinary openable doors.
                case LOCKED_DOOR_RATTLE->.72*noise*
                    (Math.exp(-25*Math.abs(t-.10))+Math.exp(-28*Math.abs(t-.27))
                    +Math.exp(-30*Math.abs(t-.44)))*.55
                    +.33*Math.sin(2*Math.PI*116*t)*Math.exp(-t*4);
                case HORROR_STING_A->.34*Math.sin(2*Math.PI*(120-45*t)*t)
                    +.30*noise*Math.exp(-t*4);
                case HORROR_STING_B->.32*Math.sin(2*Math.PI*(201+55*t)*t)
                    +.24*Math.sin(2*Math.PI*70*t)+.19*noise;
                case HORROR_STING_C->.40*Math.sin(2*Math.PI*(67+190*t*t)*t)
                    +.29*noise*Math.sin(2*Math.PI*19*t);
            };
            double value=Math.max(-.85,Math.min(.85,wave*env*gain));
            short lv=(short)Math.round(value*left*22000),rv=(short)Math.round(value*right*22000);
            int at=i*4;
            output[at]=(byte)lv;output[at+1]=(byte)(lv>>8);
            output[at+2]=(byte)rv;output[at+3]=(byte)(rv>>8);
        }
        return output;
    }
    @Override public void close(){closed=true;queue.clear();worker.interrupt();}
}
