package org.cubechat.android;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;

/**
 * Readback-driven *presentation* gate for future privileged controls. This class
 * never performs a radio operation. A request/daemon heartbeat is not evidence.
 */
public final class GuardianPolicyGate {
    public enum Surface {
        IPV4, IPV6, WIFI_MANAGEMENT, BLUETOOTH_MANAGEMENT, CELLULAR_SIGNALING,
        NORMAL_CALLS, EMERGENCY_PATH, BOOT_PERSISTENCE
    }
    public enum Proof { UNSUPPORTED, UNKNOWN, REQUESTED, VERIFIED_READBACK, FAILED }
    public enum Outcome { OFF, PARTIAL, FAILED, VERIFIED }
    public static final class Assessment {
        public final Outcome outcome;
        public final String explanation;
        private Assessment(Outcome outcome, String explanation) {
            this.outcome = outcome;
            this.explanation = explanation;
        }
    }
    private static final EnumSet<Surface> REQUIRED = EnumSet.allOf(Surface.class);

    public static Assessment assess(boolean requested, Map<Surface, Proof> proofs) {
        if (!requested) return new Assessment(Outcome.OFF, "Lockdown not requested");
        if (proofs == null) return new Assessment(Outcome.PARTIAL, "No verified control readbacks");
        for (Surface surface : REQUIRED) {
            if (proofs.get(surface) == Proof.FAILED) {
                return new Assessment(Outcome.FAILED, "Failed: " + surface);
            }
        }
        for (Surface surface : REQUIRED) {
            if (proofs.get(surface) != Proof.VERIFIED_READBACK) {
                return new Assessment(Outcome.PARTIAL, "Unverified or unsupported: " + surface);
            }
        }
        return new Assessment(Outcome.VERIFIED, "All required controls have independent readback evidence");
    }

    public static Map<Surface, Proof> empty() {
        Map<Surface, Proof> result = new EnumMap<>(Surface.class);
        for (Surface surface : REQUIRED) result.put(surface, Proof.UNKNOWN);
        return result;
    }

    private GuardianPolicyGate() { }
}
