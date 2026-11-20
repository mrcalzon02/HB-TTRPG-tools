package org.cubechat.android;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * On-device-only, encrypted aggregate security history. AES-GCM keys never leave
 * AndroidKeyStore. This is NOT a traffic recorder or background cell scanner.
 * All failures are isolated from the firewall itself and never fall back to plaintext.
 */
final class SecurityTelemetryStore {
    private static final String PREFS = "cubechat-security-telemetry";
    private static final String KEY_ALIAS = "cubechat-security-telemetry-v1";
    private static final String DATA = "encrypted-buckets";
    private static final String ENABLED = "recording-enabled";
    private static final String RETENTION = "retention-ms";
    private static final long DEFAULT_RETENTION = 72 * SecurityTimeline.HOUR_MS;
    private static final byte[] AAD = "CubeChat security telemetry v1".getBytes(StandardCharsets.US_ASCII);
    private static SecurityTelemetryStore instance;
    private static volatile boolean purging;

    private final Context app;
    private final SharedPreferences prefs;
    private final ScheduledExecutorService writer;
    private final AtomicLong pendingPackets = new AtomicLong();
    private final AtomicLong pendingBytes = new AtomicLong();
    private SecurityTimeline timeline = new SecurityTimeline();
    private volatile boolean enabled;
    private long retentionMs;
    private volatile String storageError;
    private boolean dirty;

    private SecurityTelemetryStore(Context context) {
        app = context.getApplicationContext();
        prefs = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        enabled = prefs.getBoolean(ENABLED, true);
        long stored = prefs.getLong(RETENTION, DEFAULT_RETENTION);
        retentionMs = SecurityTimeline.validRetention(stored) ? stored : DEFAULT_RETENTION;
        String encrypted = prefs.getString(DATA, null);
        if (encrypted != null) {
            try { timeline = SecurityTimeline.decode(decrypt(encrypted), System.currentTimeMillis()); }
            catch (Exception failed) { storageError = "Encrypted history cannot be read. Clear history to reset it."; }
        }
        writer = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread worker = new Thread(r, "CubeChat aggregate statistics");
            worker.setDaemon(true);
            return worker;
        });
        writer.scheduleWithFixedDelay(() -> {
            try { flushNow(); }
            catch (RuntimeException ignored) { /* Never affect VPN packet disposal. */ }
        }, 30, 30, TimeUnit.SECONDS);
    }

    static synchronized SecurityTelemetryStore get(Context context) {
        if (instance == null) instance = new SecurityTelemetryStore(context);
        return instance;
    }
    boolean enabled() { return enabled && !purging; }
    synchronized String error() { return storageError; }
    synchronized long retentionMs() { return retentionMs; }
    synchronized void setEnabled(boolean on) {
        if (purging) return;
        if (!prefs.edit().putBoolean(ENABLED, on).commit())
            throw new IllegalStateException("Could not persist statistics setting");
        if (!on) drain(System.currentTimeMillis());
        enabled = on;
        if (dirty) writer.execute(this::flushNow);
    }
    synchronized void setRetention(long periodMs) {
        if (!SecurityTimeline.validRetention(periodMs)) throw new IllegalArgumentException("Retention period");
        if (purging) return;
        if (!prefs.edit().putLong(RETENTION, periodMs).commit())
            throw new IllegalStateException("Could not persist statistics retention");
        retentionMs = periodMs;
        timeline.prune(System.currentTimeMillis(), retentionMs);
        dirty = true;
        writer.execute(this::flushNow);
    }
    /** One atomic counter update per packet; no parsing, content copy or disk I/O. */
    void droppedPacket(int bytes) {
        if (!enabled() || bytes <= 0 || storageError != null) return;
        pendingPackets.incrementAndGet();
        pendingBytes.addAndGet(bytes);
    }
    /** Only called after the existing explicit, permission-gated Android cell read. */
    synchronized void cellReport(List<CellObservation> sample) {
        if (!enabled() || storageError != null || sample == null) return;
        int count = Math.min(256, sample.size()), fresh = 0, serving = 0;
        int signal = SecurityTimeline.UNKNOWN_SIGNAL;
        for (int i = 0; i < count; i++) {
            CellObservation cell = sample.get(i);
            if (cell == null) continue;
            if (cell.isCurrent()) fresh++;
            if (cell.registered) {
                serving++;
                if (cell.isCurrent() && cell.signalDbm != CellObservation.UNKNOWN)
                    signal = cell.signalDbm;
            }
        }
        timeline.recordCellReport(System.currentTimeMillis(), count, fresh, serving, signal);
        dirty = true;
        writer.execute(this::flushNow);
    }
    private void drain(long nowMs) {
        long packets = pendingPackets.getAndSet(0);
        long bytes = pendingBytes.getAndSet(0);
        if (packets > 0 || bytes > 0) {
            timeline.recordDrops(nowMs, Math.max(0, packets), Math.max(0, bytes));
            dirty = true;
        }
    }
    synchronized List<SecurityTimeline.Bucket> history() {
        if (purging || storageError != null) return Collections.emptyList();
        long now = System.currentTimeMillis();
        drain(now);
        // A read can expire buckets without any new traffic; persist that deletion.
        if (timeline.prune(now, retentionMs)) {
            dirty = true;
            writer.execute(this::flushNow);
        }
        return timeline.snapshot(now, retentionMs);
    }
    synchronized void flushNow() {
        if (purging || storageError != null) return;
        long now = System.currentTimeMillis();
        drain(now);
        // Retention must expire encrypted rows even on a completely idle phone.
        if (timeline.prune(now, retentionMs)) dirty = true;
        if (!dirty) return;
        try {
            // Never write unencrypted metadata. The only durable time series is AEAD ciphertext.
            timeline.prune(now, retentionMs);
            String ciphertext = encrypt(timeline.encode(now));
            if (!prefs.edit().putString(DATA, ciphertext).commit())
                throw new IllegalStateException("Preferences write failed");
            dirty = false;
        } catch (Exception failure) {
            storageError = "Secure history storage unavailable. Clear history to retry.";
        }
    }
    /** Clears counters, ciphertext and the history key; does not change VPN policy. */
    synchronized boolean clearHistory() {
        if (purging) return false;
        pendingPackets.set(0); pendingBytes.set(0);
        timeline.clear(); dirty = false;
        boolean cleared = prefs.edit().remove(DATA).commit();
        try { deleteKey(); }
        catch (Exception failure) { cleared = false; }
        if (cleared) storageError = null;
        else storageError = "Secure history could not be fully cleared; local PURGE remains available.";
        return cleared;
    }
    /** Invoked before Android clearApplicationUserData: freeze writers, erase history and key. */
    static synchronized void purge(Context context) {
        purging = true;
        if (instance != null) {
            synchronized (instance) {
                instance.enabled = false;
                instance.pendingPackets.set(0); instance.pendingBytes.set(0);
                instance.timeline.clear();
                instance.writer.shutdownNow();
            }
        }
        context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().clear().commit();
        try { deleteKey(); } catch (Exception ignored) { /* OS app-data reset still follows. */ }
    }

    private static SecretKey key(boolean generate) throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        KeyStore.Entry entry = store.getEntry(KEY_ALIAS, null);
        if (entry instanceof KeyStore.SecretKeyEntry)
            return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
        if (!generate) throw new IllegalStateException("Missing history key");
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setKeySize(256)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build());
        return generator.generateKey();
    }
    private static void deleteKey() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(KEY_ALIAS)) store.deleteEntry(KEY_ALIAS);
    }
    private static String encrypt(String plaintext) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key(true));
        cipher.updateAAD(AAD);
        byte[] iv = cipher.getIV();
        if (iv.length != 12) throw new IllegalStateException("Unexpected GCM IV size");
        byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
        byte[] result = new byte[iv.length + encrypted.length];
        System.arraycopy(iv, 0, result, 0, iv.length);
        System.arraycopy(encrypted, 0, result, iv.length, encrypted.length);
        return Base64.encodeToString(result, Base64.NO_WRAP);
    }
    private static String decrypt(String encoded) throws Exception {
        if (encoded.length() > 900_000) throw new IllegalArgumentException("History too large");
        byte[] data = Base64.decode(encoded, Base64.DEFAULT);
        if (data.length < 12 + 16) throw new IllegalArgumentException("Truncated history");
        byte[] iv = new byte[12];
        System.arraycopy(data, 0, iv, 0, iv.length);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(false), new GCMParameterSpec(128, iv));
        cipher.updateAAD(AAD);
        return new String(cipher.doFinal(data, iv.length, data.length - iv.length), StandardCharsets.UTF_8);
    }
}
