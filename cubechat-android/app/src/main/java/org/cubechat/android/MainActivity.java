package org.cubechat.android;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipDescription;
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
import android.widget.CheckBox;
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
import java.util.function.Consumer;

public final class MainActivity extends Activity implements PeerLink.Listener {
    private static final int SCAN = 1, CAMERA = 2, BUNDLE = 3, QR_IMAGE = 4, SAVE_QR = 5;
    private static final String APP_INVITE = "cubechat://pair/";
    private static final int PAPER = 0xfff5f7f1, INK = 0xff17251e, MUTED = 0xff4c6157;
    private static final int GREEN = 0xff185f46, PALE = 0xffdcefdc, LINE = 0xffcdd8ce;
    private static final int MATCH = ViewGroup.LayoutParams.MATCH_PARENT;
    private static final int WRAP = ViewGroup.LayoutParams.WRAP_CONTENT;

    private PeerLink link;
    private ProfileSecurityUi security;
    private ChatPreferences chatPrefs;
    private final List<java.lang.ref.WeakReference<AlertDialog>> chatDialogs = new ArrayList<>();
    private PopupMenu activeMenu;
    private Button createProfile;
    private Intent deferredIntent, resultData;
    private int resultRequest = -1, resultCode;
    private Bundle fileState;
    private long pendingQrContact;
    private boolean inEnrollment, resumed, privacyPaused;

    private UpdateCheck updates;
    private Button updateBanner, fileNotice, jumpLatest, undoDraft;
    private AttachmentsUi files;
    private CubeProfile profile;
    private WifiDirectController direct;
    private BluetoothRadio bluetooth;
    private TextView subtitle, status, radioStatus, relayStatus, contactName, conversationState, pingResult, draftLength;
    private LinearLayout startPanel, composerRow, contactBar;
    private ListView history;
    private EditText draft;
    private Button send, options, inviteButton, scanButton, pasteButton, ping;
    private TextView pairTitle, pairHint;
    private boolean wasConnected;
    private Messages adapter;
    private AlertDialog inviteDialog, shareDialog;
    private QrArtworkUi artworkQr;
    private boolean wantsInvite, closing;
    private String lastProblem = "", exportCode;
    private PendingSend submitted;
    private String clearedDraft;
    private long clearedDraftContact;
    private long renderedId, inviteFrom = -1;
    private final DraftSaveState draftSaveState = new DraftSaveState();
    private boolean loadingDraft, shareSelecting;
    private static final String UNSAVED_DRAFT_NOTICE =
            "Draft not saved · Draft ⋮ → Save draft now to retry.";
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final Runnable writeDraft = this::flushDraft;
    private final Runnable expireDraftUndo = this::forgetClearedDraft;
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
        security = new ProfileSecurityUi(this);
        Intent launch = getIntent();
        if (launch != null && (Intent.ACTION_VIEW.equals(launch.getAction()) || Intent.ACTION_SEND.equals(launch.getAction())))
            deferredIntent = new Intent(launch);
        setIntent(new Intent(this, MainActivity.class));
        if (security.startLocked()) return;
        fileState = state;
        if (getLastNonConfigurationInstance() instanceof Retained) {
            retained = (Retained) getLastNonConfigurationInstance();
            exportCode = retained.exportCode;
            share = retained.share;
            shareTarget = retained.shareTarget;
            sharedText = retained.sharedText;
        }
        openChat();
    }

    void openChat() {
        if (closing || security.sealed()) return;
        DisplayPrivacy.apply(this);
        // The Java transport helpers remain Android-independent for host regressions.
        // Only CubeChat's audited peer sockets receive VPN protection.
        android.content.Context networkApp = getApplicationContext();
        LanDiscovery.setSocketProtector(socket ->
                LockdownFirewall.protectChatDatagram(networkApp, socket));
        RelayForwarder.setSocketProtector(socket ->
                LockdownFirewall.protectChatSocket(networkApp, socket));
        buildScreen();
        securityChanged();
        updates = new UpdateCheck(this, updateBanner);
        try {
            if (link == null) {
                profile = new CubeProfile(this);
                link = new PeerLink(this, profile, this);
                direct = new WifiDirectController(this, link, this::radioMessage);
                bluetooth = new BluetoothRadio(this, link);
                link.start();
            } else link.unlockVault();
            files = new AttachmentsUi(this, link, fileNotice, fileState);
            fileState = null;
            bluetooth.resume();
            changed();
            if (resumed) updates.check(false);
        } catch (Exception e) {
            problem("Could not open CubeChat: " + e.getMessage());
        }
    }

    void securityChanged() {
        if (createProfile != null) createProfile.setVisibility(security.configured() ? View.GONE : View.VISIBLE);
        DisplayPrivacy.apply(this);
    }

    boolean protectedProfile() { return security != null && security.configured(); }
    boolean privacyShield() { return privacyPaused || (security != null && security.sealed()); }
    private boolean chatOpen() { return !closing && security != null && !security.sealed() && !inEnrollment; }

    void trackDialog(AlertDialog dialog) {
        chatDialogs.removeIf(ref -> ref.get() == null);
        chatDialogs.add(new java.lang.ref.WeakReference<>(dialog));
        dialog.setOnShowListener(d -> {
            if (closing || (security != null && security.sealed())) dialog.dismiss();
        });
    }

    void prepareEnrollment(Runnable action) {
        flushDraft();
        inEnrollment = true;
        if (link == null) action.run();
        else link.pauseForEnrollment(action);
    }
    void finishEnrollment() {
        inEnrollment = false;
        if (link != null && chatOpen()) link.unlockVault();
    }

    void parkChat(Runnable parked) {
        flushDraft();
        if (activeMenu != null) activeMenu.dismiss();
        wantsInvite = false;
        clearShare();
        if (updates != null) { updates.close(); updates = null; }
        if (files != null) {
            fileState = new Bundle();
            files.saveState(fileState);
            files.closeDialogs();
            files = null;
        }
        for (java.lang.ref.WeakReference<AlertDialog> ref : new ArrayList<>(chatDialogs)) {
            AlertDialog dialog = ref.get();
            if (dialog != null) dialog.dismiss();
        }
        chatDialogs.clear();
        inviteDialog = null;
        if (artworkQr != null) { artworkQr.close(); artworkQr = null; }
        exportCode = null;
        retained = null;
        forgetClearedDraft();
        renderedId = 0;
        submitted = null;
        loadingDraft = true;
        if (draft != null) draft.setText("");
        loadingDraft = false;
        draftSaveState.reset();
        if (adapter != null) { adapter.items = Collections.emptyList(); adapter.notifyDataSetChanged(); }
        if (subtitle != null) subtitle.setText("");
        if (contactName != null) contactName.setText("");
        if (pingResult != null) pingResult.setText("");
        lastProblem = "";
        // Let Android release the detached chat tree, including recycled message rows.
        if (history != null) history.setAdapter(null);
        history = null; adapter = null; draft = null;
        updateBanner = fileNotice = jumpLatest = undoDraft = send = options = inviteButton = scanButton = pasteButton = ping = createProfile = null;
        draftLength = null;
        subtitle = status = radioStatus = relayStatus = contactName = conversationState = pingResult = pairTitle = pairHint = null;
        startPanel = composerRow = contactBar = null;
        if (link == null) parked.run(); else link.lockVault(parked);
    }

    void discardIncoming() {
        deferredIntent = null;
        resultRequest = -1;
        resultData = null;
        fileState = null;
        pendingQrContact = 0;
        setIntent(new Intent(this, MainActivity.class));
    }
    void announcePurge(Runnable cleared) {
        clearOwnClipboard();
        PeerLink.announcePurgeToAll(cleared);
    }
    private static final String CLIP_MARKER = "org.cubechat.android.private-clip";
    private static final String LEGACY_INVITE_MARKER = "org.cubechat.android.key-card";

    static ClipData privateClip(String label, String text) {
        ClipData clip = ClipData.newPlainText(label, text);
        PersistableBundle extras = new PersistableBundle();
        extras.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true);
        extras.putBoolean(CLIP_MARKER, true);
        clip.getDescription().setExtras(extras);
        return clip;
    }

    static boolean isCubeChatClip(ClipDescription info) {
        if (info == null || info.getExtras() == null) return false;
        PersistableBundle extras = info.getExtras();
        return extras.getBoolean(CLIP_MARKER, false) || extras.getBoolean(LEGACY_INVITE_MARKER, false);
    }

    private void copyPrivateText(String label, String text, String confirmation) {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
        if (clipboard != null) {
            try {
                clipboard.setPrimaryClip(privateClip(label, text));
                Toast.makeText(this, confirmation, Toast.LENGTH_SHORT).show();
                return;
            } catch (RuntimeException ignored) { /* Clipboard access can be restricted. */ }
        }
        Toast.makeText(this, "Clipboard unavailable", Toast.LENGTH_SHORT).show();
    }

    private void clearOwnClipboard() {
        try {
            ClipboardManager clipboard = (ClipboardManager)getSystemService(CLIPBOARD_SERVICE);
            if (clipboard == null || !isCubeChatClip(clipboard.getPrimaryClipDescription())) return;
            if (android.os.Build.VERSION.SDK_INT >= 28) clipboard.clearPrimaryClip();
            else clipboard.setPrimaryClip(ClipData.newPlainText("", ""));
        } catch (RuntimeException ignored) { /* Android can restrict clipboard access in the background. */ }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && (Intent.ACTION_VIEW.equals(intent.getAction()) || Intent.ACTION_SEND.equals(intent.getAction()))) {
            deferredIntent = new Intent(intent);
            setIntent(new Intent(this, MainActivity.class));
            if (chatOpen() && link != null && link.snapshot().loaded) deliverPending();
        }
    }

    private void deliverPending() {
        if (!chatOpen()) return;
        if (resultRequest != -1) {
            int request = resultRequest, result = resultCode;
            Intent data = resultData;
            resultRequest = -1;
            resultData = null;
            handleResult(request, result, data);
        }
        if (deferredIntent != null) {
            Intent intent = deferredIntent;
            deferredIntent = null;
            openExternalInvite(intent);
        }
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
        if (!chatOpen() || value == null || link == null) return;
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
        if (!chatOpen() || protectedProfile() || draft == null) return null;
        Retained r = new Retained();
        r.id = renderedId;
        String editing = draft.getText().toString();
        r.draft = submitted != null && submitted.ownsDraft(editing) ? null : editing;
        r.exportCode = exportCode;
        r.share = share;
        r.shareTarget = shareTarget;
        r.sharedText = sharedText;
        return r;
    }

    @Override protected void onPause() {
        resumed = false;
        if (chatOpen()) flushDraft();
        if (protectedProfile()) {
            privacyPaused = true;
            DisplayPrivacy.apply(this);
            for (java.lang.ref.WeakReference<AlertDialog> ref : chatDialogs) {
                AlertDialog dialog = ref.get();
                if (dialog != null && dialog.getWindow() != null)
                    dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            }
        }
        super.onPause();
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        if (files != null && !protectedProfile()) files.saveState(state);
    }

    @Override protected void onResume() {
        super.onResume();
        resumed = true;
        privacyPaused = false;
        security.resumed();
        DisplayPrivacy.apply(this);
        if (chatOpen()) {
            if (updates != null) updates.check(false);
            if (bluetooth != null) bluetooth.resume();
        }
    }

    @Override public void onUserInteraction() {
        super.onUserInteraction();
        if (security != null) security.interacted();
    }

    @Override protected void onStop() {
        super.onStop();
        if (!isChangingConfigurations()) security.stopped();
    }

    private void leaveRadio() {
        if (direct != null) direct.stop(true);
        if (bluetooth != null) bluetooth.leave();
        radioMessage("");
    }

    @Override protected void onDestroy() {
        closing = true;
        if (security != null) security.close();
        if (updates != null) updates.close();
        if (files != null) files.closeDialogs();
        if (inviteDialog != null) inviteDialog.dismiss();
        if (artworkQr != null) { artworkQr.close(); artworkQr = null; }
        if (shareDialog != null) shareDialog.dismiss();
        ui.removeCallbacks(writeDraft);
        if (bluetooth != null) bluetooth.stop();
        if (direct != null) direct.stop(isFinishing());
        if (link != null) link.stop();
        if (profile != null) profile.close();
        super.onDestroy();
    }

    int dp(float value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    LinearLayout column() {
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
    void pad(View v, int h, int t, int b) { v.setPadding(dp(h), dp(t), dp(h), dp(b)); }
    TextView label(String value, int size, int color, boolean bold) {
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
    Button button(String title, boolean primary, View.OnClickListener action) {
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
        if (chatPrefs == null) chatPrefs = new ChatPreferences(this);
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
        conversationState = label("", 13, MUTED, false);
        conversationState.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        pad(conversationState, 18, 2, 5);
        conversationState.setVisibility(View.GONE);
        root.addView(conversationState);
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
        jumpLatest = button("Latest messages ↓", false, v -> {
            if (history != null && adapter != null && adapter.getCount() > 0)
                history.setSelection(adapter.getCount() - 1);
        });
        FrameLayout.LayoutParams jumpParams = new FrameLayout.LayoutParams(WRAP, WRAP, Gravity.END | Gravity.BOTTOM);
        jumpParams.setMargins(dp(8), dp(8), dp(12), dp(10));
        body.addView(jumpLatest, jumpParams);
        jumpLatest.setVisibility(View.GONE);
        history.setOnScrollListener(new AbsListView.OnScrollListener() {
            public void onScrollStateChanged(AbsListView view, int scrollState) {}
            public void onScroll(AbsListView view, int first, int visible, int total) {
                if (jumpLatest != null)
                    jumpLatest.setVisibility(total > 0 && first + visible < total - 2
                            ? View.VISIBLE : View.GONE);
            }
        });
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
        createProfile = button("Create local profile", false, v -> security.enroll());
        startPanel.addView(createProfile);
        body.addView(instructions);

        composerRow = row();
        composerRow.setGravity(Gravity.BOTTOM);
        pad(composerRow, 12, 8, 10);
        composerRow.addView(button("Files", false, v -> {
            if (files != null) files.showFiles();
        }));
        draft = new ChatPreferences.Composer(this);
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
        chatPrefs.apply(draft, this::send);
        composerRow.addView(draft, weight(WRAP));
        Button draftMenu = button("Draft ⋮", false, null);
        draftMenu.setContentDescription("Draft actions: copy or clear");
        draftMenu.setOnClickListener(v -> showDraftActions(v));
        composerRow.addView(draftMenu);
        send = button("Send", true, v -> send());
        send.setEnabled(false);
        LinearLayout.LayoutParams sendParams = new LinearLayout.LayoutParams(WRAP, dp(52));
        sendParams.setMarginStart(dp(6));
        composerRow.addView(send, sendParams);
        draft.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            public void afterTextChanged(Editable e) {}
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (!loadingDraft && renderedId != 0) {
                    if (submitted != null) submitted.edited = true;
                    draftSaveState.edited();
                    ui.removeCallbacks(writeDraft);
                    ui.postDelayed(writeDraft, 350);
                }
                // Update the badge after the revision advances so one keystroke
                // cannot temporarily look like a completed saved draft.
                refreshSend();
            }
        });
        root.addView(composerRow);
        undoDraft = button("Undo clear", false, v -> restoreClearedDraft());
        undoDraft.setVisibility(View.GONE);
        root.addView(undoDraft);
        draftLength = label("", 12, MUTED, false);
        draftLength.setTextAlignment(View.TEXT_ALIGNMENT_VIEW_END);
        pad(draftLength, 12, 0, 10);
        draftLength.setVisibility(View.GONE);
        root.addView(draftLength);
        composerRow.setVisibility(View.GONE);
        setContentView(root);
    }

    @Override public void changed() {
        if (!chatOpen() || link == null) return;
        PeerLink.Snapshot next = link.snapshot();
        // A new invite for the same conversation invalidates old artwork,
        // just as switching contacts does. Never display stale pairing keys.
        if (artworkQr != null && !artworkQr.validForCurrentPairing())
            artworkQr.close();
        if (files != null) files.changed(next);
        boolean paired = !next.role.isEmpty();
        boolean switched = next.activeId != renderedId;
        if (switched) {
            forgetClearedDraft();
            flushDraft();
            draftSaveState.reset();
            if (renderedId != 0) leaveRadio();
            renderedId = next.activeId;
            submitted = null;
            lastProblem = "";
            wasConnected = false;
            if (inviteDialog != null) inviteDialog.dismiss();
            // A QR artwork editor holds private pairing key material only for
            // its original conversation; dismiss on contact switch.
            if (artworkQr != null) artworkQr.close();
            loadingDraft = true;
            String saved = retained != null && retained.id == renderedId && retained.draft != null
                    ? retained.draft : next.draft;
            draft.setText(saved);
            draft.setSelection(draft.length());
            loadingDraft = false;
            if (!TextUtils.equals(saved, next.draft)) {
                draftSaveState.edited();
                flushDraft();
            }
            retained = null;
        }
        int queuedHere = 0;
        for (ChatStore.Contact c : next.contacts) if (c.id == renderedId) {
            contactName.setText(c.name);
            queuedHere = c.pending;
            break;
        }
        contactBar.setVisibility(paired ? View.VISIBLE : View.GONE);
        conversationState.setVisibility(paired ? View.VISIBLE : View.GONE);
        if (paired) {
            String reachability = next.connected ? "Connected" : "Not connected";
            String queue = queuedHere == 0 ? "No queued messages"
                    : queuedHere == 1 ? "1 message queued" : queuedHere + " messages queued";
            conversationState.setText(reachability + " · " + queue + " · Route: " + next.route);
            conversationState.setTextColor(next.connected ? GREEN : MUTED);
        }
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
        if (jumpLatest != null && !paired) jumpLatest.setVisibility(View.GONE);
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
        if (next.loaded) { deliverPending(); advanceShare(next); }
    }

    private final class PendingSend implements Consumer<String> {
        final long contact;
        final String text;
        boolean edited;

        PendingSend(long contact, String text) {
            this.contact = contact;
            this.text = text;
        }

        boolean ownsDraft(CharSequence current) {
            return !edited && text.contentEquals(current);
        }

        @Override public void accept(String error) {
            if (!chatOpen() || renderedId != contact || submitted != this) return;
            submitted = null;
            if (error != null) {
                problem(error);
                return;
            }
            if (ownsDraft(draft.getText())) {
                // ChatStore already cleared the matching draft in the outbox transaction.
                loadingDraft = true;
                draft.setText("");
                loadingDraft = false;
                // The sent text was committed to the outbox, not saved as a
                // draft. Invalidate any pending editor-only save receipt.
                draftSaveState.reset();
            }
            forgetClearedDraft();
            refreshSend();
        }
    }

    @Override public void fileSaved(long contactId, String fileId) {
        if (chatOpen() && files != null) files.saved(contactId);
    }

    @Override public void problem(String message) {
        if (!chatOpen()) return;
        if (files != null) files.problem(message);
        wantsInvite = false;
        if (shareSelecting && renderedId != shareTarget) clearShare();
        lastProblem = message;
        status.setText(message);
        status.setTextColor(0xff8c351c);
        refreshSend();
    }

    private void beginAction() { lastProblem = ""; }

    private void flushDraft() { flushDraft(false); }

    private void flushDraft(boolean explicit) {
        ui.removeCallbacks(writeDraft);
        if (renderedId == 0 || link == null || draft == null) return;
        DraftSaveState.Ticket ticket = draftSaveState.begin(
                renderedId, draft.getText().toString());
        if (ticket == null) return;
        refreshSend();
        link.saveDraft(ticket.contactId, ticket.text, error -> {
            if (!chatOpen() || draft == null || status == null
                    || renderedId != ticket.contactId) return;
            String editing = draft.getText().toString();
            if (error != null) {
                if (draftSaveState.failed(ticket, renderedId, editing, error)) {
                    lastProblem = UNSAVED_DRAFT_NOTICE;
                    status.setText(lastProblem);
                    status.setTextColor(0xff8c351c);
                }
            } else if (draftSaveState.succeeded(ticket, renderedId, editing)) {
                if (UNSAVED_DRAFT_NOTICE.equals(lastProblem)) {
                    lastProblem = "";
                    status.setText(link.snapshot().status);
                    status.setTextColor(MUTED);
                }
                if (explicit)
                    Toast.makeText(this, "Draft saved locally", Toast.LENGTH_SHORT).show();
            }
            refreshSend();
        });
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
        if (shareDialog != null || !chatOpen()) return;
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
        if (!chatOpen() || radioStatus == null) return;
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

    private void showDraftActions(View anchor) {
        if (!chatOpen() || renderedId == 0 || draft == null || submitted != null) return;
        long contactId = renderedId;
        PopupMenu menu = new PopupMenu(this, anchor);
        menu.getMenu().add("Save draft now").setEnabled(
                draft.length() > 0 || draftSaveState.isDirty());
        menu.getMenu().add("Copy draft").setEnabled(draft.length() > 0);
        menu.getMenu().add("Clear draft").setEnabled(draft.length() > 0);
        menu.setOnMenuItemClickListener(item -> {
            if (!chatOpen() || draft == null || renderedId != contactId || submitted != null) return true;
            String contents = draft.getText().toString();
            if ("Save draft now".contentEquals(item.getTitle())) {
                draftSaveState.retry();
                flushDraft(true);
            } else if ("Copy draft".contentEquals(item.getTitle())) {
                copyPrivateText("CubeChat draft", contents, "Draft copied");
            } else if ("Clear draft".contentEquals(item.getTitle()) && !contents.isEmpty()) {
                forgetClearedDraft();
                clearedDraft = contents;
                clearedDraftContact = renderedId;
                draft.setText("");
                flushDraft();
                if (undoDraft != null) undoDraft.setVisibility(View.VISIBLE);
                ui.postDelayed(expireDraftUndo, 10_000);
            }
            return true;
        });
        menu.show();
    }

    private void restoreClearedDraft() {
        if (!chatOpen() || draft == null || clearedDraft == null
                || renderedId != clearedDraftContact || submitted != null) {
            forgetClearedDraft();
            return;
        }
        // Undo must not overwrite newer typed text.
        if (!draft.getText().toString().isEmpty()) {
            Toast.makeText(this, "Clear the new draft before restoring", Toast.LENGTH_SHORT).show();
            return;
        }
        String restored = clearedDraft;
        forgetClearedDraft();
        draft.setText(restored);
        draft.setSelection(draft.length());
        flushDraft();
    }

    private void forgetClearedDraft() {
        ui.removeCallbacks(expireDraftUndo);
        clearedDraft = null;
        clearedDraftContact = 0;
        if (undoDraft != null) undoDraft.setVisibility(View.GONE);
    }

    private void refreshSend() {
        if (send == null || draft == null) return;
        String text = draft.getText().toString();
        int bytes = text.getBytes(StandardCharsets.UTF_8).length;
        boolean over = bytes > 4096;
        String action = submitted == null ? "Send" : "Saving…";
        if (!action.contentEquals(send.getText())) send.setText(action);
        send.setEnabled(link != null && renderedId != 0 && submitted == null && !over && !text.trim().isEmpty());
        if (draftLength != null) {
            boolean pending = draftSaveState.isAwaiting();
            boolean failed = draftSaveState.hadFailure();
            boolean unsaved = draftSaveState.isDirty();
            boolean visible = renderedId != 0
                    && (!text.isEmpty() || pending || failed || unsaved);
            draftLength.setVisibility(visible ? View.VISIBLE : View.GONE);
            String phase = over ? " · Message too long"
                    : failed ? " · Draft not saved · Retry in Draft ⋮"
                    : pending ? " · Saving locally…"
                    : unsaved ? " · Unsaved changes"
                    : text.isEmpty() ? "" : " · Saved locally";
            draftLength.setText(bytes + " / 4096 bytes" + phase);
            draftLength.setTextColor(over || failed ? 0xff8c351c : MUTED);
        }
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
        submitted = new PendingSend(renderedId, text);
        refreshSend();
        link.send(renderedId, text, submitted);
    }

    private void conversations() {
        if (link == null || !chatOpen()) return;
        PeerLink.Snapshot current = link.snapshot();
        LinearLayout content = column();
        pad(content, 16, 0, 0);

        EditText search = new EditText(this);
        search.setHint("Search contacts");
        search.setSingleLine(true);
        search.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        search.setImeOptions(EditorInfo.IME_ACTION_SEARCH
                | EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING);
        search.setFilters(new InputFilter[]{new InputFilter.LengthFilter(96)});
        search.setSaveEnabled(false);
        content.addView(search);

        CheckBox queuedOnly = new CheckBox(this);
        queuedOnly.setText("Conversations with queued messages only");
        queuedOnly.setTextSize(15);
        content.addView(queuedOnly);

        TextView summary = label("", 13, MUTED, false);
        summary.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        content.addView(summary);

        FrameLayout results = new FrameLayout(this);
        // A bounded list remains scrollable on narrow Android screens instead
        // of expanding the AlertDialog past its visible buttons.
        int maxListHeight = Math.max(dp(120), Math.min(dp(320),
                getResources().getDisplayMetrics().heightPixels / 2));
        content.addView(results, new LinearLayout.LayoutParams(MATCH, maxListHeight));
        ListView choices = new ListView(this);
        choices.setSaveEnabled(false);
        choices.setContentDescription("Conversations, current then queued first");
        results.addView(choices, new FrameLayout.LayoutParams(MATCH, MATCH));
        TextView empty = label("No matching contacts", 15, MUTED, false);
        pad(empty, 12, 16, 12);
        results.addView(empty, new FrameLayout.LayoutParams(MATCH, MATCH));
        choices.setEmptyView(empty);

        List<ConversationPickerModel.Entry> contacts = new ArrayList<>();
        for (ChatStore.Contact contact : current.contacts)
            contacts.add(new ConversationPickerModel.Entry(
                    contact.id, contact.name, contact.pending));
        ArrayAdapter<ConversationPickerModel.Entry> rows =
                new ArrayAdapter<ConversationPickerModel.Entry>(this,
                        android.R.layout.simple_list_item_2, android.R.id.text1) {
            @Override public View getView(int position, View recycled, ViewGroup parent) {
                View view = super.getView(position, recycled, parent);
                ConversationPickerModel.Entry contact = getItem(position);
                ((TextView) view.findViewById(android.R.id.text1)).setText(contact.name);
                String detail = contact.id == current.activeId
                        ? (current.connected ? "Current · Connected" : "Current · Not connected")
                        : "Tap to open";
                if (contact.queued > 0)
                    detail += " · " + contact.queued
                            + (contact.queued == 1 ? " queued message" : " queued messages");
                else detail += " · No queued messages";
                ((TextView) view.findViewById(android.R.id.text2)).setText(detail);
                return view;
            }
        };
        rows.setNotifyOnChange(false);
        choices.setAdapter(rows);
        Runnable refresh = () -> {
            List<ConversationPickerModel.Entry> filtered = ConversationPickerModel.choose(
                    contacts, current.activeId, search.getText().toString(),
                    queuedOnly.isChecked());
            rows.setNotifyOnChange(false);
            rows.clear();
            rows.addAll(filtered);
            rows.notifyDataSetChanged();
            summary.setText(filtered.size() + " of " + contacts.size()
                    + " conversations · "
                    + ConversationPickerModel.queuedConversations(contacts)
                    + " with queued messages");
            empty.setText(queuedOnly.isChecked()
                    ? "No matching conversations with queued messages."
                    : "No matching contacts.");
        };
        search.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) { }
            @Override public void afterTextChanged(Editable e) { refresh.run(); }
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) { }
        });
        queuedOnly.setOnCheckedChangeListener((button, checked) -> refresh.run());
        refresh.run();

        AlertDialog.Builder builder = DisplayPrivacy.dialog(this).setTitle("Conversations")
                .setView(content).setNegativeButton("Close", null)
                .setPositiveButton("Add contact", (d, w) -> addContact());
        for (ChatStore.Contact contact : current.contacts) if (contact.id == current.activeId) {
            builder.setNeutralButton("Rename contact", (d, w) -> renameContact(contact));
            break;
        }
        AlertDialog dialog = builder.create();
        choices.setOnItemClickListener((parent, view, position, id) -> {
            ConversationPickerModel.Entry selected = rows.getItem(position);
            dialog.dismiss();
            if (selected == null || !chatOpen() || link == null) return;
            // The modal is a snapshot; a contact can be forgotten while it is
            // open. Never navigate using a no-longer-present contact identity.
            boolean exists = false;
            for (ChatStore.Contact live : link.snapshot().contacts) {
                if (live.id == selected.id) { exists = true; break; }
            }
            if (exists) selectContact(selected.id);
            else Toast.makeText(this, "That conversation is no longer available.",
                    Toast.LENGTH_SHORT).show();
        });
        dialog.setOnDismissListener(d -> {
            // Keep contact queries out of saved state/keyboard personalization,
            // and release references held by the dialog adapter on close.
            search.setText("");
            rows.clear();
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
        if (!chatOpen()) return;
        PopupMenu popup = new PopupMenu(this, options);
        activeMenu = popup;
        popup.setOnDismissListener(done -> { if (activeMenu == done) activeMenu = null; });
        popup.getMenu().add("Chat preferences").setOnMenuItemClickListener(i -> {
            chatPrefs.show(this, () -> {
                if (chatOpen()) { chatPrefs.apply(draft, this::send); adapter.notifyDataSetChanged(); }
            });
            return true;
        });
        popup.getMenu().add("Security").setOnMenuItemClickListener(i -> { security.settings(); return true; });
        popup.getMenu().add("Firewall settings").setOnMenuItemClickListener(i -> {
            startActivity(new Intent(this, FirewallSettings.class)); return true;
        });
        if (security.configured()) popup.getMenu().add("Lock now").setOnMenuItemClickListener(i -> { security.lock(); return true; });
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
                    if (!chatOpen() || renderedId != state.activeId
                            || adapter == null || history == null) return;
                    int position = MessageJump.locate(items, index, adapter.items,
                            (original, visible) -> original != null && visible != null
                                    && original.time == visible.time
                                    && original.outgoing == visible.outgoing
                                    && original.text.equals(visible.text));
                    if (position >= 0) {
                        history.setSelection(position);
                    } else {
                        Toast.makeText(this, "That message moved or is no longer in recent history. Search again.",
                                Toast.LENGTH_SHORT).show();
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
        if (!chatOpen() || link == null) return;
        beginAction();
        wantsInvite = true;
        inviteFrom = bundle == null ? -1 : renderedId;
        flushDraft();
        if (bundle == null) link.createInvite(); else link.createInvite(bundle);
    }

    private void showInvite(String raw) {
        if (!chatOpen() || inviteDialog != null) return;
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
            pendingQrContact = renderedId;
            Intent create = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            create.addCategory(Intent.CATEGORY_OPENABLE);
            create.setType("image/png");
            create.putExtra(Intent.EXTRA_TITLE, "CubeChat-key-card.png");
            startActivityForResult(create, SAVE_QR);
        }));
        content.addView(button("Blend QR into a photo", true, v -> {
            if (!chatOpen() || link == null || artworkQr != null) return;
            // Switching export modes invalidates a previously cancelled plain
            // QR destination request; never reuse a stale invite string.
            exportCode = null;
            pendingQrContact = 0;
            final long contact = renderedId;
            final String expected = code;
            QrArtworkUi artwork = new QrArtworkUi(this, expected,
                    () -> chatOpen() && link != null
                            && link.snapshot().activeId == contact
                            && expected.equals(Pairing.HTTPS_PREFIX + link.snapshot().invite),
                    () -> artworkQr = null);
            artworkQr = artwork;
            if (inviteDialog != null) inviteDialog.dismiss();
            artwork.chooseImage();
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
            copyPrivateText("CubeChat invite", code, "Invite copied");
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
                if (chatOpen()) Toast.makeText(this, "Key card saved", Toast.LENGTH_SHORT).show();
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
        if (!chatOpen()) return;
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
        if (!chatOpen() || (link != null && !link.snapshot().loaded && protectedProfile())) {
            resultRequest = request;
            resultCode = result;
            resultData = data;
            return;
        }
        handleResult(request, result, data);
    }

    private void handleResult(int request, int result, Intent data) {
        if (!chatOpen()) return;
        if (request == QrArtworkUi.PICK_IMAGE || request == QrArtworkUi.SAVE_IMAGE) {
            if (artworkQr != null) artworkQr.consume(request, result, data);
            else Toast.makeText(this, "Reopen the pairing invite to edit artwork",
                    Toast.LENGTH_LONG).show();
            return;
        }
        if (files != null && files.result(request, result, data)) return;
        if ((request == 732 || request == 733) && bluetooth != null) {
            bluetooth.onActivityResult(request, result);
            return;
        }
        if (request == SAVE_QR) {
            String code = exportCode;
            if (code == null && link != null && pendingQrContact != 0 && link.snapshot().activeId == pendingQrContact
                    && !link.snapshot().invite.isEmpty()) code = Pairing.HTTPS_PREFIX + link.snapshot().invite;
            exportCode = null;
            pendingQrContact = 0;
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

    private void messageActions(View anchor, PeerLink.Message message, long contactId) {
        if (!chatOpen() || link == null || renderedId != contactId) return;
        PopupMenu menu = new PopupMenu(this, anchor);
        menu.getMenu().add("Copy message").setOnMenuItemClickListener(item -> {
            if (!chatOpen() || renderedId != contactId) return true;
            copyPrivateText("CubeChat message", message.text, "Message copied");
            return true;
        });
        menu.getMenu().add("Quote in reply").setOnMenuItemClickListener(item -> {
            quoteInDraft(contactId, message.text);
            return true;
        });
        menu.show();
    }

    private void quoteInDraft(long contactId, String source) {
        if (!chatOpen() || draft == null || link == null || renderedId != contactId) return;
        // Quotes are plain text. Never silently send, overwrite an existing draft, or
        // cross conversation boundaries. Keep the inserted quote short enough to edit.
        StringBuilder quoted = new StringBuilder();
        int sourceBytes = 0;
        boolean atLineStart = true;
        for (int offset = 0; offset < source.length();) {
            int cp = source.codePointAt(offset);
            String character = new String(Character.toChars(cp));
            int bytes = character.getBytes(StandardCharsets.UTF_8).length;
            if (sourceBytes + bytes > 1024) {
                quoted.append("…");
                break;
            }
            if (atLineStart) quoted.append("> ");
            quoted.append(character);
            sourceBytes += bytes;
            offset += Character.charCount(cp);
            atLineStart = cp == '\n';
        }
        String original = draft.getText().toString();
        String separator = original.isEmpty() ? "" : (original.endsWith("\n") ? "\n" : "\n\n");
        String addition = separator + quoted + "\n";
        if ((original + addition).getBytes(StandardCharsets.UTF_8).length > 4096) {
            Toast.makeText(this, "Draft is too long to add this quote", Toast.LENGTH_LONG).show();
            return;
        }
        // Append below the existing draft so a quote never splits text at an old cursor.
        draft.append(addition);
        draft.setSelection(draft.length());
        draft.requestFocus();
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
            ((TextView) bubble.getChildAt(0)).setTextSize(chatPrefs.textSize());
            ((TextView) bubble.getChildAt(1)).setTextSize(chatPrefs.captionSize());
            ((TextView) bubble.getChildAt(0)).setText(msg.text);
            final long messageContact = renderedId;
            bubble.setContentDescription((msg.outgoing ? "Your message. " : "Received message. ")
                    + "Tap for Copy or Quote. " + msg.text);
            bubble.setOnClickListener(v -> messageActions(v, msg, messageContact));
            bubble.setOnLongClickListener(v -> {
                messageActions(v, msg, messageContact);
                return true;
            });
            String source = msg.outgoing ? "You" : "Peer";
            String receipt = msg.outgoing ? (msg.delivered ? " · Delivered" : " · Queued") : "";
            ((TextView) bubble.getChildAt(1)).setText(source + " · " + timeFormat.format(new Date(msg.time)) + receipt);
            return line;
        }
    }
}
