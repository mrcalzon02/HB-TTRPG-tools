package org.cubechat.android;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.VpnService;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Lockdown has an honest status: "requested", "IP filtering" and "OS fail-closed"
 * are separate states. No in-app indicator claims radio or baseband isolation.
 */
public final class FirewallSettings extends Activity {
    private static final int VPN_CONSENT = 243;
    private static final int INK = 0xff17251e, MUTED = 0xff4c6157, DANGER = 0xff8c351c;
    private final Handler ui = new Handler(Looper.getMainLooper());
    // One delayed refresh allows service startup without replacing the entire
    // interactive tab every second while a person is touching its controls.
    private final Runnable refresh = () -> { if (visible) render(); };
    private LinearLayout page;
    private int tab;
    private boolean visible;

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
        String[] names = {"Lockdown", "Exceptions", "Radios"};
        for (int index = 0; index < names.length; index++) {
            final int selected = index;
            Button choice = new Button(this);
            choice.setText(names[index]);
            choice.setAllCaps(false);
            choice.setTextSize(12);
            choice.setEnabled(tab != index);
            choice.setOnClickListener(v -> { tab = selected; render(); });
            tabs.addView(choice, new LinearLayout.LayoutParams(0, dp(55), 1));
        }
        root.addView(tabs);
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
        else showRadios();
    }

    private void showLockdown() {
        boolean requested = LockdownFirewall.armed(this);
        boolean running = LockdownFirewall.running();
        boolean verified = LockdownFirewall.systemLockdownVerified();
        text(page, "Default: CubeChat peer connections only. All other app IP packets are dropped while the firewall VPN runs.", 16, INK);
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
        if (!requested) text(page, "OFF · Ordinary Android networking is available.", 17, DANGER);
        else if (verified) text(page, "OS-ENFORCED · Android reports Always-on VPN and Block connections without VPN. IP traffic is fail-closed.", 17, 0xff185f46);
        else if (running) text(page, "PARTIAL · CubeChat is dropping IP packets, but protection after a reboot, VPN failure or force-stop is NOT verified.", 17, DANGER);
        else text(page, "NOT PROTECTED · Lockdown was requested but the VPN is not running. Other apps may have network access.", 17, DANGER);

        String error = LockdownFirewall.failure();
        if (!error.isEmpty()) text(page, "VPN error: " + error, 14, DANGER);
        if (requested && !running) button(page, "Retry firewall", this::enable);
        button(page, "Open Android VPN settings", () -> open(Settings.ACTION_VPN_SETTINGS));
        text(page, "REQUIRED for fail-closed IP filtering: Select CubeChat as Always-on VPN, then enable Block connections without VPN in Android's VPN settings. Android may require a separate VPN consent prompt.", 15, MUTED);
        if (Build.VERSION.SDK_INT < 29) text(page,
                "Android 8–9 cannot report the OS lockdown flags to this screen through the public VpnService API. Treat this status as unverified until device tests.", 14, DANGER);
        text(page, "This controls app IP traffic, not Bluetooth, Wi-Fi management frames, cellular signaling, emergency calling, carrier services or all privileged OS traffic. See the Radios tab.", 15, MUTED);
        text(page, "Android permits only one active VPN. Enabling this can disconnect another VPN, work profile, captive portal or ordinary internet service.", 14, MUTED);
    }

    private void showExceptions() {
        text(page, "Default-deny permissions", 19, INK);
        text(page, "ALLOWED · CubeChat's explicitly selected peer IP sockets for direct chat, local discovery and relay. CubeChat Bluetooth chat still depends on the Android radio and pairing permissions.", 16, 0xff185f46);
        text(page, "OS-MANAGED · Device network registration, emergency services and system connectivity checks. Android controls these; CubeChat does not have authority to define or inspect every one.", 16, MUTED);
        text(page, "DENIED · All other application IPv4/IPv6 traffic entering this VPN, including DNS, browsing, background synchronization and ordinary app updates.", 16, DANGER);
        text(page, "Extra application exceptions: NONE. The first version intentionally refuses arbitrary app allowlisting. Android VPN per-app exclusions can silently bypass a VPN when OS lockdown is absent. We will expose editable exceptions only after a verified, fail-closed forwarding/OS-policy implementation exists.", 15, MUTED);
        text(page, "CubeChat's own online update checks are not a default exception. Peer chat traffic is not a blanket permission for every URL requested by this app.", 15, MUTED);
    }

    private void showRadios() {
        text(page, "Radio exposure controls", 19, INK);
        text(page, "The VPN does not prevent Bluetooth discovery/pairing, Wi-Fi probe traffic, hotspot beacons, nearby-device advertisements, mobile registration or calls. Other applications can still access Bluetooth with their Android permissions.", 16, DANGER);
        text(page, "For strict radio quiet, manually turn Bluetooth off and disable Wi-Fi Direct discovery, hotspot and nearby sharing in Android. Keep only the radio needed for your selected CubeChat transport. CubeChat cannot force these device-wide states as an ordinary Android app.", 16, MUTED);
        button(page, "Bluetooth settings", () -> open(Settings.ACTION_BLUETOOTH_SETTINGS));
        button(page, "Wi-Fi settings", () -> open(Settings.ACTION_WIFI_SETTINGS));
        text(page, "Future managed-device edition: device-owner restrictions, radio-policy status and verified application allowlists. Device-owner enrollment is a separate, destructive administrative setup process and will never happen silently.", 15, MUTED);
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
            LockdownFirewall.start(this);
        } catch (Exception e) {
            Toast.makeText(this, "Could not start firewall: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
        render();
    }

    private void disable() {
        if (LockdownFirewall.systemLockdownVerified()) {
            new AlertDialog.Builder(this).setTitle("Turn off firewall?")
                    .setMessage("Android is in VPN lockdown. Stopping CubeChat's VPN can leave the phone without internet until you disable Always-on VPN or Block connections without VPN in Android settings.")
                    .setNegativeButton("Keep enabled", (d, w) -> render())
                    .setPositiveButton("Stop firewall", (d, w) -> stopFirewall())
                    .show();
        } else stopFirewall();
    }

    private void stopFirewall() {
        try {
            LockdownFirewall.setArmed(this, false);
            LockdownFirewall.stop(this);
        } catch (Exception e) {
            Toast.makeText(this, "Could not stop firewall: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
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
