package org.cubechat.android;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PersistableBundle;
import android.text.Editable;
import android.text.InputFilter;
import android.text.InputType;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.AbsListView;
import android.widget.ArrayAdapter;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.PopupMenu;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeReader;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.DateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public final class MainActivity extends Activity implements PeerLink.Listener {
    private static final int SCAN = 1, CAMERA = 2, BUNDLE = 3, QR_IMAGE = 4, SAVE_QR = 5;
    private static final String APP_INVITE = "cubechat://pair/";
    private static final int PAPER = 0xfff5f7f1, INK = 0xff17251e, MUTED = 0xff4c6157;
    private static final int GREEN = 0xff185f46, PALE = 0xffdcefdc, LINE = 0xffcdd8ce;
    private static final int MATCH = ViewGroup.LayoutParams.MATCH_PARENT;
    private static final int WRAP = ViewGroup.LayoutParams.WRAP_CONTENT;

    private PeerLink link;
    private UpdateCheck updates;
    private Button updateBanner, fileNotice;
    private AttachmentsUi files;
    private CubeProfile profile;
    private WifiDirectController direct;
    private BluetoothRadio bluetooth;
    private TextView subtitle, status, radioStatus, relayStatus, contactName, pingResult;
    private LinearLayout startPanel, composerRow, contactBar;
    private ListView history;
    private EditText draft;
    private Button send, options, inviteButton, scanButton, pasteButton, ping;
    private TextView pairTitle, pairHint;
    private boolean wasConnected;
    private Messages adapter;
    private AlertDialog inviteDialog, shareDialog;
    private boolean wantsInvite, closing;
    private String lastProblem = "", submitted, exportCode;
    private long renderedId, inviteFrom = -1;
    private boolean draftDirty, loadingDraft, shareSelecting;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final Runnable writeDraft = this::flushDraft;
    private Retained retained;
    private ShareText share;
    private long shareTarget;
    private String sharedText;

    private static final class Retained {
        long id, shareTarget;
        String draft, exportCode, sharedText;
        ShareText share;
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        DisplayPrivacy.apply(this);
        buildScreen();
        updates = new UpdateCheck(this, updateBanner);
        if (getLastNonConfigurationInstance() instanceof Retained) {
            retained = (Retained) getLastNonConfigurationInstance();
            exportCode = retained.exportCode;
            share = retained.share;
            shareTarget = retained.shareTarget;
            sharedText = retained.sharedText;
        }
        try {
            profile = new CubeProfile(this);
            link = new PeerLink(this, profile, this);
            files = new AttachmentsUi(this, link, fileNotice, state);
            link.start();
            direct = new WifiDirectController(this, link, this::radioMessage);
            bluetooth = new BluetoothRadio(this, link);
            bluetooth.resume();
            changed();
            if (state == null && retained == null) openExternalInvite(getIntent());
        } catch (Exception e) {
            problem("Could not open CubeChat: " + e.getMessage());
        }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openExternalInvite(intent);
    }

    private void openExternalInvite(Intent intent) {
        ShareText incoming = ShareText.fromIntent(intent);
        if (incoming != null) {
            setIntent(new Intent(this, MainActivity.class));
            clearShare();
            if (inviteDialog != null) inviteDialog.dismiss();
            wantsInvite = false;
            share = incoming;
            if (link != null && link.snapshot().loaded) advanceShare(link.snapshot());
            return;
        }
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) return;
        String value = intent.getDataString();
        setIntent(new Intent(this, MainActivity.class));
        if (value == null || !(value.startsWith(APP_INVITE) || value.startsWith(Pairing.HTTPS_PREFIX))) {
            problem("This link is not a CubeChat pairing invite.");
            return;
        }
        clearShare();
        importCard(value);
    }

    private void importCard(String value) {
        if (value == null || link == null) return;
        if (value.length() > 2500 || value.trim().isEmpty()) {
            problem("Invalid CubeChat key card.");
            return;
        }
        // Validate and durably import the complete key card on the protocol lane.
        beginAction();
        flushDraft();
        link.join(value.trim());
    }

    @Override public Object onRetainNonConfigurationInstance() {
        Retained r = new Retained();
        r.id = renderedId;
        String editing = draft.getText().toString();
        r.draft = editing.equals(submitted) ? null : editing;
        r.exportCode = exportCode;
        r.share = share;
        r.shareTarget = shareTarget;
        r.sharedText = sharedText;
        return r;
    }

    @Override protected void onPause() {
        flushDraft();
        super.onPause();
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        if (files != null) files.saveState(state);
    }

    @Override protected void onResume() {
        super.onResume();
        if (updates != null) updates.check(false);
        if (bluetooth != null) bluetooth.resume();
    }

    private void leaveRadio() {
        if (direct != null) direct.stop(true);
        if (bluetooth != null) bluetooth.leave();
        radioMessage("");
    }

    @Override protected void onDestroy() {
        closing = true;
        if (updates != null) updates.close();
        if (files != null) files.closeDialogs();
        if (inviteDialog != null) inviteDialog.dismiss();
        if (shareDialog != null) shareDialog.dismiss();
        ui.removeCallbacks(writeDraft);
        if (bluetooth != null) bluetooth.stop();
        if (direct != null) direct.stop(isFinishing());
        if (link != null) link.stop();
        if (profile != null) profile.close();
        super.onDestroy();
    }

    private int dp(float value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private LinearLayout column() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        return l;
    }
    private LinearLayout row() {
        LinearLayout l = new LinearLayout(this);
        l.setGravity(Gravity.CENTER_VERTICAL);
        return l;
    }
    private LinearLayout.LayoutParams weight(int height) {
        return new LinearLayout.LayoutParams(0, height, 1);
    }
    private void pad(View v, int h, int t, int b) { v.setPadding(dp(h), dp(t), dp(h), dp(b)); }
    private TextView label(String value, int size, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextSize(size);
        t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return t;
    }
    private GradientDrawable shape(int color, int radius, boolean outline) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radius));
        if (outline) d.setStroke(dp(1), LINE);
        return d;
    }
    private Button button(String title, boolean primary, View.OnClickListener action) {
        Button b = new Button(this);
        b.setText(title);
        b.setTextSize(15);
        b.setAllCaps(false);
        b.setMinWidth(0); b.setMinimumWidth(0);
        b.setMinHeight(dp(48));
        b.setTextColor(new ColorStateList(new int[][] {
                new int[] {-android.R.attr.state_enabled}, new int[0]
        }, new int[] {0xff5f7267, primary ? Color.WHITE : GREEN}));
        b.setBackgroundTintList(new ColorStateList(new int[][] {
                new int[] {-android.R.attr.state_enabled}, new int[0]
        }, new int[] {0xffd3dcd5, primary ? GREEN : 0xffe7eee6}));
        b.setOnClickListener(action);
        return b;
    }

    private void buildScreen() {
        LinearLayout root = column();
        root.setFitsSystemWindows(true);
        root.setBackgroundColor(PAPER);
        root.setFocusableInTouchMode(true);
        LinearLayout header = row();
        pad(header, 16, 10, 8);
        ImageView icon = new ImageView(this);
        icon.setImageResource(R.drawable.cubechat_icon);
        header.addView(icon, new LinearLayout.LayoutParams(dp(36), dp(36)));
        LinearLayout title = column();
        title.setPadding(dp(10), 0, dp(6), 0);
        title.addView(label("CubeChat", 23, INK, true));
        subtitle = label("Direct messages", 13, MUTED, false);
        title.addView(subtitle);
        header.addView(title, weight(WRAP));
        options = button("Pairing", false, v -> menu());
        header.addView(options);
        root.addView(header);
        contactBar = row();
        pad(contactBar, 12, 0, 0);
        contactBar.addView(button("Conversations", false, v -> conversations()));
        contactName = label("", 15, INK, true);
        contactName.setSingleLine();
        contactName.setEllipsize(TextUtils.TruncateAt.END);
        pad(contactName, 8, 0, 0);
        contactBar.addView(contactName, weight(WRAP));
        ping = button("Ping", false, v -> { beginAction(); link.ping(); });
        ping.setContentDescription("Ping contact");
        contactBar.addView(ping);
        contactBar.setVisibility(View.GONE);
        root.addView(contactBar);
        updateBanner = button("Update available", false, null);
        updateBanner.setVisibility(View.GONE);
        root.addView(updateBanner);
        status = label("Starting local connection…", 14, MUTED, false);
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        pad(status, 18, 7, 8);
        status.setBackgroundColor(0xffe7eee5);
        root.addView(status);
        fileNotice = button("Review file offer", false, null);
        fileNotice.setVisibility(View.GONE);
        root.addView(fileNotice);
        pingResult = label("", 14, GREEN, false);
        pingResult.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        pad(pingResult, 18, 4, 6);
        pingResult.setVisibility(View.GONE);
        root.addView(pingResult);
        radioStatus = label("", 14, MUTED, false);
        radioStatus.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        pad(radioStatus, 18, 4, 6);
        radioStatus.setVisibility(View.GONE);
        root.addView(radioStatus);
        relayStatus = label("", 14, GREEN, false);
        relayStatus.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        pad(relayStatus, 18, 4, 6);
        relayStatus.setVisibility(View.GONE);
        root.addView(relayStatus);

        FrameLayout body = new FrameLayout(this);
        root.addView(body, new LinearLayout.LayoutParams(MATCH, 0, 1));
        history = new ListView(this);
        history.setDivider(null);
        history.setPadding(dp(14), dp(8), dp(14), dp(12));
        history.setClipToPadding(false);
        history.setTranscriptMode(AbsListView.TRANSCRIPT_MODE_NORMAL);
        adapter = new Messages();
        history.setAdapter(adapter);
        body.addView(history);
        ScrollView instructions = new ScrollView(this);
        instructions.setFillViewport(true);
        startPanel = column();
        startPanel.setGravity(Gravity.CENTER_VERTICAL);
        pad(startPanel, 24, 18, 22);
        instructions.addView(startPanel);
        pairTitle = label("Pair two phones", 26, INK, true);
        startPanel.addView(pairTitle);
        pairHint = label("", 16, MUTED, false);
        pairHint.setPadding(0, dp(8), 0, dp(16));
        startPanel.addView(pairHint);
        inviteButton = button("Show my invite", true, v -> requestInvite(null));
        scanButton = button("Scan an invite", false, v -> scan());
        pasteButton = button("Paste an invite", false, v -> paste());
        startPanel.addView(inviteButton);
        startPanel.addView(scanButton);
        startPanel.addView(pasteButton);
        body.addView(instructions);

        composerRow = row();
        composerRow.setGravity(Gravity.BOTTOM);
        pad(composerRow, 12, 8, 10);
        composerRow.addView(button("Files", false, v -> {
            if (files != null) files.showFiles();
        }));
        draft = new EditText(this);
        draft.setSaveEnabled(false);
        draft.setTextSize(17);
        draft.setTextColor(INK);
        draft.setHintTextColor(MUTED);
        draft.setHint("Message");
        draft.setBackground(shape(Color.WHITE, 12, true));
        pad(draft, 12, 10, 10);
        draft.setMinHeight(dp(48));
        draft.setMaxLines(4);
        draft.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE
                | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        draft.setImeOptions(EditorInfo.IME_FLAG_NO_EXTRACT_UI);
        composerRow.addView(draft, weight(WRAP));
        send = button("Send", true, v -> send());
        send.setEnabled(false);
        LinearLayout.LayoutParams sendParams = new LinearLayout.LayoutParams(WRAP, dp(52));
        sendParams.setMarginStart(dp(6));
        composerRow.addView(send, sendParams);
        draft.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            public void afterTextChanged(Editable e) {}
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                refreshSend();
                if (!loadingDraft && renderedId != 0) {
                    draftDirty = true;
                    ui.removeCallbacks(writeDraft);
                    ui.postDelayed(writeDraft, 350);
                }
            }
        });
        root.addView(composerRow);
        composerRow.setVisibility(View.GONE);
        setContentView(root);
    }

    @Override public void changed() {
        if (closing || link == null) return;
        PeerLink.Snapshot next = link.snapshot();
        if (files != null) files.changed(next);
        boolean paired = !next.role.isEmpty();
        boolean switched = next.activeId != renderedId;
        if (switched) {
            flushDraft();
            if (renderedId != 0) leaveRadio();
            renderedId = next.activeId;
            submitted = null;
            lastProblem = "";
            wasConnected = false;
            if (inviteDialog != null) inviteDialog.dismiss();
            loadingDraft = true;
            String saved = retained != null && retained.id == renderedId && retained.draft != null
                    ? retained.draft : next.draft;
            draft.setText(saved);
            draft.setSelection(draft.length());
            loadingDraft = false;
            if (!TextUtils.equals(saved, next.draft)) { draftDirty = true; flushDraft(); }
            retained = null;
        }
        for (ChatStore.Contact c : next.contacts) if (c.id == renderedId) { contactName.setText(c.name); break; }
        contactBar.setVisibility(paired ? View.VISIBLE : View.GONE);
        ping.setEnabled(paired && !next.pinging);
        String checked = next.pingTime == 0 || next.pinging ? "" : " · " +
                android.text.format.DateFormat.getTimeFormat(this).format(new Date(next.pingTime));
        pingResult.setText(next.ping + checked);
        pingResult.setVisibility(paired && !next.ping.isEmpty() ? View.VISIBLE : View.GONE);
        subtitle.setText(!next.peer.isEmpty() ? "Peer " + next.peer : paired ? "Key ready · Hosting" : "Direct messages");
        status.setText(lastProblem.isEmpty() ? next.status : lastProblem);
        status.setTextColor(lastProblem.isEmpty() ? MUTED : 0xff8c351c);
        ((View) startPanel.getParent()).setVisibility(paired ? View.GONE : View.VISIBLE);
        pairHint.setText("Show a key card on one phone and scan it on the other. Queue messages offline. Use local Wi-Fi, Wi-Fi Direct or Bluetooth to deliver them.");
        history.setVisibility(paired ? View.VISIBLE : View.GONE);
        composerRow.setVisibility(paired ? View.VISIBLE : View.GONE);
        if (next.connected) radioMessage("");
        relayStatus.setText(next.relay);
        relayStatus.setVisibility(next.forwarding && !next.relay.isEmpty() ? View.VISIBLE : View.GONE);
        boolean atEnd = switched || adapter.getCount() == 0 || history.getLastVisiblePosition() >= adapter.getCount() - 2;
        adapter.items = next.messages;
        adapter.notifyDataSetChanged();
        if (atEnd && !next.messages.isEmpty()) history.setSelection(next.messages.size() - 1);
        refreshSend();
        if (next.connected && !wasConnected && inviteDialog != null) inviteDialog.dismiss();
        wasConnected = next.connected;
        if (wantsInvite && !next.invite.isEmpty() && next.activeId != inviteFrom) {
            wantsInvite = false;
            showInvite(next.invite);
        }
        if (next.loaded) advanceShare(next);
    }

    @Override public void queued(long id, String text) {
        if (closing || renderedId != id || !text.equals(submitted)) return;
        if (text.contentEquals(draft.getText())) {
            draft.setText("");
            flushDraft();
        }
        submitted = null;
        refreshSend();
    }

    @Override public void fileSaved(long contactId, String fileId) {
        if (!closing && files != null) files.saved(contactId);
    }

    @Override public void problem(String message) {
        if (closing) return;
        if (files != null) files.problem(message);
        wantsInvite = false;
        if (shareSelecting && renderedId != shareTarget) clearShare();
        submitted = null;
        lastProblem = message;
        status.setText(message);
        status.setTextColor(0xff8c351c);
        refreshSend();
    }

    private void beginAction() { lastProblem = ""; }

    private void flushDraft() {
        ui.removeCallbacks(writeDraft);
        if (!draftDirty || renderedId == 0 || link == null) return;
        link.saveDraft(renderedId, draft.getText().toString());
        draftDirty = false;
    }

    private void selectContact(long id) {
        if (id == renderedId || link == null) return;
        beginAction();
        flushDraft();
        link.selectContact(id);
    }

    private void clearShare() {
        share = null;
        sharedText = null;
        shareTarget = 0;
        shareSelecting = false;
        AlertDialog previous = shareDialog;
        shareDialog = null;
        if (previous != null) previous.dismiss();
    }

    private void advanceShare(PeerLink.Snapshot snapshot) {
        if (shareDialog != null || closing) return;
        AlertDialog dialog;
        if (share != null) {
            dialog = share.choose(this, snapshot.contacts, (id, text) -> {
                share = null;
                shareTarget = id;
                sharedText = text;
            });
        } else if (sharedText != null && shareTarget == renderedId && renderedId != 0) {
            shareSelecting = false;
            long target = shareTarget;
            dialog = ShareText.apply(this, draft.getText().toString(), sharedText, text -> {
                if (target == renderedId && link.snapshot().activeId == target) {
                    draft.setText(text);
                    draft.setSelection(draft.length());
                    flushDraft();
                    draft.requestFocus();
                }
            });
            if (dialog == null) {
                sharedText = null;
                shareTarget = 0;
                return;
            }
        } else {
            if (sharedText != null && !shareSelecting) {
                for (ChatStore.Contact contact : snapshot.contacts) if (contact.id == shareTarget) {
                    shareSelecting = true;
                    selectContact(shareTarget);
                    return;
                }
                clearShare();
                problem("That conversation is no longer available.");
            }
            return;
        }
        boolean choosing = share != null;
        shareDialog = dialog;
        dialog.setOnDismissListener(d -> {
            if (shareDialog != dialog || closing) return;
            shareDialog = null;
            if (choosing) share = null;
            else { sharedText = null; shareTarget = 0; }
            if (!isChangingConfigurations() && !isFinishing() && link != null) advanceShare(link.snapshot());
        });
    }

    private void radioMessage(String message) {
        if (closing) return;
        radioStatus.setText(message);
        radioStatus.setVisibility(message.isEmpty() ? View.GONE : View.VISIBLE);
    }

    private void chooseConnection() {
        PeerLink.Snapshot state = link.snapshot();
        String lan = "Local Wi-Fi / hotspot", p2p = "Wi-Fi Direct", bt = "Bluetooth";
        String via = "Send via relay", forward = "Forward for other phones", stop = "Stop forwarding";
        List<String> modes = new ArrayList<>();
        if (!state.role.isEmpty()) {
            modes.add(lan); modes.add(p2p); modes.add(bt);
            if ("guest".equals(state.role)) modes.add(via);
        }
        modes.add(forward);
        if (state.forwarding) modes.add(stop);
        int selectedRoute = state.role.isEmpty() ? -1 : modes.indexOf("Local relay".equals(state.route) ? via : state.route);
        DisplayPrivacy.dialog(this).setTitle("Connection").setSingleChoiceItems(modes.toArray(new String[0]), selectedRoute, (d, which) -> {
            d.dismiss();
            if (link.snapshot().activeId != state.activeId) return;
            beginAction();
            String selected = modes.get(which);
            if (selected.equals(lan)) {
                leaveRadio(); link.useLan();
            } else if (selected.equals(p2p)) {
                bluetooth.leave(); radioMessage(""); direct.begin();
            } else if (selected.equals(bt)) {
                direct.stop(true); radioMessage(""); bluetooth.choose();
            } else if (selected.equals(stop)) {
                link.stopRelay();
            } else {
                configureRelay(selected.equals(forward));
            }
        }).setNegativeButton("Close", null).show();
    }

    private void configureRelay(boolean forwarding) {
        LinearLayout content = column();
        pad(content, 20, 8, 8);
        content.addView(label(forwarding
                ? "Keep this phone open. Enter the next phone’s local IPv4 address. A forwarding phone carries encrypted traffic without importing the chat key."
                : "Enter the first forwarding phone’s local IPv4 address. The final forwarding phone must reach the phone hosting your chat.", 15, MUTED, false));
        EditText address = new EditText(this);
        address.setHint(forwarding ? "Next phone’s IPv4 address" : "First relay’s IPv4 address");
        address.setSingleLine();
        address.setInputType(InputType.TYPE_CLASS_PHONE);
        content.addView(address);
        RadioGroup nextType = new RadioGroup(this);
        RadioButton host = new RadioButton(this);
        host.setText("Recipient phone (chat host)");
        RadioButton another = new RadioButton(this);
        another.setText("Another forwarding phone");
        if (forwarding) {
            nextType.addView(host); nextType.addView(another);
            host.setChecked(true);
            content.addView(nextType);
        }
        AlertDialog dialog = DisplayPrivacy.dialog(this)
                .setTitle(forwarding ? "Forward for other phones" : "Send via relay")
                .setView(content).setNegativeButton("Cancel", null)
                .setPositiveButton(forwarding ? "Start forwarding" : "Connect", null).create();
        dialog.show();
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String ip = address.getText().toString().trim();
            if (ip.isEmpty()) { address.setError("Enter a local IPv4 address"); return; }
            if (forwarding) link.startRelay(ip, another.isChecked());
            else { leaveRadio(); link.useRelay(ip); }
            dialog.dismiss();
        });
    }

    private void refreshSend() {
        if (send == null || draft == null) return;
        send.setEnabled(link != null && renderedId != 0 && submitted == null && draft.getText().toString().trim().length() > 0);
    }

    private void send() {
        if (link == null || submitted != null) return;
        String text = draft.getText().toString();
        if (text.trim().isEmpty()) return;
        if (text.getBytes(StandardCharsets.UTF_8).length > 4096) {
            problem("This message exceeds 4,096 UTF-8 bytes. Split it into smaller messages.");
            return;
        }
        beginAction();
        flushDraft();
        submitted = text;
        refreshSend();
        link.send(renderedId, text);
    }

    private void conversations() {
        PeerLink.Snapshot current = link.snapshot();
        LinearLayout content = column();
        pad(content, 16, 0, 0);
        content.setFocusableInTouchMode(true);
        EditText search = new EditText(this);
        search.setHint("Search contacts");
        search.setSingleLine();
        search.setSaveEnabled(false);
        content.addView(search);
        FrameLayout results = new FrameLayout(this);
        content.addView(results, new LinearLayout.LayoutParams(MATCH, WRAP));
        ListView choices = new ListView(this);
        TextView empty = label("No matching contacts", 15, MUTED, false);
        pad(empty, 12, 16, 12);
        results.addView(choices);
        results.addView(empty);
        choices.setEmptyView(empty);
        ArrayAdapter<ChatStore.Contact> rows = new ArrayAdapter<ChatStore.Contact>(this,
                android.R.layout.simple_list_item_2, android.R.id.text1) {
            @Override public View getView(int position, View recycled, ViewGroup parent) {
                View view = super.getView(position, recycled, parent);
                ChatStore.Contact contact = getItem(position);
                TextView name = view.findViewById(android.R.id.text1);
                name.setText(contact.name);
                String detail = contact.id == current.activeId ? "Current conversation" : "Conversation " + contact.id;
                if (contact.pending > 0) detail += " · " + contact.pending + " queued";
                ((TextView) view.findViewById(android.R.id.text2)).setText(detail);
                return view;
            }
        };
        choices.setAdapter(rows);
        rows.addAll(current.contacts);
        search.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            public void afterTextChanged(Editable e) {}
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                String query = s.toString().trim().toLowerCase(Locale.ROOT);
                rows.setNotifyOnChange(false);
                rows.clear();
                for (ChatStore.Contact contact : current.contacts) {
                    if (contact.name.toLowerCase(Locale.ROOT).contains(query)) rows.add(contact);
                }
                rows.notifyDataSetChanged();
            }
        });
        AlertDialog.Builder builder = DisplayPrivacy.dialog(this).setTitle("Conversations").setView(content)
                .setNegativeButton("Close", null)
                .setPositiveButton("Add contact", (d, w) -> addContact());
        for (ChatStore.Contact contact : current.contacts) if (contact.id == current.activeId) {
            builder.setNeutralButton("Rename contact", (d, w) -> renameContact(contact));
            break;
        }
        AlertDialog dialog = builder.create();
        choices.setOnItemClickListener((parent, view, position, id) -> {
            ChatStore.Contact selected = rows.getItem(position);
            dialog.dismiss();
            if (selected != null) selectContact(selected.id);
        });
        dialog.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN
                | WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        dialog.show();
    }

    private void renameContact(ChatStore.Contact contact) {
        LinearLayout content = column();
        pad(content, 20, 8, 4);
        EditText input = new EditText(this);
        input.setHint("Contact name");
        input.setSingleLine();
        input.setSaveEnabled(false);
        input.setFilters(new InputFilter[]{new InputFilter.LengthFilter(64)});
        input.setText(contact.name);
        input.selectAll();
        content.addView(input);
        AlertDialog dialog = DisplayPrivacy.dialog(this).setTitle("Rename contact").setView(content)
                .setNegativeButton("Cancel", null).setPositiveButton("Save", null).create();
        dialog.show();
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String name = input.getText().toString().trim();
            if (name.isEmpty()) {
                input.setError("Enter a name");
                return;
            }
            beginAction();
            link.renameContact(contact.id, name);
            dialog.dismiss();
        });
    }

    private void addContact() {
        String[] actions = {"Create new invite", "Scan an invite", "Open QR image", "Paste an invite", "Use existing key bundle"};
        DisplayPrivacy.dialog(this).setTitle("Add contact").setItems(actions, (dialog, which) -> {
            switch (which) {
                case 0:
                    beginAction();
                    flushDraft();
                    wantsInvite = true;
                    inviteFrom = renderedId;
                    link.createNewInvite();
                    break;
                case 1: scan(); break;
                case 2: chooseImage(); break;
                case 3: paste(); break;
                case 4: chooseBundle(); break;
            }
        }).setNegativeButton("Cancel", null).show();
    }

    private void menu() {
        PopupMenu popup = new PopupMenu(this, options);
        popup.getMenu().add("Screen privacy").setOnMenuItemClickListener(i -> { DisplayPrivacy.choose(this); return true; });
        popup.getMenu().add("Check for updates").setOnMenuItemClickListener(i -> { updates.check(true); return true; });
        if (link == null) { popup.show(); return; }
        PeerLink.Snapshot state = link.snapshot();
        popup.getMenu().add("Connection…").setOnMenuItemClickListener(i -> {
            chooseConnection(); return true;
        });
        if (!"guest".equals(state.role)) {
            popup.getMenu().add("Show my invite").setOnMenuItemClickListener(i -> { requestInvite(null); return true; });
        }
        popup.getMenu().add("Scan an invite").setOnMenuItemClickListener(i -> { scan(); return true; });
        popup.getMenu().add("Open QR image").setOnMenuItemClickListener(i -> { chooseImage(); return true; });
        popup.getMenu().add("Paste an invite").setOnMenuItemClickListener(i -> { paste(); return true; });
        if (state.role.isEmpty()) {
            popup.getMenu().add("Use existing key bundle").setOnMenuItemClickListener(i -> { chooseBundle(); return true; });
        } else {
            popup.getMenu().add("Find in conversation").setOnMenuItemClickListener(i -> {
                List<PeerLink.Message> items = state.messages;
                FindMessages.show(this, items, index -> {
                    if (renderedId == state.activeId && index >= 0 && index < items.size()) {
                        PeerLink.Message match = items.get(index);
                        for (int pos = 0; pos < adapter.getCount(); pos++) {
                            PeerLink.Message visible = adapter.getItem(pos);
                            if (visible.time == match.time && visible.outgoing == match.outgoing && visible.text.equals(match.text)) {
                                history.setSelection(pos); break;
                            }
                        }
                    }
                });
                return true;
            });
            popup.getMenu().add("Reconnect / retry delivery").setOnMenuItemClickListener(i -> {
                beginAction(); link.retry(); return true;
            });
            popup.getMenu().add("Forget pairing").setOnMenuItemClickListener(i -> {
                DisplayPrivacy.dialog(this).setTitle("Forget this pairing?")
                    .setMessage("This removes this pairing’s keys and local conversation. To talk again, pair both phones with a new invite.")
                    .setNegativeButton("Cancel", null).setPositiveButton("Forget", (d, w) -> {
                        if (renderedId != state.activeId) return;
                        beginAction(); flushDraft(); leaveRadio(); submitted = null; link.reset(state.activeId);
                    }).show();
                return true;
            });
        }
        popup.show();
    }

    private void requestInvite(String bundle) {
        if (link == null) return;
        beginAction();
        wantsInvite = true;
        inviteFrom = bundle == null ? -1 : renderedId;
        flushDraft();
        if (bundle == null) link.createInvite(); else link.createInvite(bundle);
    }

    private void showInvite(String raw) {
        if (closing || inviteDialog != null) return;
        String code = Pairing.HTTPS_PREFIX + raw;
        LinearLayout content = column();
        pad(content, 20, 8, 8);
        content.addView(label("Scan with the other phone to import this chat’s keys, even offline. Anyone with the card can read those keys. Keep it private.", 15, MUTED, false));
        try {
            Bitmap qr = renderQr(code, 1);
            android.graphics.drawable.BitmapDrawable image = new android.graphics.drawable.BitmapDrawable(getResources(), qr);
            image.setFilterBitmap(false);
            ImageView view = new ImageView(this);
            view.setContentDescription("CubeChat pairing QR code");
            view.setImageDrawable(image);
            view.setScaleType(ImageView.ScaleType.FIT_CENTER);
            content.addView(view, new LinearLayout.LayoutParams(MATCH, dp(270)));
        } catch (WriterException e) {
            content.addView(label("Use Copy code, then paste the invite on the other phone.", 15, MUTED, false));
        }
        content.addView(button("Save QR image", true, v -> {
            exportCode = code;
            Intent create = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            create.addCategory(Intent.CATEGORY_OPENABLE);
            create.setType("image/png");
            create.putExtra(Intent.EXTRA_TITLE, "CubeChat-key-card.png");
            startActivityForResult(create, SAVE_QR);
        }));
        TextView privateCode = label(code, 13, INK, false);
        privateCode.setTextIsSelectable(true);
        privateCode.setVisibility(View.GONE);
        Button reveal = button("Show invite text", false, v -> {
            boolean hidden = privateCode.getVisibility() != View.VISIBLE;
            privateCode.setVisibility(hidden ? View.VISIBLE : View.GONE);
            ((Button) v).setText(hidden ? "Hide invite text" : "Show invite text");
        });
        content.addView(reveal);
        content.addView(privateCode);
        ScrollView scroll = new ScrollView(this);
        scroll.addView(content);
        AlertDialog dialog = DisplayPrivacy.dialog(this).setTitle("Pairing invite")
                .setView(scroll).setNegativeButton("Close", null)
                .setNeutralButton("Copy code", null).create();
        inviteDialog = dialog;
        dialog.setOnDismissListener(d -> inviteDialog = null);
        dialog.show();
        dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setOnClickListener(v -> {
            ClipData clip = ClipData.newPlainText("CubeChat invite", code);
            PersistableBundle extras = new PersistableBundle();
            extras.putBoolean("android.content.extra.IS_SENSITIVE", true);
            clip.getDescription().setExtras(extras);
            ((ClipboardManager) getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(clip);
            Toast.makeText(this, "Invite copied", Toast.LENGTH_SHORT).show();
        });
    }

    private Bitmap renderQr(String code, int minimumSide) throws WriterException {
        BitMatrix matrix = new QRCodeWriter().encode(code, BarcodeFormat.QR_CODE, minimumSide, minimumSide);
        int width = matrix.getWidth(), height = matrix.getHeight();
        int[] pixels = new int[width * height];
        for (int y = 0; y < height; y++)
            for (int x = 0; x < width; x++) pixels[y * width + x] = matrix.get(x, y) ? Color.BLACK : Color.WHITE;
        return Bitmap.createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888);
    }

    private void saveQr(android.net.Uri target, String code) {
        new Thread(() -> {
            Bitmap bitmap = null;
            try (OutputStream out = getContentResolver().openOutputStream(target, "wt")) {
                if (out == null) throw new IOException("File unavailable");
                bitmap = renderQr(code, 900);
                if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)) throw new IOException("Image encoding failed");
            } catch (Exception e) {
                runOnUiThread(() -> problem("Could not save the key card: " + e.getMessage()));
                return;
            } finally { if (bitmap != null) bitmap.recycle(); }
            runOnUiThread(() -> {
                if (!closing) Toast.makeText(this, "Key card saved", Toast.LENGTH_SHORT).show();
            });
        }, "cubechat-qr-export").start();
    }

    private void scan() {
        if (link == null) return;
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] { Manifest.permission.CAMERA }, CAMERA);
        } else startActivityForResult(new Intent(this, QrScanner.class), SCAN);
    }

    @Override public void onRequestPermissionsResult(int request, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(request, permissions, results);
        if (request == WifiDirectController.PERMISSION && direct != null) {
            direct.permissionResult(results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED);
            return;
        }
        if (request == 731 && bluetooth != null) { bluetooth.onPermissionsResult(request); return; }
        if (request != CAMERA) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) scan();
        else { Toast.makeText(this, "Camera permission is needed to scan. You can paste an invite.", Toast.LENGTH_LONG).show(); paste(); }
    }

    private void paste() {
        if (link == null) return;
        EditText input = new EditText(this);
        input.setHint("Paste invite code");
        input.setSaveEnabled(false);
        input.setSingleLine();
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        LinearLayout content = column();
        pad(content, 20, 8, 8);
        content.addView(input);
        AlertDialog dialog = DisplayPrivacy.dialog(this).setTitle("Join a phone")
                .setMessage("Use the private invite from the phone you want to pair with.")
                .setView(content).setNegativeButton("Cancel", null)
                .setPositiveButton("Import", (d, w) -> importCard(input.getText().toString())).create();
        dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        dialog.show();
    }

    private void chooseImage() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("image/*");
        startActivityForResult(intent, QR_IMAGE);
    }

    private void readQrImage(android.net.Uri uri) {
        new Thread(() -> {
            Bitmap image = null;
            try {
                BitmapFactory.Options opts = new BitmapFactory.Options();
                opts.inJustDecodeBounds = true;
                try (InputStream in = getContentResolver().openInputStream(uri)) {
                    BitmapFactory.decodeStream(in, null, opts);
                }
                if (opts.outWidth < 1 || opts.outHeight < 1) throw new IOException("Unreadable image");
                opts.inJustDecodeBounds = false;
                opts.inSampleSize = 1;
                while (Math.max(opts.outWidth, opts.outHeight) / opts.inSampleSize > 2048)
                    opts.inSampleSize *= 2;
                try (InputStream in = getContentResolver().openInputStream(uri)) {
                    image = BitmapFactory.decodeStream(in, null, opts);
                }
                if (image == null) throw new IOException("Unreadable image");
                int width = image.getWidth(), height = image.getHeight();
                int[] pixels = new int[width * height];
                image.getPixels(pixels, 0, width, 0, 0, width, height);
                BinaryBitmap code = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(width, height, pixels)));
                String decoded = new QRCodeReader().decode(code).getText();
                runOnUiThread(() -> { if (!closing) importCard(decoded); });
            } catch (Exception e) {
                runOnUiThread(() -> problem("Could not read a QR code in this image. Try a clearer image or paste the invite."));
            } finally { if (image != null) image.recycle(); }
        }, "cubechat-qr-image").start();
    }

    private void chooseBundle() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        startActivityForResult(intent, BUNDLE);
    }

    @Override public void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (files != null && files.result(request, result, data)) return;
        if ((request == 732 || request == 733) && bluetooth != null) {
            bluetooth.onActivityResult(request, result);
            return;
        }
        if (request == SAVE_QR) {
            String code = exportCode;
            exportCode = null;
            if (result == RESULT_OK && data != null && data.getData() != null) {
                if (code == null) problem("Open the key card again to save its image.");
                else saveQr(data.getData(), code);
            }
            return;
        }
        if (result != RESULT_OK || data == null || link == null) return;
        if (request == SCAN) importCard(data.getStringExtra(QrScanner.RESULT_CODE));
        else if (request == QR_IMAGE && data.getData() != null) readQrImage(data.getData());
        else if (request == BUNDLE && data.getData() != null) {
            android.net.Uri uri = data.getData();
            new Thread(() -> {
                try (InputStream stream = getContentResolver().openInputStream(uri);
                     ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                    if (stream == null) throw new IOException("File unavailable");
                    byte[] chunk = new byte[8192]; int n;
                    while ((n = stream.read(chunk)) != -1) {
                        if (bytes.size() + n > 1024 * 1024) throw new IOException("Key bundle exceeds 1 MiB");
                        bytes.write(chunk, 0, n);
                    }
                    String json = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
                    runOnUiThread(() -> { if (!closing) requestInvite(json); });
                } catch (Exception e) { runOnUiThread(() -> problem("Could not import the key bundle: " + e.getMessage())); }
            }, "cubechat-key-import").start();
        }
    }

    private final class Messages extends BaseAdapter {
        List<PeerLink.Message> items = Collections.emptyList();
        final DateFormat timeFormat = android.text.format.DateFormat.getTimeFormat(MainActivity.this);
        public int getCount() { return items.size(); }
        public PeerLink.Message getItem(int position) { return items.get(position); }
        public long getItemId(int position) { return position; }
        public View getView(int position, View recycled, ViewGroup parent) {
            LinearLayout line = (LinearLayout) recycled;
            if (line == null) {
                line = new LinearLayout(MainActivity.this);
                pad(line, 0, 3, 3);
                LinearLayout bubble = column();
                pad(bubble, 12, 8, 8);
                TextView text = label("", 17, INK, false);
                text.setTextIsSelectable(true);
                bubble.addView(text);
                TextView meta = label("", 12, MUTED, false);
                meta.setPadding(0, dp(3), 0, 0);
                bubble.addView(meta);
                line.addView(bubble);
            }
            PeerLink.Message msg = getItem(position);
            line.setGravity(msg.outgoing ? Gravity.END : Gravity.START);
            line.setPaddingRelative(msg.outgoing ? dp(36) : 0, dp(3), msg.outgoing ? 0 : dp(36), dp(3));
            LinearLayout bubble = (LinearLayout) line.getChildAt(0);
            bubble.setBackground(shape(msg.outgoing ? PALE : Color.WHITE, 12, !msg.outgoing));
            ((TextView) bubble.getChildAt(0)).setText(msg.text);
            String source = msg.outgoing ? "You" : "Peer";
            String receipt = msg.outgoing ? (msg.delivered ? " · Delivered" : " · Queued") : "";
            ((TextView) bubble.getChildAt(1)).setText(source + " · " + timeFormat.format(new Date(msg.time)) + receipt);
            return line;
        }
    }
}
