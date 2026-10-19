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
            boolean footstep=cue==LanSound.Cue.STEP||cue==LanSound.Cue.STEP_STONE
                ||cue==LanSound.Cue.STEP_CARPET||cue==LanSound.Cue.STEP_WOOD;
            long interval=footstep?310_000_000L:
                cue==LanSound.Cue.UI_CLICK||cue==LanSound.Cue.SELECT?55_000_000L:75_000_000L;
            Long last=footstep?LAST.get(LanSound.Cue.STEP):LAST.get(cue);
            if(last!=null&&now-last<interval)return;
            LAST.put(footstep?LanSound.Cue.STEP:cue,now);
        }
        Player.AUDIO.play(new LanSound.CueEvent(cue,0,
            footstepVolume(cue),0));
    }
    private static int footstepVolume(LanSound.Cue cue){
        return switch(cue){
            case STEP,STEP_STONE->48;
            case STEP_CARPET->29;
            case STEP_WOOD->42;
            case UI_CLICK->35;
            default->70;
        };
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
