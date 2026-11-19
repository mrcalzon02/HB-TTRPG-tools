package org.cubechat.android;

/**
 * Plain-Java interpretation of the persistent *ordinary manual* release log.
 * Its state means that commands were requested, never that radios, VPNs or
 * system policies have been independently verified as removed.
 *
 * No telephony, calling or privileged signal is represented here.
 */
final class LockdownReleaseJournal {
    static final String STARTED = "STARTED";
    static final String REQUESTS_SENT = "REQUESTS_SENT";
    static final String REQUESTS_FAILED = "REQUESTS_FAILED";

    enum State { NEVER_ATTEMPTED, INTERRUPTED_OR_UNCONFIRMED, REQUESTS_SENT, REQUESTS_FAILED }

    static final class Review {
        final State state;
        final String label;
        final boolean showReceipts;
        Review(State state, String label, boolean showReceipts) {
            this.state = state;
            this.label = label;
            this.showReceipts = showReceipts;
        }
    }

    private LockdownReleaseJournal() { }

    static Review inspect(long startedAtMs, String phase, boolean legacyCompleted) {
        if (startedAtMs <= 0)
            return new Review(State.NEVER_ATTEMPTED,
                    "No manual release attempt recorded on this installation.", false);
        if (STARTED.equals(phase))
            return new Review(State.INTERRUPTED_OR_UNCONFIRMED,
                    "Release began but no final command receipt was saved. It may have "
                    + "been interrupted. Check Recovery and Android VPN settings; "
                    + "use the manual release action again if needed.", false);
        if (REQUESTS_SENT.equals(phase))
            return new Review(State.REQUESTS_SENT,
                    "Release requests sent; removal NOT independently verified", true);
        if (REQUESTS_FAILED.equals(phase))
            return new Review(State.REQUESTS_FAILED,
                    "Some release requests FAILED; review each cleanup step", true);

        // Older builds saved only a Boolean completion value. Preserve that
        // legacy display, but never silently interpret an unknown new phase
        // as successful cleanup.
        if (phase == null || phase.isEmpty())
            return legacyCompleted
                    ? new Review(State.REQUESTS_SENT,
                            "Legacy release requests sent; removal NOT independently verified", true)
                    : new Review(State.REQUESTS_FAILED,
                            "Legacy release may be incomplete; review Android VPN settings", true);
        return new Review(State.INTERRUPTED_OR_UNCONFIRMED,
                "Unrecognized release receipt. Removal NOT verified; inspect Android VPN settings.", false);
    }
}
