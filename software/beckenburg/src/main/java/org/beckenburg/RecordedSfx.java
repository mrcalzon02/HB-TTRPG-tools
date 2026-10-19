package org.beckenburg;

import javax.sound.sampled.*;
import java.io.*;
import java.util.EnumMap;

/**
 * Optional real-world Foley clips. Curated CC0 NOX files are loaded as packaged
 * 16-kHz signed stereo WAVs; missing clips fall back to LanAudio's synthesized cues.
 * A source pack or Drive connection is never required on an installed player's PC.
 */
final class RecordedSfx {
    private static final AudioFormat FORMAT=new AudioFormat(16000f,16,2,true,false);
    private static final EnumMap<LanSound.Cue,byte[]> CACHE=new EnumMap<>(LanSound.Cue.class);
    // Short Foley clips must not monopolize the single effects line behind critical attack cues.
    private static final int MAX_PCM_BYTES=16000*4*4;
    private RecordedSfx(){}

    private static synchronized byte[] original(LanSound.Cue cue){
        if(CACHE.containsKey(cue))return CACHE.get(cue);
        String resource="/org/beckenburg/sfx/"+cue.name().toLowerCase(java.util.Locale.ROOT)+".wav";
        byte[] pcm=null;
        try(InputStream input=RecordedSfx.class.getResourceAsStream(resource)){
            if(input!=null){
                try(AudioInputStream file=AudioSystem.getAudioInputStream(new BufferedInputStream(input))){
                    if(!AudioSystem.isConversionSupported(FORMAT,file.getFormat()))
                        throw new UnsupportedAudioFileException("Unsupported curated clip: "+resource);
                    try(AudioInputStream converted=AudioSystem.getAudioInputStream(FORMAT,file)){
                        byte[] candidate=converted.readNBytes(MAX_PCM_BYTES+4);
                        if(candidate.length>0&&candidate.length<=MAX_PCM_BYTES
                                &&candidate.length%4==0)pcm=candidate;
                        else throw new IOException("Curated clip too long or invalid: "+resource);
                    }
                }
            }
        }catch(Exception invalid){
            System.err.println("Beckenburg Foley ignored (using generated fallback): "+invalid.getMessage());
        }
        CACHE.put(cue,pcm);
        return pcm;
    }

    /** Return a fresh, attenuated/panned buffer; never modify the cached clean master. */
    static byte[] render(LanSound.CueEvent event,int effectsVolume){
        byte[] source=original(event.cue());
        if(source==null)return null;
        if(effectsVolume<0||effectsVolume>100)throw new IllegalArgumentException("effects volume");
        double pan=event.pan()/100d;
        double left=Math.sqrt(1-pan),right=Math.sqrt(1+pan);
        double volume=event.volume()/100d*effectsVolume/100d;
        byte[] out=new byte[source.length];
        for(int i=0;i<source.length;i+=4){
            short l=(short)((source[i]&255)|(source[i+1]<<8));
            short r=(short)((source[i+2]&255)|(source[i+3]<<8));
            int lv=(int)Math.round(l*volume*left);
            int rv=(int)Math.round(r*volume*right);
            lv=Math.max(Short.MIN_VALUE,Math.min(Short.MAX_VALUE,lv));
            rv=Math.max(Short.MIN_VALUE,Math.min(Short.MAX_VALUE,rv));
            out[i]=(byte)lv;out[i+1]=(byte)(lv>>8);
            out[i+2]=(byte)rv;out[i+3]=(byte)(rv>>8);
        }
        return out;
    }
    static boolean isPackaged(LanSound.Cue cue){return original(cue)!=null;}
}
