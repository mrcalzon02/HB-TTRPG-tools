package org.cubechat.android;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/** Exercises the exact client feed and metadata checks without installing a synthetic build. */
public final class UpdateSelectionTest {
    private static final String REPO = "https://github.com/" + CubeChatReleases.REPOSITORY;
    private static final String FEED = "https://api.github.com/repos/" + CubeChatReleases.REPOSITORY + "/releases?per_page=100&page=";
    private static final String SHA = "a".repeat(64);
    private final Map<String,String> responses = new HashMap<>();
    private String unavailableUrl = "";

    private JSONObject release(String version, int code, boolean preview, boolean draft) throws Exception {
        String tag = CubeChatReleases.PREFIX + version;
        String base = REPO + "/releases/download/" + tag.replace("+", "%2B") + "/";
        JSONObject manifest = new JSONObject().put("applicationId", CubeChatReleases.APP).put("versionCode", code)
                .put("versionName", version).put("tag", tag).put("apk", "CubeChat.apk").put("size", 4096)
                .put("url", base + "CubeChat.apk").put("signerSha256", CubeChatReleases.SIGNER).put("sha256", SHA);
        responses.put(base + "release.json", manifest.toString());
        JSONArray assets = new JSONArray();
        for (String name : new String[]{"release.json", "CubeChat.apk"}) {
            assets.put(new JSONObject().put("name", name).put("size", 4096).put("state", "uploaded")
                    .put("browser_download_url", base + name).put("digest", "sha256:" + SHA));
        }
        return new JSONObject().put("tag_name", tag).put("draft", draft).put("prerelease", preview)
                .put("assets", assets).put("body", "Offline messaging update");
    }

    private CubeChatReleases.Offer check(long installed) throws Exception {
        return CubeChatReleases.check(installed, (url, limit) -> {
            if (url.equals(unavailableUrl)) throw new IOException("HTTP 503");
            if (!responses.containsKey(url)) throw new AssertionError("Unexpected request: " + url);
            return responses.get(url);
        });
    }

    private void run() throws Exception {
        JSONObject unrelated = new JSONObject().put("tag_name", "sound-manager-v19.0.0").put("draft", false);
        JSONObject stable = release("5.0.0", 8, false, false);
        JSONObject candidate = release("0.3.1-rc.1", 12, true, false);
        JSONObject draft = release("10.0.0", 25, false, true);
        responses.remove(REPO + "/releases/download/" + draft.getString("tag_name") + "/release.json");
        JSONArray first = new JSONArray().put(draft).put(stable);
        while (first.length() < 100) first.put(unrelated);
        responses.put(FEED + 1, first.toString());
        responses.put(FEED + 2, new JSONArray().put(candidate).toString());
        CubeChatReleases.Offer offer = check(7);
        require(offer != null && offer.code == 12 && "0.3.1-rc.1".equals(offer.version));
        require("Offline messaging update".equals(offer.notes));
        require(check(12) == null && check(13) == null);

        String manifestUrl = REPO + "/releases/download/" + candidate.getString("tag_name") + "/release.json";
        JSONObject metadata = new JSONObject(responses.get(manifestUrl));
        for (String field : new String[]{"applicationId", "versionName", "apk", "url", "sha256", "signerSha256", "size", "versionCode"}) {
            Object previous = metadata.get(field);
            responses.put(manifestUrl, metadata.put(field, "invalid").toString());
            try {
                check(8);
                throw new AssertionError("Unverified release metadata accepted: " + field);
            } catch (IOException expected) {
                require(expected.getMessage().contains("verified"));
            }
            metadata.put(field, previous);
        }

        responses.remove(manifestUrl);
        candidate.getJSONArray("assets").getJSONObject(1).put("browser_download_url", "https://example.org/CubeChat.apk");
        responses.put(FEED + 2, new JSONArray().put(candidate).toString());
        require(check(0).code == 8 && check(0).incomplete);

        // The greatest build code might be beyond page ten in the shared Foundry repository.
        JSONArray full = new JSONArray();
        for (int i = 0; i < 100; i++) full.put(unrelated);
        for (int page = 1; page <= 11; page++) responses.put(FEED + page, full.toString());
        JSONObject plus = release("0.2.0-preview+15", 29, true, false);
        String plusUrl = REPO + "/releases/download/cubechat-android-v0.2.0-preview%2B15/";
        // A literal plus in release.json is equivalent to GitHub's encoded path.
        JSONObject plusManifest = new JSONObject(responses.get(plusUrl + "release.json"));
        responses.put(plusUrl + "release.json", plusManifest.put("url", plusUrl.replace("%2B", "+") + "CubeChat.apk").toString());
        responses.put(FEED + 12, new JSONArray().put(stable).put(plus).toString());
        unavailableUrl = REPO + "/releases/download/" + stable.getString("tag_name") + "/release.json";
        offer = check(8);
        require(offer != null && offer.code == 29 && offer.incomplete && offer.url.equals(plusUrl + "CubeChat.apk"));
        unavailableUrl = "";
        require(!check(8).incomplete);

        // A full final page is followed by a genuine empty page.
        responses.put(FEED + 12, "[]");
        require(check(0) == null);
        System.out.println("PASS: paginated product filtering, previews by Android build code, no drafts or downgrade, trusted asset/digest/signer/size and metadata-only traffic");
    }

    private static void require(boolean condition) {
        if (!condition) throw new AssertionError();
    }

    public static void main(String[] args) throws Exception { new UpdateSelectionTest().run(); }
}
