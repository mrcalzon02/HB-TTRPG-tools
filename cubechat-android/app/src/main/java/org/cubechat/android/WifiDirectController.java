package org.cubechat.android;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.wifi.WpsInfo;
import android.net.wifi.p2p.WifiP2pConfig;
import android.net.wifi.p2p.WifiP2pDevice;
import android.net.wifi.p2p.WifiP2pInfo;
import android.net.wifi.p2p.WifiP2pManager;
import android.os.Build;
import android.provider.Settings;
import android.widget.ArrayAdapter;
import android.widget.ListView;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.Consumer;

/** Android establishes the radio group; the existing authenticated chat protocol runs over its LAN. */
final class WifiDirectController {
    static final int PERMISSION = 51;
    private final Activity screen;
    private final PeerLink link;
    private final Consumer<String> feedback;
    private final WifiP2pManager manager;
    private WifiP2pManager.Channel channel;
    private boolean registered, active, connecting, ownsGroup;
    private String appliedEndpoint = "";
    private final List<WifiP2pDevice> peers = new ArrayList<>();
    private ArrayAdapter<String> names;
    private AlertDialog devices;
    private final BroadcastReceiver broadcasts = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            if (!active || channel == null) return;
            String event = intent.getAction();
            // Read authoritative state from WifiP2pManager rather than trusting broadcast extras.
            if (WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION.equals(event)) refreshPeers();
            else if (WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION.equals(event))
                manager.requestConnectionInfo(channel, WifiDirectController.this::onConnection);
        }
    };

    WifiDirectController(Activity screen, PeerLink link, Consumer<String> feedback) {
        this.screen = screen;
        this.link = link;
        this.feedback = feedback;
        manager = (WifiP2pManager) screen.getSystemService(Context.WIFI_P2P_SERVICE);
    }

    void begin() {
        if (LockdownFirewall.armed(screen)
                && ManagedLockdownController.restrictionsPresent(screen)) {
            feedback.accept("Wi-Fi Direct is disabled by managed lockdown; use LAN chat or disable lockdown.");
            return;
        }
        if (link.snapshot().role.isEmpty()) {
            feedback.accept("Create or scan a key card before opening Wi-Fi Direct.");
            return;
        }
        if (manager == null || !screen.getPackageManager().hasSystemFeature(PackageManager.FEATURE_WIFI_DIRECT)) {
            feedback.accept("This device does not offer Wi-Fi Direct. Choose Local Wi-Fi or Bluetooth.");
            return;
        }
        // A user-chosen transport is a transient grant; old grants never
        // carry across lockdown activation or an app process restart.
        LockdownRadioPolicy.chooseWifiDirect(screen);
        String permission = Build.VERSION.SDK_INT >= 33
                ? Manifest.permission.NEARBY_WIFI_DEVICES : Manifest.permission.ACCESS_FINE_LOCATION;
        if (screen.checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) {
            permissionContact = link.snapshot().activeId;
            String[] requested = Build.VERSION.SDK_INT == 31 || Build.VERSION.SDK_INT == 32
                    ? new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}
                    : new String[]{permission};
            screen.requestPermissions(requested, PERMISSION);
            return;
        }
        if (Build.VERSION.SDK_INT < 33 && Settings.Secure.getInt(screen.getContentResolver(),
                Settings.Secure.LOCATION_MODE, Settings.Secure.LOCATION_MODE_OFF) == Settings.Secure.LOCATION_MODE_OFF) {
            DisplayPrivacy.dialog(screen).setTitle("Enable device location")
                    .setMessage("This Android version requires Location to discover nearby Wi-Fi Direct peers.")
                    .setNegativeButton("Cancel", null).setPositiveButton("Settings", (d,w) ->
                        screen.startActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))).show();
            return;
        }
        if (channel == null) channel = manager.initialize(screen, screen.getMainLooper(), () -> {
            channel = null; connecting = false; appliedEndpoint = "";
            if (active) feedback.accept("Wi-Fi Direct service disconnected. Open Wi-Fi Direct to reconnect.");
        });
        if (channel == null) { feedback.accept("Wi-Fi Direct service is unavailable."); return; }
        active = true;
        if (!registered) {
            IntentFilter filter = new IntentFilter(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION);
            filter.addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION);
            if (Build.VERSION.SDK_INT >= 33) screen.registerReceiver(broadcasts, filter, Context.RECEIVER_EXPORTED);
            else screen.registerReceiver(broadcasts, filter);
            registered = true;
        }
        manager.requestGroupInfo(channel, group -> {
            if (!active || channel == null) return;
            boolean host = "host".equals(link.snapshot().role);
            if (group != null && group.isGroupOwner() != host) {
                DisplayPrivacy.dialog(screen).setTitle("Leave the current Wi-Fi Direct group?")
                        .setMessage("CubeChat needs this phone to " + (host ? "host its own group." : "join the card holder’s group."))
                        .setNegativeButton("Cancel", null).setPositiveButton("Leave group", (d,w) ->
                                manager.removeGroup(channel, action(() -> openRole(host), "Leave group"))).show();
            } else if (group != null) manager.requestConnectionInfo(channel, this::onConnection);
            else openRole(host);
        });
    }

    private long permissionContact;

    void permissionResult(boolean granted) {
        if (permissionContact == 0 || permissionContact != link.snapshot().activeId) return;
        permissionContact = 0;
        if (granted) begin();
        else feedback.accept("Wi-Fi Direct needs Nearby devices or Location permission. Other connections remain available.");
    }

    private void openRole(boolean host) {
        if (!active || channel == null) return;
        if (host) {
            manager.createGroup(channel, action(() -> {
                ownsGroup = true;
                feedback.accept("Wi-Fi Direct group starting. On the other phone, select Wi-Fi Direct.");
                manager.requestConnectionInfo(channel, this::onConnection);
            }, "Create Wi-Fi Direct group"));
        } else showPeers();
    }

    private WifiP2pManager.ActionListener action(Runnable ok, String what) {
        return new WifiP2pManager.ActionListener() {
            public void onSuccess() { if (active && channel != null) ok.run(); }
            public void onFailure(int reason) {
                if (!active) return;
                connecting = false;
                String cause = reason == WifiP2pManager.P2P_UNSUPPORTED ? "unsupported on this device"
                        : reason == WifiP2pManager.BUSY ? "Wi-Fi is busy; retry with Wi-Fi enabled" : "Wi-Fi service error";
                feedback.accept(what + " failed: " + cause + ".");
            }
        };
    }

    private void showPeers() {
        if (devices != null) return;
        names = new ArrayAdapter<>(screen, android.R.layout.simple_list_item_1);
        ListView list = new ListView(screen);
        list.setAdapter(names);
        list.setOnItemClickListener((a,v,position,id) -> {
            if (position >= peers.size() || channel == null) return;
            WifiP2pDevice chosen = peers.get(position);
            WifiP2pConfig config = new WifiP2pConfig();
            config.deviceAddress = chosen.deviceAddress;
            config.groupOwnerIntent = 0;
            config.wps.setup = WpsInfo.PBC;
            connecting = true;
            manager.connect(channel, config, action(() -> {
                feedback.accept("Connecting over Wi-Fi Direct. Accept Android’s connection prompt on the hosting phone.");
                if (devices != null) devices.dismiss();
            }, "Connect to device"));
        });
        AlertDialog dialog = DisplayPrivacy.dialog(screen).setTitle("Nearby Wi-Fi Direct devices")
                .setView(list).setNegativeButton("Close", null).setNeutralButton("Refresh", null).create();
        devices = dialog;
        dialog.setOnDismissListener(d -> {
            devices = null; names = null;
            if (active && channel != null && !connecting) manager.stopPeerDiscovery(channel, null);
        });
        dialog.show();
        dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setOnClickListener(v -> discover());
        discover();
    }

    private void discover() {
        if (!LockdownRadioPolicy.wifiDirectAllowed(screen)) {
            feedback.accept("Wi-Fi Direct discovery is denied in lockdown.");
            stop(true);
            return;
        }
        if (active && channel != null) manager.discoverPeers(channel, action(this::refreshPeers, "Discover nearby devices"));
    }

    private void refreshPeers() {
        if (names == null || channel == null) return;
        manager.requestPeers(channel, results -> {
            if (!active || names == null) return;
            peers.clear(); peers.addAll(results.getDeviceList());
            peers.sort(Comparator.comparing(this::name, String.CASE_INSENSITIVE_ORDER));
            names.clear();
            for (WifiP2pDevice p : peers) names.add(name(p) + "\n" + p.deviceAddress);
            if (peers.isEmpty()) names.add("Searching… Enable Wi-Fi Direct on the hosting phone.");
        });
    }

    private String name(WifiP2pDevice p) { return p.deviceName == null || p.deviceName.isEmpty() ? "Nearby phone" : p.deviceName; }

    private void onConnection(WifiP2pInfo info) {
        if (!active || info == null) return;
        if (!info.groupFormed || info.groupOwnerAddress == null) { appliedEndpoint = ""; return; }
        connecting = false;
        if ("host".equals(link.snapshot().role)) {
            String address = info.groupOwnerAddress.getHostAddress();
            if (info.isGroupOwner && !address.equals(appliedEndpoint)) {
                appliedEndpoint = address; link.useWifiEndpoint(address);
                manager.requestGroupInfo(channel, group -> {
                    if (!active || group == null) return;
                    String device = group.getOwner() == null ? Build.MODEL : name(group.getOwner());
                    feedback.accept("Wi-Fi Direct host ready. Select " + device + " on the other phone.");
                });
            }
            return;
        }
        if (info.isGroupOwner) { feedback.accept("This phone became group owner. Reopen Wi-Fi Direct to join the hosting phone."); return; }
        String address = info.groupOwnerAddress.getHostAddress();
        if (!address.equals(appliedEndpoint)) {
            appliedEndpoint = address;
            ownsGroup = true;
            link.useWifiEndpoint(address);
        }
        if (devices != null) devices.dismiss();
    }

    void stop(boolean leaveOwnedGroup) {
        permissionContact = 0;
        active = false;
        if (devices != null) devices.dismiss();
        if (channel != null) {
            manager.stopPeerDiscovery(channel, null);
            if (leaveOwnedGroup && ownsGroup) manager.removeGroup(channel, null);
            if (Build.VERSION.SDK_INT >= 27) channel.close();
            channel = null;
        }
        if (registered) { screen.unregisterReceiver(broadcasts); registered = false; }
        appliedEndpoint = ""; connecting = false; ownsGroup = false;
    }
}
