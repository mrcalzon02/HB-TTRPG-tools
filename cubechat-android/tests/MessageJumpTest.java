package org.cubechat.android;

import java.util.ArrayList;
import java.util.List;

/** Pure host test; message identity and ambiguity, no Android state. */
public final class MessageJumpTest {
    private static int checks;
    private static void check(boolean actual, String why) {
        checks++;
        if (!actual) throw new AssertionError(why);
    }

    private static final class Message {
        final String content;
        Message(String content) { this.content = content; }
    }

    private static int jump(List<Message> old, int selected, List<Message> now) {
        return MessageJump.locate(old, selected, now,
                (a, b) -> a != null && b != null && a.content.equals(b.content));
    }

    private static final class StoredMessage {
        final long rowId;
        final String content;
        final long time;
        StoredMessage(long rowId, String content, long time) {
            this.rowId = rowId; this.content = content; this.time = time;
        }
    }

    private static int jumpStored(List<StoredMessage> old, int selected,
                                  List<StoredMessage> now) {
        return MessageJump.locateById(old, selected, now,
                message -> message.rowId);
    }

    public static void main(String[] args) {
        Message a = new Message("repeated");
        Message b = new Message("repeated");
        Message c = new Message("unique");
        List<Message> original = new ArrayList<>(List.of(a, b, c));
        check(jump(original, 1, original) == 1,
                "same list selects exact duplicate by index");
        check(jump(original, 0, original) == 0, "first duplicate selected exactly");
        check(jump(original, 2, original) == 2, "unique index selected exactly");
        check(jump(original, -1, original) == -1, "negative index rejected");
        check(jump(original, 3, original) == -1, "out-of-range index rejected");

        List<Message> newList = List.of(new Message("new"), b, a, c);
        check(jump(original, 1, newList) == 1,
                "same message object located after insertion");
        check(jump(original, 0, newList) == 2,
                "identity avoids accidental matching same-text message");
        check(jump(original, 2, newList) == 3,
                "newer messages do not change target identity");

        List<Message> reload = List.of(new Message("new"), new Message("unique"));
        check(jump(original, 2, reload) == 1,
                "single equivalent message accepted after object reload");
        check(jump(original, 0, reload) == -1,
                "removed message never invents a match");
        List<Message> ambiguous = List.of(
                new Message("repeated"), new Message("repeated"));
        check(jump(original, 0, ambiguous) == -1,
                "identical-looking messages after reload must not choose arbitrarily");
        check(jump(original, 1, ambiguous) == -1,
                "second duplicate also refused as ambiguous");
        // A refreshed conversation may contain just one surviving look-alike
        // even when the original search contained two distinct messages.
        // Its content cannot establish WHICH old message survived.
        List<Message> oneReplacement = List.of(new Message("repeated"));
        check(jump(original, 0, oneReplacement) == -1,
                "removed first duplicate cannot jump to sole replacement");
        check(jump(original, 1, oneReplacement) == -1,
                "removed second duplicate cannot jump to sole replacement");
        check(jump(original, 0, List.of(b)) == -1,
                "surviving other original duplicate is not selected identity");
        check(jump(original, 1, List.of(a)) == -1,
                "opposite surviving duplicate cannot substitute target");
        check(jump(original, 0, List.of(new Message("other"), b)) == -1,
                "unrelated insertion must not make other duplicate safe");
        check(jump(original, 1, List.of(new Message("other"), a)) == -1,
                "index shift does not make lost duplicate safe");
        check(jump(original, 1, List.of(b)) == 0,
                "exact selected duplicate remains safe after peer removal");
        check(jump(original, 0, List.of(new Message("other"), a)) == 1,
                "exact first duplicate remains safe after peer removal");
        check(jump(original, 2, List.of(new Message("unique"))) == 0,
                "unique old match still navigates to sole refreshed match");
        check(jump(List.of(a, c, b), 2, oneReplacement) == -1,
                "nonadjacent old duplicate still blocks fallback");
        // Two references to the same message object are not distinct messages.
        check(jump(List.of(a, a), 0, oneReplacement) == 0,
                "same original object referenced twice is not ambiguity");
        check(jump(original, 2, List.of(new Message("unique"), new Message("unique"))) == -1,
                "uniquely authored message still rejects two refreshed look-alikes");
        check(jump(original, 2, List.of()) == -1,
                "cleared conversation never jumps to old data");

        // Actual loaded-history boundary: after message 201, the oldest of
        // 200 disappears. A new message can have the same text and timestamp
        // as the evicted one, but it must never inherit its search result.
        ArrayList<StoredMessage> oldWindow = new ArrayList<>();
        oldWindow.add(new StoredMessage(1, "repeat", 123456));
        for (int i = 2; i <= 200; i++)
            oldWindow.add(new StoredMessage(i, "message-" + i, i));
        ArrayList<StoredMessage> newWindow = new ArrayList<>();
        for (int i = 1; i < oldWindow.size(); i++) {
            StoredMessage previous = oldWindow.get(i);
            newWindow.add(new StoredMessage(previous.rowId, previous.content, previous.time));
        }
        newWindow.add(new StoredMessage(201, "repeat", 123456));
        check(jumpStored(oldWindow, 0, newWindow) == -1,
                "evicted target must not jump to new identical timestamp/text row");
        check(jumpStored(oldWindow, 120, newWindow) == 119,
                "surviving middle target resolves after 200-message eviction");
        check(jumpStored(oldWindow, 199, newWindow) == 198,
                "surviving newest row resolves at new index");
        check(jumpStored(oldWindow, 0, List.of(
                new StoredMessage(1, "repeat", 123456))) == 0,
                "reloaded instance with same stored row ID remains selectable");
        check(jumpStored(oldWindow, 0, List.of(
                new StoredMessage(900, "repeat", 123456))) == -1,
                "single look-alike is not sufficient identity");
        check(jumpStored(oldWindow, 0, List.of(
                new StoredMessage(1, "repeat", 123456),
                new StoredMessage(1, "repeat", 123456))) == -1,
                "duplicate row IDs in a broken refresh fail closed");
        check(jumpStored(oldWindow, 0, List.of()) == -1,
                "cleared history cannot jump to evicted target");
        check(jumpStored(List.of(new StoredMessage(0, "unknown", 0)), 0,
                List.of(new StoredMessage(0, "unknown", 0))) == -1,
                "missing database row identity fails closed");
        check(jumpStored(oldWindow, -1, newWindow) == -1,
                "invalid search result index fails closed");
        check(jumpStored(oldWindow, 200, newWindow) == -1,
                "out-of-range snapshot index fails closed");
        check(jumpStored(oldWindow, 120, List.of(
                new StoredMessage(121, "edited display flag", 121))) == 0,
                "same persisted row stays selected after display metadata changes");

        System.out.println("MessageJump: " + checks
                + " offline navigation assertions passed");
    }
}
