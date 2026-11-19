package org.cubechat.android;

/** Ordinary manual-release display fixtures ONLY. No telephony or radio events. */
public final class LockdownRecoverySummaryTest {
    private static int checks;

    private static void check(boolean yes, String message) {
        checks++;
        if (!yes) throw new AssertionError(message);
    }

    private static LockdownRecoverySummary.Snapshot s(boolean armed, boolean running,
            boolean os, boolean owner, boolean restrictions) {
        return LockdownRecoverySummary.inspect(armed, running, os, owner, restrictions);
    }

    public static void main(String[] args) {
        LockdownRecoverySummary.Snapshot off = s(false, false, false, false, false);
        check(off.state == LockdownRecoverySummary.State.NOT_REQUESTED, "ordinary off");
        check(off.headline.contains("NOT REQUESTED"), "off label");
        check(off.details.contains("NOT proof"), "off is not an absolute guarantee");
        check(off.diagnostics.contains("Kernel / modem / hardware coverage: NOT_VERIFIED"),
                "never imply radio isolation");
        check(off.diagnostics.contains("Other Android-owned VPN settings: NOT_VERIFIED"),
                "external VPN state unverified");
        check(!off.diagnostics.contains("192.168."), "no unrequested peer address");

        LockdownRecoverySummary.Snapshot inactive = s(true, false, false, true, true);
        check(inactive.state == LockdownRecoverySummary.State.REQUESTED_NOT_RUNNING,
                "requested but absent filter");
        check(inactive.details.contains("may be possible"), "avoid fail-closed claims");

        LockdownRecoverySummary.Snapshot active = s(true, true, false, false, false);
        check(active.state == LockdownRecoverySummary.State.LOCAL_VPN_ACTIVE,
                "local VPN not proof of reboot protection");
        check(active.headline.contains("UNVERIFIED"), "visible uncertainty");

        LockdownRecoverySummary.Snapshot system = s(true, true, true, true, true);
        check(system.state == LockdownRecoverySummary.State.OS_IP_LOCKDOWN_REPORTED,
                "only system reports OS policy");
        check(system.details.contains("does not establish"), "OS status not radio status");
        check(system.diagnostics.contains("RESTRICTIONS_REPORTED"), "managed status present");

        LockdownRecoverySummary.Snapshot leftovers = s(false, false, false, true, true);
        check(leftovers.state == LockdownRecoverySummary.State.RELEASE_INCOMPLETE,
                "managed restrictions remain");
        check(leftovers.headline.contains("INCOMPLETE"), "clear warning");

        LockdownRecoverySummary.Snapshot vpnLeft = s(false, true, false, false, false);
        check(vpnLeft.state == LockdownRecoverySummary.State.RELEASE_INCOMPLETE,
                "VPN still running after off");
        check(vpnLeft.diagnostics.contains("Local VPN running: YES"), "report lingering VPN");

        LockdownRecoverySummary.Snapshot unknown = s(true, true, false, true, false);
        check(unknown.state == LockdownRecoverySummary.State.MANAGED_POLICY_UNVERIFIED,
                "managed restrictions have priority over partial VPN confidence");
        check(unknown.diagnostics.contains("Device-owner policy: NOT_CONFIRMED"),
                "missing managed restrictions not reported as complete");
        check(unknown.diagnostics.contains("No radio traffic or peer identifiers"),
                "diagnostic is metadata-only");
        LockdownRecoverySummary.Snapshot managedVpn = s(true, true, true, true, false);
        check(managedVpn.state == LockdownRecoverySummary.State.MANAGED_POLICY_UNVERIFIED,
                "even OS VPN readback cannot hide missing managed radio restrictions");

        System.out.println("LockdownRecoverySummary: " + checks
                + " offline UI-model assertions passed; no device controls exercised");
    }
}
