package org.cubechat.android;

import android.app.ActivityManager;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.system.Os;
import android.system.OsConstants;

import java.io.File;
import java.io.FileDescriptor;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import javax.crypto.BadPaddingException;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

/** Offline profile for this installation. Only the normal password can unwrap the data key. */
final class LocalVault {
    enum Result { NORMAL, DURESS, INVALID }
    private static final int ITERATIONS = 310_000;
    private static final String NORMAL = "cubechat/vault/v1/normal", DURESS = "cubechat/vault/v1/duress";
    private static final byte[] TRIGGER = "CubeChat local PURGE credential v1".getBytes(StandardCharsets.UTF_8);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final ConcurrentHashMap<String,SecretKey> SESSIONS = new ConcurrentHashMap<>();
    private static final Set<String> RETIRED = Collections.newSetFromMap(new ConcurrentHashMap<>());
    private static final Set<String> VERIFIED_RESETS = ConcurrentHashMap.newKeySet();
    // Serialize password changes and memory-key publication across Activity instances.
    private static final Object CREDENTIALS = new Object();
    private final Context context;
    private final String namespace;
    private final File pending, reserved;

    LocalVault(Context context) { this(context, ChatStore.MAIN_DB); }
    LocalVault(Context context, String namespace) {
        this.context = context.getApplicationContext();
        this.namespace = namespace;
        File directory = this.context.getNoBackupFilesDir();
        this.pending = new File(directory, namespace + ".purge-pending");
        this.reserved = new File(directory, namespace + ".purge-ready");
    }

    static void createTable(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE vault_profile (id INTEGER PRIMARY KEY CHECK(id=1), name TEXT NOT NULL, "
                + "salt BLOB NOT NULL, iterations INTEGER NOT NULL, normal BLOB NOT NULL, duress BLOB)");
    }

    static boolean enrolled(SQLiteDatabase db) {
        try (Cursor row = db.rawQuery("SELECT id FROM vault_profile LIMIT 1", null)) { return row.moveToFirst(); }
    }
    static SecretKey activeKey(String namespace) {
        SecretKey key = SESSIONS.get(namespace);
        if (key == null) throw new IllegalStateException("Unlock CubeChat first");
        return key;
    }
    static String legacyAlias(String namespace) {
        return "cubechat.direct.store.1" + (ChatStore.MAIN_DB.equals(namespace) ? "" : "." + namespace);
    }
    static String wrappingAlias(String namespace) { return "cubechat.profile.wrap.1." + namespace; }
    private static KeyStore keyStore() throws Exception {
        KeyStore keys = KeyStore.getInstance("AndroidKeyStore");
        keys.load(null);
        return keys;
    }
    static synchronized SecretKey deviceKey(String alias, boolean create) throws Exception {
        KeyStore keys = keyStore();
        SecretKey key = (SecretKey) keys.getKey(alias,null);
        if (key != null) return key;
        if (!create) throw new IllegalStateException("CubeChat's device key is unavailable");
        KeyGenerator gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        gen.init(new KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return gen.generateKey();
    }
    private static synchronized void removeAlias(String alias) throws Exception {
        KeyStore keys = keyStore();
        if (keys.containsAlias(alias)) keys.deleteEntry(alias);
    }
    private void retireLegacyKey() throws Exception {
        if (RETIRED.contains(namespace)) return;
        removeAlias(legacyAlias(namespace));
        RETIRED.add(namespace);
    }

    private static final class Profile {
        final String name;
        final byte[] salt, normal, duress;
        final int iterations;
        Profile(Cursor c) {
            name = c.getString(0); salt = c.getBlob(1); iterations = c.getInt(2);
            normal = c.getBlob(3); duress = c.getBlob(4);
            if (salt == null || salt.length != 16 || iterations != ITERATIONS || normal == null)
                throw new IllegalStateException("Damaged CubeChat profile");
        }
    }
    private static Profile profile(SQLiteDatabase db) {
        try (Cursor c = db.rawQuery("SELECT name,salt,iterations,normal,duress FROM vault_profile WHERE id=1", null)) {
            return c.moveToFirst() ? new Profile(c) : null;
        }
    }
    private Profile readProfile() {
        try (ChatStore store = new ChatStore(context, namespace)) {
            Profile p = profile(store.vaultDatabase());
            if (p != null) {
                // Recover a process death between SQLite COMMIT and retiring the legacy device key.
                try { retireLegacyKey(); }
                catch (Exception e) { throw new IllegalStateException("Could not retire the old CubeChat key",e); }
            }
            return p;
        }
    }
    boolean configured() { return readProfile() != null; }
    String username() { Profile p = readProfile(); return p == null ? "" : p.name; }
    boolean hasDuress() { Profile p = readProfile(); return p != null && p.duress != null; }
    boolean locked() { return purgePending() || (configured() && !SESSIONS.containsKey(namespace)); }
    void lock() { synchronized (CREDENTIALS) { SESSIONS.remove(namespace); } }

    private static String cleanName(String name) {
        String clean = name == null ? "" : name.trim();
        if (clean.isEmpty() || clean.length() > 64)
            throw new IllegalArgumentException("Use a local name of 1 to 64 characters");
        for (int i=0; i < clean.length(); i++)
            if (Character.isISOControl(clean.charAt(i))) throw new IllegalArgumentException("Use a single-line local name");
        return clean;
    }
    private static void checkPassword(char[] password) {
        if (password == null || password.length < 8 || password.length > 256)
            throw new IllegalArgumentException("Use a password of 8 to 256 characters");
    }
    private static SecretKey passwordKey(char[] password, byte[] salt, int iterations) throws Exception {
        PBEKeySpec spec = new PBEKeySpec(password, salt, iterations, 256);
        byte[] raw = null;
        try {
            raw = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
            return new SecretKeySpec(raw, "AES");
        } finally {
            spec.clearPassword();
            if (raw != null) Arrays.fill(raw,(byte)0);
        }
    }
    private static byte[] random(int count) { byte[] data = new byte[count]; RANDOM.nextBytes(data); return data; }

    // Device layer prevents testing passwords with just a copied database. Inside it, separate
    // AEAD domains bind a normal password to the DEK and a duress password to a fixed marker only.
    private byte[] wrap(SecretKey device, SecretKey password, String role, byte[] clear) throws Exception {
        byte[] inside = ChatStore.encrypt(password, clear, role);
        return ChatStore.encrypt(device, inside, role + "/device/" + namespace);
    }
    private byte[] tryCredential(SecretKey device, SecretKey password, String role, byte[] wrapped) throws Exception {
        if (wrapped == null) return null;
        byte[] inside = ChatStore.decrypt(device, wrapped, role + "/device/" + namespace);
        try { return ChatStore.decrypt(password, inside, role); }
        catch (BadPaddingException wrongPassword) { return null; }
    }
    private boolean matchesDuress(SecretKey device, SecretKey password, Profile p) throws Exception {
        byte[] value = tryCredential(device, password, DURESS, p.duress);
        if (value == null) return false;
        try { return MessageDigest.isEqual(value,TRIGGER); }
        finally { Arrays.fill(value,(byte)0); }
    }
    private void live() {
        if (purgePending()) throw new IllegalStateException("A local reset is pending");
    }

    void enroll(String username, char[] password) throws Exception {
        String name = cleanName(username);
        checkPassword(password);
        synchronized (CREDENTIALS) {
            live();
            byte[] raw = random(32), salt = random(16);
            try (ChatStore store = new ChatStore(context,namespace)) {
                SecretKey dataKey = new SecretKeySpec(raw,"AES");
                SecretKey pass = passwordKey(password,salt,ITERATIONS);
                SQLiteDatabase db = store.vaultDatabase();
                db.beginTransaction();
                try {
                    if (enrolled(db)) throw new IllegalStateException("A local profile already exists");
                    SecretKey previous = deviceKey(legacyAlias(namespace),true);
                    SecretKey device = deviceKey(wrappingAlias(namespace),true);
                    ContentValues row = new ContentValues();
                    row.put("id",1); row.put("name",name); row.put("salt",salt); row.put("iterations",ITERATIONS);
                    row.put("normal", wrap(device,pass,NORMAL,raw));
                    new VaultMigration(db,previous,dataKey).run();
                    db.insertOrThrow("vault_profile",null,row);
                    db.setTransactionSuccessful();
                } finally { db.endTransaction(); }
                // Only retire the v0.1.3 key after the migration transaction is durable.
                retireLegacyKey();
                SESSIONS.put(namespace,dataKey);
            } finally { Arrays.fill(raw,(byte)0); }
        }
    }

    Result unlock(String username, char[] password) throws Exception {
        synchronized (CREDENTIALS) {
            if (purgePending()) return Result.DURESS;
            Profile p = readProfile();
            if (p == null || username == null || !p.name.equals(username.trim())
                    || password == null || password.length < 8 || password.length > 256) return Result.INVALID;
            SecretKey device = deviceKey(wrappingAlias(namespace),false);
            SecretKey pass = passwordKey(password,p.salt,p.iterations);
            byte[] raw = tryCredential(device,pass,NORMAL,p.normal);
            if (raw != null) {
                try {
                    if (raw.length != 32) throw new IllegalStateException("Damaged CubeChat data key");
                    retireLegacyKey();
                    SESSIONS.put(namespace,new SecretKeySpec(raw,"AES"));
                    return Result.NORMAL;
                } finally { Arrays.fill(raw,(byte)0); }
            }
            if (!matchesDuress(device,pass,p)) return Result.INVALID;
            SESSIONS.remove(namespace);
            VERIFIED_RESETS.add(namespace);
            try { markPurge(); }
            catch (IOException | android.system.ErrnoException | SecurityException unavailable) {
                // The locally verified credential still authorizes the system clear if storage fails.
            }
            return Result.DURESS;
        }
    }

    void changePassword(char[] current, char[] replacement) throws Exception {
        checkPassword(replacement);
        editCredential(current,replacement,false);
    }
    void setDuress(char[] current, char[] replacementOrEmpty) throws Exception {
        if (replacementOrEmpty == null) throw new IllegalArgumentException("Missing duress password");
        if (replacementOrEmpty.length != 0) checkPassword(replacementOrEmpty);
        editCredential(current,replacementOrEmpty,true);
    }
    private void editCredential(char[] current, char[] replacement, boolean duress) throws Exception {
        synchronized (CREDENTIALS) {
            live();
            if (current == null || current.length < 8 || current.length > 256)
                throw new IllegalArgumentException("Enter your current sign-in password");
            activeKey(namespace);
            try (ChatStore store = new ChatStore(context,namespace)) {
                SQLiteDatabase db = store.vaultDatabase();
                Profile p = profile(db);
                if (p == null) throw new IllegalStateException("Create a local profile first");
                SecretKey device = deviceKey(wrappingAlias(namespace),false);
                SecretKey oldPass = passwordKey(current,p.salt,p.iterations);
                byte[] data = tryCredential(device,oldPass,NORMAL,p.normal);
                if (data == null) throw new IllegalArgumentException("Enter your current sign-in password");
                try {
                    ContentValues changes = new ContentValues();
                    if (duress && replacement.length == 0) changes.putNull("duress");
                    else {
                        SecretKey newPass = passwordKey(replacement,p.salt,p.iterations);
                        if (duress ? Arrays.equals(current,replacement)
                                : matchesDuress(device,newPass,p))
                            throw new IllegalArgumentException("Choose different sign-in and duress passwords");
                        changes.put(duress ? "duress" : "normal",wrap(device,newPass,duress ? DURESS : NORMAL,duress ? TRIGGER : data));
                        if (duress) reserveMarker();
                    }
                    if (db.update("vault_profile",changes,"id=1",null) != 1)
                        throw new IllegalStateException("Profile changed");
                    if (duress && replacement.length == 0) reserved.delete();
                } finally { Arrays.fill(data,(byte)0); }
            }
        }
    }

    boolean purgePending() { return VERIFIED_RESETS.contains(namespace) || pending.isFile(); }

    private void reserveMarker() {
        try {
            if (!reserved.isFile()) {
                writeMarker(reserved);
                syncMarkerDirectory();
            }
        } catch (IOException | android.system.ErrnoException | SecurityException unavailable) {
            // Activation can write the marker directly if reserving it now is impossible.
        }
    }
    private void markPurge() throws IOException, android.system.ErrnoException {
        // Prepare the inode when setting the duress credential. A same-directory rename usually
        // needs no new data block even if the phone fills up before activation.
        if (!reserved.renameTo(pending)) writeMarker(pending);
        syncMarkerDirectory();
    }
    private static void writeMarker(File file) throws IOException {
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(1);
            out.getFD().sync();
        }
    }
    private void syncMarkerDirectory() throws android.system.ErrnoException {
        FileDescriptor dir = Os.open(pending.getParent(), OsConstants.O_RDONLY,0);
        try { Os.fsync(dir); }
        finally { Os.close(dir); }
    }

    /** Only the locally verified duress path creates the marker, never inbound messages. */
    void requestClear() throws Exception {
        synchronized (CREDENTIALS) {
            if (!purgePending() || !ChatStore.MAIN_DB.equals(namespace))
                throw new IllegalStateException("No local reset is pending");
            SESSIONS.remove(namespace);
            // Android clears package databases, preferences, caches, WebView data, grants and credentials.
            // Retire aliases eagerly as well. If Android rejects a request, keep the marker for retry.
            try {
                removeAlias(wrappingAlias(namespace));
                removeAlias(legacyAlias(namespace));
            } finally {
                // PURGE is stronger than manual history clearing: halt writers before Android
                // clears app data, and retire the independent encrypted telemetry key.
                // Failure here must never prevent the app-data reset attempt.
                try { SecurityTelemetryStore.purge(context); }
                catch (RuntimeException ignored) { }
                try { FirewallSettings.clearSessionObservationOnPurge(); }
                catch (RuntimeException ignored) { }
                ActivityManager am = (ActivityManager)context.getSystemService(Context.ACTIVITY_SERVICE);
                if (am == null || !am.clearApplicationUserData())
                    throw new IOException("Android could not clear CubeChat. Reopen it to retry.");
            }
        }
    }
}
