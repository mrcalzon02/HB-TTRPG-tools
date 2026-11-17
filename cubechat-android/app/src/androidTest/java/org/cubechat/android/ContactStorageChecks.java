package org.cubechat.android;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.ClipData;
import android.content.ClipDescription;
import android.content.ContentValues;
import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteException;
import android.os.Bundle;
import android.os.PersistableBundle;
import android.util.Log;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.UUID;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;

/**
 * Install the debug app and its androidTest APK, then run:
 * adb shell am instrument -w org.cubechat.android.test/org.cubechat.android.ContactStorageChecks
 * The randomized database belongs to this run. The normal application mailbox is never opened.
 */
public final class ContactStorageChecks extends Instrumentation {
    @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }

    @Override public void onStart() {
        Context context = getTargetContext();
        String name = "cubechat-test-" + UUID.randomUUID() + ".db";
        Bundle result = new Bundle();
        int code = Activity.RESULT_OK;
        try {
            checkClipboardMetadata();
            checkUpgradeAndIsolation(context, name);
            AttachmentStorageChecks.run(context);
            VaultStorageChecks.run(context);
            result.putString("cubechat_checks", "passed");
            result.putString("stream", "PASS: SQLite upgrade, contact isolation, drafts, counters and attachment vault.\nPASS: password-gated migration, credential changes, locked PURGE notices and durable reset marker.\n");
        } catch (Throwable failure) {
            code = Activity.RESULT_CANCELED;
            result.putString("stream", Log.getStackTraceString(failure));
        } finally {
            context.deleteDatabase(name);
            finish(code, result);
        }
    }

    private static void check(boolean condition, String detail) {
        if (!condition) throw new AssertionError(detail);
    }

    private static void checkClipboardMetadata() {
        ClipData chat = MainActivity.privateClip("CubeChat draft", "sample draft");
        check("sample draft".contentEquals(chat.getItemAt(0).getText()), "Copy changed selected text");
        check(chat.getDescription().getExtras().getBoolean(ClipDescription.EXTRA_IS_SENSITIVE),
                "Private clip missing preview protection");
        check(MainActivity.isCubeChatClip(chat.getDescription()), "PURGE missed CubeChat copy");

        ClipDescription other = ClipData.newPlainText("CubeChat draft", "other").getDescription();
        check(!MainActivity.isCubeChatClip(other), "Clip label treated as ownership");
        PersistableBundle extras = new PersistableBundle();
        extras.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true);
        other.setExtras(extras);
        check(!MainActivity.isCubeChatClip(other), "Unrelated sensitive clip selected for removal");
        extras.putBoolean("org.cubechat.android.key-card", true);
        other.setExtras(extras);
        check(MainActivity.isCubeChatClip(other), "Existing release's invite marker lost");
    }

    private static byte[] v1Blob(SecretKey key, String aad, String text) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key);
        cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
        byte[] ciphertext = cipher.doFinal(text.getBytes(StandardCharsets.UTF_8));
        byte[] iv = cipher.getIV();
        return ByteBuffer.allocate(iv.length + ciphertext.length).put(iv).put(ciphertext).array();
    }

    private static void prepareLegacyStore(Context context, String name, Pairing pair) throws Exception {
        // Initialize the same Keystore alias used in the released app, then build its v1 schema.
        try (ChatStore init = new ChatStore(context, name)) { init.createPair(pair.json()); }
        check(context.deleteDatabase(name), "Could not prepare isolated fixture");
        KeyStore keys = KeyStore.getInstance("AndroidKeyStore");
        keys.load(null);
        SecretKey key = (SecretKey) keys.getKey(LocalVault.legacyAlias(name), null);
        try (SQLiteDatabase db = SQLiteDatabase.openOrCreateDatabase(context.getDatabasePath(name), null)) {
            db.execSQL("CREATE TABLE pairing(id INTEGER PRIMARY KEY CHECK(id=1), body BLOB NOT NULL)");
            db.execSQL("CREATE TABLE messages(id INTEGER PRIMARY KEY, outgoing INTEGER NOT NULL, seq INTEGER NOT NULL, "
                    + "ts INTEGER NOT NULL, delivered INTEGER NOT NULL, body BLOB NOT NULL, packet BLOB, UNIQUE(outgoing,seq))");
            ContentValues saved = new ContentValues();
            saved.put("id", 1);
            saved.put("body", v1Blob(key, "pair", pair.json().toString()));
            db.insertOrThrow("pairing", null, saved);
            for (int direction = 0; direction <= 1; direction++) {
                boolean outgoing = direction == 1;
                ContentValues row = new ContentValues();
                row.put("outgoing", direction);
                row.put("seq", 0);
                row.put("ts", 100L + direction);
                row.put("delivered", !outgoing);
                row.put("body", v1Blob(key, "body:" + outgoing + ":0", outgoing ? "original send" : "original reply"));
                if (outgoing) row.put("packet", v1Blob(key, "packet:0", "legacy packet"));
                db.insertOrThrow("messages", null, row);
            }
            db.setVersion(1);
        }
    }

    private static void checkUpgradeAndIsolation(Context context, String name) throws Exception {
        Pairing original = Pairing.host(null);
        Pairing newHost = Pairing.host(null);
        Pairing guest = Pairing.join(newHost.invite("127.0.0.1"));
        prepareLegacyStore(context, name, original);
        long second;
        try (ChatStore firstActivity = new ChatStore(context, name);
             ChatStore nextActivity = new ChatStore(context, name)) {
            long first = firstActivity.activeId();
            check(first == 1 && firstActivity.contacts().size() == 1, "Missing migrated contact");
            check(firstActivity.pairing().toString().equals(original.json().toString()), "Changed migrated pairing");
            check(firstActivity.history().get(0).text.equals("original reply"), "Missing received history");
            check(firstActivity.history().get(1).text.equals("original send"), "Missing sent history");
            check(firstActivity.packet(0).equals("legacy packet") && firstActivity.pending() == 0, "Lost outbox");
            check(firstActivity.next(true) == 1 && firstActivity.next(false) == 1, "Incorrect migrated counters");
            firstActivity.rename(first, "Original phone");
            firstActivity.saveDraft(first, "unfinished");
            firstActivity.saveRoute("BLUETOOTH", "");

            second = nextActivity.createPair(guest.json());
            nextActivity.save(true, 0, "second phone only", "second packet");
            nextActivity.delivered(0);
            firstActivity.save(false, 1, "late reply to first activity", null);
            check(firstActivity.activeId() == first && firstActivity.history().size() == 3, "Late receipt crossed contacts");
            check(nextActivity.activeId() == second && nextActivity.history().size() == 1, "Second inbox is mixed");
            check(firstActivity.pending() == 0 && nextActivity.pending() == -1, "Delivery marked the wrong outbox");

            Pairing repeated = Pairing.join(newHost.invite("127.0.0.2"));
            check(nextActivity.findCard(repeated) == second, "Updated address created a duplicate");
            check(nextActivity.createPair(repeated.json()) == second, "Repeat import was not idempotent");
            check(nextActivity.pairing().getString("private").equals(guest.json().getString("private")), "Repeat import replaced identity");

            SQLiteDatabase db = firstActivity.getWritableDatabase();
            db.execSQL("CREATE TRIGGER fail_message BEFORE INSERT ON messages BEGIN SELECT RAISE(ABORT,'forced failure'); END");
            try {
                firstActivity.save(true, 1, "unfinished", "next packet");
                throw new AssertionError("Injection did not fail");
            } catch (SQLiteException expected) {
                check(firstActivity.next(true) == 1 && firstActivity.draft(first).equals("unfinished"), "Failed write lost draft or advanced counter");
            }
            db.execSQL("DROP TRIGGER fail_message");
            firstActivity.save(true, 1, "unfinished", "next packet");
            check(firstActivity.draft(first).isEmpty(), "A queued draft was not cleared");
            db.delete("messages", "contact_id=1 AND outgoing=1 AND seq=1", null);
            check(firstActivity.next(true) == 2, "Deleting history rolled a counter back");
            try {
                firstActivity.save(true, 1, "replay", "duplicate");
                throw new AssertionError("Reused an old sequence");
            } catch (IllegalStateException expected) {
                check(firstActivity.next(true) == 2, "Invalid sequence changed the counter");
            }
            firstActivity.save(true, 2, "new sequence", "new packet");
            nextActivity.saveDraft(second, "independent draft");
        }
        try (ChatStore reopened = new ChatStore(context, name)) {
            check(reopened.activeId() == second && reopened.contacts().size() == 2, "Selection lost after restart");
            check(reopened.draft(second).equals("independent draft"), "Draft lost after restart");
            reopened.resetPair();
            check(reopened.activeId() == 1 && reopened.contacts().size() == 1, "Forget removed the wrong contact");
            check(reopened.route(1)[0].equals("BLUETOOTH") && reopened.contacts().get(0).name.equals("Original phone"), "Preferences lost");
            check(reopened.history().size() == 4 && reopened.packet(0).equals("legacy packet"), "Forgetting one contact altered another");
        }
    }
}
