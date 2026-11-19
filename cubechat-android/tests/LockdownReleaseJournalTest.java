package org.cubechat.android;

/** Host-only manual cleanup journal tests. No calls, radios or OS operations. */
public final class LockdownReleaseJournalTest {
    private static int checks;

    private static void check(boolean yes, String why) {
        checks++;
        if (!yes) throw new AssertionError(why);
    }

    private static void verify(long at, String phase, boolean previous,
                               LockdownReleaseJournal.State expected, boolean receipts) {
        LockdownReleaseJournal.Review result =
                LockdownReleaseJournal.inspect(at, phase, previous);
        check(result.state == expected, "state: " + phase);
        check(result.showReceipts == receipts, "receipt visibility: " + phase);
    }

    public static void main(String[] args) {
        verify(0, null, false, LockdownReleaseJournal.State.NEVER_ATTEMPTED, false);
        verify(-1, LockdownReleaseJournal.STARTED, true,
                LockdownReleaseJournal.State.NEVER_ATTEMPTED, false);
        verify(12345, LockdownReleaseJournal.STARTED, true,
                LockdownReleaseJournal.State.INTERRUPTED_OR_UNCONFIRMED, false);
        verify(12345, LockdownReleaseJournal.STARTED, false,
                LockdownReleaseJournal.State.INTERRUPTED_OR_UNCONFIRMED, false);
        verify(12345, LockdownReleaseJournal.REQUESTS_SENT, true,
                LockdownReleaseJournal.State.REQUESTS_SENT, true);
        verify(12345, LockdownReleaseJournal.REQUESTS_FAILED, false,
                LockdownReleaseJournal.State.REQUESTS_FAILED, true);
        verify(12345, "", true, LockdownReleaseJournal.State.REQUESTS_SENT, true);
        verify(12345, null, false, LockdownReleaseJournal.State.REQUESTS_FAILED, true);
        verify(12345, "CORRUPTED", true,
                LockdownReleaseJournal.State.INTERRUPTED_OR_UNCONFIRMED, false);

        LockdownReleaseJournal.Review interrupted =
                LockdownReleaseJournal.inspect(100, LockdownReleaseJournal.STARTED, true);
        check(interrupted.label.contains("may have been interrupted"), "interrupted warning");
        check(!interrupted.label.contains("requests sent"), "old success not replayed");
        LockdownReleaseJournal.Review completed =
                LockdownReleaseJournal.inspect(100, LockdownReleaseJournal.REQUESTS_SENT, true);
        check(completed.label.contains("NOT independently verified"), "no false verification");
        LockdownReleaseJournal.Review failed =
                LockdownReleaseJournal.inspect(100, LockdownReleaseJournal.REQUESTS_FAILED, false);
        check(failed.label.contains("FAILED"), "failure explicit");
        System.out.println("LockdownReleaseJournal: " + checks
                + " host-only assertions passed; no device or calling actions");
    }
}
