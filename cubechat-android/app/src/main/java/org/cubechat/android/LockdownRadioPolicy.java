package org.cubechat.android;

import android.content.Context;

/**
 * Transient CubeChat RADIO authorizations for strict mode.
 *
 * These grants control CubeChat's own radio sessions, not the operating system
 * or other apps. No grant persists after a process restart. Existing saved
 * Bluetooth / Wi-Fi Direct pairings must not auto-restore when the user enables
 * network lockdown. A new explicit route selection is required.
 */
final class LockdownRadioPolicy {
    private static volatile boolean bluetoothChosen;
    private static volatile boolean wifiDirectChosen;

    private LockdownRadioPolicy() { }

    static void revokeAll() {
        bluetoothChosen = false;
        wifiDirectChosen = false;
    }

    static void chooseBluetooth(Context context) {
        if (LockdownFirewall.armed(context)) bluetoothChosen = true;
    }

    static void chooseWifiDirect(Context context) {
        if (LockdownFirewall.armed(context)) wifiDirectChosen = true;
    }

    static boolean bluetoothAllowed(Context context) {
        return !LockdownFirewall.armed(context) || bluetoothChosen;
    }

    static boolean wifiDirectAllowed(Context context) {
        return !LockdownFirewall.armed(context) || wifiDirectChosen;
    }
}
