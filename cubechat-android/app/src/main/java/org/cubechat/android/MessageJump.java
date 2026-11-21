package org.cubechat.android;

import java.util.List;
import java.util.Objects;
import java.util.function.BiPredicate;

/**
 * Resolves a search hit after the conversation may have refreshed.
 * Never silently jumps to an arbitrary duplicate with identical text/time.
 */
final class MessageJump {
    private MessageJump() { }

    static <T> int locate(List<T> searched, int originalIndex, List<T> visible,
                          BiPredicate<T, T> sameContent) {
        Objects.requireNonNull(searched, "searched");
        Objects.requireNonNull(visible, "visible");
        Objects.requireNonNull(sameContent, "comparator");
        if (originalIndex < 0 || originalIndex >= searched.size()) return -1;
        T chosen = searched.get(originalIndex);
        if (searched == visible && originalIndex < visible.size()
                && visible.get(originalIndex) == chosen)
            return originalIndex;

        // If a refreshed list contains the same object, prefer that exact
        // message over a look-alike, even if its position changed.
        for (int i = 0; i < visible.size(); i++)
            if (visible.get(i) == chosen) return i;

        // A single look-alike in the refreshed list is not enough when
        // the searched snapshot contained two distinct equal messages:
        // the surviving match could belong to the other old message.
        for (int i = 0; i < searched.size(); i++) {
            T other = searched.get(i);
            if (other != chosen && sameContent.test(chosen, other)) return -1;
        }

        // After a reload, content alone cannot distinguish duplicated
        // messages. Jump only if the candidate is unambiguous.
        int candidate = -1;
        for (int i = 0; i < visible.size(); i++) {
            if (!sameContent.test(chosen, visible.get(i))) continue;
            if (candidate >= 0) return -1;
            candidate = i;
        }
        return candidate;
    }
}
