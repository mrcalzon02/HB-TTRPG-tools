package org.cubechat.android;

import android.os.Looper;
import android.widget.Button;
import android.widget.EditText;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.LooperMode;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.time.Duration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import javax.crypto.KeyGenerator;

import static org.junit.Assert.*;
import static org.robolectric.Shadows.shadowOf;

/** Runs the real composer, mailbox worker and SQLite outbox without starting a radio. */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = {26, 35})
@LooperMode(LooperMode.Mode.PAUSED)
public class ComposerOutboxTest {
    private MainActivity screen;
    private PeerLink link;
    private ProfileSecurityUi security;
    private ChatStore store;
    private long contact;
    private ExecutorService mailbox;
    private EditText draft;
    private Button send;

    private static Field field(Object target, String name) throws Exception {
        Field field = target.getClass().getDeclaredField(name);
        field.setAccessible(true);
        return field;
    }

    @Before public void openOfflineComposer() throws Exception {
        screen = Robolectric.buildActivity(MainActivity.class).get();
        security = new ProfileSecurityUi(screen);
        field(screen, "security").set(screen, security);
        Method build = MainActivity.class.getDeclaredMethod("buildScreen");
        build.setAccessible(true);
        build.invoke(screen);

        PeerLink.Codec fixtureCodec = new PeerLink.Codec() {
            public JSONObject seal(String key, String channel, long sequence, String text) throws Exception {
                return new JSONObject().put("sequence", sequence);
            }
            public String open(String key, String channel, JSONObject packet) {
                throw new AssertionError("Unexpected inbound message");
            }
        };
        link = new PeerLink(screen, fixtureCodec, screen);
        store = (ChatStore) field(link, "store").get(link);
        // Exercise the real encrypted draft/outbox code with a process-local test key.
        field(store, "legacyKey").set(store, KeyGenerator.getInstance("AES").generateKey());
        Pairing pair = Pairing.host(null);
        contact = store.createPair(pair.json());
        field(link, "pair").set(link, pair);
        field(link, "activeId").setLong(link, contact);
        field(link, "loaded").setBoolean(link, true);
        field(screen, "link").set(screen, link);
        field(screen, "renderedId").setLong(screen, contact);
        mailbox = (ExecutorService) field(link, "lane").get(link);
        draft = (EditText) field(screen, "draft").get(screen);
        send = (Button) field(screen, "send").get(screen);
    }

    @After public void close() {
        if (link != null) link.stop();
        if (security != null) security.close();
    }

    private void drainMailbox() throws Exception {
        mailbox.submit(() -> {}).get(5, TimeUnit.SECONDS);
    }

    private void finishUiAndDraftWrites() throws Exception {
        drainMailbox();
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(400));
        drainMailbox();
        shadowOf(Looper.getMainLooper()).idle();
    }

    private void submit(String message) {
        draft.setText(message);
        send.performClick();
    }

    @Test public void unrelatedErrorCannotQueueTwoCopies() throws Exception {
        submit("Arrived");
        screen.problem("File picker unavailable");
        assertFalse(send.isEnabled());
        assertEquals("Saving…", send.getText().toString());
        send.performClick();
        finishUiAndDraftWrites();
        assertEquals(1, store.next(true));
        assertEquals(0, store.pending());
        assertEquals("", draft.getText().toString());
    }

    @Test public void retypedIdenticalDraftSurvivesFirstCommit() throws Exception {
        submit("Arrived");
        draft.setText("");
        draft.setText("Arrived");
        finishUiAndDraftWrites();
        assertTrue(send.isEnabled());
        assertEquals("Arrived", draft.getText().toString());
        assertEquals("Arrived", store.draft(contact));
        assertEquals(1, store.next(true));
    }

    @Test public void clearingOldEditorDoesNotClearANewerStoredDraft() throws Exception {
        submit("Arrived");
        drainMailbox(); // The SQLite transaction has committed, its UI callback is still pending.
        store.saveDraft(contact, "Meet at the dock");
        finishUiAndDraftWrites();
        assertEquals("", draft.getText().toString());
        assertEquals("Meet at the dock", store.draft(contact));
    }

    @Test public void rejectedCommitKeepsDraftForOneRetry() throws Exception {
        store.getWritableDatabase().execSQL("CREATE TRIGGER reject_send BEFORE INSERT ON messages "
                + "BEGIN SELECT RAISE(ABORT, 'fixture write failure'); END");
        submit("Arrived");
        finishUiAndDraftWrites();
        assertEquals(0, store.next(true));
        assertEquals("Arrived", store.draft(contact));
        assertTrue(send.isEnabled());
        store.getWritableDatabase().execSQL("DROP TRIGGER reject_send");
        send.performClick();
        finishUiAndDraftWrites();
        assertEquals(1, store.next(true));
        assertEquals("", store.draft(contact));
    }

    @Test public void contactRefreshErrorAfterCommitDoesNotOfferResend() throws Exception {
        store.getWritableDatabase().execSQL("UPDATE contacts SET alias=X'00' WHERE id=?", new Object[]{contact});
        submit("Arrived");
        finishUiAndDraftWrites();
        assertEquals(1, store.next(true));
        assertEquals("", draft.getText().toString());
        assertFalse(send.isEnabled());
    }
}
