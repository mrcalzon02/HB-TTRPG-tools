package org.cubechat.android;

/**
 * Build-time capability eligibility, NOT a protection attestation.
 *
 * Only the ordinary user-consented application VPN fallback is eligible in
 * this build. A device-owner, kernel, vendor radio or modem actuator needs
 * independently reviewed hardware support and an early trusted priority
 * release mechanism before it can become eligible.
 *
 * This model never invokes calling, telephony, networking or radio services.
 */
final class GuardianDeploymentGate {
    enum Tier { APPLICATION_VPN, DEVICE_OWNER, KERNEL_IP, WIFI_BLUETOOTH_DRIVER, CELLULAR_MODEM }

    enum Eligibility { USER_CONSENT_AND_OS_CHECKS_REQUIRED, DISABLED_UNVERIFIED }

    private GuardianDeploymentGate() { }

    static Eligibility eligibility(Tier tier) {
        if (tier == null) throw new IllegalArgumentException("Missing enforcement tier");
        return tier == Tier.APPLICATION_VPN
                ? Eligibility.USER_CONSENT_AND_OS_CHECKS_REQUIRED
                : Eligibility.DISABLED_UNVERIFIED;
    }

    /** This flag must remain false until a separate, audited integration exists. */
    static boolean managedDevicePolicyAllowed() {
        return eligibility(Tier.DEVICE_OWNER) != Eligibility.DISABLED_UNVERIFIED;
    }
}
