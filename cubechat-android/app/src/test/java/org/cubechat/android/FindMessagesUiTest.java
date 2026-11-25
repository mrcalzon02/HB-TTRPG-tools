package org.cubechat.android;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.robolectric.Shadows.shadowOf;

import android.app.AlertDialog;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.ListView;
import android.widget.RadioButton;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;
import org.robolectric.shadows.ShadowAlertDialog;

/** Read-only search UI: no database, networking, keys or calling operations. */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = {26, 35})
public final class FindMessagesUiTest {
    @Test public void senderFilterKeepsCorrectOriginalJumpIndex() {
        FirewallSettings activity = Robolectric.buildActivity(FirewallSettings.class)
                .setup().get();
        AtomicInteger chosen = new AtomicInteger(-1);
        List<PeerLink.Message> messages = List.of(
                new PeerLink.Message("needle old peer", false, true, 1000),
                new PeerLink.Message("no match", true, true, 2000),
                new PeerLink.Message("needle from me", true, true, 3000),
                new PeerLink.Message("needle recent peer", false, true, 4000));

        FindMessages.show(activity, messages, chosen::set);
        AlertDialog dialog = ShadowAlertDialog.getLatestAlertDialog();
        assertNotNull("Private in-conversation search dialog shown", dialog);
        View root = dialog.getWindow().getDecorView();
        EditText input = child(root, EditText.class);
        ListView results = child(root, ListView.class);
        RadioButton you = radio(root, "You");
        RadioButton peer = radio(root, "Peer");
        assertNotNull(input);
        assertNotNull(results);
        assertNotNull(you);
        assertNotNull(peer);

        input.setText("NEEDLE");
        assertEquals("All sender matches shown", 3, results.getAdapter().getCount());
        you.performClick();
        assertEquals("Only the outgoing match remains", 1, results.getAdapter().getCount());
        assertTrue(results.getAdapter().getItem(0).toString().contains("needle from me"));
        results.performItemClick(null, 0, results.getAdapter().getItemId(0));
        assertEquals("Selection refers to input snapshot, not filtered row", 2, chosen.get());
        shadowOf(Looper.getMainLooper()).idle();
        assertEquals("Search query cleared on dialog close", "", input.getText().toString());
    }

    @Test public void peerFilterPreservesMostRecentFirst() {
        FirewallSettings activity = Robolectric.buildActivity(FirewallSettings.class)
                .setup().get();
        List<PeerLink.Message> messages = List.of(
                new PeerLink.Message("blue first", false, true, 1000),
                new PeerLink.Message("blue from me", true, true, 2000),
                new PeerLink.Message("blue last", false, true, 3000));
        FindMessages.show(activity, messages, ignored -> {});
        AlertDialog dialog = ShadowAlertDialog.getLatestAlertDialog();
        View root = dialog.getWindow().getDecorView();
        EditText input = child(root, EditText.class);
        ListView results = child(root, ListView.class);
        assertNotNull(input);
        assertNotNull(results);
        input.setText("blue");
        radio(root, "Peer").performClick();
        assertEquals(2, results.getAdapter().getCount());
        assertTrue(results.getAdapter().getItem(0).toString().contains("blue last"));
        assertTrue(results.getAdapter().getItem(1).toString().contains("blue first"));
        dialog.dismiss();
    }

    private static RadioButton radio(View root, String label) {
        if (root instanceof RadioButton &&
                label.equals(((RadioButton) root).getText().toString()))
            return (RadioButton) root;
        if (root instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) root;
            for (int i = 0; i < group.getChildCount(); i++) {
                RadioButton found = radio(group.getChildAt(i), label);
                if (found != null) return found;
            }
        }
        return null;
    }

    private static <T extends View> T child(View root, Class<T> type) {
        if (type.isInstance(root)) return type.cast(root);
        if (root instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) root;
            for (int i = 0; i < group.getChildCount(); i++) {
                T found = child(group.getChildAt(i), type);
                if (found != null) return found;
            }
        }
        return null;
    }
}
