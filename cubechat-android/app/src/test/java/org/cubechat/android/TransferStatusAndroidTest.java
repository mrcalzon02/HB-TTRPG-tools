package org.cubechat.android;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.database.MatrixCursor;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

/**
 * Offline API 26/35 regression of the real attachment status view adapter.
 * No vault opened, file bytes, networking or device radio operations.
 */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = {26, 35})
public final class TransferStatusAndroidTest {
    private static AttachmentStore.Transfer fixture(String status, boolean outgoing,
            long size, long progress, boolean paused, boolean peerPaused,
            String reason) throws Exception {
        MatrixCursor row = new MatrixCursor(new String[] {
                "id", "outgoing", "size", "progress", "status", "notify",
                "paused", "peer_paused", "manifest"
        });
        row.addRow(new Object[] {
                "offline-test", outgoing ? 1 : 0, size, progress, status, 0,
                paused ? 1 : 0, peerPaused ? 1 : 0, new byte[0]
        });
        assertTrue(row.moveToFirst());
        JSONObject manifest = new JSONObject()
                .put("name", "fixture.txt")
                .put("mime", "text/plain")
                .put("size", size)
                .put("sha256", "00".repeat(32))
                .put("reason", reason);
        return new AttachmentStore.Transfer(row, manifest);
    }

    @Test public void receiptNeededBeforeDelivered() throws Exception {
        AttachmentStore.Transfer outgoing = fixture(
                AttachmentStore.ACCEPTED, true, 400, 400, false, false, "");
        assertEquals("Awaiting delivery confirmation",
                TransferOverview.status(outgoing, true, true, true));
        assertEquals(" · 100%", TransferProgress.percentSuffix(outgoing.progress, outgoing.size));
        AttachmentStore.Transfer completed = fixture(
                AttachmentStore.COMPLETE, true, 400, 400, false, false, "");
        assertEquals("Delivered", TransferOverview.status(completed, true, true, true));
    }

    @Test public void incomingIsVerifiedOnlyAtTerminalState() throws Exception {
        AttachmentStore.Transfer inbound = fixture(
                AttachmentStore.ACCEPTED, false, 120, 120, false, false, "");
        assertEquals("Verifying received file",
                TransferOverview.status(inbound, true, true, true));
        AttachmentStore.Transfer complete = fixture(
                AttachmentStore.COMPLETE, false, 120, 120, false, false, "");
        assertEquals("Verified", TransferOverview.status(complete, true, true, true));
    }

    @Test public void pausedOfflineAndStorageRefusalsAreCorrect() throws Exception {
        AttachmentStore.Transfer paused = fixture(
                AttachmentStore.ACCEPTED, true, 120, 24, true, false, "");
        assertEquals("Paused", TransferOverview.status(paused, true, true, true));
        AttachmentStore.Transfer offline = fixture(
                AttachmentStore.ACCEPTED, false, 120, 24, false, false, "");
        assertEquals("Waiting for connection",
                TransferOverview.status(offline, true, false, true));
        AttachmentStore.Transfer rejected = fixture(
                AttachmentStore.DECLINED, true, 120, 0, false, false,
                AttachmentStore.STORAGE_REASON);
        assertEquals("Rejected: not enough storage on recipient",
                TransferOverview.status(rejected, true, true, true));
    }
}
