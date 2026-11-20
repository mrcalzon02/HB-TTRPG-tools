package org.cubechat.android;

import android.content.Context;
import android.text.format.Formatter;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** The selected mailbox supplies live progress. Other conversations come from the vault overview. */
final class TransferOverview extends BaseAdapter {
    private final Context context;
    private final List<AttachmentStore.Completed> visible = new ArrayList<>();
    private final Map<Long, String> names = new HashMap<>();
    private PeerLink.Snapshot previous;
    private boolean reviewOnly;
    private String summary = "";

    TransferOverview(Context context) { this.context = context; }

    String update(PeerLink.Snapshot state, boolean onlyOffers) {
        boolean sameFiles = previous != null && previous.activeId == state.activeId
                && previous.files == state.files && previous.transferOverview == state.transferOverview
                && reviewOnly == onlyOffers;
        boolean sameNames = previous != null && previous.contacts == state.contacts;
        boolean sameConnection = previous != null && previous.connected == state.connected
                && previous.fileCapable == state.fileCapable;
        previous = state;
        reviewOnly = onlyOffers;
        if (!sameNames) {
            names.clear();
            for (ChatStore.Contact contact : state.contacts) names.put(contact.id, contact.name);
        }
        if (!sameFiles) {
            visible.clear();
            for (AttachmentStore.Transfer file : state.files)
                if (!AttachmentStore.REMOVED.equals(file.status))
                    visible.add(new AttachmentStore.Completed(state.activeId, file));
            for (AttachmentStore.Completed item : state.transferOverview)
                if (item.contactId != state.activeId) visible.add(item);

            int offers = 0, accepted = 0, stopped = 0, complete = 0;
            for (AttachmentStore.Completed item : visible) {
                switch (item.file.status) {
                    case AttachmentStore.OFFERED: offers++; break;
                    case AttachmentStore.ACCEPTED: accepted++; break;
                    case AttachmentStore.DECLINED:
                    case AttachmentStore.CANCELED: stopped++; break;
                    case AttachmentStore.COMPLETE: complete++; break;
                }
            }
            summary = offers + (offers == 1 ? " offer · " : " offers · ") + accepted + " accepted · " + stopped + " stopped · " + complete + " completed";
            if (onlyOffers) visible.removeIf(item -> !needsDecision(item.file));
            visible.sort(Comparator.comparingInt(item -> priority(item.file)));
        }
        if (!sameFiles || !sameNames || !sameConnection) notifyDataSetChanged();
        return summary;
    }

    static boolean needsDecision(AttachmentStore.Transfer file) {
        return !file.outgoing && AttachmentStore.OFFERED.equals(file.status);
    }

    private static int priority(AttachmentStore.Transfer file) {
        switch (file.status) {
            case AttachmentStore.OFFERED: return file.outgoing ? 1 : 0;
            case AttachmentStore.ACCEPTED: return 2;
            case AttachmentStore.COMPLETE: return 4;
            default: return 3;
        }
    }

    static String status(AttachmentStore.Transfer f, boolean selected, boolean connected, boolean fileCapable) {
        if (AttachmentStore.STORAGE_REASON.equals(f.reason) && AttachmentStore.DECLINED.equals(f.status))
            return f.outgoing ? "Rejected: not enough storage on recipient" : "Rejected: not enough storage";
        switch (f.status) {
            case AttachmentStore.OFFERED:
                if (!f.outgoing) return "Awaiting your decision";
                if (f.paused) return "Paused before transfer";
                if (!selected || !connected) return "Queued offer";
                return fileCapable ? "Awaiting acceptance" : "Waiting for file support";
            case AttachmentStore.ACCEPTED:
                return TransferProgress.acceptedStatus(f.outgoing, selected, connected,
                        fileCapable, f.paused, f.peerPaused, f.progress, f.size);
            case AttachmentStore.COMPLETE: return f.outgoing ? "Delivered" : "Verified";
            case AttachmentStore.DECLINED: return "Declined";
            case AttachmentStore.CANCELED: return "Canceled";
            case AttachmentStore.REMOVED: return "Removed from this phone";
            default: return "Waiting";
        }
    }

    @Override public int getCount() { return visible.size(); }
    @Override public AttachmentStore.Completed getItem(int position) { return visible.get(position); }
    @Override public long getItemId(int position) { return position; }
    @Override public View getView(int position, View row, ViewGroup parent) {
        if (row == null) row = LayoutInflater.from(context).inflate(android.R.layout.simple_list_item_2, parent, false);
        AttachmentStore.Completed item = getItem(position);
        AttachmentStore.Transfer f = item.file;
        TextView title = row.findViewById(android.R.id.text1);
        title.setText(f.name);
        String detail = status(f, item.contactId == previous.activeId, previous.connected, previous.fileCapable);
        String percent = AttachmentStore.ACCEPTED.equals(f.status)
                ? TransferProgress.percentSuffix(f.progress, f.size) : "";
        TextView subtitle = row.findViewById(android.R.id.text2);
        subtitle.setSingleLine(false);
        subtitle.setText(names.getOrDefault(item.contactId, "Conversation " + item.contactId)
                + " · " + Formatter.formatFileSize(context, f.size) + percent + " · " + detail);
        return row;
    }
}
