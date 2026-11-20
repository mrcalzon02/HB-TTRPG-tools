package org.cubechat.android;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * Read-only, in-memory conversation chooser presentation.
 * Does not change SQLite ordering, selected contact, message data or drafts.
 */
final class ConversationPickerModel {
    static final class Entry {
        final long id;
        final String name;
        final int queued;

        Entry(long id, String name, int queued) {
            if (id <= 0) throw new IllegalArgumentException("Invalid contact identity");
            this.id = id;
            this.name = Objects.requireNonNull(name, "contact name");
            this.queued = Math.max(0, queued);
        }
    }

    private ConversationPickerModel() { }

    /**
     * Selected contact first. Other queued conversations next (largest queue
     * first). Remaining contacts alphabetically, with stable ID tie-breaking.
     * Search and queued-only filters never modify the original list.
     */
    static List<Entry> choose(List<Entry> contacts, long selectedId,
                              String search, boolean queuedOnly) {
        Objects.requireNonNull(contacts, "contacts");
        String needle = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        ArrayList<Entry> result = new ArrayList<>();
        for (Entry item : contacts) {
            if (item == null) continue;
            if (queuedOnly && item.queued == 0) continue;
            if (!item.name.toLowerCase(Locale.ROOT).contains(needle)) continue;
            result.add(item);
        }
        result.sort(Comparator
                .comparingInt((Entry c) -> c.id == selectedId ? 0 : c.queued > 0 ? 1 : 2)
                .thenComparing((Entry left, Entry right) -> Integer.compare(right.queued, left.queued))
                .thenComparing(c -> c.name.toLowerCase(Locale.ROOT))
                .thenComparingLong(c -> c.id));
        return Collections.unmodifiableList(result);
    }

    static int queuedConversations(List<Entry> contacts) {
        Objects.requireNonNull(contacts, "contacts");
        int count = 0;
        for (Entry item : contacts) if (item != null && item.queued > 0) count++;
        return count;
    }
}
