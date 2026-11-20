package org.cubechat.android;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

/**
 * Android minSdk/target API compilation and in-memory save lifecycle checks.
 * No vault opened, no Android calling APIs, and no network or radio access.
 */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = {26, 35})
public final class DraftSaveStateAndroidTest {
    @Test public void failedWriteDoesNotSilentlyMarkCurrentDraftSaved() {
        DraftSaveState state = new DraftSaveState();
        state.edited();
        DraftSaveState.Ticket queued = state.begin(7, "Unsent draft");
        assertNotNull(queued);
        assertFalse(state.isDirty());
        assertTrue(state.isAwaiting());
        assertTrue(state.failed(queued, 7, "Unsent draft", "Disk full"));
        assertTrue(state.isDirty());
        assertTrue(state.hadFailure());
        assertFalse(state.isAwaiting());
        DraftSaveState.Ticket retry = state.begin(7, "Unsent draft");
        assertNotNull(retry);
        assertTrue(state.isAwaiting());
        assertFalse(state.hadFailure());
        assertFalse(state.failed(retry, 7, "Unsent draft", null));
        assertTrue(state.succeeded(retry, 7, "Unsent draft"));
        assertFalse(state.isAwaiting());
        assertFalse(state.isDirty());
    }

    @Test public void composerLabelReflectsActualLocalSaveAcknowledgement() {
        DraftSaveState state = new DraftSaveState();
        state.edited();
        DraftStatusText.Summary edited = DraftStatusText.describe(
                "A🐟", true, state.isAwaiting(), state.hadFailure(), state.isDirty());
        assertTrue(edited.label.contains("Unsaved changes"));
        assertTrue(edited.sendable);
        assertTrue(edited.bytes == 5);

        DraftSaveState.Ticket pending = state.begin(1, "A🐟");
        DraftStatusText.Summary saving = DraftStatusText.describe(
                "A🐟", true, state.isAwaiting(), state.hadFailure(), state.isDirty());
        assertTrue(saving.label.contains("Saving locally"));
        assertFalse(saving.label.contains("Saved locally"));

        assertTrue(state.succeeded(pending, 1, "A🐟"));
        DraftStatusText.Summary saved = DraftStatusText.describe(
                "A🐟", true, state.isAwaiting(), state.hadFailure(), state.isDirty());
        assertTrue(saved.label.contains("Saved locally"));
        assertFalse(saved.problem);

        state.edited();
        DraftSaveState.Ticket failedTicket = state.begin(1, "B");
        assertTrue(state.failed(failedTicket, 1, "B", "Local disk unavailable"));
        DraftStatusText.Summary failed = DraftStatusText.describe(
                "B", true, state.isAwaiting(), state.hadFailure(), state.isDirty());
        assertTrue(failed.label.contains("Draft not saved"));
        assertTrue(failed.problem);
        assertFalse(DraftStatusText.describe("🐟".repeat(1025),
                true, false, false, false).sendable);
    }

    @Test public void oldSameTextResultCannotAffectNewEditOrLockedProfile() {
        DraftSaveState state = new DraftSaveState();
        state.edited();
        DraftSaveState.Ticket old = state.begin(4, "identical");
        state.edited();
        assertFalse(state.isCurrent(old, 4, "identical"));
        assertFalse(state.succeeded(old, 4, "identical"));
        assertFalse(state.failed(old, 4, "identical", "old callback"));
        assertTrue(state.isDirty());
        DraftSaveState.Ticket fresh = state.begin(4, "identical");
        state.reset();
        assertFalse(state.failed(fresh, 4, "identical", "locked"));
        assertFalse(state.isCurrent(fresh, 4, "identical"));
        assertFalse(state.isAwaiting());
        assertFalse(state.isDirty());
    }
}
