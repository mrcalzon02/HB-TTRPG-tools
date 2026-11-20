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
        assertTrue(state.failed(queued, 7, "Unsent draft", "Disk full"));
        assertTrue(state.isDirty());
        DraftSaveState.Ticket retry = state.begin(7, "Unsent draft");
        assertNotNull(retry);
        assertFalse(state.failed(retry, 7, "Unsent draft", null));
        assertFalse(state.isDirty());
    }

    @Test public void oldSameTextResultCannotAffectNewEditOrLockedProfile() {
        DraftSaveState state = new DraftSaveState();
        state.edited();
        DraftSaveState.Ticket old = state.begin(4, "identical");
        state.edited();
        assertFalse(state.isCurrent(old, 4, "identical"));
        assertFalse(state.failed(old, 4, "identical", "old callback"));
        assertTrue(state.isDirty());
        DraftSaveState.Ticket fresh = state.begin(4, "identical");
        state.reset();
        assertFalse(state.failed(fresh, 4, "identical", "locked"));
        assertFalse(state.isCurrent(fresh, 4, "identical"));
        assertFalse(state.isDirty());
    }
}
