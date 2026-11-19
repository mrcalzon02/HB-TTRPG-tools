package org.cubechat.android;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Reads public release metadata only. The user opens the APK in an external browser. */
final class CubeChatReleases {
    static final String PREFIX = "cubechat-android-v";
    static final String APP = "org.cubechat.android";
    static final String REPOSITORY = "mrcalzon02/HB-TTRPG-tools";
    static final String SIGNER = "7d8ad886143d7c8e951cd28af2bb143011d498b03bc48ec90a9d876d9ee17877";
    private static final String API = "https://api.github.com/repos/" + REPOSITORY + "/releases";
    private static final int PAGE = 100;

    static class Offer {
        final long code;
        final String version, url, notes;
        final boolean incomplete;
        Offer(long code, String version, String url, String notes, boolean incomplete) {
            this.code = code;
            this.version = version;
            this.url = url;
            this.notes = notes;
            this.incomplete = incomplete;
        }
    }

    interface Reader { String read(String url, int limit) throws IOException; }
    interface AccessCheck {
        void verify() throws IOException;
        /** Optional hook for promptly canceling an already-open HTTP connection. */
        default void connectionOpened(HttpURLConnection connection) { }
        default void connectionClosed(HttpURLConnection connection) { }
    }

    static Offer check(long installed) throws IOException, JSONException {
        return check(installed, () -> {});
    }

    /** Production entry point; checks revocation before each connection and read. */
    static Offer check(long installed, AccessCheck access) throws IOException, JSONException {
        return check(installed, (url, limit) -> read(url, limit, access), access);
    }

    /** Retain the original offline-fixture entry point without changing its API. */
    static Offer check(long installed, Reader reader) throws IOException, JSONException {
        return check(installed, reader, () -> {});
    }

    static Offer check(long installed, Reader reader, AccessCheck access)
            throws IOException, JSONException {
        Offer best = null;
        boolean invalid = false;
        for (long page = 1; ; page++) {
            access.verify();
            JSONArray batch;
            try {
                String pageData = reader.read(API + "?per_page=" + PAGE + "&page=" + page, 4 * 1024 * 1024);
                access.verify();
                batch = new JSONArray(pageData);
            } catch (IOException | JSONException unavailable) {
                // A security cancellation must never be converted into a
                // partially validated update suggestion or a successful scan.
                access.verify();
                if (best == null || Thread.currentThread().isInterrupted()) throw unavailable;
                invalid = true;
                break;
            }
            for (int i = 0; i < batch.length(); i++) {
                JSONObject release = batch.getJSONObject(i);
                String tag = release.optString("tag_name");
                // The GitHub prerelease flag is intentionally eligible. Don't rank previews by their names.
                if (release.optBoolean("draft", true) || !tag.startsWith(PREFIX)) continue;
                String version = tag.substring(PREFIX.length());
                if (!version.matches("[0-9][0-9A-Za-z._+-]{0,79}")) continue;
                JSONArray assets = release.optJSONArray("assets");
                JSONObject apk = asset(assets, "CubeChat.apk");
                JSONObject manifest = asset(assets, "release.json");
                if (apk == null || manifest == null) { invalid = true; continue; }
                String base = assetBase(version);
                String apkUrl = base + "CubeChat.apk";
                String manifestUrl = manifest.optString("browser_download_url");
                if (!isAssetUrl(apkUrl, apk.optString("browser_download_url"))
                        || !isAssetUrl(base + "release.json", manifestUrl)) {
                    invalid = true;
                    continue;
                }
                try {
                    access.verify();
                    String manifestData = reader.read(manifestUrl, 32768);
                    access.verify();
                    JSONObject metadata = new JSONObject(manifestData);
                    Object codeValue = metadata.get("versionCode");
                    long code = metadata.getLong("versionCode");
                    String hash = metadata.getString("sha256");
                    if (!(codeValue instanceof Integer || codeValue instanceof Long) || code <= 0 || code > Integer.MAX_VALUE
                            || !APP.equals(metadata.getString("applicationId")) || !version.equals(metadata.getString("versionName"))
                            || !tag.equals(metadata.optString("tag", tag)) || !"CubeChat.apk".equals(metadata.getString("apk"))
                            || !isAssetUrl(apkUrl, metadata.getString("url")) || !SIGNER.equals(metadata.getString("signerSha256"))
                            || !hash.matches("[0-9a-f]{64}") || !("sha256:" + hash).equals(apk.getString("digest"))
                            || apk.getLong("size") <= 0 || apk.getLong("size") != metadata.getLong("size")) {
                        invalid = true;
                        continue;
                    }
                    if (code > installed && (best == null || code > best.code)) {
                        String notes = release.isNull("body") ? "" : release.optString("body").trim();
                        if (notes.length() > 2500) notes = notes.substring(0, 2500) + "…";
                        best = new Offer(code, version, apkUrl, notes, false);
                    }
                } catch (IOException | JSONException missingOrMalformed) {
                    access.verify();
                    if (Thread.currentThread().isInterrupted()) throw missingOrMalformed;
                    invalid = true;
                }
            }
            if (batch.length() < PAGE) break;
        }
        access.verify();
        if (!invalid) return best;
        if (best == null) throw new IOException("CubeChat release metadata could not be fully verified.");
        return new Offer(best.code, best.version, best.url, best.notes, true);
    }

    static String assetBase(String version) {
        return "https://github.com/" + REPOSITORY + "/releases/download/" + PREFIX + version.replace("+", "%2B") + "/";
    }

    private static boolean isAssetUrl(String expected, String actual) {
        // GitHub encodes '+' in tag paths. Only this single equivalent escape is accepted.
        return expected.equals(actual.replace("+", "%2B").replace("%2b", "%2B"));
    }

    private static JSONObject asset(JSONArray assets, String name) {
        if (assets == null) return null;
        for (int i = 0; i < assets.length(); i++) {
            JSONObject a = assets.optJSONObject(i);
            if (a != null && name.equals(a.optString("name")) && "uploaded".equals(a.optString("state"))) return a;
        }
        return null;
    }

    private static String read(String address, int limit, AccessCheck access) throws IOException {
        URL next = new URL(address);
        for (int hop = 0; hop <= 4; hop++) {
            access.verify();
            if (Thread.currentThread().isInterrupted()) throw new IOException("Update check interrupted.");
            String host = next.getHost();
            if (!"https".equals(next.getProtocol()) || next.getUserInfo() != null || (next.getPort() != -1 && next.getPort() != 443)
                    || !("api.github.com".equals(host) || "github.com".equals(host)
                    || "release-assets.githubusercontent.com".equals(host) || "objects.githubusercontent.com".equals(host))) {
                throw new IOException("Unrecognized update source.");
            }
            access.verify();
            HttpURLConnection c = (HttpURLConnection) next.openConnection();
            try {
                // Register before the first response byte; a lockdown change
                // can now disconnect blocked HTTP reads, not just deny later pages.
                access.connectionOpened(c);
                access.verify();
                c.setRequestProperty("User-Agent", "CubeChat Android updater");
                c.setRequestProperty("Accept", "api.github.com".equals(host) ? "application/vnd.github+json" : "*/*");
                c.setInstanceFollowRedirects(false);
                c.setConnectTimeout(7000);
                c.setReadTimeout(10000);
                access.verify();
                int status = c.getResponseCode();
                access.verify();
                if (status == 301 || status == 302 || status == 303 || status == 307 || status == 308) {
                    String location = c.getHeaderField("Location");
                    if (location == null) throw new IOException("Missing release redirect.");
                    next = new URL(next, location);
                    continue;
                }
                if (status != 200) throw new IOException("GitHub returned HTTP " + status + ".");
                if (c.getContentLengthLong() > limit) throw new IOException("Release metadata is too large.");
                access.verify();
                try (InputStream in = c.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    byte[] chunk = new byte[8192];
                    while (true) {
                        access.verify();
                        int n = in.read(chunk);
                        access.verify();
                        if (n < 0) break;
                        if (out.size() + n > limit) throw new IOException("Release metadata is too large.");
                        out.write(chunk, 0, n);
                    }
                    access.verify();
                    return new String(out.toByteArray(), StandardCharsets.UTF_8);
                }
            } finally {
                access.connectionClosed(c);
                c.disconnect();
            }
        }
        throw new IOException("Too many release redirects.");
    }

    private CubeChatReleases() {}
}
