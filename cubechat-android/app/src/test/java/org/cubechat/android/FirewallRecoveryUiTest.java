package org.cubechat.android;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.app.AlertDialog;
import android.content.Context;
import android.content.ClipboardManager;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import org.robolectric.shadows.ShadowAlertDialog;

/**
 * Ordinary read-only Recovery UI checks. Does not enable a radio, start a
 * network connection, use calling APIs, or emulate privileged signals.
 */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = {26, 35})
public final class FirewallRecoveryUiTest {
    private Context app;

    @Before public void before() {
        app = RuntimeEnvironment.getApplication();
        LockdownFirewall.setArmed(app, false);
        app.getSharedPreferences("cubechat-firewall-recovery", Context.MODE_PRIVATE)
                .edit().clear().commit();
    }

    @After public void after() {
        LockdownFirewall.setArmed(app, false);
    }

    @Test public void recoveryTabReportsLimitsWithoutArmingFirewall() {
        FirewallSettings activity = Robolectric.buildActivity(FirewallSettings.class).setup().get();
        View root = activity.findViewById(android.R.id.content);
        Button recovery = buttonNamed(root, "Recovery");
        assertNotNull("Recovery tab exists", recovery);
        recovery.performClick();
        assertTrue("Shows ordinary recovery heading", hasText(root, "Recovery & manual controls"));
        assertTrue("Does not claim perfect shutdown", hasText(root, "NOT proof"));
        assertTrue("Shows external VPN limitation", hasText(root, "not independently checked"));
        assertTrue("Recovery identifies when CubeChat is not device owner",
                hasText(root, "Device owner: not provisioned"));
        assertNotNull("Manual release accessible",
                buttonNamed(root, "Release all CubeChat controls"));
        assertFalse("Viewing status must never arm a firewall", LockdownFirewall.armed(app));
    }

    @Test public void userCanCopySanitizedStatusWithoutDeviceSideEffects() {
        FirewallSettings activity = Robolectric.buildActivity(FirewallSettings.class).setup().get();
        View root = activity.findViewById(android.R.id.content);
        buttonNamed(root, "Recovery").performClick();
        Button copy = buttonNamed(root, "Copy non-sensitive status summary");
        assertNotNull(copy);
        copy.performClick();
        ClipboardManager clipboard =
                (ClipboardManager) app.getSystemService(Context.CLIPBOARD_SERVICE);
        assertNotNull(clipboard);
        assertNotNull(clipboard.getPrimaryClip());
        String summary = clipboard.getPrimaryClip().getItemAt(0).coerceToText(app).toString();
        assertTrue(summary.contains("Kernel / modem / hardware coverage: NOT_VERIFIED"));
        assertTrue(summary.contains("Other Android-owned VPN settings: NOT_VERIFIED"));
        assertFalse("Clipboard action must not activate lockdown", LockdownFirewall.armed(app));
    }

    @Test public void ordinaryManualReleaseRecordsOnlyRequestCompletion() {
        FirewallSettings activity = Robolectric.buildActivity(FirewallSettings.class).setup().get();
        View root = activity.findViewById(android.R.id.content);
        buttonNamed(root, "Recovery").performClick();
        Button release = buttonNamed(root, "Release all CubeChat controls");
        assertNotNull(release);
        release.performClick();
        AlertDialog confirm = ShadowAlertDialog.getLatestAlertDialog();
        assertNotNull("User-requested release requires an explicit confirmation", confirm);
        confirm.getButton(AlertDialog.BUTTON_POSITIVE).performClick();
        assertFalse("Ordinary manual release leaves no CubeChat request armed",
                LockdownFirewall.armed(app));
        assertTrue("Release attempt timestamp saved",
                app.getSharedPreferences("cubechat-firewall-recovery", Context.MODE_PRIVATE)
                        .contains("last-release-at"));
        String steps = app.getSharedPreferences("cubechat-firewall-recovery", Context.MODE_PRIVATE)
                .getString("last-release-steps", "");
        assertTrue("Recovery saves distinct managed-policy command status",
                steps.contains("Managed-device release: REQUEST_COMPLETED"));
        assertTrue("Recovery saves distinct VPN stop command status",
                steps.contains("CubeChat VPN stop request: REQUEST_COMPLETED"));
        // Release rerenders the Activity, replacing its previous content view.
        // Inspect the NEW tree; a stale root can never see the updated status.
        View refreshed = activity.findViewById(android.R.id.content);
        assertTrue("Result explicitly denies a verification claim",
                hasText(refreshed, "removal NOT independently verified"));
    }

    private static Button buttonNamed(View root, String label) {
        if (root instanceof Button && label.equals(((Button) root).getText().toString()))
            return (Button) root;
        if (root instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) root;
            for (int i = 0; i < group.getChildCount(); i++) {
                Button result = buttonNamed(group.getChildAt(i), label);
                if (result != null) return result;
            }
        }
        return null;
    }

    private static boolean hasText(View root, String fragment) {
        if (root instanceof TextView &&
                ((TextView) root).getText().toString().contains(fragment)) return true;
        if (root instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) root;
            for (int i = 0; i < group.getChildCount(); i++) {
                if (hasText(group.getChildAt(i), fragment)) return true;
            }
        }
        return false;
    }
}
