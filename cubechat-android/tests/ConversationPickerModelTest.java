package org.cubechat.android;

import java.util.ArrayList;
import java.util.List;

/** Only synthetic contact labels. No Android, vault, network or user data. */
public final class ConversationPickerModelTest {
    private static int assertions;

    private static void check(boolean condition, String description) {
        assertions++;
        if (!condition) throw new AssertionError(description);
    }

    private static void ids(List<ConversationPickerModel.Entry> actual, long... expected) {
        check(actual.size() == expected.length, "result count");
        for (int i = 0; i < expected.length; i++)
            check(actual.get(i).id == expected[i], "contact position " + i);
    }

    public static void main(String[] args) {
        List<ConversationPickerModel.Entry> original = List.of(
                new ConversationPickerModel.Entry(9, "Zebra", 0),
                new ConversationPickerModel.Entry(3, "Álpha", 2),
                new ConversationPickerModel.Entry(10, "Bravo", 3),
                new ConversationPickerModel.Entry(4, "charlie", 0),
                new ConversationPickerModel.Entry(1, "active", 0),
                new ConversationPickerModel.Entry(12, "Bravo", 3));
        List<ConversationPickerModel.Entry> originalCopy = new ArrayList<>(original);

        ids(ConversationPickerModel.choose(original, 1, "", false), 1, 10, 12, 3, 4, 9);
        check(original.equals(originalCopy), "source contacts remain unmodified");
        ids(ConversationPickerModel.choose(original, 10, null, false), 10, 12, 3, 1, 4, 9);
        ids(ConversationPickerModel.choose(original, 1, "", true), 10, 12, 3);
        ids(ConversationPickerModel.choose(original, 3, "", true), 3, 10, 12);
        ids(ConversationPickerModel.choose(original, 1, "bravO", false), 10, 12);
        ids(ConversationPickerModel.choose(original, 1, "   BRAVO  ", false), 10, 12);
        ids(ConversationPickerModel.choose(original, 1, "missing", false));
        check(ConversationPickerModel.queuedConversations(original) == 3,
                "accurate queued conversation count");
        check(ConversationPickerModel.choose(original, 1, null, false).get(0).id == 1,
                "null search behaves as an empty search");
        check(ConversationPickerModel.choose(original, -1, "", false).get(0).id == 10,
                "invalid selected id does not invent active contact");
        check(ConversationPickerModel.choose(original, 4, "char", true).isEmpty(),
                "queued-only excludes filtered unqueued contact");
        check(ConversationPickerModel.choose(original, 4, "CHAR", false).get(0).id == 4,
                "Unicode-safe ROOT case folding for names");
        try {
            ConversationPickerModel.choose(original, 1, "", false).clear();
            throw new AssertionError("Result modified");
        } catch (UnsupportedOperationException expected) {
            check(true, "results unmodifiable");
        }

        List<ConversationPickerModel.Entry> unsorted = List.of(
                new ConversationPickerModel.Entry(80, "something", -4),
                new ConversationPickerModel.Entry(2, "Something", Integer.MAX_VALUE));
        ids(ConversationPickerModel.choose(unsorted, 0, "", false), 2, 80);
        check(unsorted.get(0).queued == 0, "negative queued count clamped");
        check(ConversationPickerModel.queuedConversations(unsorted) == 1,
                "queue statistics ignore invalid negative values");
        check(ConversationPickerModel.choose(List.of(), 0, "", false).isEmpty(),
                "empty mailbox remains empty");
        try {
            new ConversationPickerModel.Entry(0, "invalid", 1);
            throw new AssertionError("Invalid contact id accepted");
        } catch (IllegalArgumentException expected) {
            check(true, "invalid IDs rejected");
        }
        System.out.println("ConversationPickerModel: " + assertions
                + " host-only assertions passed; no Android state touched");
    }
}
