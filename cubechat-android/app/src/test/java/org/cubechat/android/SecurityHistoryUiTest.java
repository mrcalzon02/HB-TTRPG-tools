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

/** Android UI gating: graphs are read-only and never arm or probe the radios. */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = {26, 35})
public final class SecurityHistoryUiTest {
    private Context app;

    @Before public void before() {
        app = RuntimeEnvironment.getApplication();
        LockdownFirewall.setArmed(app, false);
    }
    @After public void after() { LockdownFirewall.setArmed(app, false); }

    @Test public void historyTabShowsLocalAggregatesWithoutEnablingLockdown() {
        FirewallSettings screen = Robolectric.buildActivity(FirewallSettings.class).setup().get();
        View root = screen.findViewById(android.R.id.content);
        Button tab = findButton(root, "History");
        assertNotNull("New History tab must be visible", tab);
        tab.performClick();
        assertTrue(hasText(root, "Security history"));
        assertTrue(hasText(root, "VPN TUN packets discarded"));
        assertTrue(hasText(root, "Serving-cell signal over time"));
        assertNotNull(findButton(root, "Clear saved security statistics"));
        assertFalse("History must never arm a VPN", LockdownFirewall.armed(app));
    }

    private static Button findButton(View root, String name) {
        if (root instanceof Button && name.equals(((Button) root).getText().toString()))
            return (Button) root;
        if (root instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) root;
            for (int i = 0; i < group.getChildCount(); i++) {
                Button child = findButton(group.getChildAt(i), name);
                if (child != null) return child;
            }
        }
        return null;
    }
    private static boolean hasText(View root, String phrase) {
        if (root instanceof TextView
                && ((TextView) root).getText().toString().contains(phrase)) return true;
        if (root instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) root;
            for (int i = 0; i < group.getChildCount(); i++)
                if (hasText(group.getChildAt(i), phrase)) return true;
        }
        return false;
    }
}
