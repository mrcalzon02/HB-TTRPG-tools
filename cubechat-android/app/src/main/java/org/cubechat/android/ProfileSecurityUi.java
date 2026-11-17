package org.cubechat.android;

import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.text.InputFilter;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.util.Arrays;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Owns the local sign-in screen. A sealed activity has no chat views or editable chat dialogs. */
final class ProfileSecurityUi {
    private static CompletableFuture<Boolean> resetRequest;
    // Accessed on the main thread. A replacement Activity waits for the migration before
    // deciding whether this installation still allows entry without a password.
    private static CompletableFuture<Void> enrollment;
    private static final long MINUTE = 60_000L;
    private static final long[] IDLE = {MINUTE, 5 * MINUTE, 15 * MINUTE, 30 * MINUTE, -1};
    private static final long[] AWAY = {0, 30_000, MINUTE, 5 * MINUTE, 15 * MINUTE};
    private static final String[] IDLE_LABELS = {"1 minute", "5 minutes", "15 minutes", "30 minutes", "Manual only"};
    private static final String[] AWAY_LABELS = {"Immediately", "30 seconds", "1 minute", "5 minutes", "15 minutes"};
    private final MainActivity screen;
    private final LocalVault vault;
    private final SharedPreferences prefs;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Runnable timeout = this::checkTime;
    private boolean enrolled, sealed, readyToUnlock, busy, clearing, closed, away;
    private String username = "";
    private long lastActive, leftAt;
    private EditText loginName, loginPassword;
    private TextView lockStatus;
    private Button unlockButton;

    ProfileSecurityUi(MainActivity screen) {
        this.screen = screen;
        vault = new LocalVault(screen.getApplicationContext());
        prefs = screen.getSharedPreferences("cubechat-lock-timing", Context.MODE_PRIVATE);
    }

    boolean startLocked() {
        try {
            if (vault.purgePending()) {
                sealed = clearing = true;
                showClearing();
                screen.announcePurge(this::clearApp);
                return true;
            }
            if (enrollment != null) {
                sealed = true;
                setPrivacy();
                LinearLayout form = form();
                form.setGravity(Gravity.CENTER_VERTICAL);
                form.setFitsSystemWindows(true);
                hint(form, "Protecting the local vault…");
                screen.setContentView(scroll(form));
                enrollment.thenRun(() -> {
                    if (!closed && !startLocked()) screen.openChat();
                });
                return true;
            }
            enrolled = vault.configured();
            if (!enrolled) {
                sealed = false;
                return false;
            }
            username = vault.username();
            vault.lock();
            sealed = readyToUnlock = true;
            showLock();
        } catch (Exception failed) {
            enrolled = sealed = true;
            readyToUnlock = false;
            vault.lock();
            setPrivacy();
            LinearLayout form = form();
            form.setGravity(Gravity.CENTER_VERTICAL);
            form.setFitsSystemWindows(true);
            form.addView(screen.label("Local vault unavailable", 25, 0xff17251e, true));
            hint(form, "CubeChat could not read the profile. Your conversations are locked.");
            form.addView(screen.button("Retry", true, v -> { if (!startLocked()) screen.openChat(); }));
            screen.setContentView(scroll(form));
        }
        return true;
    }

    boolean sealed() { return sealed; }
    boolean configured() { return enrolled; }

    void lock() {
        if (closed || sealed || !configured()) return;
        sealed = true;
        readyToUnlock = false;
        handler.removeCallbacks(timeout);
        screen.parkChat(() -> {
            if (closed) return;
            worker.execute(() -> {
                vault.lock();
                handler.post(() -> {
                    readyToUnlock = true;
                    if (!closed && !clearing && unlockButton != null) unlockButton.setEnabled(!busy);
                });
            });
        });
        showLock();
    }

    void resumed() {
        if (away) checkTime();
        away = false;
        interacted();
    }
    void stopped() {
        if (away) return;
        away = true;
        leftAt = SystemClock.elapsedRealtime();
        checkTime();
    }
    void interacted() {
        if (closed || sealed || away) return;
        lastActive = SystemClock.elapsedRealtime();
        schedule();
    }
    private void schedule() {
        handler.removeCallbacks(timeout);
        if (closed || sealed || !configured()) return;
        long delay = away ? backgroundDelay() : idleDelay();
        if (delay >= 0) handler.postDelayed(timeout, Math.max(0, (away ? leftAt : lastActive) + delay - SystemClock.elapsedRealtime()));
    }
    private long idleDelay() { return prefs.getLong("idle", 5 * MINUTE); }
    private long backgroundDelay() { return prefs.getLong("away", 0); }
    private void checkTime() {
        if (closed || sealed || !configured()) return;
        long now = SystemClock.elapsedRealtime();
        long duration = away ? backgroundDelay() : idleDelay();
        if (duration >= 0 && now - (away ? leftAt : lastActive) >= duration) lock();
        else schedule();
    }
    void close() {
        closed = true;
        handler.removeCallbacks(timeout);
        worker.shutdown();
    }

    private LinearLayout form() {
        LinearLayout form = screen.column();
        screen.pad(form, 20, 8, 10);
        form.setFocusableInTouchMode(true);
        return form;
    }
    private ScrollView scroll(LinearLayout form) {
        ScrollView container = new ScrollView(screen);
        container.setFillViewport(true);
        container.addView(form);
        return container;
    }
    private TextView hint(LinearLayout form, String message) {
        TextView view = screen.label(message, 15, 0xff43574b, false);
        screen.pad(view, 0, 6, 8);
        form.addView(view);
        return view;
    }
    private EditText field(LinearLayout form, String title, boolean password) {
        form.addView(screen.label(title, 15, 0xff263e30, true));
        EditText input = new EditText(screen);
        input.setHint(title);
        input.setContentDescription(title);
        input.setSaveEnabled(false);
        input.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        input.setSingleLine();
        input.setInputType(InputType.TYPE_CLASS_TEXT | (password ? InputType.TYPE_TEXT_VARIATION_PASSWORD :
                InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS));
        input.setImeOptions(EditorInfo.IME_ACTION_NEXT | EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING |
                EditorInfo.IME_FLAG_NO_EXTRACT_UI);
        input.setFilters(new InputFilter[]{new InputFilter.LengthFilter(password ? 256 : 64)});
        input.setMinHeight(screen.dp(48));
        input.addTextChangedListener(new android.text.TextWatcher() {
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            public void onTextChanged(CharSequence s, int start, int before, int count) { interacted(); }
            public void afterTextChanged(android.text.Editable s) {}
        });
        form.addView(input);
        return input;
    }
    private static char[] read(EditText field) {
        if (field == null) return new char[0];
        char[] value = new char[field.length()];
        field.getText().getChars(0, value.length, value, 0);
        return value;
    }
    private static void erase(char[]... values) {
        for (char[] value : values) Arrays.fill(value, '\0');
    }
    private void setPrivacy() {
        screen.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        if (android.os.Build.VERSION.SDK_INT >= 33) screen.setRecentsScreenshotEnabled(false);
    }
    private void showLock() {
        setPrivacy();
        LinearLayout form = form();
        form.setGravity(Gravity.CENTER_VERTICAL);
        form.setFitsSystemWindows(true);
        form.setBackgroundColor(0xfff5f7f1);
        form.addView(screen.label("Unlock CubeChat", 26, 0xff17251e, true));
        hint(form, "Sign in to your local profile.");
        loginName = field(form, "Username", false);
        if (prefs.getBoolean("remember-name", true)) loginName.setText(username);
        loginPassword = field(form, "Password", true);
        loginPassword.setImeOptions(EditorInfo.IME_ACTION_DONE | EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING |
                EditorInfo.IME_FLAG_NO_EXTRACT_UI);
        lockStatus = hint(form, "");
        lockStatus.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        unlockButton = screen.button("Unlock", true, v -> authenticate());
        unlockButton.setEnabled(readyToUnlock && !busy);
        form.addView(unlockButton);
        loginPassword.setOnEditorActionListener((v, id, event) -> {
            if (id != EditorInfo.IME_ACTION_DONE) return false;
            authenticate();
            return true;
        });
        screen.setContentView(scroll(form));
    }
    private void authenticate() {
        if (closed || busy || clearing || !readyToUnlock || !sealed) return;
        final String name = loginName.getText().toString().trim();
        final char[] password = read(loginPassword);
        loginPassword.setText("");
        busy = true;
        unlockButton.setEnabled(false);
        lockStatus.setText("Unlocking…");
        worker.execute(() -> {
            LocalVault.Result result = null;
            try { result = vault.unlock(name, password); }
            catch (Exception ignored) { /* The app stays sealed on storage and credential errors. */ }
            finally { erase(password); }
            final LocalVault.Result outcome = result;
            handler.post(() -> {
                busy = false;
                if (vault.purgePending() || outcome == LocalVault.Result.DURESS) {
                    if (!clearing) {
                        clearing = true;
                        if (closed) PeerLink.announcePurgeToAll(this::clearApp);
                        else {
                            screen.discardIncoming();
                            showClearing();
                            screen.announcePurge(this::clearApp);
                        }
                    }
                    return;
                }
                if (closed || away || screen.isFinishing()) {
                    vault.lock();
                    if (!closed) { lockStatus.setText(""); unlockButton.setEnabled(true); }
                    return;
                }
                if (outcome == LocalVault.Result.NORMAL) {
                    sealed = false;
                    loginPassword = null;
                    loginName = null;
                    lockStatus = null;
                    unlockButton = null;
                    screen.openChat();
                    interacted();
                } else {
                    lockStatus.setText(outcome == null ? "Could not open this local profile." : "Incorrect username or password.");
                    unlockButton.setEnabled(true);
                    loginPassword.requestFocus();
                }
            });
        });
    }

    private void showClearing() {
        setPrivacy();
        LinearLayout form = form();
        form.setGravity(Gravity.CENTER_VERTICAL);
        form.setFitsSystemWindows(true);
        form.addView(screen.label("Resetting CubeChat", 24, 0xff17251e, true));
        lockStatus = hint(form, "CubeChat will close. Open it again to start fresh.");
        screen.setContentView(scroll(form));
    }
    private void clearApp() {
        // A replacement Activity can join the same armed reset. Submit exactly one system clear.
        final CompletableFuture<Boolean> result;
        synchronized (ProfileSecurityUi.class) {
            if (resetRequest != null) result = resetRequest;
            else {
                resetRequest = result = new CompletableFuture<>();
                new Thread(() -> {
                    try {
                        vault.requestClear();
                        result.complete(true);
                    } catch (Exception failure) {
                        synchronized (ProfileSecurityUi.class) { resetRequest = null; }
                        result.complete(false);
                    }
                }, "cubechat-local-reset").start();
            }
        }
        result.thenAccept(accepted -> {
            if (!accepted) handler.post(this::showResetPending);
        });
    }
    private void showResetPending() {
        if (closed) return;
        setPrivacy();
        LinearLayout form = form();
        form.setGravity(Gravity.CENTER_VERTICAL);
        form.addView(screen.label("Reset pending", 24, Color.BLACK, true));
        hint(form, "Android could not clear CubeChat. Your profile is locked.");
        form.addView(screen.button("Retry reset", true, v -> { showClearing(); clearApp(); }));
        screen.setContentView(scroll(form));
    }

    void settings() {
        if (sealed || closed) return;
        boolean protectedProfile = configured();
        LinearLayout form = form();
        if (protectedProfile) {
            hint(form, "Local profile · " + username);
        } else {
            hint(form, "A local username and password protect this phone’s CubeChat vault. You can still pair and chat offline.");
        }
        AlertDialog dialog = DisplayPrivacy.dialog(screen).setTitle("Security").setView(scroll(form))
                .setNegativeButton("Close", null).create();
        if (!protectedProfile) {
            form.addView(screen.button("Set up local profile", true, v -> { dialog.dismiss(); edit(Mode.ENROLL); }));
        } else {
            form.addView(screen.button("Lock now", true, v -> { dialog.dismiss(); lock(); }));
            form.addView(screen.button("Change password", false, v -> { dialog.dismiss(); edit(Mode.CHANGE); }));
            form.addView(screen.button("PURGE password", false, v -> { dialog.dismiss(); edit(Mode.DURESS); }));
            String status = vault.hasDuress() ? "Enabled" : "Off";
            hint(form, "PURGE password · " + status);
            form.addView(screen.button("Lock timing", false, v -> { dialog.dismiss(); timings(); }));
            CheckBox remember = new CheckBox(screen);
            remember.setText("Fill in my username on the lock screen");
            remember.setChecked(prefs.getBoolean("remember-name", true));
            remember.setOnCheckedChangeListener((v, checked) -> prefs.edit().putBoolean("remember-name", checked).apply());
            form.addView(remember);
        }
        dialog.show();
    }

    void enroll() { if (!configured() && !sealed) edit(Mode.ENROLL); }
    private enum Mode { ENROLL, CHANGE, DURESS, DISABLE }
    private void edit(Mode mode) {
        if (sealed || closed || busy) return;
        boolean setup = mode == Mode.ENROLL;
        boolean purge = mode == Mode.DURESS;
        boolean disabling = mode == Mode.DISABLE;
        boolean existing = purge && vault.hasDuress();
        LinearLayout form = form();
        String title = setup ? "Set up local profile" : disabling ? "Disable PURGE password" :
                purge ? "PURGE password" : "Change password";
        if (setup) hint(form, "Use 8–256 characters. Remember this password to reopen this vault.");
        else if (purge) hint(form, "Entering this separate password on the lock screen announces PURGE to connected conversations, then clears CubeChat on this phone, including its profile, keys, messages, files and settings. Offline peers will miss the notice. Peers’ copies and files you exported stay where they are. Open CubeChat again for first-time setup.");
        else if (disabling) hint(form, "Enter your regular password to remove the PURGE password.");
        EditText name = setup ? field(form, "Username", false) : null;
        EditText current = setup ? null : field(form, "Current password", true);
        EditText next = disabling ? null : field(form, purge ? "PURGE password" : "New password", true);
        EditText confirm = disabling ? null : field(form, purge ? "Confirm PURGE password" : "Confirm password", true);
        CheckBox consent = new CheckBox(screen);
        if (purge) {
            consent.setText("I understand this clears CubeChat on this phone");
            form.addView(consent);
        }
        TextView error = hint(form, "");
        error.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        String action = setup ? "Create profile" : purge ? (existing ? "Change PURGE password" : "Enable PURGE password")
                : disabling ? "Disable PURGE password" : "Change password";
        AlertDialog.Builder builder = DisplayPrivacy.dialog(screen).setTitle(title).setView(scroll(form))
                .setNegativeButton("Cancel", null).setPositiveButton(action, null);
        if (existing) builder.setNeutralButton("Disable", (d, w) -> edit(Mode.DISABLE));
        AlertDialog dialog = builder.create();
        dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        dialog.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        dialog.show();
        dialog.setOnDismissListener(d -> {
            if (current != null) current.setText("");
            if (next != null) next.setText("");
            if (confirm != null) confirm.setText("");
        });
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            if (busy || sealed) return;
            final String username = name == null ? "" : name.getText().toString().trim();
            char[] old = read(current), fresh = read(next), repeated = read(confirm);
            String issue = setup && username.isEmpty() ? "Enter a username." :
                    !setup && old.length == 0 ? "Enter your current password." :
                    !disabling && fresh.length < 8 ? "Use at least 8 characters." :
                    !Arrays.equals(fresh, repeated) ? "The two new passwords must match." :
                    purge && !consent.isChecked() ? "Confirm the PURGE behavior first." : null;
            erase(repeated);
            if (issue != null) { erase(old, fresh); error.setText(issue); return; }
            busy = true;
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(false);
            dialog.setCancelable(false);
            dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setEnabled(false);
            if (existing) dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setEnabled(false);
            error.setText(setup ? "Protecting the local vault…" : "Saving…");
            Runnable write = () -> worker.execute(() -> {
                String failure = null;
                try {
                    if (setup) vault.enroll(username, fresh);
                    else if (mode == Mode.CHANGE) vault.changePassword(old, fresh);
                    else vault.setDuress(old, fresh);
                } catch (Exception e) {
                    failure = e instanceof IllegalArgumentException || e instanceof SecurityException
                            ? e.getMessage() : "Could not save the change. The vault stays protected as before.";
                    if (failure == null) failure = "Could not save the change.";
                } finally { erase(old, fresh); }
                final String message = failure;
                handler.post(() -> {
                    busy = false;
                    if (setup) {
                        if (closed) vault.lock();
                        CompletableFuture<Void> finished = enrollment;
                        enrollment = null;
                        finished.complete(null);
                    }
                    if (closed) return;
                    if (setup) {
                        if (message == null) { enrolled = true; this.username = username; }
                        screen.finishEnrollment();
                    }
                    if (sealed) {
                        vault.lock();
                        if (unlockButton != null) unlockButton.setEnabled(readyToUnlock);
                        return;
                    }
                    if (message == null) {
                        dialog.dismiss();
                        screen.securityChanged();
                        if (away) checkTime(); else interacted();
                        if (!sealed && !away) settings();
                    } else if (dialog.isShowing()) {
                        if (current != null) current.setText("");
                        error.setText(message);
                        dialog.setCancelable(true);
                        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(true);
                        dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setEnabled(true);
                        if (existing) dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setEnabled(true);
                    }
                });
            });
            if (setup) {
                screen.prepareEnrollment(() -> {
                    if (closed) {
                        erase(old, fresh);
                        return;
                    }
                    enrollment = new CompletableFuture<>();
                    write.run();
                });
            } else write.run();
        });
    }

    private void timings() {
        if (sealed) return;
        LinearLayout form = form();
        AlertDialog dialog = DisplayPrivacy.dialog(screen).setTitle("Lock timing").setView(scroll(form))
                .setNegativeButton("Close", null).create();
        form.addView(screen.button("While using CubeChat · " + selected(IDLE, IDLE_LABELS, idleDelay()), false,
                v -> { dialog.dismiss(); chooseDelay(false); }));
        form.addView(screen.button("After leaving CubeChat · " + selected(AWAY, AWAY_LABELS, backgroundDelay()), false,
                v -> { dialog.dismiss(); chooseDelay(true); }));
        dialog.show();
    }
    private String selected(long[] values, String[] labels, long current) {
        for (int i = 0; i < values.length; i++) if (values[i] == current) return labels[i];
        return "";
    }
    private void chooseDelay(boolean background) {
        String[] labels = background ? AWAY_LABELS : IDLE_LABELS;
        long[] values = background ? AWAY : IDLE;
        long current = background ? backgroundDelay() : idleDelay();
        int index = Arrays.asList(labels).indexOf(selected(values, labels, current));
        DisplayPrivacy.dialog(screen).setTitle(background ? "After leaving CubeChat" : "While using CubeChat")
                .setSingleChoiceItems(labels, index, (d, choice) -> {
                    prefs.edit().putLong(background ? "away" : "idle", values[choice]).apply();
                    d.dismiss();
                    interacted();
                    timings();
                }).setNegativeButton("Cancel", null).show();
    }
}
