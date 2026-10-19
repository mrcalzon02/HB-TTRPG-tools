package org.beckenburg;

import javax.swing.JButton;
import javax.swing.JTabbedPane;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/** All event vocabulary must have a real, bounded deterministic PCM fallback. */
public final class SoundCoverageTest {
    public static void main(String[] args) {
        Set<String> unique = new HashSet<>();
        for (LanSound.Cue cue : LanSound.Cue.values()) {
            if (!unique.add(cue.name())) throw new AssertionError("Duplicate cue "+cue);
            if (cue.caption().isBlank()) throw new AssertionError("Missing accessibility caption "+cue);
            var center = new LanSound.CueEvent(cue, 0, 80, 1);
            if (LanSound.decode(center.frame()).cue() != cue)
                throw new AssertionError("Cannot decode "+cue);
            byte[] pcm=LanAudio.synthesize(center);
            if(pcm.length == 0 || pcm.length > 16000*4*4 || pcm.length % 4 != 0)
                throw new AssertionError("Invalid stereo PCM "+cue+": "+pcm.length);
            if(!Arrays.equals(pcm,LanAudio.synthesize(center)))
                throw new AssertionError("Nondeterministic cue "+cue);
            byte[] pan=LanAudio.synthesize(new LanSound.CueEvent(cue,100,80,1));
            if(pan.length!=pcm.length)throw new AssertionError("Pan changed duration "+cue);
        }
        JButton button=new JButton("PLAY");
        GameSfx.button(button);
        GameSfx.button(button);
        if(!Boolean.TRUE.equals(button.getClientProperty("beckenburg.sfx.bound")))
            throw new AssertionError("UI click binding missing");
        JTabbedPane pages=new JTabbedPane();
        pages.addTab("TEST",new javax.swing.JPanel());
        GameSfx.tabs(pages);
        GameSfx.tabs(pages);
        if(!Boolean.TRUE.equals(pages.getClientProperty("beckenburg.sfx.bound")))
            throw new AssertionError("Tab click binding missing");
        int previous=LanAudio.effectsVolume();
        try {
            LanAudio.effectsVolume(0);
            byte[] muted=LanAudio.synthesize(new LanSound.CueEvent(LanSound.Cue.UI_CLICK,0,80,1));
            for(byte b:muted)if(b!=0)throw new AssertionError("FX volume 0 leaked PCM");
            LanAudio.effectsVolume(100);
            if(Arrays.equals(muted,LanAudio.synthesize(new LanSound.CueEvent(LanSound.Cue.UI_CLICK,0,80,1))))
                throw new AssertionError("FX volume 100 also silent");
        } finally {LanAudio.effectsVolume(previous);}
        System.out.println("PASS SoundCoverageTest / "+unique.size()+" event cues, captions, stable PCM, panning, FX volume and UI idempotence");
    }
}
