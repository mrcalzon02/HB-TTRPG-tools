package org.cubechat.android;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import org.json.JSONObject;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** The mailbox lane serializes commands. A message row and its sequence counter commit together. */
final class ChatStore extends SQLiteOpenHelper {
    private static final String ALIAS = "cubechat.direct.store.1";
    private SecretKey key;
    // A second Activity can open the mailbox before the previous transport finishes closing.
    // The persistent selection is a startup preference. Each transport owns its selected contact.
    private long selected = -1;

    static final class Contact {
        final long id;
        final String name;
        final int pending;
        Contact(long id, String name, int pending) {
            this.id = id; this.name = name; this.pending = pending;
        }
    }

    ChatStore(Context context) { this(context, "cubechat-direct.db"); }
    ChatStore(Context context, String name) { super(context, name, null, 3); }

    @Override public void onCreate(SQLiteDatabase db) {
        createMailbox(db);
        AttachmentStore.createTables(db);
    }

    private static void createMailbox(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE contacts(id INTEGER PRIMARY KEY AUTOINCREMENT, body BLOB NOT NULL, alias BLOB, "
                + "route BLOB, draft BLOB, next_out INTEGER NOT NULL DEFAULT 0, next_in INTEGER NOT NULL DEFAULT 0)");
        db.execSQL("CREATE TABLE mailbox(id INTEGER PRIMARY KEY CHECK(id=1), active INTEGER NOT NULL)");
        db.execSQL("INSERT INTO mailbox VALUES (1,0)");
        db.execSQL("CREATE TABLE messages(id INTEGER PRIMARY KEY, contact_id INTEGER NOT NULL REFERENCES contacts(id), "
                + "outgoing INTEGER NOT NULL, seq INTEGER NOT NULL, ts INTEGER NOT NULL, delivered INTEGER NOT NULL, "
                + "body BLOB NOT NULL, packet BLOB, UNIQUE(contact_id,outgoing,seq))");
        db.execSQL("CREATE INDEX messages_history ON messages(contact_id,id)");
        db.execSQL("CREATE INDEX messages_pending ON messages(contact_id,outgoing,delivered,seq)");
    }

    @Override public void onUpgrade(SQLiteDatabase db, int old, int next) {
        if ((old != 1 && old != 2) || next != 3) throw new IllegalStateException("Unsupported message database version");
        if (old == 1) migrateSingleContact(db);
        AttachmentStore.createTables(db);
    }

    private static void migrateSingleContact(SQLiteDatabase db) {
        // SQLiteOpenHelper wraps the upgrade, including its user_version change, in a transaction.
        db.execSQL("ALTER TABLE messages RENAME TO legacy_messages");
        createMailbox(db);
        db.execSQL("INSERT INTO contacts(id,body,next_out,next_in) SELECT id,body, "
                + "(SELECT COALESCE(MAX(seq),-1)+1 FROM legacy_messages WHERE outgoing=1), "
                + "(SELECT COALESCE(MAX(seq),-1)+1 FROM legacy_messages WHERE outgoing=0) FROM pairing");
        db.execSQL("INSERT INTO messages(id,contact_id,outgoing,seq,ts,delivered,body,packet) "
                + "SELECT id,1,outgoing,seq,ts,delivered,body,packet FROM legacy_messages");
        db.execSQL("UPDATE mailbox SET active=COALESCE((SELECT id FROM contacts LIMIT 1),0)");
        db.execSQL("DROP TABLE legacy_messages");
        db.execSQL("DROP TABLE pairing");
    }

    // Contact 1 owns the original v1 AAD so migration can copy encrypted blobs without reading plaintext.
    // AUTOINCREMENT prevents reuse of a forgotten contact's number.
    private static String scope(long id, String field) {
        return id == 1 ? field : "contact:" + id + ":" + field;
    }
    private static String[] idArg(long id) { return new String[]{Long.toString(id)}; }

    private SecretKey key() throws Exception {
        if (key != null) return key;
        synchronized (ChatStore.class) {
            KeyStore store = KeyStore.getInstance("AndroidKeyStore");
            store.load(null);
            if (!store.containsAlias(ALIAS)) {
                KeyGenerator gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
                gen.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
                gen.generateKey();
            }
            key = (SecretKey) store.getKey(ALIAS, null);
        }
        return key;
    }

    private byte[] seal(String text, String aad) throws Exception {
        return sealBytes(text.getBytes(StandardCharsets.UTF_8), aad);
    }
    byte[] sealBytes(byte[] clear, String aad) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key());
        cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
        byte[] iv = cipher.getIV(), encrypted = cipher.doFinal(clear);
        return ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array();
    }
    private String open(byte[] sealed, String aad) throws Exception {
        return new String(openBytes(sealed, aad), StandardCharsets.UTF_8);
    }
    byte[] openBytes(byte[] sealed, String aad) throws Exception {
        if (sealed == null || sealed.length < 28) throw new IllegalArgumentException("Damaged encrypted record");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, sealed, 0, 12));
        cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
        return cipher.doFinal(sealed, 12, sealed.length - 12);
    }

    long activeId() {
        if (selected == -1) selected = savedSelection();
        return selected;
    }

    private long savedSelection() {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT active FROM mailbox WHERE id=1", null)) {
            if (!c.moveToFirst()) throw new IllegalStateException("Mailbox state missing");
            return c.getLong(0);
        }
    }

    JSONObject pairing() throws Exception { return pairing(activeId()); }
    JSONObject pairing(long id) throws Exception {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT body FROM contacts WHERE id=?", idArg(id))) {
            return c.moveToFirst() ? new JSONObject(open(c.getBlob(0), scope(id, "pair"))) : null;
        }
    }

    List<Contact> contacts() throws Exception {
        ArrayList<Contact> contacts = new ArrayList<>();
        String query = "SELECT id, alias, (SELECT COUNT(*) FROM messages WHERE contact_id=contacts.id "
                + "AND outgoing=1 AND delivered=0) FROM contacts ORDER BY id";
        try (Cursor c = getReadableDatabase().rawQuery(query, null)) {
            while (c.moveToNext()) {
                long id = c.getLong(0);
                byte[] alias = c.getBlob(1);
                String name = alias == null ? "Conversation " + id : open(alias, scope(id, "alias"));
                contacts.add(new Contact(id, name, c.getInt(2)));
            }
        }
        return Collections.unmodifiableList(contacts);
    }

    long findCard(Pairing card) throws Exception {
        return findPair(Pairing.encode(card.remote), Pairing.encode(card.token), card.ab, card.ba);
    }

    private long findPair(String hostIdentity, String token, String ab, String ba) throws Exception {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT id,body FROM contacts", null)) {
            while (c.moveToNext()) {
                long id = c.getLong(0);
                JSONObject saved = new JSONObject(open(c.getBlob(1), scope(id, "pair")));
                String hostKey = saved.getString(saved.getBoolean("host") ? "public" : "peer");
                if (hostIdentity.equals(hostKey) && token.equals(saved.getString("token"))
                        && ab.equals(saved.getString("ab")) && ba.equals(saved.getString("ba"))) return id;
            }
        }
        return 0;
    }

    void select(long id) {
        persistSelection(id);
        selected = id;
    }

    private void persistSelection(long id) {
        ContentValues row = new ContentValues();
        row.put("active", id);
        if (getWritableDatabase().update("mailbox", row,
                "id=1 AND EXISTS (SELECT 1 FROM contacts WHERE id=?)", idArg(id)) != 1)
            throw new IllegalArgumentException("Conversation no longer exists");
    }

    long createPair(JSONObject state) throws Exception {
        SQLiteDatabase db = getWritableDatabase();
        long id;
        db.beginTransaction();
        try {
            String hostKey = state.getString(state.getBoolean("host") ? "public" : "peer");
            id = findPair(hostKey, state.getString("token"), state.getString("ab"), state.getString("ba"));
            if (id == 0) {
                // Allocate the permanent id before binding it into the authenticated pairing.
                ContentValues initial = new ContentValues();
                initial.put("body", new byte[0]);
                id = db.insertOrThrow("contacts", null, initial);
                writePair(db, id, state);
            }
            persistSelection(id);
            db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
        selected = id;
        return id;
    }

    private void writePair(SQLiteDatabase db, long id, JSONObject state) throws Exception {
        ContentValues row = new ContentValues();
        row.put("body", seal(state.toString(), scope(id, "pair")));
        if (db.update("contacts", row, "id=?", idArg(id)) != 1)
            throw new IllegalStateException("Conversation no longer exists");
    }

    void savePair(JSONObject state) throws Exception {
        long id = activeId();
        if (id == 0) {
            createPair(state);
            return;
        }
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            JSONObject current = pairing(id);
            if (current == null) throw new IllegalStateException("Conversation no longer exists");
            if (current.getBoolean("confirmed") && (!state.getBoolean("confirmed")
                    || !current.getString("peer").equals(state.getString("peer"))))
                throw new IllegalStateException("The paired phone has already been confirmed");
            writePair(db, id, state);
            db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
    }

    void rename(long id, String name) throws Exception {
        String label = name == null ? "" : name.trim();
        if (label.codePointCount(0, label.length()) > 64)
            throw new IllegalArgumentException("Use up to 64 characters for a conversation name");
        ContentValues row = new ContentValues();
        if (label.isEmpty()) row.putNull("alias");
        else row.put("alias", seal(label, scope(id, "alias")));
        if (getWritableDatabase().update("contacts", row, "id=?", idArg(id)) != 1)
            throw new IllegalArgumentException("Conversation no longer exists");
    }

    String[] route(long id) throws Exception {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT route FROM contacts WHERE id=?", idArg(id))) {
            byte[] value = c.moveToFirst() ? c.getBlob(0) : null;
            if (value == null) return new String[]{"LAN", ""};
            JSONObject settings = new JSONObject(open(value, scope(id, "route")));
            return new String[]{settings.getString("name"), settings.getString("endpoint")};
        }
    }

    void saveRoute(String name, String endpoint) throws Exception {
        long id = activeId();
        if (id == 0) return;
        ContentValues row = new ContentValues();
        row.put("route", seal(new JSONObject().put("name", name).put("endpoint", endpoint).toString(), scope(id, "route")));
        getWritableDatabase().update("contacts", row, "id=?", idArg(id));
    }

    String draft(long id) throws Exception {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT draft FROM contacts WHERE id=?", idArg(id))) {
            byte[] value = c.moveToFirst() ? c.getBlob(0) : null;
            return value == null ? "" : open(value, scope(id, "draft"));
        }
    }

    void saveDraft(long id, String text) throws Exception {
        if (id == 0) return;
        ContentValues row = new ContentValues();
        if (text == null || text.isEmpty()) row.putNull("draft");
        else row.put("draft", seal(text, scope(id, "draft")));
        // A delayed editor callback for a forgotten contact cannot create or change another contact.
        getWritableDatabase().update("contacts", row, "id=?", idArg(id));
    }

    void resetPair() {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            long removed = activeId();
            String[] args = idArg(removed);
            db.delete("messages", "contact_id=?", args);
            db.delete("contacts", "id=?", args);
            if (savedSelection() == removed)
                db.execSQL("UPDATE mailbox SET active=COALESCE((SELECT MIN(id) FROM contacts),0) WHERE id=1");
            db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
        selected = savedSelection();
    }

    // Existing import callers may supply a different card. Preserve the previous chat.
    void replacePair(JSONObject state) throws Exception { createPair(state); }

    long next(boolean outgoing) {
        String column = outgoing ? "next_out" : "next_in";
        try (Cursor c = getReadableDatabase().rawQuery("SELECT " + column
                + " FROM contacts WHERE id=?", idArg(activeId()))) {
            return c.moveToFirst() ? c.getLong(0) : 0;
        }
    }

    void save(boolean outgoing, long seq, String text, String packet) throws Exception {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            long id = activeId();
            if (id == 0 || seq < 0 || seq == Long.MAX_VALUE) throw new IllegalStateException("Invalid message sequence");
            String column = outgoing ? "next_out" : "next_in";
            ContentValues progress = new ContentValues();
            progress.put(column, seq + 1);
            if (outgoing && text.equals(draft(id))) progress.putNull("draft");
            if (db.update("contacts", progress, "id=? AND " + column + "=?",
                    new String[]{Long.toString(id), Long.toString(seq)}) != 1)
                throw new IllegalStateException("Message sequence already stored or out of order");
            ContentValues row = new ContentValues();
            row.put("contact_id", id);
            row.put("outgoing", outgoing ? 1 : 0);
            row.put("seq", seq);
            row.put("ts", System.currentTimeMillis());
            row.put("delivered", outgoing ? 0 : 1);
            row.put("body", seal(text, scope(id, "body:" + outgoing + ":" + seq)));
            if (packet != null) row.put("packet", seal(packet, scope(id, "packet:" + seq)));
            db.insertOrThrow("messages", null, row);
            db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
    }

    long pending() {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT seq FROM messages WHERE contact_id=? "
                + "AND outgoing=1 AND delivered=0 ORDER BY seq LIMIT 1", idArg(activeId()))) {
            return c.moveToFirst() ? c.getLong(0) : -1;
        }
    }

    String packet(long seq) throws Exception {
        long id = activeId();
        try (Cursor c = getReadableDatabase().rawQuery("SELECT packet FROM messages WHERE contact_id=? AND outgoing=1 AND seq=?",
                new String[]{Long.toString(id), Long.toString(seq)})) {
            if (!c.moveToFirst()) throw new IllegalStateException("Missing queued envelope");
            return open(c.getBlob(0), scope(id, "packet:" + seq));
        }
    }

    void delivered(long seq) {
        ContentValues row = new ContentValues();
        row.put("delivered", 1);
        row.putNull("packet");
        getWritableDatabase().update("messages", row, "contact_id=? AND outgoing=1 AND seq=?",
                new String[]{Long.toString(activeId()), Long.toString(seq)});
    }

    List<PeerLink.Message> history() throws Exception {
        long id = activeId();
        ArrayList<PeerLink.Message> rows = new ArrayList<>();
        try (Cursor c = getReadableDatabase().rawQuery("SELECT outgoing,seq,ts,delivered,body FROM messages "
                + "WHERE contact_id=? ORDER BY id DESC LIMIT 200", idArg(id))) {
            while (c.moveToNext()) {
                boolean outgoing = c.getInt(0) == 1;
                String body = open(c.getBlob(4), scope(id, "body:" + outgoing + ":" + c.getLong(1)));
                rows.add(new PeerLink.Message(body, outgoing, c.getInt(3) == 1, c.getLong(2)));
            }
        }
        Collections.reverse(rows);
        return Collections.unmodifiableList(rows);
    }
}
