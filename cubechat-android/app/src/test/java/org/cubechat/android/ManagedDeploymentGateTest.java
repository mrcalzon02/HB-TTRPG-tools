package org.cubechat.android;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.fail;

import android.content.Context;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;

/**
 * Checks the advanced-policy deployment gate, not telephone functionality.
 * No device-owner setup, VPN/radio change, calling operation, or simulation.
 */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = {26, 35})
public final class ManagedDeploymentGateTest {
    @Test public void advancedManagedPolicyUnavailableBeforePrivilegedIntegration() throws Exception {
        Context app = RuntimeEnvironment.getApplication();
        assertFalse(ManagedLockdownController.deploymentSupported());
        try {
            ManagedLockdownController.enforce(app);
            fail("Unverified managed-device restrictions must never be installed");
        } catch (UnsupportedOperationException expected) {
            // Must be refused before checking privileges or mutating policy.
        }
    }
}
