package org.cubechat.android;

/** Host-only capability eligibility test; no system, network or call activity. */
public final class GuardianDeploymentGateTest {
    private static int checks;

    private static void check(boolean valid, String description) {
        checks++;
        if (!valid) throw new AssertionError(description);
    }

    public static void main(String[] args) {
        check(GuardianDeploymentGate.eligibility(
                GuardianDeploymentGate.Tier.APPLICATION_VPN)
                == GuardianDeploymentGate.Eligibility.USER_CONSENT_AND_OS_CHECKS_REQUIRED,
                "ordinary VPN remains an opt-in fallback, not automatic certification");
        for (GuardianDeploymentGate.Tier tier : new GuardianDeploymentGate.Tier[] {
                GuardianDeploymentGate.Tier.DEVICE_OWNER,
                GuardianDeploymentGate.Tier.KERNEL_IP,
                GuardianDeploymentGate.Tier.WIFI_BLUETOOTH_DRIVER,
                GuardianDeploymentGate.Tier.CELLULAR_MODEM
        }) {
            check(GuardianDeploymentGate.eligibility(tier)
                    == GuardianDeploymentGate.Eligibility.DISABLED_UNVERIFIED,
                    "unverified privileged tier disabled: " + tier);
        }
        check(!GuardianDeploymentGate.managedDevicePolicyAllowed(),
                "device-owner policy writes remain blocked in this build");
        try {
            GuardianDeploymentGate.eligibility(null);
            throw new AssertionError("null tier incorrectly accepted");
        } catch (IllegalArgumentException expected) {
            check(true, "unknown tier fails closed");
        }
        check(GuardianDeploymentGate.Tier.values().length == 5,
                "new enforcement tier requires updating the test allowlist");
        System.out.println("GuardianDeploymentGate: " + checks
                + " host-only eligibility assertions passed; no privileged actions");
    }
}
