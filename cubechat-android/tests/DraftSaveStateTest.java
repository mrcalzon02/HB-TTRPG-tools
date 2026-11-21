package org.cubechat.android;

/**
 * Offline acknowledgement-order tests. No database, Android APIs,
 * network traffic, real messages, or credential material.
 */
public final class DraftSaveStateTest {
    private static int assertions;
    private static void check(boolean result, String reason) {
        assertions++;
        if (!result) throw new AssertionError(reason);
    }

    /** Delayed old vault results must not confirm a reopened identical edit or retry. */
    private static void reopenSameContactRegression() {
        final long contact = 17L;
        final String sameText = "synthetic draft";
        DraftSaveState editor = new DraftSaveState();
        editor.edited();
        DraftSaveState.Ticket old = editor.begin(contact, sameText);
        check(old != null && editor.isAwaiting(), "original vault write queued");

        editor.reset(); // close conversation before original callback arrives
        check(!editor.isCurrent(old, contact, sameText), "closing invalidates old ticket");
        editor.edited(); // reopen the identical contact, retype identical text
        check(editor.isDirty(), "reopened edit is dirty before new write");
        check(!editor.succeeded(old, contact, sameText),
                "old success cannot confirm reopened identical text while dirty");
        check(editor.isDirty() && !editor.isAwaiting(),
                "stale success cannot remove reopened pending work");

        DraftSaveState.Ticket reopened = editor.begin(contact, sameText);
        check(reopened != null && reopened.revision != old.revision,
                "reopened ticket has distinct generation despite identical contact/text");
        check(editor.isAwaiting() && !editor.isDirty(), "new vault write remains pending");
        check(!editor.succeeded(old, contact, sameText),
                "old success cannot acknowledge newer in-flight save");
        check(!editor.failed(old, contact, sameText, "synthetic failure"),
                "old failure cannot make newer in-flight save retryable");
        check(editor.isAwaiting() && !editor.isDirty() && !editor.hadFailure(),
                "both stale callback outcomes leave current pending state unchanged");
        check(editor.isCurrent(reopened, contact, sameText),
                "reopened ticket remains the sole current acknowledgement");
        check(editor.succeeded(reopened, contact, sameText),
                "new save acknowledgement is accepted once");
        check(!editor.succeeded(reopened, contact, sameText),
                "duplicate new success is ignored");
        check(!editor.isDirty() && !editor.isAwaiting() && !editor.hadFailure(),
                "new successful save leaves clean editor");

        editor.edited();
        DraftSaveState.Ticket priorFailure = editor.begin(contact, sameText);
        editor.reset();
        editor.edited();
        DraftSaveState.Ticket newFailure = editor.begin(contact, sameText);
        check(newFailure != null && newFailure.revision != priorFailure.revision,
                "second reopen also creates distinct ticket");
        check(!editor.failed(priorFailure, contact, sameText, "old failure"),
                "old failure is ignored even if latest write will fail");
        check(editor.failed(newFailure, contact, sameText, "new failure"),
                "only current failure restores manual retry");
        check(editor.isDirty() && editor.hadFailure() && !editor.isAwaiting(),
                "current failure stays visibly retryable");
        check(!editor.succeeded(priorFailure, contact, sameText),
                "late old success cannot clear retry state");
        check(editor.isDirty() && editor.hadFailure(),
                "stale success leaves retry warning intact");
        DraftSaveState.Ticket retried = editor.begin(contact, sameText);
        check(retried != null && editor.isAwaiting(), "retry queues current draft");
        check(!editor.succeeded(newFailure, contact, sameText),
                "failed prior ticket cannot acknowledge new retry");
        check(editor.succeeded(retried, contact, sameText), "retried write confirms once");
        check(!editor.isDirty() && !editor.isAwaiting() && !editor.hadFailure(),
                "successful retry clears failure status");

    }

    public static void main(String[] args) {
        DraftSaveState editor = new DraftSaveState();
        check(!editor.isDirty(), "fresh editor is clean");
        check(!editor.isAwaiting() && !editor.hadFailure(),
                "new editor has no pending or failed write");
        check(editor.begin(1, "hello") == null, "clean draft not resent");
        editor.edited();
        check(editor.isDirty(), "typing marks editor dirty");
        DraftSaveState.Ticket first = editor.begin(7, "hello");
        check(first != null && first.contactId == 7 && first.text.equals("hello"),
                "ticket binds exact contact and snapshot");
        check(!editor.isDirty(), "queued write is awaiting acknowledgement");
        check(editor.isAwaiting(), "queued write is not yet confirmed");
        check(editor.isCurrent(first, 7, "hello"), "successful callback belongs to current edit");
        check(!editor.isCurrent(first, 9, "hello"), "success cannot cross contacts");
        check(!editor.failed(first, 7, "hello", null), "successful acknowledgement is not failure");
        check(editor.succeeded(first, 7, "hello"), "exact acknowledgement can confirm this write");
        check(!editor.isAwaiting(), "acknowledged save no longer pending");
        check(!editor.succeeded(first, 7, "hello"), "duplicate success does not re-confirm save");
        check(!editor.isDirty(), "successful write keeps editor clean");
        check(editor.begin(7, "hello") == null, "unchanged draft not resent automatically");

        editor.edited();
        DraftSaveState.Ticket failure = editor.begin(7, "offline");
        check(editor.failed(failure, 7, "offline", "Vault locked"),
                "failed current write is retryable");
        check(editor.hadFailure(), "failed current write has visible retry status");
        check(!editor.isAwaiting(), "failed request is not awaiting acknowledgement");
        check(!editor.failed(failure, 7, "offline", "duplicate"),
                "duplicate failure is not reported again");
        check(editor.isDirty(), "failed current write restores pending save");
        DraftSaveState.Ticket retry = editor.begin(7, "offline");
        check(retry != null, "recovery retries the original draft");
        check(!editor.hadFailure(), "new retry hides old failure while checking");
        check(editor.isAwaiting(), "retry pending until transaction acknowledgement");
        check(!editor.failed(retry, 7, "offline", null), "retry succeeds");
        check(editor.succeeded(retry, 7, "offline"), "retry success acknowledged");
        check(!editor.isDirty(), "success clears pending flag");

        editor.edited();
        DraftSaveState.Ticket old = editor.begin(7, "same words");
        editor.edited();
        check(!editor.failed(old, 7, "same words", "Old failure"),
                "old edit cannot invalidate identical new text");
        check(!editor.isCurrent(old, 7, "same words"),
                "old successful acknowledgement also cannot validate a new same-text edit");
        check(!editor.succeeded(old, 7, "same words"),
                "stale success cannot mark identical new text as locally saved");
        check(editor.isDirty(), "new same-text edit remains dirty");
        DraftSaveState.Ticket current = editor.begin(7, "same words");
        check(current != null && current.revision != old.revision,
                "edit revision distinguishes identical strings");
        check(editor.failed(current, 7, "same words", "Newest failure"),
                "current same-text failure restored to dirty");
        check(editor.isDirty(), "current failure remains retryable");

        editor.edited();
        DraftSaveState.Ticket previous = editor.begin(7, "draft A");
        editor.edited();
        check(!editor.failed(previous, 7, "draft B", "stale failure"),
                "old acknowledgement cannot change newer draft B state");
        check(editor.isDirty(), "new draft B pending");
        DraftSaveState.Ticket b = editor.begin(7, "draft B");
        check(!editor.failed(b, 8, "draft B", "stale contact"),
                "failure cannot affect a different conversation");
        check(!editor.isDirty(), "different contact failure ignored");

        editor.retry();
        DraftSaveState.Ticket pending = editor.begin(7, "switching");
        editor.reset();
        check(!editor.isCurrent(pending, 7, "switching"),
                "profile lock invalidates old successful acknowledgements");
        check(!editor.failed(pending, 7, "switching", "locked"),
                "profile lock discards stale reply");
        check(!editor.isDirty(), "locked view does not retain dirty state");
        check(!editor.isAwaiting() && !editor.hadFailure(),
                "locked view discards all local status flags");

        editor.retry();
        DraftSaveState.Ticket newRequest = editor.begin(9, "");
        check(newRequest != null, "clearing a draft is a legitimate save");
        check(!editor.failed(newRequest, 9, "new text", "changed"),
                "failure for different current text ignored");
        check(!editor.isDirty(), "stale callback does not request old save");

        editor.retry();
        check(editor.isDirty(), "explicit retry requests a save");
        check(editor.begin(0, "invalid") == null, "unselected contact never gets a save");
        check(editor.isDirty(), "invalid contact does not erase pending state");
        check(editor.begin(-1, "invalid") == null, "negative contact never saved");
        check(editor.begin(9, null) == null, "null draft cannot start a save");
        check(editor.isDirty(), "invalid saves are still pending");
        DraftSaveState.Ticket end = editor.begin(9, "new");
        check(end != null, "valid retry starts after invalid calls");
        check(!editor.failed(null, 9, "new", "bad"), "null callback ticket ignored");
        check(!editor.failed(end, 9, "new", null), "null error ignored");
        check(editor.failed(end, 9, "new", "disk unavailable"),
                "valid failure remains retryable");
        check(editor.hadFailure() && editor.isDirty(),
                "failed final save remains explicitly retryable");
        reopenSameContactRegression();
        System.out.println("DraftSaveState: " + assertions
                + " offline assertions passed; no persistence or network");
    }
}
