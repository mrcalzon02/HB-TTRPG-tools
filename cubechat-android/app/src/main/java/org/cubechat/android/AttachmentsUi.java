package org.cubechat.android;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.text.format.Formatter;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** The system picker supplies the input and the user chooses the destination of a verified export. */
final class AttachmentsUi {
    private static final int PICK = 740, EXPORT = 741;
    private final Activity screen;
    private final PeerLink link;
    private final Button notice;
    private final FileRows rows = new FileRows();
    private AlertDialog listDialog, detailDialog, removeDialog, cleanupDialog, overviewDialog;
    private LinearLayout cleanupRows;
    private TransferOverview overviewRows;
    private CheckBox reviewOnly;
    private TextView overviewSummary, overviewEmpty;
    private boolean rowsConnected, rowsFileCapable;
    private long openTransferContact;
    private String openTransferId;
    private TextView connection, storageSummary, detailStatus, detailBytes;
    private ProgressBar progress;
    private LinearLayout actions;
    private long dialogContact, pickerContact;
    private long restoreContact;
    private boolean restoreList, restoreOverview, restoreReviewOnly;
    private String restoreDetail;
    private String selectedId, exportId, actionState;
    private Uri pendingUri;
    private final Map<String, String> observedFileStates = new HashMap<>();
    private long observedContact;
    private boolean observedInitialFiles;
    private String latestFileEventId, latestFileEventText;

    AttachmentsUi(Activity screen, PeerLink link, Button notice, Bundle state) {
        this.screen = screen;
        this.link = link;
        this.notice = notice;
        notice.setOnClickListener(v -> openFileNotice());
        if (state != null) {
            pickerContact = state.getLong("filePickerContact");
            exportId = state.getString("fileExportId");
            restoreContact = state.getLong("fileDialogContact");
            restoreList = state.getBoolean("fileListOpen");
            restoreOverview = state.getBoolean("fileOverviewOpen");
            restoreReviewOnly = state.getBoolean("fileReviewOnly");
            restoreDetail = state.getString("fileDetailId");
        }
    }

    void saveState(Bundle state) {
        state.putLong("filePickerContact", pickerContact);
        state.putString("fileExportId", exportId);
        boolean pending = restoreContact != 0;
        state.putLong("fileDialogContact", pending ? restoreContact : dialogContact);
        state.putBoolean("fileListOpen", pending ? restoreList : listDialog != null);
        state.putBoolean("fileOverviewOpen", pending ? restoreOverview : overviewDialog != null);
        state.putBoolean("fileReviewOnly", pending ? restoreReviewOnly : reviewOnly != null && reviewOnly.isChecked());
        state.putString("fileDetailId", pending ? restoreDetail : selectedId);
    }

    void changed(PeerLink.Snapshot state) {
        if (observedContact != state.activeId) {
            observedContact = state.activeId;
            observedFileStates.clear();
            observedInitialFiles = false;
            latestFileEventId = null;
            latestFileEventText = null;
        }
        if (state.loaded) {
            for (AttachmentStore.Transfer f : state.files) {
                String prior = observedFileStates.put(f.id, f.status);
                if (TransferEventText.shouldNotify(observedInitialFiles, prior,
                        f.status, f.outgoing, f.reason)) {
                    String event = TransferEventText.changed(
                            f.status, f.outgoing, f.name, f.reason);
                    if (event != null) {
                        latestFileEventId = f.id;
                        latestFileEventText = event;
                    }
                }
            }
            observedInitialFiles = true;
        }
        if (dialogContact != 0 && dialogContact != state.activeId) closeDialogs();
        if (state.loaded && restoreContact != 0) {
            if (restoreContact == state.activeId) {
                if (restoreList) showFiles();
                if (restoreOverview && listDialog != null) showOverview(restoreReviewOnly);
                AttachmentStore.Transfer file = find(state.files, restoreDetail);
                if (file != null) showDetail(state, file);
            }
            restoreContact = 0;
            restoreDetail = null;
        }
        int count = 0;
        for (AttachmentStore.Transfer file : state.files) {
            if (needsConsent(file)) count++;
        }
        if (latestFileEventId != null && find(state.files, latestFileEventId) == null) {
            latestFileEventId = null;
            latestFileEventText = null;
        }
        boolean event = latestFileEventId != null;
        notice.setVisibility(count > 0 || event ? View.VISIBLE : View.GONE);
        if (count > 0) notice.setText(count == 1 ? "Review file offer" : "Review " + count + " file offers");
        else if (event) notice.setText(latestFileEventText);
        if (listDialog != null) {
            connection.setText(connectionText(state));
            storageSummary.setText(spaceText(state));
            if (rows.items != state.files || rowsConnected != state.connected || rowsFileCapable != state.fileCapable) {
                rowsConnected = state.connected;
                rowsFileCapable = state.fileCapable;
                rows.items = state.files;
                rows.notifyDataSetChanged();
            }
        }
        if (detailDialog != null) {
            AttachmentStore.Transfer selected = find(state.files, selectedId);
            if (selected == null) detailDialog.dismiss();
            else renderDetail(selected);
        }
        if (cleanupDialog != null) renderCleanup(state);
        if (overviewDialog != null) renderOverview(state);
        if (openTransferContact != 0 && state.loaded && state.activeId == openTransferContact) {
            String id = openTransferId;
            openTransferContact = 0;
            openTransferId = null;
            showFiles();
            AttachmentStore.Transfer chosen = find(state.files, id);
            if (chosen != null) showDetail(state, chosen);
        }
        if (state.loaded && pendingUri != null) finishPicker(state);
    }

    private String connectionText(PeerLink.Snapshot state) {
        if (!state.connected) return "Offline · Offers and accepted transfers wait for a connection.";
        if (!state.fileCapable) return "Waiting for peer file support. Both phones need a version with attachments.";
        return "Files use " + state.route + " · Up to 8 MiB per file";
    }

    private String spaceText(PeerLink.Snapshot state) {
        AttachmentStore.Space capacity = state.space;
        if (capacity == null) return "Checking available storage…";
        String usage = size(capacity.quotaUsed) + " / " + size(capacity.quotaLimit) + " CubeChat attachment allowance used";
        String room = "Space for new incoming files: " + size(capacity.acceptableBytes)
                + " · Device free: " + size(capacity.deviceFree);
        String active = capacity.incomingRemaining > 0
                ? " · " + size(capacity.incomingRemaining) + " already committed to receiving" : "";
        return room + active + "\n" + usage
                + "\nRemove completed local attachments to recover CubeChat allowance. Files exported elsewhere are unaffected.";
    }

    private boolean needsConsent(AttachmentStore.Transfer f) {
        return TransferOverview.needsDecision(f);
    }

    private AttachmentStore.Transfer find(List<AttachmentStore.Transfer> files, String id) {
        for (AttachmentStore.Transfer file : files) if (file.id.equals(id)) return file;
        return null;
    }

    private void openFileNotice() {
        PeerLink.Snapshot state = link.snapshot();
        for (AttachmentStore.Transfer file : state.files)
            if (needsConsent(file)) { reviewOffers(); return; }
        String id = latestFileEventId;
        latestFileEventId = null;
        latestFileEventText = null;
        if (id != null) {
            notice.setVisibility(View.GONE);
            AttachmentStore.Transfer file = find(state.files, id);
            if (file != null) showDetail(state, file);
        }
    }

    private void reviewOffers() {
        PeerLink.Snapshot state = link.snapshot();
        AttachmentStore.Transfer single = null;
        for (AttachmentStore.Transfer f : state.files) if (needsConsent(f)) {
            if (single != null) { showFiles(); return; }
            single = f;
        }
        if (single != null) showDetail(state, single);
    }

    void showFiles() {
        PeerLink.Snapshot state = link.snapshot();
        if (state.activeId == 0 || listDialog != null) return;
        link.refreshAttachmentSpace();
        dialogContact = state.activeId;
        LinearLayout content = panel();
        connection = text(14);
        connection.setText(connectionText(state));
        content.addView(connection);
        storageSummary = text(13);
        storageSummary.setText(spaceText(state));
        content.addView(storageSummary);
        Button overview = new Button(screen);
        overview.setAllCaps(false);
        overview.setText("All conversations · Transfer status");
        overview.setMinHeight(dp(48));
        overview.setOnClickListener(v -> showOverview(false));
        content.addView(overview);
        FrameLayout box = new FrameLayout(screen);
        content.addView(box);
        ListView list = new ListView(screen);
        list.setSaveEnabled(false);
        box.addView(list);
        TextView empty = text(16);
        empty.setText("No file transfers in this conversation.");
        box.addView(empty);
        list.setEmptyView(empty);
        rows.items = state.files;
        rowsConnected = state.connected;
        rowsFileCapable = state.fileCapable;
        list.setAdapter(rows);
        list.setOnItemClickListener((a,v,pos,id) -> {
            AttachmentStore.Transfer f = rows.getItem(pos);
            if (dialogContact == link.snapshot().activeId) showDetail(link.snapshot(), f);
        });
        AlertDialog opened = DisplayPrivacy.dialog(screen).setTitle("Files").setView(content)
                .setNegativeButton("Close", null)
                .setNeutralButton("Manage storage", (d,w) -> showCleanup())
                .setPositiveButton("Attach file", (d,w) -> chooseInput(state.activeId)).create();
        listDialog = opened;
        opened.setOnDismissListener(d -> {
            if (listDialog == opened) {
                listDialog = null;
                rows.items = Collections.emptyList();
                storageSummary = null;
                if (detailDialog == null) dialogContact = 0;
            }
        });
        opened.show();
    }

    private void showOverview(boolean onlyOffers) {
        if (overviewDialog != null) return;
        link.refreshTransferOverview();
        LinearLayout content = panel();
        overviewSummary = text(14);
        content.addView(overviewSummary);
        reviewOnly = new CheckBox(screen);
        reviewOnly.setText("Needs my review");
        reviewOnly.setChecked(onlyOffers);
        content.addView(reviewOnly);
        FrameLayout box = new FrameLayout(screen);
        content.addView(box);
        ListView list = new ListView(screen);
        box.addView(list);
        overviewEmpty = text(15);
        box.addView(overviewEmpty);
        list.setEmptyView(overviewEmpty);
        overviewRows = new TransferOverview(screen);
        list.setAdapter(overviewRows);
        list.setOnItemClickListener((parent, view, position, id) -> openOverviewItem(overviewRows.getItem(position)));
        reviewOnly.setOnCheckedChangeListener((button, checked) -> renderOverview(link.snapshot()));
        AlertDialog opened = DisplayPrivacy.dialog(screen).setTitle("All file transfers")
                .setView(content).setNegativeButton("Close", null)
                .setNeutralButton("Refresh", null).create();
        overviewDialog = opened;
        opened.setOnDismissListener(d -> {
            if (overviewDialog == opened) {
                overviewDialog = null;
                overviewRows = null;
                overviewSummary = overviewEmpty = null;
                reviewOnly = null;
            }
        });
        renderOverview(link.snapshot());
        opened.show();
        opened.getButton(AlertDialog.BUTTON_NEUTRAL).setOnClickListener(v -> link.refreshTransferOverview());
    }

    private void renderOverview(PeerLink.Snapshot state) {
        boolean filtered = reviewOnly.isChecked();
        overviewSummary.setText(overviewRows.update(state, filtered));
        overviewEmpty.setText(filtered ? "No incoming offers need a decision." : "No file transfers recorded.");
    }

    private void openOverviewItem(AttachmentStore.Completed item) {
        PeerLink.Snapshot state = link.snapshot();
        overviewDialog.dismiss();
        if (item.contactId == state.activeId) {
            AttachmentStore.Transfer selected = find(state.files, item.file.id);
            if (selected != null) showDetail(state, selected);
        } else {
            // Overview can outlive its parent Files dialog. Do not crash when
            // changing conversations from that still-open overview.
            if (listDialog != null) listDialog.dismiss();
            openTransferContact = item.contactId;
            openTransferId = item.file.id;
            link.selectContact(item.contactId);
        }
    }

    private void showCleanup() {
        if (cleanupDialog != null) return;
        link.refreshCompletedFiles();
        LinearLayout content = panel();
        TextView explanation = text(14);
        explanation.setText("Completed local file copies across all conversations. Tap a file to remove only its CubeChat vault copy. Files saved elsewhere remain untouched.");
        content.addView(explanation);
        cleanupRows = new LinearLayout(screen);
        cleanupRows.setOrientation(LinearLayout.VERTICAL);
        content.addView(cleanupRows);
        ScrollView scroll = new ScrollView(screen);
        scroll.addView(content);
        AlertDialog opened = DisplayPrivacy.dialog(screen).setTitle("Manage attachment storage")
                .setView(scroll).setNegativeButton("Close", null).create();
        cleanupDialog = opened;
        opened.setOnDismissListener(d -> {
            if (cleanupDialog == opened) {
                cleanupDialog = null;
                cleanupRows = null;
            }
        });
        renderCleanup(link.snapshot());
        opened.show();
    }

    private void renderCleanup(PeerLink.Snapshot state) {
        if (cleanupRows == null) return;
        cleanupRows.removeAllViews();
        long recoverable = 0;
        for (AttachmentStore.Completed item : state.completedFiles) recoverable += item.file.size;
        TextView heading = text(15);
        heading.setText(state.completedFiles.size() + " completed local files · "
                + size(recoverable) + " of attachment data");
        cleanupRows.addView(heading);
        if (state.completedFiles.isEmpty()) {
            TextView empty = text(14);
            empty.setText("No completed local attachments found.");
            cleanupRows.addView(empty);
            return;
        }
        for (AttachmentStore.Completed item : state.completedFiles) {
            String contactName = "Conversation " + item.contactId;
            for (ChatStore.Contact contact : state.contacts)
                if (contact.id == item.contactId) { contactName = contact.name; break; }
            Button file = new Button(screen);
            file.setAllCaps(false);
            file.setMinHeight(dp(48));
            file.setText(item.file.name + " · " + size(item.file.size) + "\n" + contactName);
            file.setOnClickListener(v -> confirmCleanup(item.contactId, item.file.id, item.file.name, item.file.size));
            cleanupRows.addView(file);
        }
    }

    private void confirmCleanup(long contactId, String id, String filename, long bytes) {
        if (removeDialog != null) return;
        removeDialog = DisplayPrivacy.dialog(screen).setTitle("Remove local attachment?")
                .setMessage(filename + " (" + size(bytes) + ") will be removed from CubeChat's encrypted vault. "
                        + "Any separately exported copies remain untouched. Active transfers are not eligible.")
                .setNegativeButton("Keep", null)
                .setPositiveButton("Remove", (d,w) -> link.removeCompletedFromContact(contactId,id)).create();
        removeDialog.setOnDismissListener(d -> removeDialog = null);
        removeDialog.show();
    }

    private void chooseInput(long contactId) {
        if (link.snapshot().activeId != contactId) return;
        pickerContact = contactId;
        exportId = null;
        launch(new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE), PICK);
    }

    private void chooseDestination(long contactId, AttachmentStore.Transfer f) {
        if (link.snapshot().activeId != contactId || f.outgoing || !"COMPLETE".equals(f.status)) return;
        pickerContact = contactId;
        exportId = f.id;
        launch(new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/octet-stream")
                .addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE, suggestedName(f.name)), EXPORT);
    }

    private String suggestedName(String name) {
        String safe = name.replaceAll("[/\\\\\\p{Cc}\\p{Cf}]", "_").trim();
        return safe.isEmpty() || safe.equals(".") || safe.equals("..") ? "CubeChat-file" : safe;
    }

    private void launch(Intent picker, int request) {
        try { screen.startActivityForResult(picker, request); }
        catch (ActivityNotFoundException | SecurityException e) {
            pickerContact = 0; exportId = null;
            note("Android could not open its document picker.");
        }
    }

    boolean result(int request, int result, Intent data) {
        if (request != PICK && request != EXPORT) return false;
        Uri selected = data == null ? null : data.getData();
        if (result != Activity.RESULT_OK || selected == null || !"content".equals(selected.getScheme())
                || ((request == EXPORT) != (exportId != null))) {
            pickerContact = 0; exportId = null; pendingUri = null;
            return true;
        }
        pendingUri = selected;
        if (link.snapshot().loaded) finishPicker(link.snapshot());
        return true;
    }

    private void finishPicker(PeerLink.Snapshot state) {
        Uri uri = pendingUri;
        long target = pickerContact;
        String fileId = exportId;
        pendingUri = null; exportId = null; pickerContact = 0;
        if (target == 0 || target != state.activeId) {
            note("The conversation changed. Open Files in the intended chat and choose again.");
            return;
        }
        if (fileId == null) {
            link.offerFile(target, uri);
            showFiles();
            note("Preparing file offer");
        } else link.exportFile(target, fileId, uri);
    }

    void saved(long contactId) {
        if (link.snapshot().activeId == contactId) note("File saved");
    }

    void problem(String message) {
        if (listDialog != null || detailDialog != null) note(message);
    }

    private void note(String message) { Toast.makeText(screen, message, Toast.LENGTH_LONG).show(); }

    private LinearLayout panel() {
        LinearLayout content = new LinearLayout(screen);
        content.setOrientation(LinearLayout.VERTICAL);
        int h = dp(18);
        content.setPadding(h, dp(4), h, dp(8));
        return content;
    }

    private int dp(int value) { return Math.round(screen.getResources().getDisplayMetrics().density * value); }

    private TextView text(int size) {
        TextView view = new TextView(screen);
        view.setTextSize(size);
        view.setPadding(0, dp(4), 0, dp(4));
        return view;
    }

    private String size(long bytes) { return Formatter.formatFileSize(screen, bytes); }

    private String stateLabel(AttachmentStore.Transfer f) {
        PeerLink.Snapshot state = link.snapshot();
        return TransferOverview.status(f, true, state.connected, state.fileCapable);
    }

    private final class FileRows extends BaseAdapter {
        List<AttachmentStore.Transfer> items = Collections.emptyList();
        @Override public int getCount() { return items.size(); }
        @Override public AttachmentStore.Transfer getItem(int pos) { return items.get(pos); }
        @Override public long getItemId(int pos) { return pos; }
        @Override public View getView(int pos, View convert, ViewGroup parent) {
            View row = convert == null ? screen.getLayoutInflater().inflate(android.R.layout.simple_list_item_2, parent, false) : convert;
            AttachmentStore.Transfer f = getItem(pos);
            TextView title = row.findViewById(android.R.id.text1);
            title.setSingleLine(); title.setEllipsize(TextUtils.TruncateAt.END);
            title.setText(f.name);
            String percent = AttachmentStore.ACCEPTED.equals(f.status)
                    ? TransferProgress.percentSuffix(f.progress, f.size) : "";
            ((TextView)row.findViewById(android.R.id.text2)).setText((f.outgoing ? "Outgoing" : "Incoming") +
                    " · " + size(f.size) + " · " + stateLabel(f) + percent);
            return row;
        }
    }

    private void showDetail(PeerLink.Snapshot s, AttachmentStore.Transfer f) {
        if (detailDialog != null) return;
        dialogContact = s.activeId;
        selectedId = f.id;
        actionState = "";
        LinearLayout content = panel();
        TextView name = text(18);
        name.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        name.setText(f.name);
        content.addView(name);
        TextView metadata = text(14);
        metadata.setText((f.outgoing ? "Outgoing" : "Incoming") + " · " + size(f.size) + " · " + f.mime);
        content.addView(metadata);
        detailStatus = text(16);
        content.addView(detailStatus);
        progress = new ProgressBar(screen, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(1000);
        content.addView(progress);
        detailBytes = text(14);
        content.addView(detailBytes);
        actions = new LinearLayout(screen);
        actions.setOrientation(LinearLayout.VERTICAL);
        content.addView(actions);
        TextView checksum = text(13);
        checksum.setText("SHA-256\n" + f.sha256);
        checksum.setTypeface(Typeface.MONOSPACE);
        checksum.setTextIsSelectable(true);
        content.addView(checksum);
        ScrollView scroll = new ScrollView(screen);
        scroll.addView(content);
        AlertDialog opened = DisplayPrivacy.dialog(screen).setTitle("File details").setView(scroll)
                .setNegativeButton("Close", null).create();
        detailDialog = opened;
        opened.setOnDismissListener(d -> {
            if (detailDialog == opened) {
                detailDialog = null; selectedId = null;
                if (listDialog == null) dialogContact = 0;
            }
        });
        renderDetail(f);
        opened.show();
    }

    private void renderDetail(AttachmentStore.Transfer f) {
        String label = stateLabel(f);
        detailStatus.setText(label);
        boolean moving = "ACCEPTED".equals(f.status);
        progress.setVisibility(moving ? View.VISIBLE : View.GONE);
        detailBytes.setVisibility(moving ? View.VISIBLE : View.GONE);
        if (moving) {
            progress.setProgress(Math.max(0,
                    TransferProgress.progressPermille(f.progress, f.size)));
            detailBytes.setText(size(TransferProgress.boundedBytes(f.progress, f.size))
                    + " / " + size(Math.max(0, f.size)));
        }
        boolean offline = !link.snapshot().connected;
        String buttons = f.status + "/" + f.paused + "/" + offline;
        if (actionState.equals(buttons)) return;
        actionState = buttons;
        actions.removeAllViews();
        long cid = dialogContact;
        String id = f.id;
        if (needsConsent(f)) {
            action("Accept file", () -> link.acceptFile(cid,id));
            action("Decline", () -> link.declineFile(cid,id));
        } else if ("OFFERED".equals(f.status) || moving) {
            if (f.paused) action("Resume", () -> link.resumeFile(cid,id));
            else action("Pause", () -> link.pauseFile(cid,id));
            if (offline) action("Retry connection", () -> link.retryFile(cid,id));
            action("Cancel transfer", () -> link.cancelFile(cid,id));
        } else if ("COMPLETE".equals(f.status)) {
            if (!f.outgoing) action("Save file", () -> chooseDestination(cid,f));
            action("Remove local file", () -> confirmRemove(cid,id));
        }
    }

    private void action(String title, Runnable callback) {
        Button b = new Button(screen);
        b.setText(title);
        b.setAllCaps(false);
        b.setMinHeight(dp(48));
        b.setOnClickListener(v -> {
            if (dialogContact == link.snapshot().activeId) callback.run();
        });
        actions.addView(b);
    }

    private void confirmRemove(long cid, String id) {
        if (removeDialog != null) return;
        removeDialog = DisplayPrivacy.dialog(screen).setTitle("Remove local file?")
                .setMessage("This removes the attachment data from CubeChat on this phone. Copies saved to Downloads stay there.")
                .setNegativeButton("Keep", null)
                .setPositiveButton("Remove", (d,w) -> {
                    if (cid == link.snapshot().activeId) link.deleteAttachment(cid,id);
                }).create();
        removeDialog.setOnDismissListener(d -> removeDialog = null);
        removeDialog.show();
    }

    void closeDialogs() {
        if (removeDialog != null) removeDialog.dismiss();
        if (detailDialog != null) detailDialog.dismiss();
        if (listDialog != null) listDialog.dismiss();
        if (cleanupDialog != null) cleanupDialog.dismiss();
        if (overviewDialog != null) overviewDialog.dismiss();
        dialogContact = 0;
    }
}
