package org.cubechat.android;

/**
 * Pure, offline status formatting for CubeChat's ordinary manual recovery UI.
 * None of these flags proves hardware isolation, emergency-call readiness,
 * or absence of Android-owned VPN configurations.
 */
final class LockdownRecoverySummary {
    enum State {
        NOT_REQUESTED, LOCAL_VPN_ACTIVE, OS_IP_LOCKDOWN_REPORTED,
        REQUESTED_NOT_RUNNING, MANAGED_POLICY_UNVERIFIED, RELEASE_INCOMPLETE
    }

    static final class Snapshot {
        final State state;
        final String headline;
        final String details;
        final String diagnostics;

        private Snapshot(State state, String headline, String details, String diagnostics) {
            this.state = state;
            this.headline = headline;
            this.details = details;
            this.diagnostics = diagnostics;
        }
    }

    private LockdownRecoverySummary() { }

    static Snapshot inspect(boolean armed, boolean vpnRunning, boolean osLockdownReported,
                            boolean deviceOwner, boolean managedRestrictionsPresent) {
        State state;
        String headline;
        String details;
        if (!armed && (vpnRunning || managedRestrictionsPresent)) {
            state = State.RELEASE_INCOMPLETE;
            headline = "INCOMPLETE RELEASE";
            details = "CubeChat lockdown was turned off, but a local VPN or managed restriction "
                    + "still appears active. Request release again and review Android VPN settings.";
        } else if (!armed) {
            state = State.NOT_REQUESTED;
            headline = "CUBECHAT LOCKDOWN NOT REQUESTED";
            details = "No local VPN is reported running and no CubeChat-managed restrictions "
                    + "were detected. This is NOT proof that Android-owned VPN rules or "
                    + "other software restrictions have been removed.";
        } else if (!vpnRunning) {
            state = State.REQUESTED_NOT_RUNNING;
            headline = "LOCKDOWN REQUESTED, VPN NOT RUNNING";
            details = "CubeChat requested IP lockdown, but its local packet filter is absent. "
                    + "Other application traffic may be possible unless Android separately blocks it.";
        } else if (deviceOwner && !managedRestrictionsPresent) {
            state = State.MANAGED_POLICY_UNVERIFIED;
            headline = "MANAGED RADIO RESTRICTIONS UNVERIFIED";
            details = "Android device-owner mode is present, but the required CubeChat-managed "
                    + "radio restrictions were not all reported. VPN status alone must not "
                    + "be presented as complete device lockdown.";
        } else if (osLockdownReported) {
            state = State.OS_IP_LOCKDOWN_REPORTED;
            headline = "ANDROID IP LOCKDOWN REPORTED";
            details = "The active CubeChat VPN reports Always-on VPN and Block without VPN. "
                    + "This does not establish kernel, radio, modem, or emergency-call protection.";
        } else {
            state = State.LOCAL_VPN_ACTIVE;
            headline = "LOCAL IP FILTER ACTIVE, OS LOCKDOWN UNVERIFIED";
            details = "CubeChat reports an active VPN, but fail-closed behavior during service "
                    + "failure or reboot has not been established.";
        }

        String managed = !deviceOwner ? "NOT_DEVICE_OWNER"
                : managedRestrictionsPresent ? "RESTRICTIONS_REPORTED"
                : armed ? "NOT_CONFIRMED" : "NONE_REPORTED";
        String report = "CubeChat RadioGuard diagnostic (manual status only)\n"
                + "Requested IP lockdown: " + (armed ? "YES" : "NO") + "\n"
                + "Local VPN running: " + (vpnRunning ? "YES" : "NO") + "\n"
                + "Android IP lockdown reported: " + (osLockdownReported ? "YES" : "NO") + "\n"
                + "Device-owner policy: " + managed + "\n"
                + "Overall local status: " + state.name() + "\n"
                + "Kernel / modem / hardware coverage: NOT_VERIFIED\n"
                + "Other Android-owned VPN settings: NOT_VERIFIED\n"
                + "No radio traffic or peer identifiers were collected for this summary.";
        return new Snapshot(state, headline, details, report);
    }
}
