package org.cubechat.android;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.VpnService;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.telephony.CellInfo;
import android.telephony.TelephonyManager;
import android.provider.Settings;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Lockdown has an honest status: "requested", "IP filtering" and "OS fail-closed"
 * are separate states. No in-app indicator claims radio or baseband isolation.
 */
public final class FirewallSettings extends Activity {
    private static final int VPN_CONSENT = 243, CELL_PERMISSION = 244;
    private static final String RECOVERY_PREFS = "cubechat-firewall-recovery";
    private static final long MIN_CELL_REFRESH_MS = 15_000L;
    private static final CellObservationBook CELL_HISTORY = new CellObservationBook();
    private static final int INK = 0xff17251e, MUTED = 0xff4c6157, DANGER = 0xff8c351c;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private boolean visible;
    // One delayed refresh allows service startup without replacing the entire
    // interactive tab every second while a person is touching its controls.
    private final Runnable refresh = () -> { if (visible) render(); };
    private LinearLayout page;
    private int tab;
    private List<CellObservation> observedCells = Collections.emptyList();
    private String cellStatus = "No cellular observations requested.";
    private boolean cellRequestRunning;
    private long lastCellRefreshMs = -1L;
    private int cellRequestGeneration;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        if (saved != null) tab = saved.getInt("tab", 0);
        render();
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        state.putInt("tab", tab);
        super.onSaveInstanceState(state);
    }

    @Override protected void onResume() {
        super.onResume();
        visible = true;
        if (!hasCellPermission()) {
            observedCells = Collections.emptyList();
            CELL_HISTORY.clear();
            cellStatus = "Location permission not granted. No cell data is collected.";
        }
        ui.removeCallbacks(refresh);
        ui.postDelayed(refresh, 1200);
    }

    @Override protected void onPause() {
        visible = false;
        ui.removeCallbacks(refresh);
        super.onPause();
    }

    private int dp(int size) { return Math.round(size * getResources().getDisplayMetrics().density); }

    private LinearLayout col() {
        LinearLayout view = new LinearLayout(this);
        view.setOrientation(LinearLayout.VERTICAL);
        return view;
    }

    private void text(LinearLayout target, String value, int size, int color) {
        TextView line = new TextView(this);
        line.setText(value);
        line.setTextColor(color);
        line.setTextSize(size);
        line.setPadding(0, dp(7), 0, dp(7));
        target.addView(line);
    }

    private Button button(LinearLayout target, String title, Runnable run) {
        Button action = new Button(this);
        action.setText(title);
        action.setAllCaps(false);
        action.setTextSize(15);
        action.setOnClickListener(v -> run.run());
        target.addView(action, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        return action;
    }

    private void render() {
        if (isFinishing()) return;
        LinearLayout root = col();
        root.setPadding(dp(16), dp(14), dp(16), dp(10));
        root.setBackgroundColor(0xfff5f7f1);
        text(root, "CubeChat · Firewall settings", 23, INK);
        LinearLayout tabs = new LinearLayout(this);
        tabs.setOrientation(LinearLayout.HORIZONTAL);
        String[] names = {"Lockdown", "Exceptions", "Radios", "Connections", "Recovery", "Device"};
        for (int index = 0; index < names.length; index++) {
            final int selected = index;
            Button choice = new Button(this);
            choice.setText(names[index]);
            choice.setAllCaps(false);
            choice.setTextSize(12);
            choice.setEnabled(tab != index);
            choice.setOnClickListener(v -> { tab = selected; render(); });
            tabs.addView(choice, new LinearLayout.LayoutParams(dp(103), dp(55)));
        }
        android.widget.HorizontalScrollView tabStrip = new android.widget.HorizontalScrollView(this);
        tabStrip.setHorizontalScrollBarEnabled(false);
        tabStrip.addView(tabs);
        root.addView(tabStrip);
        final int selectedTab = tab;
        tabStrip.post(() -> tabStrip.scrollTo(Math.max(0, dp(103 * selectedTab - 130)), 0));
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        page = col();
        page.setPadding(0, dp(10), 0, dp(20));
        scroll.addView(page);
        root.addView(scroll, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        button(root, "Return to CubeChat", this::finish);
        setContentView(root);
        if (tab == 0) showLockdown();
        else if (tab == 1) showExceptions();
        else if (tab == 2) showRadios();
        else if (tab == 3) showConnections();
        else if (tab == 4) showRecovery();
        else showDevice();
    }

    private void showLockdown() {
        boolean requested = LockdownFirewall.armed(this);
        boolean running = LockdownFirewall.running();
        boolean verified = LockdownFirewall.systemLockdownVerified();
        boolean owner = ManagedLockdownController.isDeviceOwner(this);
        boolean managed = owner && ManagedLockdownController.restrictionsPresent(this);
        text(page, "Default: CubeChat peer connections only. Other apps' ordinary IP packets are dropped while this firewall VPN runs.", 16, INK);
        Switch toggle = new Switch(this);
        toggle.setText("IP lockdown");
        toggle.setTextSize(19);
        toggle.setChecked(requested);
        toggle.setPadding(0, dp(12), 0, dp(12));
        toggle.setOnCheckedChangeListener((view, enable) -> {
            if (enable) enable();
            else disable();
        });
        page.addView(toggle);
        if (!requested) text(page, "OFF REQUESTED · CubeChat's firewall is not armed. Android's own Always-on VPN or other policies may still restrict network access. See Recovery.", 17, DANGER);
        else if (verified) text(page, "OS-ENFORCED · Android reports Always-on VPN and Block connections without VPN. IP traffic is fail-closed.", 17, 0xff185f46);
        else if (running) text(page, "PARTIAL · CubeChat is dropping IP packets, but protection after a reboot, VPN failure or force-stop is NOT verified.", 17, DANGER);
        else text(page, "NOT PROTECTED · Lockdown was requested but the VPN is not running. Other apps may have network access.", 17, DANGER);

        String error = LockdownFirewall.failure();
        if (!error.isEmpty()) text(page, "VPN error: " + error, 14, DANGER);
        if (requested && !running) button(page, "Retry firewall", this::enable);
        if (owner) {
            if (!ManagedLockdownController.deploymentSupported()) {
                text(page, "ADVANCED DEVICE-OWNER LOCKDOWN DISABLED · This APK has no verified early trusted-system priority release. Turning on IP lockdown will NOT install managed radio restrictions or a managed Always-on VPN.", 16, DANGER);
                if (managed)
                    text(page, "PREVIOUS MANAGED RESTRICTIONS REPORTED · Older policies may remain. Use Recovery to review and request their removal.", 15, DANGER);
            } else if (requested && managed) text(page,
                    "MANAGED DEVICE · Android reports configured radio restrictions, but this does not prove hardware isolation.", 16, MUTED);
            else if (requested) {
                text(page, "MANAGED POLICY INCOMPLETE · One or more device-owner radio restrictions are not confirmed. Treat lockdown as partial.", 16, DANGER);
                button(page, "Retry managed restrictions", this::applyManaged);
            } else text(page, "Device-owner provisioning detected; managed controls require independently verified support.", 15, MUTED);
        } else {
            text(page, "STANDARD APPLICATION · This installation cannot enforce device-owner radio restrictions. A malicious app with elevated privileges may circumvent IP filtering.", 15, DANGER);
        }
        button(page, "Open Android VPN settings", () -> open(Settings.ACTION_VPN_SETTINGS));
        button(page, "Recovery & release status", () -> { tab = 4; render(); });
        text(page, "REQUIRED for fail-closed IP filtering: Select CubeChat as Always-on VPN, then enable Block connections without VPN in Android's VPN settings. Android may require a separate VPN consent prompt.", 15, MUTED);
        if (Build.VERSION.SDK_INT < 29) text(page,
                "Android 8–9 cannot report the OS lockdown flags to this screen through the public VpnService API. Treat this status as unverified until device tests.", 14, DANGER);
        text(page, "Emergency priority: RadioGuard's planned trusted-system override must remove all of its enforcement controls, with no prompt or allowlist. The public APK cannot reliably detect every emergency-call activation, so automatic release is NOT implemented or verified. We do not test emergency calls.", 15, DANGER);
        text(page, "This controls app IP traffic, not Bluetooth, Wi-Fi management frames, cellular signaling, emergency calling, carrier services or all privileged OS traffic. See the Radios tab.", 15, MUTED);
        text(page, "Android permits only one active VPN. Enabling this can disconnect another VPN, work profile, captive portal or ordinary internet service.", 14, MUTED);
    }

    private void showExceptions() {
        text(page, "Default-deny permissions", 19, INK);
        text(page, "ALLOWED · CubeChat's explicitly selected peer IP sockets for direct chat, local discovery and relay. CubeChat Bluetooth chat still depends on the Android radio and pairing permissions.", 16, 0xff185f46);
        text(page, "OS-MANAGED · Device network registration, emergency services and system connectivity checks. Android controls these; CubeChat does not have authority to define or inspect every one.", 16, MUTED);
        text(page, "DENIED · All other application IPv4/IPv6 traffic entering this VPN, including DNS, browsing, background synchronization and ordinary app updates.", 16, DANGER);
        text(page, "Extra application exceptions: NONE. The first version intentionally refuses arbitrary app allowlisting. Android VPN per-app exclusions can silently bypass a VPN when OS lockdown is absent. We will expose editable exceptions only after a verified, fail-closed forwarding/OS-policy implementation exists.", 15, MUTED);
        text(page, "CubeChat's own updater checks and download-link launches pause during lockdown; verified update information is retained. Other browsers and apps depend on Android's VPN policy and are not certified by this screen.", 15, MUTED);
    }

    private void showRadios() {
        text(page, "Radio exposure controls", 19, INK);
        text(page, "The VPN does not prevent Bluetooth discovery/pairing, Wi-Fi probe traffic, hotspot beacons, nearby-device advertisements, mobile registration or calls. Other applications may access Bluetooth with Android permissions unless a managed-device restriction disables it.", 16, DANGER);
        text(page, "For strict radio quiet, manually turn Bluetooth off and disable Wi-Fi Direct discovery, hotspot and nearby sharing in Android. Keep only the radio needed for your selected CubeChat transport. CubeChat cannot force these device-wide states as an ordinary Android app.", 16, MUTED);
        button(page, "Bluetooth settings", () -> open(Settings.ACTION_BLUETOOTH_SETTINGS));
        button(page, "Wi-Fi settings", () -> open(Settings.ACTION_WIFI_SETTINGS));
        if (ManagedLockdownController.isDeviceOwner(this)) {
            text(page, "Device-owner app detected. New managed radio restrictions are DISABLED in this build pending an independently trusted early priority-release integration. The IP VPN toggle does not turn on Bluetooth or Wi-Fi Direct blocking.", 15, DANGER);
            ManagedLockdownController.Audit previous = ManagedLockdownController.audit(this);
            if (previous.restrictionsReadable && previous.appliedRestrictions > 0)
                text(page, "Previously configured device-owner restrictions are still reported. Use the Recovery tab to request ordinary removal; completion is not independently verified.", 15, DANGER);
            text(page, "Stock Android and the vendor modem retain radio/call authority. No hardware transmission cutoff is provided by CubeChat.", 15, MUTED);
        } else {
            text(page, "Device owner unavailable. To obtain stronger radio restrictions requires deliberate fully managed device provisioning, typically during initial setup or after a factory reset. This screen cannot self-provision or silently reset the phone.", 15, MUTED);
        }
    }


    /** M1: read-only cellular inventory; never requests or modifies radio registration. */
    private void showConnections() {
        text(page, "Cellular connections · observation only", 19, INK);
        text(page, "Android may report a serving cell and some neighboring cells. This is NOT a complete radio scan or proof of a tower's physical identity.", 15, MUTED);
        String ip = LockdownFirewall.systemLockdownVerified() ? "OS VPN lockdown confirmed"
                : LockdownFirewall.running() ? "Local VPN running, OS lockdown unverified"
                : LockdownFirewall.armed(this) ? "Lockdown requested, firewall not running" : "IP lockdown off";
        text(page, "IP firewall: " + ip, 15, INK);
        if (!getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY)) {
            text(page, "No Android cellular radio is available on this device.", 16, DANGER);
            return;
        }
        if (!hasCellPermission()) {
            text(page, "No location permission · Android requires precise location permission to report cell identifiers. This tab never collects data until permission is granted AND a read is requested.", 15, DANGER);
            button(page, "Grant cellular observation permission", () ->
                    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, CELL_PERMISSION));
            return;
        }
        text(page, cellStatus, 15, cellRequestRunning ? DANGER : INK);
        if (!cellRequestRunning) {
            button(page, "Read cached cellular observations", this::readCachedCells);
            if (Build.VERSION.SDK_INT >= 29) {
                button(page, "Request updated cell measurements", this::requestFreshCells);
            }
        }
        text(page, "Reports can be missing, stale or rate-limited. A request does not force active RF scanning. Repeated identities are only observations made during this app process.", 14, MUTED);
        if (observedCells.isEmpty()) {
            text(page, "No reported cells in the current snapshot.", 15, MUTED);
        } else {
            List<CellObservation> visible = new ArrayList<>(observedCells);
            visible.sort((a, b) -> Boolean.compare(b.registered, a.registered));
            text(page, "Reported cellular cells: " + visible.size(), 17, INK);
            for (int i = 0; i < visible.size() && i < 32; i++) {
                CellObservation item = visible.get(i);
                String role = item.registered ? "REGISTERED / SERVING" : "OTHER REPORTED CELL";
                text(page, role + (item.isCurrent() ? "" : " · STALE / TIMESTAMP UNKNOWN"), 15,
                        item.isCurrent() ? INK : DANGER);
                text(page, item.summary(), 14, MUTED);
                CellObservationBook.Evidence evidence = CELL_HISTORY.find(item);
                text(page, evidence == null ? "History: not enough valid samples" : evidence.label(),
                        13, MUTED);
            }
            if (visible.size() > 32) text(page, "Additional entries not displayed. This view limits rendering to 32 rows.", 14, MUTED);
        }
        button(page, "Clear session observation history", () -> {
            CELL_HISTORY.clear();
            observedCells = Collections.emptyList();
            cellStatus = "Session observations cleared; nothing was saved to disk.";
            render();
        });
        text(page, "Not enabled: rogue tower verdicts, cell selection, baseband blocking, background collection, cloud uploads and persistent location history.", 14, DANGER);
    }

    /**
     * Device capabilities are an Android-declared read-only snapshot, not an
     * independent kernel driver or radio-power audit. No radio scan occurs.
     */
    private void showDevice() {
        text(page, "RadioGuard device inventory", 19, INK);
        text(page, "Use this information when assessing a supported test handset. A reported Wi-Fi or modem feature does NOT prove driver access or safe kernel enforcement.", 15, MUTED);
        String inventory = GuardianDeviceInventory.snapshot(this);
        text(page, inventory, 14, INK);
        button(page, "Copy device inventory", () -> {
            if (!DiagnosticClipboard.copy(this,
                    "CubeChat RadioGuard device inventory", inventory)) {
                Toast.makeText(this, "Clipboard unavailable", Toast.LENGTH_LONG).show();
                return;
            }
            if (Build.VERSION.SDK_INT < 33)
                Toast.makeText(this, "Inventory copied · includes device software details",
                        Toast.LENGTH_SHORT).show();
        });
        text(page, "Copying exposes this inventory to Android's system clipboard. A sensitive-preview flag hides previews where supported but does not prevent other applications from reading clipboard contents.", 14, MUTED);
        text(page, "No hardware access was requested, no cellular registration was changed, and no location or subscriber identifiers were collected. Physical radio and early priority-release guarantees remain unverified.", 14, DANGER);
    }

    /**
     * Recovery is read-only until the user explicitly selects a release action.
     * Status is local OS/app readback, not a kernel, RF or calling attestation.
     */
    private void showRecovery() {
        ManagedLockdownController.Audit managed = ManagedLockdownController.audit(this);
        LockdownRecoverySummary.Snapshot snapshot = LockdownRecoverySummary.inspect(
                LockdownFirewall.armed(this), LockdownFirewall.running(),
                LockdownFirewall.systemLockdownVerified(), managed.deviceOwner,
                managed.appliedRestrictions, managed.totalRestrictions,
                managed.restrictionsReadable, managed.cubechatOwnsAlwaysOnVpn,
                managed.vpnReadable);
        text(page, "Recovery & manual controls", 19, INK);
        text(page, snapshot.headline, 17,
                snapshot.state == LockdownRecoverySummary.State.NOT_REQUESTED ? INK : DANGER);
        text(page, snapshot.details, 15, MUTED);
        text(page, managed.localSummary(), 15,
                snapshot.state == LockdownRecoverySummary.State.RELEASE_INCOMPLETE
                        || snapshot.state == LockdownRecoverySummary.State.READBACK_UNAVAILABLE
                        ? DANGER : MUTED);
        text(page, "Status is based on CubeChat's own observations. Other Android-owned VPN settings, privileged helpers, kernel drivers and physical transmitters are not independently checked.", 14, DANGER);

        android.content.SharedPreferences recovery =
                getSharedPreferences(RECOVERY_PREFS, MODE_PRIVATE);
        long attemptedAt = recovery.getLong("last-release-at", 0L);
        LockdownReleaseJournal.Review review = LockdownReleaseJournal.inspect(
                attemptedAt, recovery.getString("last-release-phase", null),
                recovery.getBoolean("last-release-requests-sent", false));
        if (attemptedAt > 0) {
            String time = java.text.DateFormat.getDateTimeInstance().format(
                    new java.util.Date(attemptedAt));
            text(page, "Last manual release · " + time + "\n" + review.label, 14,
                    review.state == LockdownReleaseJournal.State.REQUESTS_SENT ? MUTED : DANGER);
            if (review.showReceipts) {
                String steps = recovery.getString("last-release-steps", "");
                if (steps != null && !steps.isEmpty())
                    text(page, steps, 14,
                            review.state == LockdownReleaseJournal.State.REQUESTS_SENT
                                    ? MUTED : DANGER);
            }
        } else {
            text(page, review.label, 14, MUTED);
        }
        button(page, review.state == LockdownReleaseJournal.State.INTERRUPTED_OR_UNCONFIRMED
                || review.state == LockdownReleaseJournal.State.REQUESTS_FAILED
                ? "Retry CubeChat cleanup" : "Release all CubeChat controls", () ->
                new AlertDialog.Builder(this)
                        .setTitle("Release CubeChat lockdown controls?")
                        .setMessage("This attempts to remove CubeChat-owned restrictions and stop its VPN. Other applications may regain network access. Android-owned Always-on VPN settings may still need manual changes.")
                        .setNegativeButton("Keep current state", null)
                        .setPositiveButton("Release controls", (dialog, which) -> stopFirewall())
                        .show());
        button(page, "Android VPN settings", () -> open(Settings.ACTION_VPN_SETTINGS));
        button(page, "Copy non-sensitive status summary", () -> {
            String report = snapshot.diagnostics;
            if (attemptedAt > 0) {
                report += "\nLast manual release status: " + review.state.name();
                if (review.showReceipts) {
                    String steps = recovery.getString("last-release-steps", "");
                    if (steps != null && !steps.isEmpty())
                        report += "\nLast cleanup commands (not verified removals):\n" + steps;
                }
            }
            if (!DiagnosticClipboard.copy(this, "CubeChat lockdown status", report)) {
                Toast.makeText(this, "Clipboard unavailable", Toast.LENGTH_LONG).show();
                return;
            }
            if (Build.VERSION.SDK_INT < 33)
                Toast.makeText(this, "Status copied without messages or peer identifiers",
                        Toast.LENGTH_SHORT).show();
        });
        text(page, "Copied diagnostics use Android's system clipboard; other applications may access them. Preview hiding is not clipboard isolation.", 14, MUTED);
        text(page, "Automatic trusted-system priority release is NOT implemented in this standard APK. No emergency-call tests are performed. Advanced controls requiring that integration remain unavailable.", 14, DANGER);
    }

    private boolean hasCellPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private TelephonyManager telephony() {
        return (TelephonyManager) getSystemService(TELEPHONY_SERVICE);
    }

    private void readCachedCells() {
        if (cellRequestRunning || !hasCellPermission()) return;
        TelephonyManager tm = telephony();
        if (tm == null) { cellStatus = "No telephony service available."; render(); return; }
        cellRequestRunning = true;
        cellStatus = "Reading Android's last cached cell report…";
        int generation = ++cellRequestGeneration;
        render();
        new Thread(() -> {
            try {
                List<CellInfo> records = tm.getAllCellInfo();
                List<CellObservation> snapshot = CellSnapshotReader.convert(records);
                runOnUiThread(() -> finishCellRead(generation, snapshot, "Cached Android cell report"));
            } catch (SecurityException | UnsupportedOperationException e) {
                runOnUiThread(() -> failCellRead(generation, "Cell readings denied or unsupported by this device."));
            } catch (RuntimeException e) {
                runOnUiThread(() -> failCellRead(generation, "Cell report not available."));
            }
        }, "CubeChat passive cell metadata").start();
    }

    private void requestFreshCells() {
        if (Build.VERSION.SDK_INT < 29 || cellRequestRunning || !hasCellPermission()) return;
        long nowMs = SystemClock.elapsedRealtime();
        if (lastCellRefreshMs >= 0 && nowMs - lastCellRefreshMs < MIN_CELL_REFRESH_MS) {
            cellStatus = "Refresh deferred: please allow at least 15 seconds between modem requests.";
            render();
            return;
        }
        TelephonyManager tm = telephony();
        if (tm == null) { cellStatus = "No telephony service available."; render(); return; }
        lastCellRefreshMs = nowMs;
        cellRequestRunning = true;
        cellStatus = "Requesting measurements; Android may throttle or decline this request…";
        int generation = ++cellRequestGeneration;
        render();
        try {
            tm.requestCellInfoUpdate(getMainExecutor(), new TelephonyManager.CellInfoCallback() {
                @Override public void onCellInfo(List<CellInfo> records) {
                    finishCellRead(generation, CellSnapshotReader.convert(records), "Requested cell report");
                }
                @Override public void onError(int errorCode, Throwable detail) {
                    failCellRead(generation, "Modem request failed or timed out (code " + errorCode + ").");
                }
            });
            ui.postDelayed(() -> failCellRead(generation, "Cell observation request timed out; cached data may still be available."), 15_000L);
        } catch (SecurityException | UnsupportedOperationException e) {
            failCellRead(generation, "Cell update denied or unsupported.");
        } catch (RuntimeException e) {
            failCellRead(generation, "Cell update unavailable.");
        }
    }

    private void finishCellRead(int generation, List<CellObservation> result, String source) {
        if (generation != cellRequestGeneration || isFinishing()) return;
        observedCells = result == null ? Collections.emptyList() : result;
        CELL_HISTORY.record(observedCells, SystemClock.elapsedRealtime());
        cellRequestRunning = false;
        cellStatus = source + ": " + observedCells.size() + " reported cell(s); each identity is unverified.";
        if (tab == 3) render();
    }

    private void failCellRead(int generation, String reason) {
        if (generation != cellRequestGeneration || isFinishing() || !cellRequestRunning) return;
        cellRequestRunning = false;
        cellStatus = reason;
        if (tab == 3) render();
    }

    @Override public void onRequestPermissionsResult(int request, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(request, permissions, results);
        if (request == CELL_PERMISSION) {
            cellStatus = hasCellPermission()
                    ? "Location permission granted. Tap a read button to observe reported cells."
                    : "Location permission denied. Cellular observation remains disabled.";
            render();
        }
    }

    private void open(String action) {
        try { startActivity(new Intent(action)); }
        catch (Exception error) { Toast.makeText(this, "Android settings unavailable", Toast.LENGTH_LONG).show(); }
    }

    private void enable() {
        Intent consent = VpnService.prepare(this);
        if (consent != null) {
            try { startActivityForResult(consent, VPN_CONSENT); }
            catch (Exception e) { Toast.makeText(this, "VPN permission dialog unavailable", Toast.LENGTH_LONG).show(); }
            render();
            return;
        }
        try {
            LockdownFirewall.setArmed(this, true);
        } catch (Exception e) {
            Toast.makeText(this, "Could not save firewall request: " + e.getMessage(), Toast.LENGTH_LONG).show();
            render(); return;
        }
        // Even if a later managed-policy operation fails, attempt local packet
        // filtering. Never silently roll the entire request back to "off".
        if (ManagedLockdownController.isDeviceOwner(this)
                && ManagedLockdownController.deploymentSupported()) applyManaged();
        try {
            LockdownFirewall.start(this);
        } catch (Exception e) {
            Toast.makeText(this, "Could not start firewall: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
        render();
    }

    private void applyManaged() {
        if (!ManagedLockdownController.deploymentSupported()
                || !ManagedLockdownController.isDeviceOwner(this)
                || !LockdownFirewall.armed(this)) return;
        try {
            ManagedLockdownController.enforce(this);
        } catch (Exception e) {
            Toast.makeText(this, "Managed protection incomplete: " + e.getMessage(),
                    Toast.LENGTH_LONG).show();
        }
        render();
    }

    private void disable() {
        if (ManagedLockdownController.isDeviceOwner(this)
                || LockdownFirewall.systemLockdownVerified()) {
            new AlertDialog.Builder(this).setTitle("Turn off lockdown?")
                    .setMessage("This removes CubeChat's managed restrictions and packet filtering when permitted. Other applications may regain network access. If a separate Android VPN lockdown remains, internet may stay blocked until it is switched off in Android settings.")
                    .setNegativeButton("Keep enabled", (d, w) -> render())
                    .setPositiveButton("Disable lockdown", (d, w) -> stopFirewall())
                    .show();
        } else stopFirewall();
    }

    private void stopFirewall() {
        // Write-ahead receipt: if the app is terminated during this ordinary
        // manual cleanup, Recovery must show an INTERRUPTED state instead of
        // replaying the previous attempt's successful-looking receipt.
        android.content.SharedPreferences recovery =
                getSharedPreferences(RECOVERY_PREFS, MODE_PRIVATE);
        boolean startedSaved = recovery.edit()
                .putLong("last-release-at", System.currentTimeMillis())
                .putString("last-release-phase", LockdownReleaseJournal.STARTED)
                .remove("last-release-requests-sent")
                .remove("last-release-steps")
                .commit();
        // Cleanup is safety-critical relative to the request: it proceeds
        // regardless of whether writing the journal entry was possible.
        LockdownReleaseController.Result result =
                LockdownReleaseController.releaseAllOwnedControls(this);
        boolean receiptSaved = recovery.edit()
                .putString("last-release-phase", result.requestsCompleted
                        ? LockdownReleaseJournal.REQUESTS_SENT
                        : LockdownReleaseJournal.REQUESTS_FAILED)
                .putBoolean("last-release-requests-sent", result.requestsCompleted)
                .putString("last-release-steps", result.stepSummary)
                .commit();
        String warning = (!startedSaved || !receiptSaved)
                ? " Cleanup history could not be saved reliably." : "";
        Toast.makeText(this, result.detail + warning, Toast.LENGTH_LONG).show();
        render();
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == VPN_CONSENT) {
            if (result == RESULT_OK) enable();
            else { Toast.makeText(this, "VPN consent declined. Firewall remains off.", Toast.LENGTH_LONG).show(); render(); }
        }
    }
}
