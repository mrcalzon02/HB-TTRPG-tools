package io.github.mrcalzon02.barotrauma.assets;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets.AssetRole;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets.AssetSource;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets.Mode;

import java.nio.file.Files;
import java.nio.file.Path;

/** Decodes every binary fallback PNG from the runtime classpath. */
public final class PackagedFallbackAssetVerification {
    private PackagedFallbackAssetVerification() { }

    public static void verifyContract() throws Exception {
        Path root = Files.createTempDirectory("barotrauma-fallback-assets-");
        try {
            BarotraumaDonorAssets assets = new BarotraumaDonorAssets(root.resolve("assets.properties"));
            assets.saveConfiguration(Mode.FALLBACK, null);
            for (AssetRole role : AssetRole.values()) {
                var resolved = assets.resolve(role);
                require(resolved.source() == AssetSource.PACKAGED_FALLBACK,
                        role + " did not resolve to the packaged fallback in fallback-only mode.");
                var icon = assets.loadIcon(role, 64, 64);
                require(icon.getIconWidth() == 64 && icon.getIconHeight() == 64,
                        role + " fallback PNG could not be decoded and scaled.");
            }
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(java.util.Comparator.reverseOrder()).toList()) {
                    Files.deleteIfExists(path);
                }
            }
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Packaged fallback PNG assets passed.");
    }
}
