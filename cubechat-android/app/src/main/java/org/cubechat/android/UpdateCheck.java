package org.cubechat.android;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.view.View;
import android.widget.Button;
import android.widget.Toast;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

final class UpdateCheck {
    private final Activity activity;
    private final Button banner;
    private final SharedPreferences saved;
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private final String installed;
    private final long installedCode;
    private CubeChatReleases.Offer offer;
    private boolean checking, manual;
    private volatile boolean closed;
    private volatile UpdateRunGate.Permit activePermit;

    UpdateCheck(Activity activity, Button banner) {
        this.activity = activity;
        this.banner = banner;
        PackageInfo app;
        try {
            app = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
        } catch (PackageManager.NameNotFoundException absent) {
            throw new IllegalStateException(absent);
        }
        installed = app.versionName;
        installedCode = Build.VERSION.SDK_INT >= 28 ? app.getLongVersionCode() : app.versionCode;
        saved = activity.getSharedPreferences("app-updates", Context.MODE_PRIVATE);
        long code = saved.getLong("code", 0);
        String version = saved.getString("version", "");
        if (code > installedCode && version.matches("[0-9][0-9A-Za-z._+-]{0,79}")) {
            String url = CubeChatReleases.assetBase(version) + "CubeChat.apk";
            offer = new CubeChatReleases.Offer(code, version, url, saved.getString("notes", ""), saved.getBoolean("incomplete", false));
        }
        banner.setOnClickListener(v -> review());
        render();
    }

    void check(boolean requested) {
        if (closed) return;
        // Refresh the local banner when coming back from Firewall Settings,
        // without making an HTTP request or changing cached release metadata.
        render();
        // A release check is NOT an authorized CubeChat peer connection.
        // Skip it entirely while lockdown is requested; do not burn battery on
        // blocked HTTP timeouts or generate false "network broken" notices.
        if (LockdownFirewall.armed(activity)) {
            if (requested) explainPaused();
            return;
        }
        if (!requested) {
            long elapsed = System.currentTimeMillis() - saved.getLong("checked", 0);
            long interval = offer != null && offer.incomplete ? TimeUnit.MINUTES.toMillis(15) : TimeUnit.HOURS.toMillis(6);
            if (elapsed >= 0 && elapsed < interval) return;
            ConnectivityManager manager = activity.getSystemService(ConnectivityManager.class);
            Network active = manager == null ? null : manager.getActiveNetwork();
            NetworkCapabilities caps = active == null ? null : manager.getNetworkCapabilities(active);
            if (caps == null || !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) return;
        }
        if (requested) {
            manual = true;
            Toast.makeText(activity, "Checking GitHub for CubeChat updates…", Toast.LENGTH_SHORT).show();
        }
        if (checking) return;
        checking = true;
        // A permit is permanently invalidated by a lockdown activation,
        // even if the toggle is briefly switched back off before this job ends.
        UpdateRunGate.Permit permit = UpdateRunGate.enter(
                () -> !closed && !LockdownFirewall.armed(activity));
        activePermit = permit;
        CubeChatReleases.AccessCheck guard = new CubeChatReleases.AccessCheck() {
            @Override public void verify() throws IOException { permit.verify(); }
            @Override public void connectionOpened(HttpURLConnection connection) {
                permit.track(connection);
            }
            @Override public void connectionClosed(HttpURLConnection connection) {
                permit.untrack(connection);
            }
        };
        network.execute(() -> {
            try {
                permit.verify();
                CubeChatReleases.Offer newest = CubeChatReleases.check(installedCode, guard);
                permit.verify();
                activity.runOnUiThread(() -> {
                    try {
                        if (closed) return;
                        boolean show = manual;
                        checking = false;
                        manual = false;
                        if (!permit.allowed()) return;
                        offer = newest;
                        SharedPreferences.Editor edit = saved.edit().clear().putLong("checked", System.currentTimeMillis());
                        if (newest != null) edit.putLong("code", newest.code).putString("version", newest.version)
                                .putString("notes", newest.notes).putBoolean("incomplete", newest.incomplete);
                        edit.apply();
                        render();
                        if (show) review();
                    } finally {
                        // Keep the permit alive until the UI has accepted the
                        // result, then free its cancellation/connection handles.
                        permit.close();
                        if (activePermit == permit) activePermit = null;
                    }
                });
            } catch (Exception problem) {
                activity.runOnUiThread(() -> {
                    try {
                        if (closed) return;
                        boolean show = manual;
                        checking = false;
                        manual = false;
                        // Canceled checks are not connectivity errors and must
                        // not display a retry dialog or erase cached offers.
                        if (!permit.allowed()) return;
                        if (show) {
                            String detail = problem instanceof java.net.UnknownHostException
                                    ? "GitHub could not be reached." : problem.getMessage();
                            DisplayPrivacy.dialog(activity).setTitle("Couldn’t check for updates")
                                    .setMessage("Installed CubeChat " + installed + ".\n\n" + (detail == null ? "" : detail + " ")
                                            + "Check your internet connection and try again.")
                                    .setNegativeButton("Close", null)
                                    .setPositiveButton("Retry", (d, w) -> check(true)).show();
                        }
                    } finally {
                        permit.close();
                        if (activePermit == permit) activePermit = null;
                    }
                });
            }
        });
    }

    private void render() {
        boolean paused = LockdownFirewall.armed(activity);
        if (paused) {
            banner.setText(offer == null ? "Update checks paused · Lockdown"
                    : "Update available · " + offer.version + " · Download paused");
        } else if (offer != null) {
            banner.setText("Update available · CubeChat " + offer.version);
        }
        // When locked, show the pause reason even if no release was cached.
        banner.setVisibility(paused || offer != null ? View.VISIBLE : View.GONE);
    }

    private void explainPaused() {
        DisplayPrivacy.dialog(activity).setTitle("Updates paused by lockdown")
                .setMessage("CubeChat's updater does not contact GitHub or open its download link while lockdown is requested. Cached release information remains available. Other apps and browsers are controlled by Android's separate network policies. To update, explicitly turn off lockdown and check again.")
                .setNegativeButton("Close", null)
                .setPositiveButton("Firewall settings", (d, w) ->
                        activity.startActivity(new Intent(activity, FirewallSettings.class)))
                .show();
    }

    private void review() {
        CubeChatReleases.Offer update = offer;
        if (LockdownFirewall.armed(activity)) {
            explainPaused();
            return;
        }
        if (update == null) {
            DisplayPrivacy.dialog(activity).setTitle("CubeChat is up to date")
                    .setMessage("Installed CubeChat " + installed + " (build " + installedCode + ").")
                    .setPositiveButton("Close", null).show();
            return;
        }
        String message = "Installed " + installed + " (build " + installedCode + "). Available " + update.version
                + " (build " + update.code + ").\n\nOpen the signed APK in your browser, then choose Update in the Android installer.";
        if (update.incomplete) message += "\n\nThis update was verified. Some release information was unavailable, so a newer update may exist.";
        if (!update.notes.isEmpty()) message += "\n\n" + update.notes;
        DisplayPrivacy.dialog(activity).setTitle("CubeChat update available").setMessage(message)
                .setNegativeButton("Not now", null).setPositiveButton("Open download", (d, w) -> open(update.url)).show();
    }

    private void open(String url) {
        if (LockdownFirewall.armed(activity)) {
            explainPaused();
            return;
        }
        // Resolve a generic HTTPS address to prefer the system browser even if a GitHub client handles release links.
        Intent view = new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE);
        Intent generic = new Intent(Intent.ACTION_VIEW, Uri.parse("https://example.org/")).addCategory(Intent.CATEGORY_BROWSABLE);
        ResolveInfo browser = activity.getPackageManager().resolveActivity(generic, PackageManager.MATCH_DEFAULT_ONLY);
        if (browser != null && browser.activityInfo != null && !"android".equals(browser.activityInfo.packageName)) {
            view.setPackage(browser.activityInfo.packageName);
        }
        try {
            activity.startActivity(view);
        } catch (ActivityNotFoundException unavailable) {
            try {
                activity.startActivity(view.setPackage(null));
            } catch (ActivityNotFoundException missing) {
                DisplayPrivacy.dialog(activity).setTitle("Browser unavailable")
                        .setMessage("Enable a web browser on this phone, then choose Open download again.")
                        .setPositiveButton("Close", null).show();
            }
        }
    }

    void close() {
        closed = true;
        // A lifecycle shutdown should disconnect blocked HTTP immediately,
        // rather than wait for the socket read timeout.
        UpdateRunGate.Permit running = activePermit;
        if (running != null) running.close();
        activePermit = null;
        network.shutdownNow();
    }
}
