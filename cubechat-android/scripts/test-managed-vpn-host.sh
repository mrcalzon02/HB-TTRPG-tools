#!/usr/bin/env bash
# Compile the REAL ManagedLockdownController against inert Android stubs.
# Never invokes a phone, carrier, radio, network or emergency path.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/src/android/content" "$tmp/src/android/app/admin"          "$tmp/src/android/os" "$tmp/src/org/cubechat/android" "$tmp/classes"

cat > "$tmp/src/android/content/SharedPreferences.java" <<'JAVA'
package android.content;
import java.util.HashMap;
import java.util.Map;
public class SharedPreferences {
    private final Map<String, Boolean> data = new HashMap<>();
    public boolean getBoolean(String key, boolean fallback) {
        return data.getOrDefault(key, fallback);
    }
    public Editor edit() { return new Editor(); }
    public final class Editor {
        private final Map<String, Boolean> updates = new HashMap<>();
        public Editor putBoolean(String key, boolean value) { updates.put(key, value); return this; }
        public boolean commit() { data.putAll(updates); return true; }
    }
}
JAVA
cat > "$tmp/src/android/content/Context.java" <<'JAVA'
package android.content;
import android.app.admin.DevicePolicyManager;
public class Context {
    public static final String DEVICE_POLICY_SERVICE = "device_policy";
    public static final int MODE_PRIVATE = 0;
    public final DevicePolicyManager dpm = new DevicePolicyManager();
    public final SharedPreferences prefs = new SharedPreferences();
    public Object getSystemService(String name) { return dpm; }
    public Context getApplicationContext() { return this; }
    public String getPackageName() { return "org.cubechat.android"; }
    public SharedPreferences getSharedPreferences(String name, int mode) { return prefs; }
}
JAVA
cat > "$tmp/src/android/content/ComponentName.java" <<'JAVA'
package android.content;
public class ComponentName {
    public ComponentName(Context context, Class<?> cls) { }
}
JAVA
cat > "$tmp/src/android/os/Build.java" <<'JAVA'
package android.os;
public final class Build {
    public static final class VERSION { public static int SDK_INT = 26; }
}
JAVA
cat > "$tmp/src/android/os/Bundle.java" <<'JAVA'
package android.os;
import java.util.HashMap;
import java.util.Map;
public class Bundle {
    private final Map<String, Boolean> values = new HashMap<>();
    public void putBoolean(String name, boolean value) { values.put(name, value); }
    public boolean getBoolean(String name, boolean other) { return values.getOrDefault(name, other); }
}
JAVA
cat > "$tmp/src/android/os/UserManager.java" <<'JAVA'
package android.os;
public final class UserManager {
    public static final String DISALLOW_BLUETOOTH = "no_bluetooth";
    public static final String DISALLOW_BLUETOOTH_SHARING = "no_bluetooth_sharing";
    public static final String DISALLOW_CONFIG_BLUETOOTH = "no_config_bluetooth";
    public static final String DISALLOW_WIFI_DIRECT = "no_wifi_direct";
    public static final String DISALLOW_WIFI_TETHERING = "no_wifi_tethering";
    public static final String DISALLOW_CHANGE_WIFI_STATE = "no_change_wifi_state";
    public static final String DISALLOW_CONFIG_VPN = "no_config_vpn";
}
JAVA
cat > "$tmp/src/android/app/admin/DevicePolicyManager.java" <<'JAVA'
package android.app.admin;
import android.content.ComponentName;
import android.os.Bundle;
public class DevicePolicyManager {
    public boolean owner = true, failRead, nullRestrictions;
    public String vpn;
    public int setVpnCalls, clearVpnCalls, clearRestrictionCalls;
    private final Bundle restrictions = new Bundle();
    public boolean isDeviceOwnerApp(String pkg) { return owner; }
    public void setAlwaysOnVpnPackage(ComponentName admin, String pkg, boolean locked) {
        vpn = pkg;
        setVpnCalls++;
        if (pkg == null) clearVpnCalls++;
    }
    public String getAlwaysOnVpnPackage(ComponentName admin) {
        if (failRead) throw new SecurityException("inert read denied");
        return vpn;
    }
    public void addUserRestriction(ComponentName admin, String restriction) {
        restrictions.putBoolean(restriction, true);
    }
    public void clearUserRestriction(ComponentName admin, String restriction) {
        restrictions.putBoolean(restriction, false);
        clearRestrictionCalls++;
    }
    public Bundle getUserRestrictions(ComponentName admin) {
        return nullRestrictions ? null : restrictions;
    }
}
JAVA
cat > "$tmp/src/org/cubechat/android/CubeDeviceAdmin.java" <<'JAVA'
package org.cubechat.android;
public class CubeDeviceAdmin { }
JAVA
cat > "$tmp/src/org/cubechat/android/LockdownFirewall.java" <<'JAVA'
package org.cubechat.android;
import android.content.Context;
final class LockdownFirewall {
    static boolean armed(Context context) { return true; }
}
JAVA
cat > "$tmp/src/org/cubechat/android/ManagedVpnControllerHostTest.java" <<'JAVA'
package org.cubechat.android;
import android.content.Context;
import android.os.Build;
public final class ManagedVpnControllerHostTest {
    private static int checks;
    private static void check(boolean value, String why) {
        checks++;
        if (!value) throw new AssertionError(why);
    }
    public static void main(String[] args) throws Exception {
        Build.VERSION.SDK_INT = 26;
        Context legacy = new Context();
        check(!ManagedLockdownController.deploymentSupported(),
                "no trusted early platform priority handoff in development build");
        boolean blocked = false;
        try { ManagedLockdownController.enforce(legacy); }
        catch (UnsupportedOperationException expected) { blocked = true; }
        check(blocked, "device-owner policy activation must be blocked");
        check(legacy.dpm.setVpnCalls == 0 && legacy.dpm.clearRestrictionCalls == 0,
                "blocked activation performs zero device-owner mutations");
        check(!legacy.prefs.getBoolean("cubechat-admin-installed-vpn", false),
                "blocked activation cannot fabricate VPN ownership");

        // Simulate only ordinary rollback of a LEGACY policy established by
        // an older build, using inert Android data objects; no call state.
        legacy.dpm.vpn = legacy.getPackageName();
        legacy.prefs.edit().putBoolean("cubechat-admin-installed-vpn", true).commit();
        android.content.ComponentName component = new android.content.ComponentName(
                legacy, CubeDeviceAdmin.class);
        for (String restriction : new String[] {
                android.os.UserManager.DISALLOW_BLUETOOTH,
                android.os.UserManager.DISALLOW_BLUETOOTH_SHARING,
                android.os.UserManager.DISALLOW_CONFIG_BLUETOOTH,
                android.os.UserManager.DISALLOW_CONFIG_VPN
        }) legacy.dpm.addUserRestriction(component, restriction);
        check(ManagedLockdownController.restrictionsPresent(legacy),
                "legacy restrictions reported before cleanup");
        ManagedLockdownController.release(legacy);
        check(legacy.dpm.vpn == null && legacy.dpm.clearVpnCalls == 1,
                "recorded legacy VPN cleared");
        check(!ManagedLockdownController.restrictionsPresent(legacy),
                "managed restrictions cleared");

        Context protectExisting = new Context();
        protectExisting.dpm.vpn = "org.other.vpn";
        boolean refusedReplacement = false;
        try { ManagedLockdownController.enforce(protectExisting); }
        catch (UnsupportedOperationException expected) { refusedReplacement = true; }
        check(refusedReplacement, "arming managed lockdown refuses unrelated VPN");
        check("org.other.vpn".equals(protectExisting.dpm.vpn),
                "third-party VPN remains installed after rejected enable");

        Context legacyUserVpn = new Context();
        legacyUserVpn.dpm.vpn = legacyUserVpn.getPackageName();
        boolean refusedAmbiguous = false;
        try { ManagedLockdownController.enforce(legacyUserVpn); }
        catch (UnsupportedOperationException expected) { refusedAmbiguous = true; }
        check(refusedAmbiguous, "legacy same-package VPN without provenance not hijacked");
        check(!legacyUserVpn.prefs.getBoolean("cubechat-admin-installed-vpn", false),
                "failed preflight must not mark user VPN as admin-owned");

        Context foreign = new Context();
        foreign.dpm.vpn = "org.other.vpn";
        foreign.prefs.edit().putBoolean("cubechat-admin-installed-vpn", true).commit();
        ManagedLockdownController.release(foreign);
        check("org.other.vpn".equals(foreign.dpm.vpn) && foreign.dpm.clearVpnCalls == 0,
                "unrelated user VPN left alone despite stale ownership marker");
        check(!foreign.prefs.getBoolean("cubechat-admin-installed-vpn", true),
                "stale legacy provenance cleared");

        Context noProvenance = new Context();
        noProvenance.dpm.vpn = noProvenance.getPackageName();
        boolean refused = false;
        try { ManagedLockdownController.release(noProvenance); }
        catch (IllegalStateException expected) { refused = true; }
        check(refused, "old Android refuses same-package VPN without provenance");
        check(noProvenance.dpm.clearVpnCalls == 0, "unknown ownership never cleared");
        check(noProvenance.dpm.clearRestrictionCalls > 0,
                "other cleanup attempted even when VPN ownership unknown");

        Build.VERSION.SDK_INT = 35;
        Context modernExisting = new Context();
        modernExisting.dpm.vpn = "org.other.vpn";
        boolean modernRefused = false;
        try { ManagedLockdownController.enforce(modernExisting); }
        catch (UnsupportedOperationException expected) { modernRefused = true; }
        check(modernRefused && "org.other.vpn".equals(modernExisting.dpm.vpn),
                "modern platform preflight also preserves another VPN");

        Context modern = new Context();
        modern.dpm.vpn = modern.getPackageName();
        ManagedLockdownController.release(modern);
        check(modern.dpm.clearVpnCalls == 1, "modern Android caller-owned VPN cleanup");

        Context unreadable = new Context();
        unreadable.dpm.failRead = true;
        boolean reported = false;
        try { ManagedLockdownController.release(unreadable); }
        catch (IllegalStateException expected) { reported = true; }
        check(reported, "failed ownership readback never looks like successful cleanup");
        check(unreadable.dpm.clearRestrictionCalls > 0,
                "failed ownership readback does not skip other restrictions");

        Context absent = new Context();
        absent.dpm.nullRestrictions = true;
        check(!ManagedLockdownController.restrictionsPresent(absent),
                "null restriction bundle fails as unverified rather than crash");
        Context nonOwner = new Context();
        nonOwner.dpm.owner = false;
        ManagedLockdownController.release(nonOwner);
        check(nonOwner.dpm.clearVpnCalls == 0, "non-owner release does not change OS policy");
        System.out.println("ManagedVpnController: " + checks
                + " host integration checks passed; all Android APIs were inert stubs");
    }
}
JAVA
javac --release 17 -encoding UTF-8 -d "$tmp/classes" \
    "$tmp/src/android/content/Context.java" \
    "$tmp/src/android/content/ComponentName.java" \
    "$tmp/src/android/content/SharedPreferences.java" \
    "$tmp/src/android/app/admin/DevicePolicyManager.java" \
    "$tmp/src/android/os/Build.java" \
    "$tmp/src/android/os/Bundle.java" \
    "$tmp/src/android/os/UserManager.java" \
    "$tmp/src/org/cubechat/android/CubeDeviceAdmin.java" \
    "$tmp/src/org/cubechat/android/LockdownFirewall.java" \
    "$here/app/src/main/java/org/cubechat/android/ManagedVpnOwnership.java" \
    "$here/app/src/main/java/org/cubechat/android/GuardianDeploymentGate.java" \
    "$here/app/src/main/java/org/cubechat/android/ManagedLockdownController.java" \
    "$tmp/src/org/cubechat/android/ManagedVpnControllerHostTest.java"
java -cp "$tmp/classes" org.cubechat.android.ManagedVpnControllerHostTest
