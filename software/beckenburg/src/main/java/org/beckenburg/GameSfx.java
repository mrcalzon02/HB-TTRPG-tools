package org.beckenburg;

import javax.swing.AbstractButton;
import javax.swing.JTabbedPane;
import java.util.EnumMap;

/** Local, non-positional UI/solo interaction sounds. Network/world sounds use LanHost instead.
 * No music or voice mixing is performed here; both retain their independent playback paths.
 */
public final class GameSfx {
    private static final EnumMap<LanSound.Cue,Long> LAST=new EnumMap<>(LanSound.Cue.class);
    private static final class Player {static final LanAudio AUDIO=new LanAudio();}
    private GameSfx(){}
    public static void play(LanSound.Cue cue){
        if(cue==null||Boolean.getBoolean("beckenburg.audio.mute"))return;
        long now=System.nanoTime();
        synchronized(LAST){
            long interval=cue==LanSound.Cue.STEP?310_000_000L:
                cue==LanSound.Cue.UI_CLICK||cue==LanSound.Cue.SELECT?55_000_000L:75_000_000L;
            Long last=LAST.get(cue);
            if(last!=null&&now-last<interval)return;
            LAST.put(cue,now);
        }
        Player.AUDIO.play(new LanSound.CueEvent(cue,0,
            cue==LanSound.Cue.STEP?48:cue==LanSound.Cue.UI_CLICK?35:70,0));
    }
    /** Safe to call twice: a styled button receives exactly one click action. */
    public static void button(AbstractButton button){
        if(Boolean.TRUE.equals(button.getClientProperty("beckenburg.sfx.bound")))return;
        button.putClientProperty("beckenburg.sfx.bound",Boolean.TRUE);
        button.addActionListener(e->play(LanSound.Cue.UI_CLICK));
    }
    public static void tabs(JTabbedPane tabs){
        if(Boolean.TRUE.equals(tabs.getClientProperty("beckenburg.sfx.bound")))return;
        tabs.putClientProperty("beckenburg.sfx.bound",Boolean.TRUE);
        tabs.addChangeListener(e->{
            if(tabs.isShowing())play(LanSound.Cue.SELECT);
        });
    }
}
