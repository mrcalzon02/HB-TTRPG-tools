package org.cubechat.android;

import java.util.ArrayList;
import java.util.Collections;
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

    /**
     * Real picker model only: stable IDs, snapshot counts and filter permutations.
     * In particular, equal-name/equal-queue contacts arrive in the wrong ID
     * order, so comparator stability alone cannot conceal a missing ID tie-break.
     */
    private static void snapshotPermutations() {
        ConversationPickerModel.Entry selected = new ConversationPickerModel.Entry(101, "ECHO", 0);
        ConversationPickerModel.Entry queuedEight = new ConversationPickerModel.Entry(8, "echo", 2);
        ConversationPickerModel.Entry queuedSeven = new ConversationPickerModel.Entry(7, "Echo", 2);
        ConversationPickerModel.Entry busy = new ConversationPickerModel.Entry(42, "Zulu", Integer.MAX_VALUE);
        ConversationPickerModel.Entry malformed = new ConversationPickerModel.Entry(9, "Unqueued", -5);
        ConversationPickerModel.Entry sameName = new ConversationPickerModel.Entry(3, "Echo", 0);
        List<ConversationPickerModel.Entry> incoming = new ArrayList<>(List.of(
                selected, malformed, queuedEight, busy, sameName, queuedSeven));
        List<ConversationPickerModel.Entry> savedOrder = new ArrayList<>(incoming);

        ids(ConversationPickerModel.choose(incoming, 101, "", false), 101, 42, 7, 8, 3, 9);
        ids(ConversationPickerModel.choose(incoming, 7, "", false), 7, 42, 8, 3, 101, 9);
        ids(ConversationPickerModel.choose(incoming, 3, "", true), 42, 7, 8);
        ids(ConversationPickerModel.choose(incoming, 101, "ECHO", false), 101, 7, 8, 3);
        ids(ConversationPickerModel.choose(incoming, 3, "echo", false), 3, 7, 8, 101);
        ids(ConversationPickerModel.choose(incoming, 101, "echo", true), 7, 8);
        ids(ConversationPickerModel.choose(incoming, 101, "   zulu ", true), 42);
        check(incoming.equals(savedOrder), "all picker/filter invocations preserve source ordering");
        check(ConversationPickerModel.queuedConversations(incoming) == 3,
                "total queued conversations independent of search or active selection");
        check(ConversationPickerModel.choose(incoming, 101, "echo", false).size() == 4,
                "visible count tracks search independently of total count");
        check(ConversationPickerModel.queuedConversations(
                ConversationPickerModel.choose(incoming, 101, "echo", false)) == 2,
                "visible queued count differs from total queued count");
        check(ConversationPickerModel.choose(incoming, 101, "echo", true).size() == 2,
                "queued-only search intersection count");
        check(malformed.queued == 0, "malformed negative queue normalized without changing ID");
        check(ConversationPickerModel.choose(incoming, 101, "", false).get(0) == selected,
                "selected entry retains source identity");

        Collections.reverse(incoming);
        ids(ConversationPickerModel.choose(incoming, 101, "", false), 101, 42, 7, 8, 3, 9);
        ids(ConversationPickerModel.choose(incoming, 101, "echo", true), 7, 8);
        check(ConversationPickerModel.queuedConversations(incoming) == 3,
                "queue count independent of input permutation");
        check(incoming.get(0) == queuedSeven && incoming.get(5) == selected,
                "reversed snapshot was not reordered by chooser");

        // A freshly loaded snapshot can change message counts without changing IDs.
        List<ConversationPickerModel.Entry> refreshed = List.of(
                new ConversationPickerModel.Entry(8, "echo", 1),
                new ConversationPickerModel.Entry(7, "Echo", 0),
                new ConversationPickerModel.Entry(101, "ECHO", 2));
        ids(ConversationPickerModel.choose(refreshed, 7, "", false), 7, 101, 8);
        ids(ConversationPickerModel.choose(refreshed, 7, "echo", true), 101, 8);
        check(ConversationPickerModel.queuedConversations(refreshed) == 2,
                "refreshed queued count uses refreshed values, not previous snapshot");
        check(ConversationPickerModel.queuedConversations(incoming) == 3,
                "old snapshot is left intact after refresh");

        ArrayList<ConversationPickerModel.Entry> withNull = new ArrayList<>(incoming);
        withNull.add(null);
        ids(ConversationPickerModel.choose(withNull, 0, "echo", true), 7, 8);
        check(ConversationPickerModel.queuedConversations(withNull) == 3,
                "missing contact entry does not inflate total queued count");
        check(withNull.size() == 7 && withNull.get(6) == null,
                "null entry remains in caller snapshot");
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
        snapshotPermutations();
        System.out.println("ConversationPickerModel: " + assertions
                + " host-only assertions passed; no Android state touched");
    }
}
