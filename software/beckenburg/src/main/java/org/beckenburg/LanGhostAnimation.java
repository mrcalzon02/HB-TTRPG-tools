package org.beckenburg;

import java.util.List;

/** Host-authored spectral pose phases. Cosmetic only: never resolves power, damage or sight. */
public final class LanGhostAnimation {
    public static final int MATERIALIZE_TICKS = 6, RECOVER_TICKS = 7;
    public enum Phase { MATERIALIZE, LURK, WINDUP, RECOVER, WALK, SPRINT, SIGNATURE }
    public record Motion(Phase phase, int heading, int progress, int tick) {
        public Motion {
            if (phase == null || heading < 0 || heading > 359 || progress < 0 || progress > 100 || tick < 0)
                throw new IllegalArgumentException("invalid spectral animation");
        }
        public String frame() { return "MOTION|" + phase + "|" + heading + "|" + progress + "|" + tick; }
    }
    private int manifestTick = -1, windupTick = -1, impactTick = -1;
    private int lastStepTick = -10000, lastSignatureTick = -10000;
    private boolean lastStepSprint;
    public void manifested(int tick) {
        if (tick < 0) throw new IllegalArgumentException("negative tick");
        manifestTick = tick;
        impactTick = -1;
    }
    public void windup(int tick) {
        if (tick < 0) throw new IllegalArgumentException("negative tick");
        windupTick = tick;
    }
    public void impact(int tick) {
        if (tick < 0) throw new IllegalArgumentException("negative tick");
        impactTick = tick;
        windupTick = -1;
    }
    /** Called only after the host accepted real physical ghost movement. */
    public void moved(int tick,boolean sprint) {
        if(tick<0)throw new IllegalArgumentException("negative tick");
        lastStepTick=tick;lastStepSprint=sprint;
    }
    /** Called only after the host accepted a real species SIGNATURE action. */
    public void signature(int tick) {
        if(tick<0)throw new IllegalArgumentException("negative tick");
        lastSignatureTick=tick;
    }
    /** Null means do not transmit any phase: hidden ghosts provide no extra visibility clues. */
    public Motion project(boolean visible, boolean strikePending, int heading, int tick) {
        if (tick < 0 || heading < 0 || heading > 359) throw new IllegalArgumentException("invalid spectral pose");
        if (!visible) return null;
        Phase phase;
        int progress;
        if (strikePending) {
            phase = Phase.WINDUP;
            progress = windupTick < 0 ? 0 : Math.max(0, Math.min(LanTelegraphedStrike.WINDUP_TICKS, tick - windupTick));
        } else if (impactTick >= 0 && tick >= impactTick && tick - impactTick < RECOVER_TICKS) {
            phase = Phase.RECOVER;
            progress = tick - impactTick;
        } else if (manifestTick >= 0 && tick >= manifestTick && tick - manifestTick < MATERIALIZE_TICKS) {
            phase = Phase.MATERIALIZE;
            progress = tick - manifestTick;
        } else if(lastSignatureTick>=0 && tick>=lastSignatureTick && tick-lastSignatureTick<10) {
            phase = Phase.SIGNATURE;
            progress = tick-lastSignatureTick;
        } else if(lastStepTick>=0 && tick>=lastStepTick && tick-lastStepTick<4) {
            phase = lastStepSprint?Phase.SPRINT:Phase.WALK;
            progress = tick-lastStepTick;
        } else {
            phase = Phase.LURK;
            progress = 0;
        }
        return new Motion(phase, heading, progress, tick);
    }
    public boolean animating(int tick) {
        return manifestTick >= 0 && tick >= manifestTick && tick - manifestTick < MATERIALIZE_TICKS
                || impactTick >= 0 && tick >= impactTick && tick - impactTick < RECOVER_TICKS
                || lastStepTick >= 0 && tick >= lastStepTick && tick - lastStepTick < 4
                || lastSignatureTick >= 0 && tick >= lastSignatureTick && tick - lastSignatureTick < 10;
    }
    public static Motion decode(String frame) {
        List<String> fields = LanProtocol.parts(frame);
        if (fields.size() != 5 || !fields.get(0).equals("MOTION"))
            throw new IllegalArgumentException("invalid animation frame");
        return new Motion(Phase.valueOf(fields.get(1)),
                LanProtocol.integer(fields.get(2), 0, 359),
                LanProtocol.integer(fields.get(3), 0, 100),
                LanProtocol.integer(fields.get(4), 0, 99999999));
    }
}
