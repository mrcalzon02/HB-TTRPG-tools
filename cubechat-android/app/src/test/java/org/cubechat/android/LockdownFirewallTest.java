package org.cubechat.android;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import android.content.Context;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;

import java.io.IOException;
import java.net.DatagramSocket;
import java.net.Socket;

/** Local-policy regressions. Real packet leakage requires two-device network tests. */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = 35)
public final class LockdownFirewallTest {
    private Context app;

    @Before public void before() {
        app = RuntimeEnvironment.getApplication();
        LockdownFirewall.setArmed(app, false);
    }

    @After public void after() {
        LockdownFirewall.setArmed(app, false);
    }

    @Test public void defaultIsOffUntilExplicitUserConsent() {
        assertFalse(LockdownFirewall.armed(app));
        assertFalse(LockdownFirewall.running());
        assertFalse(LockdownFirewall.systemLockdownVerified());
    }

    @Test public void armedPreferencePersistsUntilUserTurnsOff() {
        LockdownFirewall.setArmed(app, true);
        assertTrue(LockdownFirewall.armed(app));
        LockdownFirewall.setArmed(app, false);
        assertFalse(LockdownFirewall.armed(app));
    }

    @Test public void armedButVpnNotEstablishedNeverAllowsUnprotectedChatSocket() throws Exception {
        LockdownFirewall.setArmed(app, true);
        try (Socket socket = new Socket()) {
            try {
                LockdownFirewall.protectChatSocket(app, socket);
                fail("chat socket was allowed while firewall was not running");
            } catch (IOException expected) {
                assertTrue(expected.getMessage().contains("not ready"));
            }
        }
    }

    @Test public void armedButVpnNotEstablishedNeverAllowsUnprotectedDiscovery() throws Exception {
        LockdownFirewall.setArmed(app, true);
        try (DatagramSocket datagram = new DatagramSocket(null)) {
            try {
                LockdownFirewall.protectChatDatagram(app, datagram);
                fail("LAN discovery was allowed while firewall was not running");
            } catch (IOException expected) {
                assertTrue(expected.getMessage().contains("not ready"));
            }
        }
    }

    @Test public void armingPolicyRevokesExistingUpdatePermitIrreversibly() throws Exception {
        UpdateRunGate.Permit permit = UpdateRunGate.enter(() -> true);
        permit.verify();
        LockdownFirewall.setArmed(app, true);
        assertFalse("Lockdown must revoke outstanding update permission", permit.allowed());
        LockdownFirewall.setArmed(app, false);
        assertFalse("Releasing lockdown never resurrects old update traffic", permit.allowed());
        UpdateRunGate.Permit newer = UpdateRunGate.enter(() -> !LockdownFirewall.armed(app));
        assertTrue("New ordinary checks can be authorized after release", newer.allowed());
    }

    @Test public void disablingPolicyRestoresOrdinarySocketBehavior() throws Exception {
        try (Socket socket = new Socket(); DatagramSocket datagram = new DatagramSocket(null)) {
            LockdownFirewall.protectChatSocket(app, socket);
            LockdownFirewall.protectChatDatagram(app, datagram);
        }
    }
}
