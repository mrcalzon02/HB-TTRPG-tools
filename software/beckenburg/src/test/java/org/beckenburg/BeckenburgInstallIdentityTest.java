package org.beckenburg;

import java.nio.file.*;

public final class BeckenburgInstallIdentityTest {
    private static void check(boolean value, String description) { if (!value) throw new AssertionError(description); }
    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("beckenburg-install-id-");
        try {
            var a = BeckenburgInstallIdentity.loadOrCreate(root);
            var b = BeckenburgInstallIdentity.loadOrCreate(root);
            check(a.equals(b), "reload must preserve all installation and player identity fields");
            check(a.installationId().matches("[0-9a-f]{32}"), "random mixed install identifier");
            check(a.playerId().length() == 36, "UUID player profile identifier");
            check(a.shortPlayerId().length() == 8, "compact visible player label");
            Path movedSave = root.resolve("imported-profile.properties");
            Files.writeString(movedSave, "schema=1\ncurrency=999999\nexperience=20\n");
            check(a.equals(BeckenburgInstallIdentity.loadOrCreate(root)), "save import must not change install ID");
            Path second = Files.createDirectory(root.resolve("another-machine"));
            var c = BeckenburgInstallIdentity.loadOrCreate(second);
            check(!a.installationId().equals(c.installationId()), "separate installs require separate ID");
            check(!a.playerId().equals(c.playerId()), "separate installs require separate player profiles");
            Path identity = root.resolve("installation.properties");
            String valid = Files.readString(identity);
            Files.writeString(identity, "schema=999\n");
            try { BeckenburgInstallIdentity.loadOrCreate(root); throw new AssertionError("corrupt ID silently regenerated"); }
            catch (java.io.IOException expected) {}
            check(Files.readString(identity).equals("schema=999\n"), "corruption must preserve original file");
            Files.writeString(identity, valid);
            check(BeckenburgInstallIdentity.loadOrCreate(root).equals(a), "recovery from backup preserves identity");
            System.out.println("PASS: stable install/profile identity, random uniqueness, save independence, corrupt-data preservation");
        } finally {
            try (var paths = Files.walk(root)) {
                paths.sorted(java.util.Comparator.reverseOrder()).forEach(path -> {
                    try { Files.delete(path); } catch (java.io.IOException e) { throw new RuntimeException(e); }
                });
            }
        }
    }
}
