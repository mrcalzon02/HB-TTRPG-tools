package org.beckenburg;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Properties;
import java.util.UUID;

/** Private one-time local installation identity, separate from importable saves. */
public final class BeckenburgInstallIdentity {
    private static final String FILE_NAME = "installation.properties";
    private static final String SCHEMA = "1";
    private BeckenburgInstallIdentity() {}

    public record Identity(String installationId, String playerId, String hardwareProfile, String createdUtc) {
        public String shortPlayerId() { return playerId.substring(0, 8).toUpperCase(Locale.ROOT); }
    }

    /** Never transmits hardware details or reads MAC/TPM/disk/BIOS serial numbers. */
    public static Identity loadOrCreate(Path folder) throws IOException {
        Files.createDirectories(folder);
        // Cross-process lock prevents competing identities during simultaneous startup.
        try (FileChannel channel = FileChannel.open(folder.resolve("installation.lock"),
                StandardOpenOption.CREATE, StandardOpenOption.WRITE);
             FileLock lock = channel.lock()) {
            Path file = folder.resolve(FILE_NAME);
            if (Files.exists(file)) return read(file);
            Identity created = createIdentity();
            Path tmp = Files.createTempFile(folder, "installation-", ".tmp");
            try {
                Properties properties = new Properties();
                properties.setProperty("schema", SCHEMA);
                properties.setProperty("installation.id", created.installationId());
                properties.setProperty("player.id", created.playerId());
                properties.setProperty("hardware.profile.at.install", created.hardwareProfile());
                properties.setProperty("created.utc", created.createdUtc());
                try (OutputStream output = Files.newOutputStream(tmp)) {
                    properties.store(output, "Beckenburg local-only installation identity");
                }
                try { Files.move(tmp, file, StandardCopyOption.ATOMIC_MOVE); }
                catch (java.nio.file.AtomicMoveNotSupportedException e) { Files.move(tmp, file); }
            } finally { Files.deleteIfExists(tmp); }
            return read(file);
        }
    }

    private static Identity createIdentity() throws IOException {
        // Coarse hardware class is mixed into one-time random creation, never rechecked.
        String hardware = compact(System.getProperty("os.name", "unknown")) + "/"
                + compact(System.getProperty("os.arch", "unknown")) + "/cores:"
                + Runtime.getRuntime().availableProcessors();
        byte[] random = new byte[32];
        new SecureRandom().nextBytes(random);
        byte[] digest;
        try {
            MessageDigest hash = MessageDigest.getInstance("SHA-256");
            hash.update("Beckenburg-install-v1:".getBytes(StandardCharsets.UTF_8));
            hash.update(random);
            hash.update(hardware.getBytes(StandardCharsets.UTF_8));
            digest = hash.digest();
        } catch (NoSuchAlgorithmException e) { throw new IOException("SHA-256 unavailable", e); }
        String installId = HexFormat.of().formatHex(digest).substring(0, 32);
        return new Identity(installId, UUID.randomUUID().toString(), hardware, Instant.now().toString());
    }

    private static String compact(String value) {
        String normal = value.trim().replaceAll("[^a-zA-Z0-9._-]", "_");
        return normal.substring(0, Math.min(normal.length(), 48));
    }

    private static Identity read(Path file) throws IOException {
        if (!Files.isRegularFile(file) || Files.size(file) > 8192) throw new IOException("Invalid installation identity file");
        Properties p = new Properties();
        try (InputStream input = Files.newInputStream(file)) { p.load(input); }
        if (!SCHEMA.equals(p.getProperty("schema"))) throw new IOException("Unsupported installation identity schema");
        String id = p.getProperty("installation.id", "");
        String player = p.getProperty("player.id", "");
        String hardware = p.getProperty("hardware.profile.at.install", "");
        String created = p.getProperty("created.utc", "");
        if (!id.matches("[0-9a-f]{32}")) throw new IOException("Invalid installation ID");
        try { UUID.fromString(player); Instant.parse(created); }
        catch (RuntimeException ex) { throw new IOException("Invalid installation profile fields", ex); }
        if (hardware.isEmpty() || hardware.length() > 256) throw new IOException("Invalid hardware class");
        return new Identity(id, player, hardware, created);
    }
}
