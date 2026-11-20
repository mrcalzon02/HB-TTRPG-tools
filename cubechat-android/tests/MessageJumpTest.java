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
        check(jump(original, 2, List.of()) == -1,
                "cleared conversation never jumps to old data");

        System.out.println("MessageJump: " + checks
                + " offline navigation assertions passed");
    }
}
