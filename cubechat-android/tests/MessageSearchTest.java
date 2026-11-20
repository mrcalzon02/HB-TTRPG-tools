package org.cubechat.android;

import java.util.ArrayList;
import java.util.List;

/** No files, keys, database, Android service, or network used in these fixtures. */
public final class MessageSearchTest {
    private static int checks;

    private static void check(boolean condition, String description) {
        checks++;
        if (!condition) throw new AssertionError(description);
    }

    private static MessageSearch.Entry in(String text) {
        return new MessageSearch.Entry(text, false);
    }

    private static MessageSearch.Entry out(String text) {
        return new MessageSearch.Entry(text, true);
    }

    public static void main(String[] args) {
        List<MessageSearch.Entry> conversation = List.of(
                in("Old message about the station."),
                out("I asked about the blue keycard."),
                in("The blue keycard was left near the station."),
                out("The blue keycard is in my pocket."));
        MessageSearch.Result all = MessageSearch.find(
                conversation, "BLUE KEYCARD", MessageSearch.Sender.ALL);
        check(all.matches == 3, "case-insensitive search matches all senders");
        check(all.shown.size() == 3, "all three matches visible");
        check(all.shown.get(0).index == 3, "most recent matching message first");
        check(all.shown.get(2).index == 1, "index points to original snapshot");
        check(all.inspected == 4, "scanned-count is honest");

        MessageSearch.Result you = MessageSearch.find(
                conversation, "blue", MessageSearch.Sender.YOU);
        check(you.matches == 2 && you.shown.get(0).index == 3,
                "you filter accepts outgoing only");
        MessageSearch.Result peer = MessageSearch.find(
                conversation, "blue", MessageSearch.Sender.PEER);
        check(peer.matches == 1 && peer.shown.get(0).index == 2,
                "peer filter accepts incoming only");
        check(MessageSearch.find(conversation, "", MessageSearch.Sender.ALL).matches == 0,
                "blank query never dumps private chat history");
        check(MessageSearch.find(conversation, "   ", MessageSearch.Sender.ALL)
                .shown.isEmpty(), "whitespace query is empty");
        check(MessageSearch.find(conversation, null, MessageSearch.Sender.ALL)
                .shown.isEmpty(), "null query handled");
        check(MessageSearch.find(conversation, "unrelated", MessageSearch.Sender.ALL)
                .matches == 0, "no false positive");

        String longPrefix = "🐟".repeat(160);
        String veryLong = longPrefix + "\n\nImportant KEYWORD lives in the middle\n"
                + "🦀".repeat(180);
        MessageSearch.Result deep = MessageSearch.find(
                List.of(in(veryLong)), "keyword", MessageSearch.Sender.ALL);
        String excerpt = deep.shown.get(0).excerpt;
        check(excerpt.contains("KEYWORD"), "deep hit visible in excerpt");
        check(!excerpt.contains("\n"), "multi-line result condensed");
        check(excerpt.startsWith("…"), "long prefix shown as truncated");
        check(excerpt.endsWith("…"), "long suffix shown as truncated");
        check(excerpt.codePointCount(0, excerpt.length())
                <= MessageSearch.EXCERPT_CODEPOINTS + 2, "snippet length bounded");
        check(!Character.isHighSurrogate(excerpt.charAt(excerpt.length() - 2)),
                "never split high surrogate at truncation");

        List<MessageSearch.Entry> special = List.of(
                out("The bracket [a+b] is literal, not regex."),
                in("No match for your pattern here."));
        MessageSearch.Result punctuation = MessageSearch.find(
                special, "[a+b]", MessageSearch.Sender.ALL);
        check(punctuation.matches == 1, "regex punctuation searched literally");
        check(punctuation.shown.get(0).index == 0, "literal match index");
        check(MessageSearch.find(List.of(in("Ñandú")), "ñANDÚ",
                MessageSearch.Sender.ALL).matches == 1, "Unicode case-insensitive search");

        ArrayList<MessageSearch.Entry> many = new ArrayList<>();
        for (int i = 0; i < 200; i++)
            many.add(out("Message " + i + " has the search word"));
        MessageSearch.Result capped = MessageSearch.find(
                many, "search", MessageSearch.Sender.ALL);
        check(capped.matches == 200, "count every match even when list is capped");
        check(capped.shown.size() == MessageSearch.DISPLAY_LIMIT,
                "capped list avoids rendering hundreds of rows");
        check(capped.shown.get(0).index == 199, "newest result first under cap");
        check(capped.shown.get(capped.shown.size() - 1).index == 140,
                "last shown index corresponds to newest 60");
        try {
            capped.shown.clear();
            throw new AssertionError("Mutable search result");
        } catch (UnsupportedOperationException expected) {
            check(true, "search results are immutable");
        }

        check(MessageSearch.find(List.of(in("🙂🙂Needle🙂🙂")), "needle",
                MessageSearch.Sender.ALL).shown.get(0).excerpt.contains("Needle"),
                "supplementary Unicode preserved");
        check(MessageSearch.find(List.of(in("a\tb\nc\rd")), "b",
                MessageSearch.Sender.ALL).shown.get(0).excerpt.equals("a b c d"),
                "control whitespace reduced to one display line");
        check(MessageSearch.find(List.of(in(" A ")), "a",
                MessageSearch.Sender.ALL).matches == 1,
                "simple text searchable without persisted query");

        System.out.println("MessageSearch: " + checks
                + " offline assertions passed (no external state or networking)");
    }
}
