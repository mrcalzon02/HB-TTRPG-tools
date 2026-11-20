package org.cubechat.android;

/** Pure-Java synthetic composer status tests. No Android or user data. */
public final class DraftStatusTextTest {
    private static int checks;

    private static void check(boolean condition, String why) {
        checks++;
        if (!condition) throw new AssertionError(why);
    }

    private static DraftStatusText.Summary describe(String text, boolean selected,
                                                     boolean saving, boolean failed,
                                                     boolean dirty) {
        return DraftStatusText.describe(text, selected, saving, failed, dirty);
    }

    public static void main(String[] args) {
        DraftStatusText.Summary blank = describe("", true, false, false, false);
        check(blank.bytes == 0, "blank message is zero bytes");
        check(!blank.visible, "blank clean composer hides status");
        check(!blank.sendable, "blank composer cannot send");
        DraftStatusText.Summary unpaired = describe("Hello", false, false, false, false);
        check(!unpaired.visible, "unpaired composer hides draft status");
        check(!unpaired.sendable, "unpaired composer cannot send");
        check(describe(null, false, false, false, false).bytes == 0,
                "null text safely treated as empty");

        DraftStatusText.Summary edited = describe("Draft", true, false, false, true);
        check(edited.visible && edited.sendable, "edited current draft remains sendable");
        check(edited.label.contains("Unsaved changes"), "new edit is not called saved");
        DraftStatusText.Summary saving = describe("Draft", true, true, false, false);
        check(saving.label.contains("Saving locally"), "queued DB write has pending label");
        check(!saving.label.contains("Saved locally"), "pending is not confirmed");
        DraftStatusText.Summary saved = describe("Draft", true, false, false, false);
        check(saved.label.contains("Saved locally"), "acknowledged or loaded local draft");
        check(saved.sendable, "saving status never blocks sending");

        DraftStatusText.Summary failure = describe("Draft", true, false, true, true);
        check(failure.label.contains("Draft not saved"), "failed transaction clearly labeled");
        check(failure.problem, "failure uses warning style");
        check(failure.sendable, "failed draft can still be sent to outbox");
        check(describe("", true, false, true, true).visible,
                "failed clear-draft operation remains visible");

        DraftStatusText.Summary longText = describe("A".repeat(4096), true,
                false, false, false);
        check(longText.bytes == 4096, "exact byte limit allowed");
        check(longText.sendable && !longText.problem, "limit boundary accepted");
        DraftStatusText.Summary tooLong = describe("A".repeat(4097), true,
                false, false, false);
        check(tooLong.bytes == 4097, "one byte over limit");
        check(!tooLong.sendable && tooLong.problem, "overlong draft rejected without truncation");
        check(tooLong.label.contains("Message too long"), "over-limit status explicit");

        DraftStatusText.Summary emoji = describe("🐟".repeat(1024), true,
                false, false, false);
        check(emoji.bytes == 4096 && emoji.sendable,
                "surrogate pairs count as four UTF-8 bytes");
        DraftStatusText.Summary overEmoji = describe("🐟".repeat(1025), true,
                false, false, false);
        check(overEmoji.bytes == 4100 && !overEmoji.sendable,
                "emoji overflow correctly rejected");
        check(!describe(" \t \n ", true, false, false, false).sendable,
                "whitespace-only draft cannot be sent");
        check(describe("A", true, true, true, true).label.contains("Draft not saved"),
                "failed state overrides pending state");
        check(describe("A".repeat(4097), true, true, true, true)
                .label.contains("Message too long"),
                "length violation overrides all save-status labels");
        check(describe("A", true, false, false, false).label.contains("1 / 4096 bytes"),
                "compact label includes exact UTF-8 byte count");
        check(describe("A".repeat(2800), true, false, false, false).bytes == 2800,
                "long valid draft does not lose bytes");
        System.out.println("DraftStatusText: " + checks
                + " offline formatting assertions passed; no app or network actions");
    }
}
