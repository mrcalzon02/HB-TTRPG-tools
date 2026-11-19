package org.cubechat.android;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
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

/** Read-only Connections UI regression on the oldest and newest supported APIs. */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = {26, 35})
public final class FirewallConnectionsUiTest {
    private Context app;

    @Before public void before() {
        app = RuntimeEnvironment.getApplication();
        LockdownFirewall.setArmed(app, false);
    }

    @After public void after() {
        LockdownFirewall.setArmed(app, false);
    }

    @Test public void openingConnectionsDoesNotArmFirewallOrRequireDeviceOwner() {
        FirewallSettings activity = Robolectric.buildActivity(FirewallSettings.class).setup().get();
        View root = activity.findViewById(android.R.id.content);
        Button tab = buttonNamed(root, "Connections");
        assertNotNull("Connections tab must be present", tab);
        tab.performClick();
        assertTrue("Passive observation label", hasText(root, "Cellular connections"));
        assertTrue("No radio authenticity claim", hasText(root, "NOT a complete radio scan"));
        assertFalse("Never arm lockdown simply by opening observation", LockdownFirewall.armed(app));
    }

    @Test public void unprivilegedUiDoesNotOfferTowerRejection() {
        FirewallSettings activity = Robolectric.buildActivity(FirewallSettings.class).setup().get();
        View root = activity.findViewById(android.R.id.content);
        Button tab = buttonNamed(root, "Connections");
        assertNotNull(tab);
        tab.performClick();
        assertTrue("Read-only status remains visible", hasText(root, "observation only"));
        assertFalse("No selective tower blacklisting button", hasText(root, "Reject this cell"));
    }

    private static Button buttonNamed(View root, String label) {
        if (root instanceof Button && label.equals(((Button) root).getText().toString())) return (Button) root;
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
        if (root instanceof TextView && ((TextView) root).getText().toString().contains(fragment)) return true;
        if (root instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) root;
            for (int i = 0; i < group.getChildCount(); i++) {
                if (hasText(group.getChildAt(i), fragment)) return true;
            }
        }
        return false;
    }
}
