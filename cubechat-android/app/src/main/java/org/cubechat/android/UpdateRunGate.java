package org.cubechat.android;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;

/**
 * Process-local gate for CubeChat's optional GitHub release checks only.
 * No app/network permission or kernel policy is granted by this class.
 * Invalidation revokes old permits and closes their current HTTP connection;
 * the OS may still have already transmitted data before the transition.
 */
final class UpdateRunGate {
    private static final AtomicLong REVISION = new AtomicLong();
    private static final Set<Permit> ACTIVE = ConcurrentHashMap.newKeySet();

    interface Check { void verify() throws IOException; }

    static final class Permit implements Check, AutoCloseable {
        private final long revision;
        private final BooleanSupplier permission;
        private final AtomicBoolean revoked = new AtomicBoolean();
        private final AtomicReference<HttpURLConnection> currentConnection =
                new AtomicReference<>();

        private Permit(long revision, BooleanSupplier permission) {
            this.revision = revision;
            this.permission = permission;
        }

        boolean allowed() {
            if (revoked.get()) return false;
            boolean permitted;
            try {
                permitted = !Thread.currentThread().isInterrupted()
                        && revision == REVISION.get()
                        && permission.getAsBoolean();
            } catch (RuntimeException refused) {
                // If the platform cannot report network permission, deny this
                // request rather than letting a failed callback retain a permit.
                cancel();
                return false;
            }
            if (!permitted || revision != REVISION.get()) {
                cancel();
                return false;
            }
            return !revoked.get();
        }

        @Override public void verify() throws IOException {
            if (!allowed())
                throw new IOException("Update networking cancelled by lockdown or shutdown");
        }

        /** Call immediately after openConnection, BEFORE getResponseCode. */
        void track(HttpURLConnection connection) {
            Objects.requireNonNull(connection);
            HttpURLConnection old = currentConnection.getAndSet(connection);
            if (old != null && old != connection) disconnectQuietly(old);
            if (!allowed()) {
                if (currentConnection.compareAndSet(connection, null)) disconnectQuietly(connection);
            }
        }

        /** Unregister after request finalization (regardless of HTTP outcome). */
        void untrack(HttpURLConnection connection) {
            currentConnection.compareAndSet(connection, null);
        }

        private void cancel() {
            revoked.set(true);
            // A canceled worker can remain stuck in platform I/O. Remove its
            // registration NOW instead of retaining it until the UI catches up.
            ACTIVE.remove(this);
            HttpURLConnection active = currentConnection.getAndSet(null);
            if (active != null) disconnectQuietly(active);
        }

        private static void disconnectQuietly(HttpURLConnection connection) {
            try { connection.disconnect(); }
            catch (RuntimeException ignored) {
                // A failing vendor HTTP implementation cannot prevent the
                // actual lockdown invalidation or other permit cleanup.
            }
        }

        @Override public void close() {
            cancel();
        }
    }

    static Permit enter(BooleanSupplier permission) {
        Permit permit = new Permit(REVISION.get(), Objects.requireNonNull(permission));
        ACTIVE.add(permit);
        // If invalidation races registration, the epoch check still rejects it.
        if (!permit.allowed()) permit.close();
        return permit;
    }

    static void invalidate() {
        REVISION.incrementAndGet();
        for (Permit permit : ACTIVE) permit.cancel();
    }

    /** Local diagnostic/test counter; never a proof of kernel/network isolation. */
    static int outstandingRequests() {
        return ACTIVE.size();
    }

    private UpdateRunGate() { }
}
