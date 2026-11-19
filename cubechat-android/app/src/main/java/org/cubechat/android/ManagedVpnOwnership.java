package org.cubechat.android;

/**
 * Decides whether CubeChat may clear an Android always-on VPN configuration.
 *
 * On Android 12 / API 31+, DevicePolicyManager restricts removal to the policy
 * created by the calling admin. On older versions, the owner must also have a
 * durable local record that it installed the current CubeChat package VPN.
 *
 * A matching VPN *package* is not, by itself, proof that CubeChat configured
 * that VPN. This model never performs a DevicePolicyManager operation.
 */
final class ManagedVpnOwnership {
    enum Decision { NONE_OR_SYSTEM, PRESERVE_OTHER_PACKAGE, CLEAR_OUR_POLICY, OWNERSHIP_UNVERIFIED }

    private ManagedVpnOwnership() { }

    static Decision decide(String ourPackage, String reportedVpnPackage,
                           int androidApi, boolean priorAdminInstallRecorded) {
        if (ourPackage == null || ourPackage.isBlank())
            throw new IllegalArgumentException("CubeChat package identifier required");
        if (androidApi < 24)
            return Decision.OWNERSHIP_UNVERIFIED;
        if (reportedVpnPackage == null || reportedVpnPackage.isEmpty())
            return Decision.NONE_OR_SYSTEM;
        if (!ourPackage.equals(reportedVpnPackage))
            return Decision.PRESERVE_OTHER_PACKAGE;
        if (androidApi >= 31 || priorAdminInstallRecorded)
            return Decision.CLEAR_OUR_POLICY;
        return Decision.OWNERSHIP_UNVERIFIED;
    }
}
