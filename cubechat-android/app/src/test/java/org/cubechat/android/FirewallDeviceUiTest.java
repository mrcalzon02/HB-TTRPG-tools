package org.cubechat.android;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.ClipboardManager;
import android.content.ClipDescription;
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

/** Read-only device inventory UI; never uses telephony, sockets or radio operations. */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = {26, 35})
public final class FirewallDeviceUiTest {
    private Context app;
    @Before public void before() {
        app = RuntimeEnvironment.getApplication();
        LockdownFirewall.setArmed(app, false);
    }
    @After public void after() {
        LockdownFirewall.setArmed(app, false);
    }

    @Test public void inventoryIsClearlyUnverifiedAndDoesNotArmPolicy() {
        FirewallSettings activity = Robolectric.buildActivity(FirewallSettings.class).setup().get();
        View root = activity.findViewById(android.R.id.content);
        Button inventory = buttonNamed(root, "Device");
        assertNotNull("Device tab present", inventory);
        inventory.performClick();
        assertTrue(hasText(root, "RadioGuard device inventory"));
        assertTrue(hasText(root, "Kernel eBPF/tc/netfilter support: NOT_VERIFIED"));
        assertTrue(hasText(root, "Vendor radio and baseband controls: NOT_VERIFIED"));
        assertFalse("Opening read-only inventory cannot arm lockdown", LockdownFirewall.armed(app));
    }

    @Test public void copyIsOnlyAfterExplicitTap() {
        FirewallSettings activity = Robolectric.buildActivity(FirewallSettings.class).setup().get();
        View root = activity.findViewById(android.R.id.content);
        buttonNamed(root, "Device").performClick();
        Button copy = buttonNamed(root, "Copy device inventory");
        assertNotNull(copy);
        copy.performClick();
        ClipboardManager clipboard =
                (ClipboardManager) app.getSystemService(Context.CLIPBOARD_SERVICE);
        assertNotNull(clipboard);
        assertNotNull("Inventory copied", clipboard.getPrimaryClip());
        assertNotNull("Inventory preview hint included",
                clipboard.getPrimaryClip().getDescription().getExtras());
        assertTrue("Inventory preview is marked sensitive",
                clipboard.getPrimaryClip().getDescription().getExtras()
                        .getBoolean(ClipDescription.EXTRA_IS_SENSITIVE));
        String value = clipboard.getPrimaryClip().getItemAt(0).coerceToText(app).toString();
        assertTrue(value.contains("read-only device inventory"));
        assertTrue(value.contains("Kernel eBPF/tc/netfilter support: NOT_VERIFIED"));
        assertFalse(LockdownFirewall.armed(app));
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
