package org.cubechat.android;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.VpnService;
import android.os.Build;
import android.os.IBinder;
import android.os.ParcelFileDescriptor;

import java.io.FileInputStream;
import java.io.IOException;
import java.net.DatagramSocket;
import java.net.Socket;

/**
 * Local, no-gateway IPv4/IPv6 deny-all VPN. Packets arriving at the TUN interface
 * are discarded, never copied to a relay, file, DNS resolver or analytics endpoint.
 *
 * CubeChat's audited peer sockets call protect() BEFORE connecting, so only the
 * explicitly chosen CubeChat transport can use the underlying IP network.
 * This is an IP firewall, not a Bluetooth, Wi-Fi radio or baseband firewall.
 *
 * WARNING: Service lifetime alone is not fail-closed. Android's separate
 * Always-on VPN + Block connections without VPN options are necessary to prevent
 * network leakage when the process stops, reboots or is replaced.
 */
public final class LockdownFirewall extends VpnService {
    static final String ACTION_START = "org.cubechat.android.firewall.START";
    static final String ACTION_STOP = "org.cubechat.android.firewall.STOP";
    private static final String PREF = "cubechat-firewall";
    private static final String ARMED = "armed";
    private static final String CHANNEL = "cubechat-firewall";
    private static final int NOTIFICATION_ID = 2407;
    private static volatile LockdownFirewall active;
    private static volatile String lastError = "";
    private volatile boolean stopping;
    private ParcelFileDescriptor tunnel;
    private Thread discardThread;

    static boolean armed(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREF, MODE_PRIVATE)
                .getBoolean(ARMED, false);
    }

    static boolean running() {
        return active != null && active.tunnel != null && !active.stopping;
    }

    static boolean systemLockdownVerified() {
        LockdownFirewall service = active;
        return service != null && service.tunnel != null && !service.stopping
                && Build.VERSION.SDK_INT >= 29 && service.isAlwaysOn() && service.isLockdownEnabled();
    }

    static String failure() { return lastError; }

    static void setArmed(Context context, boolean enable) {
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREF, MODE_PRIVATE);
        boolean changed = prefs.getBoolean(ARMED, false) != enable;
        // Synchronous commit: network threads must see the new policy before a service is started.
        if (!prefs.edit().putBoolean(ARMED, enable).commit())
            throw new IllegalStateException("Could not save CubeChat firewall preference");
        if (changed) {
            // Once the user requests lockdown, invalidate every in-flight
            // optional updater request. A rapid on/off cannot revive one.
            if (enable) UpdateRunGate.invalidate();
            LockdownRadioPolicy.revokeAll();
            if (enable) PeerLink.enforceRadioPolicyForAll();
        }
        if (!enable) lastError = "";
    }

    static void start(Context context) {
        Intent intent = new Intent(context, LockdownFirewall.class).setAction(ACTION_START);
        context.startForegroundService(intent);
    }

    static void stop(Context context) {
        // Stop the currently running VPN synchronously when it belongs to this
        // process. Starting a foreground service just to stop it can fail
        // under Android background-start restrictions.
        LockdownFirewall current = active;
        if (current == null) return;
        current.closeTunnel();
        current.stopForeground(STOP_FOREGROUND_REMOVE);
        current.stopSelf();
    }

    /** No fallback to an unprotected socket while lockdown is requested. */
    static void protectChatSocket(Context context, Socket socket) throws IOException {
        if (!armed(context)) return;
        LockdownFirewall service = active;
        if (service == null || !running() || !service.protect(socket))
            throw new IOException("CubeChat firewall is not ready to authorize this peer socket");
    }

    static void protectChatDatagram(Context context, DatagramSocket socket) throws IOException {
        if (!armed(context)) return;
        LockdownFirewall service = active;
        if (service == null || !running() || !service.protect(socket))
            throw new IOException("CubeChat firewall is not ready to authorize LAN discovery");
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            closeTunnel();
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!armed(this)) {
            closeTunnel();
            stopSelf();
            return START_NOT_STICKY;
        }
        if (running()) return START_STICKY;
        try {
            startForeground(NOTIFICATION_ID, notification());
            stopping = false;
            Builder builder = new Builder()
                    .setSession("CubeChat IP lockdown")
                    .setMtu(1500)
                    .setBlocking(true)
                    .addAddress("10.255.247.1", 32)
                    .addRoute("0.0.0.0", 0)
                    .addDnsServer("10.255.247.2")
                    .addAddress("fd00:cc::1", 128)
                    .addRoute("::", 0);
            // No allowBypass(), app exclusions, split routes or upstream server.
            // Do not add a package allowlist: unlisted packages bypass the VPN
            // when Android's separate system lockdown option is not enabled.
            ParcelFileDescriptor established = builder.establish();
            if (established == null) throw new IOException("Android declined the VPN interface");
            tunnel = established;
            lastError = "";
            active = this;
            discardThread = new Thread(() -> discard(established), "CubeChat firewall packet drop");
            discardThread.setDaemon(true);
            discardThread.start();
            return START_STICKY;
        } catch (Exception error) {
            lastError = error.getClass().getSimpleName() + ": " + error.getMessage();
            closeTunnel();
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }
    }

    private Notification notification() {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        manager.createNotificationChannel(new NotificationChannel(CHANNEL, "CubeChat firewall",
                NotificationManager.IMPORTANCE_LOW));
        PendingIntent open = PendingIntent.getActivity(this, 0,
                new Intent(this, FirewallSettings.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(this, CHANNEL)
                .setSmallIcon(R.drawable.cubechat_icon)
                .setContentTitle("CubeChat IP lockdown")
                .setContentText("Other app IP traffic dropped; verify Android VPN lockdown")
                .setContentIntent(open)
                .setOngoing(true)
                .setCategory(Notification.CATEGORY_SERVICE)
                .build();
    }

    private void discard(ParcelFileDescriptor fd) {
        // Aggregates only packet lengths; the byte[] is never recorded or inspected.
        SecurityTelemetryStore telemetry = null;
        try { telemetry = SecurityTelemetryStore.get(this); }
        catch (RuntimeException ignored) { /* Firewall must work without telemetry. */ }
        byte[] packet = new byte[32768];
        try (FileInputStream input = new FileInputStream(fd.getFileDescriptor())) {
            while (!stopping && active == this) {
                int bytes = input.read(packet);
                if (bytes < 0) break;
                // Intentionally discard all data without forwarding or logging content.
                if (bytes > 0 && telemetry != null) telemetry.droppedPacket(bytes);
            }
        } catch (IOException error) {
            if (!stopping) lastError = "VPN interface stopped: " + error.getMessage();
        } finally {
            // Without Always-on + Block without VPN, Android can permit a leak
            // after this service exits. Never report a verified lockdown then.
            if (!stopping) {
                closeTunnel();
                stopSelf();
            }
        }
    }

    private synchronized void closeTunnel() {
        stopping = true;
        try { SecurityTelemetryStore.get(this).flushNow(); }
        catch (RuntimeException ignored) { /* Metrics never block VPN shutdown. */ }
        if (active == this) active = null;
        ParcelFileDescriptor fd = tunnel;
        tunnel = null;
        if (fd != null) try { fd.close(); } catch (IOException ignored) { }
    }

    @Override public void onRevoke() {
        lastError = "VPN permission revoked by Android or another VPN";
        closeTunnel();
        stopSelf();
        super.onRevoke();
    }

    @Override public void onDestroy() {
        closeTunnel();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return super.onBind(intent); }
}
