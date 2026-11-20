package org.cubechat.android;

/**
 * Pure, host-testable transfer progress presentation.
 * An ACCEPTED transfer is not verified complete merely because every byte
 * has been sent; completion requires the protocol's final verified receipt.
 * This formatter never reads file payloads or sends network traffic.
 */
final class TransferProgress {
    private TransferProgress() { }

    static long boundedBytes(long progress, long size) {
        return size <= 0 ? 0 : Math.max(0, Math.min(progress, size));
    }

    /** A percentage is unavailable for zero-length/invalid file sizes. */
    static int percent(long progress, long size) {
        if (size <= 0) return -1;
        // Floating-point arithmetic avoids overflow when an unexpectedly
        // large, stale transfer size reaches the UI. It is a display-only
        // percentage, not an authorization or data-integrity check.
        long done = boundedBytes(progress, size);
        return Math.max(0, Math.min(100, (int) (100.0 * done / size)));
    }

    /** 0–1000 range used by the detail progress bar; -1 means unknown. */
    static int progressPermille(long progress, long size) {
        if (size <= 0) return -1;
        long done = boundedBytes(progress, size);
        return Math.max(0, Math.min(1000, (int) (1000.0 * done / size)));
    }

    /** Accepted is not COMPLETE even after the last byte has been received. */
    static String acceptedStatus(boolean outgoing, boolean selected,
                                 boolean connected, boolean capable,
                                 boolean paused, boolean peerPaused,
                                 long progress, long size) {
        if (paused) return "Paused";
        if (peerPaused) return "Paused by contact";
        if (!selected) return "Open conversation to resume";
        if (!connected) return "Waiting for connection";
        if (!capable) return "Waiting for file support";
        if (size > 0 && progress >= size)
            return outgoing ? "Awaiting delivery confirmation" : "Verifying received file";
        return outgoing ? "Sending" : "Receiving";
    }

    static String percentSuffix(long progress, long size) {
        int percent = percent(progress, size);
        return percent < 0 ? "" : " · " + percent + "%";
    }
}
