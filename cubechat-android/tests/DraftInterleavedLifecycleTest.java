package org.cubechat.android;

/**
 * Synthetic host-only interleaving of admitted draft writes across
 * contact switching, profile concealment, reopening, and retry.
 * This is not an Android vault or SQLite durability test.
 */
public final class DraftInterleavedLifecycleTest {
    private static int assertions;

    private static void check(boolean result, String reason) {
        assertions++;
        if (!result) throw new AssertionError(reason);
    }

    /**
     * A queued save may outlive both a conversation switch and a profile lock.
     * Reopening the original contact with identical text must still distinguish
     * the new write and its explicit retry from all older acknowledgements.
     */
    private static void switchedThenLockedRetryRegression() {
        final long contactA = 17L;
        final long contactB = 29L;
        final String identical = "synthetic retyped text";
        DraftSaveState editor = new DraftSaveState();

        editor.edited();
        DraftSaveState.Ticket firstA = editor.begin(contactA, identical);
        check(firstA != null && editor.isAwaiting(), "A save admitted before switch");

        editor.reset(); // switch A -> B, even while A's database write is queued
        editor.edited();
        DraftSaveState.Ticket writeB = editor.begin(contactB, "other synthetic text");
        check(writeB != null && editor.isAwaiting(), "B can queue its own write");
        check(!editor.failed(firstA, contactB, "other synthetic text", "late A error"),
                "A failure while B is selected cannot become B's error");
        check(editor.isAwaiting() && !editor.isDirty() && !editor.hadFailure(),
                "B stays awaiting after A's late failure");

        editor.reset(); // profile lock while B is also still awaiting
        check(!editor.isAwaiting() && !editor.isDirty() && !editor.hadFailure(),
                "lock clears only transient displayed-editor bookkeeping");
        check(!editor.failed(writeB, 0, null, "late B error"),
                "B failure cannot mutate a missing locked composer");
        check(!editor.succeeded(firstA, 0, null),
                "A success cannot mark a missing locked composer saved");
        check(editor.begin(0, null) == null && !editor.isDirty(),
                "missing composer cannot queue another draft write");
        DraftStatusText.Summary locked = DraftStatusText.describe(identical,
                false, false, false, false);
        check(!locked.visible && !locked.sendable,
                "locked/unselected composer has no status or send action");
        DraftStatusText.Summary lockedStaleFlags = DraftStatusText.describe(
                identical, false, true, true, true);
        check(!lockedStaleFlags.visible && !lockedStaleFlags.sendable,
                "locked composer must hide even stale saving/failure indicators");

        editor.edited(); // profile unlocked, reopen A and retype exactly A's old text
        check(editor.isDirty(), "retyped A text is unsaved despite matching old text");
        check(!editor.failed(firstA, contactA, identical, "old A error"),
                "late pre-lock A failure does not produce a new failure status");
        check(!editor.succeeded(firstA, contactA, identical),
                "late pre-lock A success does not confirm retyped A text");
        check(editor.isDirty() && !editor.isAwaiting() && !editor.hadFailure(),
                "pre-lock A callbacks leave the reopened edit dirty");
        check(DraftStatusText.describe(identical, true, false,
                editor.hadFailure(), editor.isDirty()).label.contains("Unsaved changes"),
                "reopened edit is visibly unsaved, not falsely saved or failed");

        DraftSaveState.Ticket reopenedA = editor.begin(contactA, identical);
        check(reopenedA != null && reopenedA.revision != firstA.revision,
                "reopened A ticket has a new generation");
        check(editor.isCurrent(reopenedA, contactA, identical),
                "only reopened A ticket may acknowledge this in-flight write");
        check(!editor.failed(firstA, contactA, identical, "old A error again"),
                "old A failure cannot interrupt the new pending A save");
        check(!editor.failed(writeB, contactA, identical, "old B error"),
                "locked B ticket cannot interrupt reopened A save");
        check(editor.isAwaiting() && !editor.isDirty() && !editor.hadFailure(),
                "late failures do not create a false retry warning");

        editor.retry(); // user explicitly retries current A edit
        check(editor.isDirty() && !editor.isAwaiting() && !editor.hadFailure(),
                "manual retry marks latest A text unsaved");
        check(!editor.succeeded(reopenedA, contactA, identical),
                "success from superseded in-flight A write cannot confirm retry");
        check(!editor.failed(reopenedA, contactA, identical, "superseded A error"),
                "failure from superseded in-flight A write cannot discard retry");
        DraftSaveState.Ticket retriedA = editor.begin(contactA, identical);
        check(retriedA != null && retriedA.revision != reopenedA.revision,
                "manual retry has a distinct ticket from reopened A save");
        check(!editor.succeeded(firstA, contactA, identical),
                "pre-lock A success still cannot acknowledge explicit retry");
        check(editor.succeeded(retriedA, contactA, identical),
                "newest explicit retry alone can confirm local success");
        check(!editor.succeeded(retriedA, contactA, identical),
                "duplicate success cannot reacknowledge retry");
        check(!editor.isDirty() && !editor.isAwaiting() && !editor.hadFailure(),
                "successful retry leaves clean local draft status");
        check(DraftStatusText.describe(identical, true, false,
                editor.hadFailure(), editor.isDirty()).label.contains("Saved locally"),
                "only final acknowledged retry permits saved-local label");
    }

    public static void main(String[] args) {
        switchedThenLockedRetryRegression();
        System.out.println("DraftInterleavedLifecycle: " + assertions
                + " offline assertions passed; no persistence or network");
    }
}
