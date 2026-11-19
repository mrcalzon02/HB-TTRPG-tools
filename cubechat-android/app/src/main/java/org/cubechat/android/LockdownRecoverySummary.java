package org.cubechat.android;

/**
 * Pure offline status formatting for ordinary manual recovery.
 * These inputs come from Android-local reads, NOT independent radio or
 * emergency-function attestation. It must not turn UNKNOWN into "released".
 */
final class LockdownRecoverySummary {
    enum State {
        NOT_REQUESTED, LOCAL_VPN_ACTIVE, OS_IP_LOCKDOWN_REPORTED,
        REQUESTED_NOT_RUNNING, MANAGED_POLICY_UNVERIFIED,
        RELEASE_INCOMPLETE, READBACK_UNAVAILABLE
    }

    static final class Snapshot {
        final State state;
        final String headline, details, diagnostics;
        private Snapshot(State state, String headline, String details, String diagnostics) {
            this.state = state;
            this.headline = headline;
            this.details = details;
            this.diagnostics = diagnostics;
        }
    }

    private LockdownRecoverySummary() { }

    /** Compatibility with the initial Boolean-only regression fixtures. */
    static Snapshot inspect(boolean armed, boolean vpnRunning, boolean osLockdownReported,
                            boolean deviceOwner, boolean allManagedRestrictionsPresent) {
        return inspect(armed, vpnRunning, osLockdownReported, deviceOwner,
                allManagedRestrictionsPresent ? 1 : 0, 1,
                true, deviceOwner && allManagedRestrictionsPresent, true);
    }

    /**
     * The real UI passes read-only device-owner state here. A partially retained
     * policy, owned Always-on VPN, or unreadable restriction snapshot is a
     * separate condition, not the same thing as "no restrictions".
     */
    static Snapshot inspect(boolean armed, boolean vpnRunning, boolean osLockdownReported,
                            boolean deviceOwner, int restrictionsPresent,
                            int restrictionsExpected, boolean restrictionsReadable,
                            boolean cubechatOwnsAlwaysOnVpn, boolean vpnReadbackReadable) {
        State state;
        String headline;
        String details;
        boolean ownedRestrictionsRemain = deviceOwner &&
                (restrictionsPresent > 0 || cubechatOwnsAlwaysOnVpn);
        boolean unknownManagedReadback = deviceOwner &&
                (!restrictionsReadable || !vpnReadbackReadable);
        boolean managedIncomplete = deviceOwner &&
                (unknownManagedReadback || restrictionsPresent < restrictionsExpected
                        || !cubechatOwnsAlwaysOnVpn);

        if (!armed && (vpnRunning || osLockdownReported || ownedRestrictionsRemain)) {
            state = State.RELEASE_INCOMPLETE;
            headline = "INCOMPLETE RELEASE";
            details = "CubeChat lockdown was turned off, but a local VPN or one or more "
                    + "CubeChat-managed restrictions are still reported. Retry release and "
                    + "review Android VPN settings. Other owners' policies remain unverified.";
        } else if (!armed && unknownManagedReadback) {
            state = State.READBACK_UNAVAILABLE;
            headline = "RELEASE COULD NOT BE VERIFIED";
            details = "The phone has a CubeChat device owner, but Android would not return "
                    + "all policy readbacks. Do not assume restrictions are gone.";
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
        } else if (managedIncomplete) {
            state = State.MANAGED_POLICY_UNVERIFIED;
            headline = "MANAGED RADIO RESTRICTIONS UNVERIFIED";
            details = "Android device-owner mode is present, but required restrictions or "
                    + "CubeChat-owned always-on VPN were not confirmed. The active VPN does "
                    + "not establish complete device lockdown.";
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
                : !restrictionsReadable ? "UNKNOWN"
                : restrictionsPresent + " of " + restrictionsExpected + " PRESENT";
        String vpnOwnership = !deviceOwner ? "NOT_DEVICE_OWNER"
                : !vpnReadbackReadable ? "UNKNOWN"
                : cubechatOwnsAlwaysOnVpn ? "REPORTED_ACTIVE" : "NOT_REPORTED";
        String report = "CubeChat RadioGuard diagnostic (manual status only)\n"
                + "Requested IP lockdown: " + (armed ? "YES" : "NO") + "\n"
                + "Local VPN running: " + (vpnRunning ? "YES" : "NO") + "\n"
                + "Android IP lockdown reported: " + (osLockdownReported ? "YES" : "NO") + "\n"
                + "Device-owner restrictions: " + managed + "\n"
                + "CubeChat-owned always-on VPN: " + vpnOwnership + "\n"
                + "Overall local status: " + state.name() + "\n"
                + "Kernel / modem / hardware coverage: NOT_VERIFIED\n"
                + "Other Android-owned VPN settings: NOT_VERIFIED\n"
                + "No radio traffic or peer identifiers were collected for this summary.";
        return new Snapshot(state, headline, details, report);
    }
}
