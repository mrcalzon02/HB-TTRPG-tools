package org.cubechat.android;

/** Host-only formatting fixtures: no Android context, radio, modem or network calls. */
public final class GuardianDeviceInventoryTextTest {
    private static int assertions;

    private static void check(boolean yes, String reason) {
        assertions++;
        if (!yes) throw new AssertionError(reason);
    }

    public static void main(String[] args) {
        check(GuardianDeviceInventoryText.clean(null).equals("UNAVAILABLE"),
                "null field remains explicit");
        check(GuardianDeviceInventoryText.clean(" ").equals("UNAVAILABLE"),
                "empty field remains explicit");
        check(GuardianDeviceInventoryText.clean("Example\nBrand").equals("Example Brand"),
                "untrusted build strings cannot add new report lines");
        check(GuardianDeviceInventoryText.clean("A".repeat(120)).length() <= 101,
                "long build strings are bounded");
        check(GuardianDeviceInventoryText.clean("Model\u2028VERIFIED\u202e").equals("Model VERIFIED"),
                "unicode line and bidi controls cannot spoof additional report fields");

        String report = GuardianDeviceInventoryText.render(
                "Example", "Test Phone", "model_test", "15", 35, "2026-10-05",
                "6.1.0-test", "version-01", true, true, false, true, false, false);
        check(report.contains("Test Phone"), "model is identified");
        check(report.contains("Android: 15 (API 35)"), "Android version and API included");
        check(report.contains("Kernel release: 6.1.0-test"), "kernel release included");
        check(report.contains("Baseband reported by Android: version-01"),
                "baseband attribution truthful");
        check(report.contains("Cellular: DECLARED"), "declared feature");
        check(report.contains("Wi-Fi Direct: NOT_DECLARED"), "missing declaration");
        check(report.contains("Kernel eBPF/tc/netfilter support: NOT_VERIFIED"),
                "never infer kernel hooks from Android feature flags");
        check(report.contains("Vendor radio and baseband controls: NOT_VERIFIED"),
                "never infer vendor modem controls");
        check(report.contains("Radio transmitters powered off: NOT_VERIFIED"),
                "never advertise radio shutdown");
        check(report.contains("Automatic trusted-system priority release: NOT_IMPLEMENTED"),
                "never imply unsupported privileged integrations exist");
        check(!report.contains("123456789012345"), "does not invent subscriber IDs");
        System.out.println("GuardianDeviceInventoryText: " + assertions
                + " offline formatter checks passed; no hardware accessed");
    }
}
