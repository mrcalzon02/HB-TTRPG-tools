package org.cubechat.android;

/** Host-only VPN ownership decisions; no Android device/telephony operations. */
public final class ManagedVpnOwnershipTest {
    private static int checks;

    private static void check(boolean good, String why) {
        checks++;
        if (!good) throw new AssertionError(why);
    }

    private static void expect(String ours, String observed, int api, boolean previouslyInstalled,
                               ManagedVpnOwnership.Decision expected, String why) {
        check(ManagedVpnOwnership.decide(ours, observed, api, previouslyInstalled) == expected, why);
    }

    public static void main(String[] args) {
        String ours = "org.cubechat.android";
        expect(ours, null, 26, false, ManagedVpnOwnership.Decision.NONE_OR_SYSTEM,
                "no configured app VPN");
        expect(ours, null, 35, false, ManagedVpnOwnership.Decision.NONE_OR_SYSTEM,
                "system-owned VPN is not assumed ours");
        expect(ours, "org.other.vpn", 26, true,
                ManagedVpnOwnership.Decision.PRESERVE_OTHER_PACKAGE,
                "never clear another package on old Android");
        expect(ours, "org.other.vpn", 35, true,
                ManagedVpnOwnership.Decision.PRESERVE_OTHER_PACKAGE,
                "never clear another package on modern Android");
        expect(ours, ours, 26, false, ManagedVpnOwnership.Decision.OWNERSHIP_UNVERIFIED,
                "old Android: package match is not ownership");
        expect(ours, ours, 30, false, ManagedVpnOwnership.Decision.OWNERSHIP_UNVERIFIED,
                "API 30 cannot prove which admin installed same-package VPN");
        expect(ours, ours, 26, true, ManagedVpnOwnership.Decision.CLEAR_OUR_POLICY,
                "old Android allows clear when our prior installation is recorded");
        expect(ours, ours, 30, true, ManagedVpnOwnership.Decision.CLEAR_OUR_POLICY,
                "legacy recorded installation accepted");
        expect(ours, ours, 31, false, ManagedVpnOwnership.Decision.CLEAR_OUR_POLICY,
                "API31 DPM enforces caller ownership");
        expect(ours, ours, 35, false, ManagedVpnOwnership.Decision.CLEAR_OUR_POLICY,
                "API35 DPM enforces caller ownership");
        expect(ours, ours + ".rogue", 26, true,
                ManagedVpnOwnership.Decision.PRESERVE_OTHER_PACKAGE,
                "prefix attack is not an exact match");
        expect(ours, ours.toUpperCase(), 35, true,
                ManagedVpnOwnership.Decision.PRESERVE_OTHER_PACKAGE,
                "package identifier is case sensitive");
        expect(ours, ours, 23, true, ManagedVpnOwnership.Decision.OWNERSHIP_UNVERIFIED,
                "VPN ownership APIs not available before API24");

        for (String invalid : new String[] {"", "   "}) {
            try {
                ManagedVpnOwnership.decide(invalid, ours, 35, true);
                throw new AssertionError("Accepted invalid package");
            } catch (IllegalArgumentException expected) {
                check(true, "reject missing package name");
            }
        }
        check(ManagedVpnOwnership.Decision.values().length == 4,
                "all decisions accounted for");
        System.out.println("ManagedVpnOwnership: " + checks
                + " offline assertions passed; no Android policies modified");
    }
}
