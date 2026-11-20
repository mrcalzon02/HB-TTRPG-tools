package org.cubechat.android;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.List;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

/**
 * API 26/35 regression for the contact chooser's pure ordering and filtering.
 * No database, profile enrollment, networking or Android permission change.
 */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = {26, 35})
public final class ConversationPickerAndroidTest {
    @Test public void currentThenQueuedThenNames() {
        List<ConversationPickerModel.Entry> items = List.of(
                new ConversationPickerModel.Entry(12, "Zeta", 0),
                new ConversationPickerModel.Entry(3, "Second queued", 2),
                new ConversationPickerModel.Entry(1, "Current", 0),
                new ConversationPickerModel.Entry(9, "First queued", 5));
        List<ConversationPickerModel.Entry> sorted =
                ConversationPickerModel.choose(items, 1, "", false);
        assertEquals(1, sorted.get(0).id);
        assertEquals(9, sorted.get(1).id);
        assertEquals(3, sorted.get(2).id);
        assertEquals(12, sorted.get(3).id);
        assertEquals(2, ConversationPickerModel.queuedConversations(items));
    }

    @Test public void filterNeverReordersOrMutatesBackingList() {
        List<ConversationPickerModel.Entry> items = List.of(
                new ConversationPickerModel.Entry(4, "Alpha", 0),
                new ConversationPickerModel.Entry(2, "ALPHABET", 2),
                new ConversationPickerModel.Entry(9, "Other", 1));
        List<ConversationPickerModel.Entry> filtered =
                ConversationPickerModel.choose(items, 4, "  alpha ", true);
        assertEquals(1, filtered.size());
        assertEquals(2, filtered.get(0).id);
        assertEquals(4, items.get(0).id);
        assertTrue(ConversationPickerModel.choose(items, 4, "unknown", false).isEmpty());
    }
}
