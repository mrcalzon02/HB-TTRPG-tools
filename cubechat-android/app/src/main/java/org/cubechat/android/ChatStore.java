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

/** Each queued envelope and its message occupy one row. A receive receipt follows a committed insert. */
final class ChatStore extends SQLiteOpenHelper {
    private static final String ALIAS = "cubechat.direct.store.1";
    private SecretKey key;
    ChatStore(Context context) { super(context, "cubechat-direct.db", null, 1); }

    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE pairing(id INTEGER PRIMARY KEY CHECK(id=1), body BLOB NOT NULL)");
        db.execSQL("CREATE TABLE messages(id INTEGER PRIMARY KEY, outgoing INTEGER NOT NULL, seq INTEGER NOT NULL, ts INTEGER NOT NULL, delivered INTEGER NOT NULL, body BLOB NOT NULL, packet BLOB, UNIQUE(outgoing,seq))");
    }
    @Override public void onUpgrade(SQLiteDatabase db, int old, int next) { throw new IllegalStateException("Unsupported message database version"); }

    private SecretKey key() throws Exception {
        if (key == null) {
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
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key());
        cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
        byte[] iv = cipher.getIV(), encrypted = cipher.doFinal(text.getBytes(StandardCharsets.UTF_8));
        return ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array();
    }
    private String open(byte[] sealed, String aad) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, sealed, 0, 12));
        cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
        return new String(cipher.doFinal(sealed, 12, sealed.length - 12), StandardCharsets.UTF_8);
    }

    JSONObject pairing() throws Exception {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT body FROM pairing WHERE id=1", null)) {
            return c.moveToFirst() ? new JSONObject(open(c.getBlob(0), "pair")) : null;
        }
    }
    void savePair(JSONObject state) throws Exception {
        ContentValues values = new ContentValues();
        values.put("id", 1);
        values.put("body", seal(state.toString(), "pair"));
        if (getWritableDatabase().insertWithOnConflict("pairing", null, values, SQLiteDatabase.CONFLICT_REPLACE) < 0)
            throw new IllegalStateException("Could not save pairing");
    }
    void resetPair() {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            db.delete("messages", null, null);
            db.delete("pairing", null, null);
            db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
    }
    void replacePair(JSONObject state) throws Exception {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            db.delete("messages", null, null);
            savePair(state);
            db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
    }
    long next(boolean outgoing) {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT COALESCE(MAX(seq),-1)+1 FROM messages WHERE outgoing=" + (outgoing ? 1 : 0), null)) {
            c.moveToFirst(); return c.getLong(0);
        }
    }
    void save(boolean outgoing, long seq, String text, String packet) throws Exception {
        ContentValues row = new ContentValues();
        row.put("outgoing", outgoing ? 1 : 0);
        row.put("seq", seq);
        row.put("ts", System.currentTimeMillis());
        row.put("delivered", outgoing ? 0 : 1);
        row.put("body", seal(text, "body:" + outgoing + ":" + seq));
        if (packet != null) row.put("packet", seal(packet, "packet:" + seq));
        getWritableDatabase().insertOrThrow("messages", null, row);
    }
    long pending() {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT seq FROM messages WHERE outgoing=1 AND delivered=0 ORDER BY seq LIMIT 1", null)) {
            return c.moveToFirst() ? c.getLong(0) : -1;
        }
    }
    String packet(long seq) throws Exception {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT packet FROM messages WHERE outgoing=1 AND seq=?", new String[]{Long.toString(seq)})) {
            if (!c.moveToFirst()) throw new IllegalStateException("Missing queued envelope");
            return open(c.getBlob(0), "packet:" + seq);
        }
    }
    void delivered(long seq) {
        ContentValues row = new ContentValues();
        row.put("delivered", 1);
        row.putNull("packet");
        getWritableDatabase().update("messages", row, "outgoing=1 AND seq=?", new String[]{Long.toString(seq)});
    }
    List<PeerLink.Message> history() throws Exception {
        ArrayList<PeerLink.Message> rows = new ArrayList<>();
        try (Cursor c = getReadableDatabase().rawQuery("SELECT outgoing,seq,ts,delivered,body FROM messages ORDER BY id DESC LIMIT 200", null)) {
            while (c.moveToNext()) {
                boolean outgoing = c.getInt(0) == 1;
                String body = open(c.getBlob(4), "body:" + outgoing + ":" + c.getLong(1));
                rows.add(new PeerLink.Message(body, outgoing, c.getInt(3) == 1, c.getLong(2)));
            }
        }
        Collections.reverse(rows);
        return Collections.unmodifiableList(rows);
    }
}
