package org.cubechat.android;

import android.content.Context;
import android.database.MatrixCursor;

import org.json.JSONObject;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/** Exercise the same adapter and status text used by the Android dialogs. */
final class TransferOverviewChecks {
    private static AttachmentStore.Transfer file(String status, boolean outgoing, boolean paused,
                                                boolean peerPaused) throws Exception {
        String[] columns = {"id", "outgoing", "size", "progress", "status", "notify", "paused", "peer_paused"};
        try (MatrixCursor cursor = new MatrixCursor(columns)) {
            cursor.addRow(new Object[]{"same-file-id", outgoing ? 1 : 0, 100, 50, status, 0,
                    paused ? 1 : 0, peerPaused ? 1 : 0});
            cursor.moveToFirst();
            return new AttachmentStore.Transfer(cursor, new JSONObject().put("size", 100)
                    .put("name", "example.txt").put("mime", "text/plain").put("sha256", "fixture"));
        }
    }

    private static void check(boolean ok, String message) {
        if (!ok) throw new AssertionError(message);
    }

    static void run(Context context) throws Exception {
        AttachmentStore.Transfer offered = file(AttachmentStore.OFFERED, false, false, false);
        AttachmentStore.Transfer older = file(AttachmentStore.ACCEPTED, true, false, false);
        AttachmentStore.Transfer delivered = file(AttachmentStore.COMPLETE, true, false, false);
        List<AttachmentStore.Completed> cached = Arrays.asList(
                new AttachmentStore.Completed(11, older), new AttachmentStore.Completed(22, offered));
        PeerLink.Snapshot state = new PeerLink.Snapshot("", "", "", "", Collections.emptyList(),
                false, "", 11, Collections.emptyList(), "", "", 0, false, "", true,
                Collections.singletonList(delivered), false, null, Collections.emptyList(), cached);

        TransferOverview rows = new TransferOverview(context);
        rows.update(state, false);
        check(rows.getCount() == 2, "Stale entry or missing contact");
        check(rows.getItem(0).file == offered && rows.getItem(1).file == delivered,
                "Incoming decision or current delivery state lost");
        rows.update(state, true);
        check(rows.getCount() == 1 && rows.getItem(0).contactId == 22,
                "Offer filter crossed conversations that reused a file ID");
        rows.update(state, false);
        check(rows.getCount() == 2, "Clearing offer filter lost history");

        check("Waiting for connection".equals(TransferOverview.status(older, true, false, false)), "Offline progress");
        check("Waiting for file support".equals(TransferOverview.status(older, true, true, false)), "Peer capability");
        check("Open conversation to resume".equals(TransferOverview.status(older, false, true, true)), "Other contact");
        check("Sending".equals(TransferOverview.status(older, true, true, true)), "Connected progress");
        check("Paused".equals(TransferOverview.status(file(AttachmentStore.ACCEPTED, false, true, false),
                true, true, true)), "Local pause");
        check("Paused by contact".equals(TransferOverview.status(file(AttachmentStore.ACCEPTED, false, false, true),
                true, true, true)), "Peer pause");
    }
}
