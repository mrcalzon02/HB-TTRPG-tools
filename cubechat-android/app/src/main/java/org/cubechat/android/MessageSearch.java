package org.cubechat.android;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Local, read-only search of an already-loaded conversation snapshot.
 * No database query, persistence, analytics, network request, or search log.
 * Result indices refer only to the input snapshot in newest-first order.
 */
final class MessageSearch {
    static final int DISPLAY_LIMIT = 60;
    static final int EXCERPT_CODEPOINTS = 150;

    enum Sender { ALL, YOU, PEER }

    static final class Entry {
        final String text;
        final boolean outgoing;

        Entry(String text, boolean outgoing) {
            this.text = Objects.requireNonNull(text, "message");
            this.outgoing = outgoing;
        }
    }

    static final class Hit {
        final int index;
        final String excerpt;

        Hit(int index, String excerpt) {
            this.index = index;
            this.excerpt = excerpt;
        }
    }

    static final class Result {
        final List<Hit> shown;
        final int matches;
        final int inspected;

        Result(List<Hit> shown, int matches, int inspected) {
            this.shown = Collections.unmodifiableList(shown);
            this.matches = matches;
            this.inspected = inspected;
        }
    }

    private MessageSearch() { }

    static Result find(List<Entry> messages, String query, Sender sender) {
        Objects.requireNonNull(messages, "messages");
        Objects.requireNonNull(sender, "sender");
        String needle = query == null ? "" : query.trim();
        if (needle.isEmpty()) return new Result(new ArrayList<>(), 0, messages.size());

        // Quoting is important: punctuation in chat messages must be searched
        // literally, never interpreted as a regular expression.
        Pattern pattern = Pattern.compile(Pattern.quote(needle),
                Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        ArrayList<Hit> shown = new ArrayList<>();
        int matches = 0;
        for (int i = messages.size() - 1; i >= 0; i--) {
            Entry message = messages.get(i);
            if (message == null || !senderAccepts(sender, message.outgoing)) continue;
            Matcher match = pattern.matcher(message.text);
            if (!match.find()) continue;
            matches++;
            if (shown.size() < DISPLAY_LIMIT)
                shown.add(new Hit(i, excerpt(message.text, match.start())));
        }
        return new Result(shown, matches, messages.size());
    }

    private static boolean senderAccepts(Sender sender, boolean outgoing) {
        switch (sender) {
            case ALL: return true;
            case YOU: return outgoing;
            case PEER: return !outgoing;
            default: return false;
        }
    }

    private static String excerpt(String message, int matchOffset) {
        int matchPoint = message.codePointCount(0, matchOffset);
        int length = message.codePointCount(0, message.length());
        int startPoint = Math.max(0, matchPoint - 36);
        int endPoint = Math.min(length, startPoint + EXCERPT_CODEPOINTS);
        int start = message.offsetByCodePoints(0, startPoint);
        int end = message.offsetByCodePoints(0, endPoint);

        // Keep the matching phrase visible. Never split a surrogate pair or
        // render embedded newlines as additional result rows.
        StringBuilder preview = new StringBuilder(end - start + 2);
        if (startPoint > 0) preview.append('…');
        boolean space = false;
        for (int offset = start; offset < end;) {
            int cp = message.codePointAt(offset);
            offset += Character.charCount(cp);
            if (Character.isWhitespace(cp) || Character.isISOControl(cp)
                    || cp == 0x2028 || cp == 0x2029) {
                if (!space && preview.length() > 0) {
                    preview.append(' ');
                    space = true;
                }
            } else {
                preview.appendCodePoint(cp);
                space = false;
            }
        }
        if (endPoint < length) preview.append('…');
        return preview.toString();
    }
}
