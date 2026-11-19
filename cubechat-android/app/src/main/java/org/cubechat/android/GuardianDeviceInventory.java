package org.cubechat.android;

import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;

/** Read-only Android capability claims. Does not enumerate radios or issue modem commands. */
final class GuardianDeviceInventory {
    private GuardianDeviceInventory() { }

    static String snapshot(Context context) {
        PackageManager pm = context.getPackageManager();
        String radioVersion;
        try { radioVersion = Build.getRadioVersion(); }
        catch (RuntimeException unavailable) { radioVersion = "UNAVAILABLE"; }

        return GuardianDeviceInventoryText.render(
                Build.MANUFACTURER, Build.MODEL, Build.DEVICE, Build.VERSION.RELEASE,
                Build.VERSION.SDK_INT, Build.VERSION.SECURITY_PATCH,
                System.getProperty("os.version", "UNAVAILABLE"), radioVersion,
                pm.hasSystemFeature(PackageManager.FEATURE_TELEPHONY),
                pm.hasSystemFeature(PackageManager.FEATURE_WIFI),
                pm.hasSystemFeature(PackageManager.FEATURE_WIFI_DIRECT),
                pm.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH),
                pm.hasSystemFeature(PackageManager.FEATURE_NFC),
                pm.hasSystemFeature("android.hardware.uwb"));
    }
}
