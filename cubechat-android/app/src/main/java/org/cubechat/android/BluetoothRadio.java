package org.cubechat.android;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import java.io.Closeable;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Classic RFCOMM carrier for the same paired conversation, outbox and delivery receipts as Wi-Fi. */
@SuppressLint("MissingPermission") // Every radio entry is guarded, including restoration after process death.
final class BluetoothRadio {
    static final int PERMISSIONS = 731, ENABLE = 732, DISCOVERABLE = 733;
    private static final UUID SERVICE = UUID.fromString("56cf197c-c62e-46e0-8381-b4da49da39b0");
    private static final String SERVICE_NAME = "CubeChat direct";
    private final Activity activity;
    private final PeerLink link;
    private final BluetoothAdapter radio;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newCachedThreadPool();
    private final SharedPreferences saved;
    private final Object sockets = new Object();
    private BluetoothServerSocket server;
    private BluetoothSocket pending;
    private volatile int generation;
    private volatile boolean closed;
    private boolean active, inFlight, receiverRegistered;
    private AlertDialog chooser;
    private final Map<String, BluetoothDevice> nearby = new LinkedHashMap<>();
    private ArrayAdapter<String> rows;
    private List<BluetoothDevice> choices;
    private final Runnable maintenance = this::tick;

    BluetoothRadio(Activity activity, PeerLink link) {
        this.activity = activity;
        this.link = link;
        BluetoothManager manager = activity.getSystemService(BluetoothManager.class);
        radio = manager == null ? null : manager.getAdapter();
        saved = activity.getSharedPreferences("cubechat-radio", Context.MODE_PRIVATE);
    }

    private String[] permissions() {
        if (Build.VERSION.SDK_INT >= 31) {
            if ("host".equals(link.snapshot().role)) {
                return new String[]{Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_ADVERTISE};
            }
            return new String[]{Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN};
        }
        return "guest".equals(link.snapshot().role) ? new String[]{Manifest.permission.ACCESS_FINE_LOCATION} : new String[0];
    }

    private List<String> missing() {
        List<String> missing = new ArrayList<>();
        for (String permission : permissions()) {
            if (activity.checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) missing.add(permission);
        }
        return missing;
    }

    void choose() {
        if (closed) return;
        if (radio == null) { notice("This phone has no Bluetooth Classic adapter."); return; }
        if (link.snapshot().role.isEmpty()) { notice("Create or scan a key card first."); return; }
        List<String> missing = missing();
        if (!missing.isEmpty()) { activity.requestPermissions(missing.toArray(new String[0]), PERMISSIONS); return; }
        try {
            if (!radio.isEnabled()) {
                activity.startActivityForResult(new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE), ENABLE);
                return;
            }
            if ("host".equals(link.snapshot().role)) {
                activate("");
                Intent show = new Intent(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);
                show.putExtra(BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION, 120);
                activity.startActivityForResult(show, DISCOVERABLE);
            } else {
                showDevices();
            }
        } catch (RuntimeException e) { notice("Bluetooth unavailable: " + detail(e)); }
    }

    void onPermissionsResult(int request) {
        if (request != PERMISSIONS) return;
        if (missing().isEmpty()) choose();
        else notice("Bluetooth permission is needed to use this radio. Your chat key is already stored.");
    }

    void onActivityResult(int request, int result) {
        if (request == ENABLE && result == Activity.RESULT_OK) choose();
        else if (request == ENABLE) notice("Bluetooth is off.");
        else if (request == DISCOVERABLE && result == Activity.RESULT_CANCELED) {
            notice("Nearby discovery was declined. A previously paired Bluetooth device can still connect.");
        }
    }

    void resume() {
        if (closed || active || !saved.getBoolean("enabled", false) || radio == null) return;
        // Pairing is restored by PeerLink on a worker thread.
        if (link.snapshot().role.isEmpty()) {
            if (link.snapshot().status.startsWith("Opening")) ui.postDelayed(this::resume, 400);
            return;
        }
        if (!missing().isEmpty()) return;
        try { if (radio.isEnabled()) activate(saved.getString("address", "")); }
        catch (RuntimeException e) { notice("Bluetooth unavailable: " + detail(e)); }
    }

    private void activate(String address) {
        deactivate();
        active = true;
        saved.edit().putBoolean("enabled", true).putString("address", address).apply();
        link.useBluetooth();
        tick();
    }

    private void tick() {
        ui.removeCallbacks(maintenance);
        if (!active || closed) return;
        if (!inFlight && !link.snapshot().connected && !link.snapshot().role.isEmpty()) {
            int epoch = generation;
            boolean host = "host".equals(link.snapshot().role);
            String address = saved.getString("address", "");
            if (host || BluetoothAdapter.checkBluetoothAddress(address)) {
                inFlight = true;
                io.execute(() -> connect(epoch, host, address));
            }
        }
        ui.postDelayed(maintenance, 6000);
    }

    private void connect(int epoch, boolean host, String address) {
        BluetoothSocket candidate = null;
        BluetoothServerSocket listening = null;
        try {
            if (host) {
                listening = radio.listenUsingRfcommWithServiceRecord(SERVICE_NAME, SERVICE);
                synchronized (sockets) {
                    if (generation != epoch || closed) return;
                    server = listening;
                }
                candidate = listening.accept();
            } else {
                radio.cancelDiscovery();
                candidate = radio.getRemoteDevice(address).createRfcommSocketToServiceRecord(SERVICE);
                synchronized (sockets) {
                    if (generation != epoch || closed) return;
                    pending = candidate;
                }
                candidate.connect();
            }
            synchronized (sockets) {
                if (generation != epoch || closed) return;
                if (pending == candidate) pending = null;
                link.attachBluetooth(candidate.getInputStream(), candidate.getOutputStream(), candidate, "Bluetooth");
                candidate = null; // PeerLink now owns the connected socket.
            }
        } catch (IOException | SecurityException e) {
            // Restart and transient radio failures are retried through the selected, saved device.
            if (generation == epoch && !closed) link.bluetoothStatus("Bluetooth waiting: " + detail(e));
        } finally {
            synchronized (sockets) {
                if (server == listening) server = null;
                if (pending == candidate) pending = null;
            }
            closeQuietly(listening);
            closeQuietly(candidate);
            ui.post(() -> { if (generation == epoch) inFlight = false; });
        }
    }

    private final BroadcastReceiver discovered = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            if (chooser == null) return;
            if (BluetoothDevice.ACTION_FOUND.equals(intent.getAction())) {
                BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                if (device != null) { nearby.put(device.getAddress(), device); renderDevices(); }
            } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(intent.getAction())) {
                chooser.setTitle(nearby.isEmpty() ? "No phones found" : "Choose the other phone");
            }
        }
    };

    private void showDevices() {
        if (chooser != null) return;
        nearby.clear();
        for (BluetoothDevice device : radio.getBondedDevices()) nearby.put(device.getAddress(), device);
        rows = new ArrayAdapter<>(activity, android.R.layout.simple_list_item_1);
        renderDevices();
        chooser = new AlertDialog.Builder(activity).setTitle("Choose the other phone")
                .setAdapter(rows, (dialog, index) -> {
                    if (index >= 0 && index < choices.size()) activate(choices.get(index).getAddress());
                }).setNegativeButton("Cancel", null).setNeutralButton("Search again", null).create();
        chooser.setOnDismissListener(dialog -> {
            endDiscovery();
            chooser = null;
        });
        chooser.show();
        chooser.getButton(AlertDialog.BUTTON_NEUTRAL).setOnClickListener(v -> discover());
        IntentFilter filter = new IntentFilter(BluetoothDevice.ACTION_FOUND);
        filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        if (Build.VERSION.SDK_INT >= 33) activity.registerReceiver(discovered, filter, Context.RECEIVER_EXPORTED);
        else activity.registerReceiver(discovered, filter);
        receiverRegistered = true;
        discover();
    }

    private void discover() {
        try {
            radio.cancelDiscovery();
            if (radio.startDiscovery()) chooser.setTitle("Searching for nearby phones…");
            else notice("Discovery could not start. Enable Bluetooth discovery on the other phone.");
        } catch (SecurityException e) { notice("Bluetooth discovery permission is unavailable."); }
    }

    private void renderDevices() {
        choices = new ArrayList<>(nearby.values());
        rows.clear();
        for (BluetoothDevice device : choices) {
            String name = device.getName();
            rows.add((name == null || name.isEmpty() ? "Bluetooth device" : name) + "\n" + device.getAddress());
        }
        rows.notifyDataSetChanged();
    }

    private void endDiscovery() {
        if (receiverRegistered) {
            activity.unregisterReceiver(discovered);
            receiverRegistered = false;
            try { radio.cancelDiscovery(); } catch (RuntimeException ignored) { }
        }
    }

    void leave() {
        saved.edit().clear().apply();
        deactivate();
    }

    void stop() {
        closed = true;
        if (chooser != null) chooser.dismiss();
        endDiscovery();
        deactivate();
        ui.removeCallbacksAndMessages(null);
        io.shutdownNow();
    }

    private void deactivate() {
        active = false;
        inFlight = false;
        ui.removeCallbacks(maintenance);
        synchronized (sockets) {
            generation++;
            closeQuietly(server);
            closeQuietly(pending);
            server = null;
            pending = null;
        }
    }

    private void notice(String message) {
        if (!activity.isFinishing() && !closed) Toast.makeText(activity, message, Toast.LENGTH_LONG).show();
    }
    private static String detail(Exception e) { return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage(); }
    private static void closeQuietly(Closeable object) { if (object != null) try { object.close(); } catch (IOException ignored) {} }
}
