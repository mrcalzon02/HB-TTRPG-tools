package org.beckenburg;

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.DataLine;
import javax.sound.sampled.LineUnavailableException;
import javax.sound.sampled.SourceDataLine;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

/** Short synthesized PS-era paranormal effects, no proprietary sound files required.
 * Runs off the Swing EDT; bounded queue, clean shutdown, silent hardware fallback.
 */
public final class LanAudio implements AutoCloseable {
    static final int SAMPLE_RATE=16000;
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
                byte[] samples=sound.pcm()!=null?sound.pcm():synthesize(sound.cue());
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
        };
        byte[] output=new byte[samples*4];
        double pan=event.pan()/100.0;
        double left=Math.sqrt((1-pan)/2.0),right=Math.sqrt((1+pan)/2.0);
        double gain=event.volume()/100.0;
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
