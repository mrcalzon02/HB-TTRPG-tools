package org.cubechat.android;

/**
 * Host-testable formatter for a user-initiated, read-only device inventory.
 * Neither kernel driver support nor radio isolation is inferred from Android
 * system-feature declarations. No subscriber, SIM, MAC, or location IDs.
 */
final class GuardianDeviceInventoryText {
    private GuardianDeviceInventoryText() { }

    static String clean(String value) {
        if (value == null || value.trim().isEmpty()) return "UNAVAILABLE";
        String normalized = value.replaceAll("[\\p{Cntrl}]+", " ").trim();
        if (normalized.isEmpty()) return "UNAVAILABLE";
        return normalized.length() > 100 ? normalized.substring(0, 100) + "…" : normalized;
    }

    static String render(String manufacturer, String model, String device,
                         String androidVersion, int androidApi, String securityPatch,
                         String kernelVersion, String baseband,
                         boolean cellular, boolean wifi, boolean wifiDirect,
                         boolean bluetooth, boolean nfc, boolean uwb) {
        return "CubeChat RadioGuard — read-only device inventory\n"
                + "Manufacturer: " + clean(manufacturer) + "\n"
                + "Model: " + clean(model) + "\n"
                + "Device codename: " + clean(device) + "\n"
                + "Android: " + clean(androidVersion) + " (API " + androidApi + ")\n"
                + "Security patch: " + clean(securityPatch) + "\n"
                + "Kernel release: " + clean(kernelVersion) + "\n"
                + "Baseband reported by Android: " + clean(baseband) + "\n"
                + "System-declared features:\n"
                + "  Cellular: " + yesNo(cellular) + "\n"
                + "  Wi-Fi: " + yesNo(wifi) + "\n"
                + "  Wi-Fi Direct: " + yesNo(wifiDirect) + "\n"
                + "  Bluetooth: " + yesNo(bluetooth) + "\n"
                + "  NFC: " + yesNo(nfc) + "\n"
                + "  UWB: " + yesNo(uwb) + "\n"
                + "Kernel eBPF/tc/netfilter support: NOT_VERIFIED\n"
                + "Vendor radio and baseband controls: NOT_VERIFIED\n"
                + "Bootloader state and rollback: NOT_VERIFIED\n"
                + "Radio transmitters powered off: NOT_VERIFIED\n"
                + "Automatic trusted-system priority release: NOT_IMPLEMENTED\n"
                + "Emergency-call availability: NOT_TESTED_BY_PROJECT\n"
                + "This is a local device-capability inventory, not a security attestation. "
                + "It contains no SIM, subscriber, contact, location, or MAC identifiers.";
    }

    private static String yesNo(boolean reported) {
        return reported ? "DECLARED" : "NOT_DECLARED";
    }
}
