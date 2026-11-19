package org.cubechat.android;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;

/**
 * Tests ONLY the ordinary manually selected OFF state; no call states,
 * emergency triggers, emergency numbers, protocol mocks or modem events.
 */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = 35)
public final class LockdownReleaseControllerTest {
    private Context app;

    @Before public void setup() {
        app = RuntimeEnvironment.getApplication();
        LockdownFirewall.setArmed(app, false);
    }

    @After public void cleanup() {
        LockdownFirewall.setArmed(app, false);
    }

    @Test public void ordinaryManualOffClearsArmedRequestWithoutRunningVpn() {
        LockdownFirewall.setArmed(app, true);
        assertTrue(LockdownFirewall.armed(app));

        LockdownReleaseController.Result release =
                LockdownReleaseController.releaseAllOwnedControls(app);

        assertFalse("The ordinary manual off request must not leave policy armed",
                LockdownFirewall.armed(app));
        assertTrue("No device-admin or VPN service was active in this fixture",
                release.requestsCompleted);
        assertTrue("Individual cleanup commands are reported",
                release.stepSummary.contains("CubeChat IP policy disarm: REQUEST_COMPLETED"));
        assertTrue("Stopping the VPN is distinct from disarming the preference",
                release.stepSummary.contains("CubeChat VPN stop request: REQUEST_COMPLETED"));
        assertTrue("No unverified safety assurance",
                release.detail.contains("NOT independent proof"));
    }

    @Test public void repeatedOrdinaryManualOffDoesNotRearmPolicy() {
        LockdownReleaseController.releaseAllOwnedControls(app);
        LockdownReleaseController.releaseAllOwnedControls(app);
        assertFalse(LockdownFirewall.armed(app));
    }
}
