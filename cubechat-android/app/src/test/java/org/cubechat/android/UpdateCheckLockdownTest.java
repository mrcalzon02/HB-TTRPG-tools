package org.cubechat.android;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.widget.Button;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import org.robolectric.shadows.ShadowAlertDialog;

/** No HTTP requests: verifies the ordinary updater is paused by user lockdown. */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = {26, 35})
public final class UpdateCheckLockdownTest {
    private Context app;

    @Before public void before() {
        app = RuntimeEnvironment.getApplication();
        LockdownFirewall.setArmed(app, false);
        app.getSharedPreferences("app-updates", Context.MODE_PRIVATE)
                .edit().clear().commit();
    }

    @After public void after() {
        LockdownFirewall.setArmed(app, false);
    }

    @Test public void manualUpdateIsExplainedRatherThanRequested() {
        Activity activity = Robolectric.buildActivity(FirewallSettings.class).setup().get();
        LockdownFirewall.setArmed(app, true);
        UpdateCheck updater = new UpdateCheck(activity, new Button(activity));
        try {
            updater.check(true);
            AlertDialog dialog = ShadowAlertDialog.getLatestAlertDialog();
            assertNotNull("A clear explanation replaces an HTTP timeout", dialog);
            assertNotNull("Dialog includes firewall navigation", dialog.getButton(AlertDialog.BUTTON_POSITIVE));
            assertEquals("Firewall settings",
                    dialog.getButton(AlertDialog.BUTTON_POSITIVE).getText().toString());
            assertFalse("No network check timestamp should be written",
                    app.getSharedPreferences("app-updates", Context.MODE_PRIVATE)
                            .contains("checked"));
        } finally {
            updater.close();
        }
    }

    @Test public void backgroundUpdaterLeavesNetworkCheckTimestampUntouched() {
        Activity activity = Robolectric.buildActivity(FirewallSettings.class).setup().get();
        LockdownFirewall.setArmed(app, true);
        UpdateCheck updater = new UpdateCheck(activity, new Button(activity));
        try {
            updater.check(false);
            assertFalse("No background check while lockdown is requested",
                    app.getSharedPreferences("app-updates", Context.MODE_PRIVATE)
                            .contains("checked"));
        } finally {
            updater.close();
        }
    }
}
