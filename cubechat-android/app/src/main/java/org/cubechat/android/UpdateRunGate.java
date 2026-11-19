package org.cubechat.android;

import java.io.IOException;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.BooleanSupplier;

/**
 * Pure-Java, process-wide gate for optional update-network requests.
 *
 * Each request captures a revision. Lockdown activation invalidates every
 * older request irreversibly, even if the user switches lockdown off again
 * immediately. The caller must also supply a current permission check, since
 * an armed preference survives process restarts. No network is opened here.
 */
final class UpdateRunGate {
    private static final AtomicLong REVISION = new AtomicLong();

    interface Check { void verify() throws IOException; }

    static final class Permit implements Check {
        private final long revision;
        private final BooleanSupplier permission;

        private Permit(long revision, BooleanSupplier permission) {
            this.revision = revision;
            this.permission = permission;
        }

        boolean allowed() {
            return !Thread.currentThread().isInterrupted()
                    && revision == REVISION.get()
                    && permission.getAsBoolean();
        }

        @Override public void verify() throws IOException {
            if (!allowed()) throw new IOException("Update networking cancelled by lockdown or shutdown");
        }
    }

    static Permit enter(BooleanSupplier permission) {
        return new Permit(REVISION.get(), Objects.requireNonNull(permission));
    }

    static void invalidate() {
        REVISION.incrementAndGet();
    }

    private UpdateRunGate() { }
}
