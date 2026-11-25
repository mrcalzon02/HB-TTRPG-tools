package org.cubechat.android;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.json.JSONException;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

/** Offline JSON-reader fixtures only; no HTTP connection or modem operation. */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = {26, 35})
public final class CubeChatReleasesGateTest {
    @Test public void revokedPermissionRefusesFirstRequestBeforeReaderRuns() {
        AtomicInteger requests = new AtomicInteger();
        UpdateRunGate.Permit permit = UpdateRunGate.enter(() -> true);
        UpdateRunGate.invalidate();
        IOException denied = assertThrows(IOException.class, () ->
                CubeChatReleases.check(0, (url, limit) -> {
                    requests.incrementAndGet();
                    return "[]";
                }, permit::verify));
        assertTrue(denied.getMessage().contains("cancelled"));
        assertEquals("No outbound attempt when authorization was revoked", 0, requests.get());
    }

    @Test public void revocationDuringPageReadIsNeverReportedAsSuccess() {
        AtomicInteger requests = new AtomicInteger();
        AtomicBoolean enabled = new AtomicBoolean(true);
        UpdateRunGate.Permit permit = UpdateRunGate.enter(enabled::get);
        IOException denied = assertThrows(IOException.class, () ->
                CubeChatReleases.check(0, (url, limit) -> {
                    requests.incrementAndGet();
                    enabled.set(false);
                    return "[]";
                }, permit::verify));
        assertTrue(denied.getMessage().contains("cancelled"));
        assertEquals("One fake release-data read before permission changed", 1, requests.get());
    }

    @Test public void quickRelockAndUnlockCannotResurrectPreviousScan() throws IOException, JSONException {
        AtomicInteger requests = new AtomicInteger();
        UpdateRunGate.Permit permit = UpdateRunGate.enter(() -> true);
        IOException denied = assertThrows(IOException.class, () ->
                CubeChatReleases.check(0, (url, limit) -> {
                    requests.incrementAndGet();
                    UpdateRunGate.invalidate(); // permanent revocation of the old run
                    return "[]";
                }, permit::verify));
        assertTrue(denied.getMessage().contains("cancelled"));
        assertEquals(1, requests.get());
        // A fresh run after permission is restored is a separate action.
        UpdateRunGate.Permit fresh = UpdateRunGate.enter(() -> true);
        assertEquals(null, CubeChatReleases.check(0, (url, limit) -> "[]", fresh::verify));
    }
}
