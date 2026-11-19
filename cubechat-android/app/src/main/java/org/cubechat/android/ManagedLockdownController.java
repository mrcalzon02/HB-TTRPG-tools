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
    private static final String VPN_PROVENANCE_PREF = "cubechat-managed-vpn-provenance";
    private static final String VPN_CONFIGURED_BY_ADMIN = "cubechat-admin-installed-vpn";
    private static final String[] RADIO_RESTRICTIONS = {
            UserManager.DISALLOW_BLUETOOTH,
            UserManager.DISALLOW_BLUETOOTH_SHARING,
            UserManager.DISALLOW_CONFIG_BLUETOOTH
    };

    private ManagedLockdownController() { }

    /**
     * Deployment gate, intentionally CLOSED on this build.
     * Android does not expose a universal, guaranteed early priority handoff
     * to ordinary apps. Do not install persistent device-owner radio/VPN
     * restrictions until an audited, trusted OS component can disengage them
     * before platform telephone services might need the connection.
     *
     * This is NOT an emergency-path test or an emergency state detector.
     */
    static boolean deploymentSupported() { return false; }

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
        if (!deploymentSupported())
            throw new UnsupportedOperationException(
                    "Advanced managed lockdown unavailable: trusted priority-release integration absent");
        if (!isDeviceOwner(context)) throw new SecurityException("CubeChat is not the device owner");
        if (!LockdownFirewall.armed(context)) throw new IllegalStateException("Arm the IP firewall first");
        DevicePolicyManager dpm = manager(context);
        ComponentName admin = admin(context);

        // Do not silently replace a separately configured user/third-party
        // always-on VPN. On older Android even the same package name is not
        // enough to establish that this admin previously installed the VPN.
        String existingVpn = dpm.getAlwaysOnVpnPackage(admin);
        boolean locallyManagedBefore = context.getSharedPreferences(
                VPN_PROVENANCE_PREF, Context.MODE_PRIVATE)
                .getBoolean(VPN_CONFIGURED_BY_ADMIN, false);
        if (existingVpn != null &&
                (!context.getPackageName().equals(existingVpn)
                        || (Build.VERSION.SDK_INT < 31 && !locallyManagedBefore)))
            throw new IllegalStateException(
                    "Existing always-on VPN cannot be replaced without verified ownership");

        // Apply this FIRST: later restriction failures must not produce an
        // unfiltered device. No allowlist of third-party applications.
        dpm.setAlwaysOnVpnPackage(admin, context.getPackageName(), true);
        if (Build.VERSION.SDK_INT < 31 && !context.getSharedPreferences(
                VPN_PROVENANCE_PREF, Context.MODE_PRIVATE).edit()
                .putBoolean(VPN_CONFIGURED_BY_ADMIN, true).commit())
            throw new IllegalStateException("Could not record VPN ownership for legacy Android");
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

    private interface ReleaseAction { void perform() throws Exception; }

    private static void tryRelease(String name, ReleaseAction action,
                                   java.util.List<String> failures) {
        try { action.perform(); }
        catch (Exception failure) {
            failures.add(name + " (" + failure.getClass().getSimpleName() + ")");
        }
    }

    /**
     * Best-effort release of ALL CubeChat-admin restrictions.
     *
     * A failed operation cannot prevent us from attempting the rest, especially
     * removing our own always-on VPN. A caller must report a partial release;
     * this does not imply emergency-call compatibility. This method is also
     * used by the ordinary user-requested "Disable lockdown" control.
     */
    static void release(Context context) throws Exception {
        if (!isDeviceOwner(context)) return;
        DevicePolicyManager dpm = manager(context);
        ComponentName admin = admin(context);
        java.util.List<String> failures = new java.util.ArrayList<>();
        if (Build.VERSION.SDK_INT >= 33) {
            tryRelease("Wi-Fi state restriction",
                    () -> dpm.clearUserRestriction(admin, UserManager.DISALLOW_CHANGE_WIFI_STATE), failures);
            tryRelease("Wi-Fi tethering restriction",
                    () -> dpm.clearUserRestriction(admin, UserManager.DISALLOW_WIFI_TETHERING), failures);
            tryRelease("Wi-Fi Direct restriction",
                    () -> dpm.clearUserRestriction(admin, UserManager.DISALLOW_WIFI_DIRECT), failures);
        }
        for (String restriction : RADIO_RESTRICTIONS)
            tryRelease(restriction, () -> dpm.clearUserRestriction(admin, restriction), failures);
        tryRelease("VPN configuration restriction",
                () -> dpm.clearUserRestriction(admin, UserManager.DISALLOW_CONFIG_VPN), failures);
        // On Android versions older than API31, a null package may clear a
        // user-managed VPN too. Read first, and never remove a different app.
        // Even matching package names need our own durable provenance on old OS.
        tryRelease("CubeChat-owned always-on VPN", () -> {
            android.content.SharedPreferences source = context.getSharedPreferences(
                    VPN_PROVENANCE_PREF, Context.MODE_PRIVATE);
            String reported = dpm.getAlwaysOnVpnPackage(admin);
            ManagedVpnOwnership.Decision decision = ManagedVpnOwnership.decide(
                    context.getPackageName(), reported, Build.VERSION.SDK_INT,
                    source.getBoolean(VPN_CONFIGURED_BY_ADMIN, false));
            if (decision == ManagedVpnOwnership.Decision.OWNERSHIP_UNVERIFIED)
                throw new IllegalStateException("Cannot establish safe removal ownership");
            if (decision == ManagedVpnOwnership.Decision.CLEAR_OUR_POLICY)
                dpm.setAlwaysOnVpnPackage(admin, null, false);
            // Do not retain a stale ownership marker after verified readback
            // shows the VPN is absent/different, or the removal call returned.
            if (!source.edit().putBoolean(VPN_CONFIGURED_BY_ADMIN, false).commit())
                throw new IllegalStateException("Could not clear legacy VPN ownership record");
        }, failures);
        if (!failures.isEmpty())
            throw new IllegalStateException("Not all managed restrictions were released: "
                    + String.join(", ", failures));
    }

    /**
     * Read-only snapshot of restrictions issued through THIS admin. A partial
     * teardown must not look identical to a completely clean device.
     * Android may report null for system-owned Always-on VPN configurations;
     * those remain outside this application's attestation.
     */
    static final class Audit {
        final boolean deviceOwner;
        final boolean restrictionsReadable, vpnReadable;
        final int appliedRestrictions, totalRestrictions;
        final boolean cubechatOwnsAlwaysOnVpn;
        final String vpnState;

        Audit(boolean owner, boolean restrictionsReadable, boolean vpnReadable,
              int applied, int total, boolean ownsVpn, String vpnState) {
            this.deviceOwner = owner;
            this.restrictionsReadable = restrictionsReadable;
            this.vpnReadable = vpnReadable;
            this.appliedRestrictions = applied;
            this.totalRestrictions = total;
            this.cubechatOwnsAlwaysOnVpn = ownsVpn;
            this.vpnState = vpnState;
        }

        String localSummary() {
            if (!deviceOwner) return "Device owner: not provisioned";
            String restrictions = restrictionsReadable
                    ? appliedRestrictions + " of " + totalRestrictions + " CubeChat policy restrictions reported"
                    : "CubeChat restriction readback unavailable";
            return restrictions + "\nCubeChat-managed VPN package: " + vpnState;
        }
    }

    static Audit audit(Context context) {
        if (!isDeviceOwner(context)) return new Audit(
                false, false, false, 0, 0, false, "NOT_DEVICE_OWNER");

        DevicePolicyManager dpm = manager(context);
        ComponentName owner = admin(context);
        String[] known = Build.VERSION.SDK_INT >= 33
                ? new String[] { UserManager.DISALLOW_BLUETOOTH,
                    UserManager.DISALLOW_BLUETOOTH_SHARING,
                    UserManager.DISALLOW_CONFIG_BLUETOOTH,
                    UserManager.DISALLOW_WIFI_DIRECT,
                    UserManager.DISALLOW_WIFI_TETHERING,
                    UserManager.DISALLOW_CHANGE_WIFI_STATE,
                    UserManager.DISALLOW_CONFIG_VPN }
                : new String[] { UserManager.DISALLOW_BLUETOOTH,
                    UserManager.DISALLOW_BLUETOOTH_SHARING,
                    UserManager.DISALLOW_CONFIG_BLUETOOTH,
                    UserManager.DISALLOW_CONFIG_VPN };
        boolean restrictionsReadable = false;
        int applied = 0;
        try {
            Bundle restrictions = dpm.getUserRestrictions(owner);
            if (restrictions != null) {
                restrictionsReadable = true;
                for (String name : known) if (restrictions.getBoolean(name, false)) applied++;
            }
        } catch (RuntimeException ignored) { /* Not proven cleared. */ }

        boolean vpnReadable = false;
        boolean ownVpn = false;
        String vpnState = "UNVERIFIED";
        try {
            String vpn = dpm.getAlwaysOnVpnPackage(owner);
            vpnReadable = true;
            ownVpn = context.getPackageName().equals(vpn);
            vpnState = ownVpn ? "CUBECHAT_PACKAGE_REPORTED"
                    : vpn == null ? "NONE_OR_SYSTEM" : "ANOTHER_PACKAGE";
        } catch (RuntimeException ignored) { /* Not proven cleared. */ }
        return new Audit(true, restrictionsReadable, vpnReadable,
                applied, known.length, ownVpn, vpnState);
    }

    static boolean restrictionsPresent(Context context) {
        if (!isDeviceOwner(context)) return false;
        DevicePolicyManager dpm = manager(context);
        Bundle flags;
        try { flags = dpm.getUserRestrictions(admin(context)); }
        catch (RuntimeException e) { return false; }
        if (flags == null) return false;
        for (String restriction : RADIO_RESTRICTIONS)
            if (!flags.getBoolean(restriction, false)) return false;
        if (!flags.getBoolean(UserManager.DISALLOW_CONFIG_VPN, false)) return false;
        if (Build.VERSION.SDK_INT >= 33 && (!flags.getBoolean(UserManager.DISALLOW_WIFI_DIRECT, false)
                || !flags.getBoolean(UserManager.DISALLOW_WIFI_TETHERING, false)
                || !flags.getBoolean(UserManager.DISALLOW_CHANGE_WIFI_STATE, false))) return false;
        return true;
    }
}
