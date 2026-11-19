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
        check(system.diagnostics.contains("Device-owner restrictions: 1 of 1 PRESENT"),
                "managed status present");

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
        check(unknown.diagnostics.contains("Device-owner restrictions: 0 of 1 PRESENT"),
                "missing managed restrictions not reported as complete");
        check(unknown.diagnostics.contains("No radio traffic or peer identifiers"),
                "diagnostic is metadata-only");
        LockdownRecoverySummary.Snapshot managedVpn = s(true, true, true, true, false);
        check(managedVpn.state == LockdownRecoverySummary.State.MANAGED_POLICY_UNVERIFIED,
                "even OS VPN readback cannot hide missing managed radio restrictions");

        // Full readback is intentionally stricter than the old boolean API:
        // any leftover managed restriction is a failed ordinary manual release.
        LockdownRecoverySummary.Snapshot partlyReleased =
                LockdownRecoverySummary.inspect(false, false, false,
                        true, 2, 7, true, false, true);
        check(partlyReleased.state == LockdownRecoverySummary.State.RELEASE_INCOMPLETE,
                "partial release must never be described as clear");
        check(partlyReleased.diagnostics.contains("2 of 7 PRESENT"),
                "report partial count without sensitive package names");

        LockdownRecoverySummary.Snapshot lingeringOwnedVpn =
                LockdownRecoverySummary.inspect(false, false, false,
                        true, 0, 7, true, true, true);
        check(lingeringOwnedVpn.state == LockdownRecoverySummary.State.RELEASE_INCOMPLETE,
                "owner VPN remains even with zero radio restrictions");
        check(lingeringOwnedVpn.diagnostics.contains("always-on VPN: REPORTED_ACTIVE"),
                "owned VPN readback must be visible");

        LockdownRecoverySummary.Snapshot unreadable =
                LockdownRecoverySummary.inspect(false, false, false,
                        true, 0, 7, false, false, false);
        check(unreadable.state == LockdownRecoverySummary.State.READBACK_UNAVAILABLE,
                "unavailable managed readback must not mean released");
        check(unreadable.diagnostics.contains("Device-owner restrictions: UNKNOWN"),
                "show explicit unavailable state");

        LockdownRecoverySummary.Snapshot confirmedOff =
                LockdownRecoverySummary.inspect(false, false, false,
                        true, 0, 7, true, false, true);
        check(confirmedOff.state == LockdownRecoverySummary.State.NOT_REQUESTED,
                "no owned policy and clean reads permit ordinary off status");

        LockdownRecoverySummary.Snapshot partialActive =
                LockdownRecoverySummary.inspect(true, true, true,
                        true, 6, 7, true, true, true);
        check(partialActive.state == LockdownRecoverySummary.State.MANAGED_POLICY_UNVERIFIED,
                "OS VPN status must not conceal one missing radio policy");
        LockdownRecoverySummary.Snapshot missingOwnedVpn =
                LockdownRecoverySummary.inspect(true, true, true,
                        true, 7, 7, true, false, true);
        check(missingOwnedVpn.state == LockdownRecoverySummary.State.MANAGED_POLICY_UNVERIFIED,
                "OS VPN status does not confirm ownership when device owner is present");

        LockdownRecoverySummary.Snapshot inconsistentOff =
                LockdownRecoverySummary.inspect(false, false, true,
                        false, 0, 0, false, false, false);
        check(inconsistentOff.state == LockdownRecoverySummary.State.RELEASE_INCOMPLETE,
                "reported OS lockdown is inconsistent with clean off");
        LockdownRecoverySummary.Snapshot unreleasedUnverifiedVpn =
                LockdownRecoverySummary.inspect(false, false, false,
                        true, 0, 7, true, false, false);
        check(unreleasedUnverifiedVpn.state == LockdownRecoverySummary.State.READBACK_UNAVAILABLE,
                "unknown VPN owner state cannot imply clean shutdown");

        System.out.println("LockdownRecoverySummary: " + checks
                + " offline UI-model assertions passed; no device controls exercised");
    }
}
