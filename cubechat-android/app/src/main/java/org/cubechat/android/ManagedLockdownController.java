package org.cubechat.android;

import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.UserManager;

/**
 * Optional fully-managed-device hardening. Never request device ownership or
 * enroll the phone; this class only works if the owner already provisioned
 * CubeChat as the device owner. It does not obtain root or radio firmware access.
 *
 * Strict mode explicitly blocks Bluetooth and Wi-Fi Direct for ALL applications.
 * CubeChat therefore cannot use those transports while this tier is enforced.
 * Wi-Fi IP remains available to CubeChat through the protected peer sockets,
 * and is covered by the always-on default-deny VPN. Cellular modem/IMS/system
 * traffic remain controlled by Android and the carrier.
 */
final class ManagedLockdownController {
    private static final String[] RADIO_RESTRICTIONS = {
            UserManager.DISALLOW_BLUETOOTH,
            UserManager.DISALLOW_BLUETOOTH_SHARING,
            UserManager.DISALLOW_CONFIG_BLUETOOTH
    };

    private ManagedLockdownController() { }

    private static DevicePolicyManager manager(Context context) {
        return (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
    }

    private static ComponentName admin(Context context) {
        return new ComponentName(context.getApplicationContext(), CubeDeviceAdmin.class);
    }

    static boolean isDeviceOwner(Context context) {
        DevicePolicyManager dpm = manager(context);
        return dpm != null && dpm.isDeviceOwnerApp(context.getPackageName());
    }

    /** Strongest stock-Android managed-device configuration, not a hardware kill switch. */
    static void enforce(Context context) throws Exception {
        if (!isDeviceOwner(context)) throw new SecurityException("CubeChat is not the device owner");
        if (!LockdownFirewall.armed(context)) throw new IllegalStateException("Arm the IP firewall first");
        DevicePolicyManager dpm = manager(context);
        ComponentName admin = admin(context);

        // Apply this FIRST: later restriction failures must not produce an
        // unfiltered device. No allowlist of third-party applications.
        dpm.setAlwaysOnVpnPackage(admin, context.getPackageName(), true);
        for (String restriction : RADIO_RESTRICTIONS) dpm.addUserRestriction(admin, restriction);

        if (Build.VERSION.SDK_INT >= 33) {
            dpm.addUserRestriction(admin, UserManager.DISALLOW_WIFI_DIRECT);
            dpm.addUserRestriction(admin, UserManager.DISALLOW_WIFI_TETHERING);
            // Keep Wi-Fi in its current state (user can connect before arming).
            // This controls state changes, NOT other applications' radio access.
            dpm.addUserRestriction(admin, UserManager.DISALLOW_CHANGE_WIFI_STATE);
        }
        // This prevents ordinary settings changes, not compromise of SystemUI.
        dpm.addUserRestriction(admin, UserManager.DISALLOW_CONFIG_VPN);
    }

    /**
     * Undo only restrictions owned by this CubeChat device admin. If rollback
     * fails, the caller must NOT disarm the VPN or report an unrestricted state.
     */
    static void release(Context context) throws Exception {
        if (!isDeviceOwner(context)) return;
        DevicePolicyManager dpm = manager(context);
        ComponentName admin = admin(context);
        // Release state restrictions before radio preferences are changed.
        if (Build.VERSION.SDK_INT >= 33) {
            dpm.clearUserRestriction(admin, UserManager.DISALLOW_CHANGE_WIFI_STATE);
            dpm.clearUserRestriction(admin, UserManager.DISALLOW_WIFI_TETHERING);
            dpm.clearUserRestriction(admin, UserManager.DISALLOW_WIFI_DIRECT);
        }
        for (String restriction : RADIO_RESTRICTIONS) dpm.clearUserRestriction(admin, restriction);
        dpm.clearUserRestriction(admin, UserManager.DISALLOW_CONFIG_VPN);
        dpm.setAlwaysOnVpnPackage(admin, null, false);
    }

    static boolean restrictionsPresent(Context context) {
        if (!isDeviceOwner(context)) return false;
        DevicePolicyManager dpm = manager(context);
        Bundle flags;
        try { flags = dpm.getUserRestrictions(admin(context)); }
        catch (RuntimeException e) { return false; }
        for (String restriction : RADIO_RESTRICTIONS)
            if (!flags.getBoolean(restriction, false)) return false;
        if (!flags.getBoolean(UserManager.DISALLOW_CONFIG_VPN, false)) return false;
        if (Build.VERSION.SDK_INT >= 33 && (!flags.getBoolean(UserManager.DISALLOW_WIFI_DIRECT, false)
                || !flags.getBoolean(UserManager.DISALLOW_WIFI_TETHERING, false)
                || !flags.getBoolean(UserManager.DISALLOW_CHANGE_WIFI_STATE, false))) return false;
        return true;
    }
}
