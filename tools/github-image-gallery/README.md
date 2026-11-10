# GitHub Image Gallery

Automatically turns the image files visible in a GitHub repository directory into a thumbnail gallery *on that directory page*. No individual file-preview pages, GitHub API calls, token, account setup, or background worker.

![Extension icon](icons/gallery-48.png)

## What it does

- Displays PNG, APNG, JPG/JPEG, GIF, WebP, AVIF, SVG, BMP, and ICO images in a responsive grid, above GitHub's original file listing.
- Starts in gallery mode without requiring a click; offers Small / Medium / Large thumbnail controls and a Hide gallery toggle.
- Loads images lazily using each directory link's raw-file route; original GitHub links and normal navigation remain intact.
- Reacts to GitHub's in-page navigation without accumulating duplicate galleries.
- Does not run outside `github.com`, request an API token or extra API/storage permissions, store personal data, or contact telemetry services.

## Install on Firefox (temporary / development)

1. Unzip the archive.
2. Open `about:debugging#/runtime/this-firefox`.
3. Select **Load Temporary Add-on** and choose the extracted `manifest.json`.
4. Visit a GitHub repository image folder; thumbnails are inserted automatically.

**Important:** Firefox removes temporarily loaded extensions on restart. For a permanent standard Firefox installation, the extension must be signed through Mozilla Add-ons (AMO). This ZIP is **not** a signed XPI.

## Install on Chrome / Chromium / Edge (unpacked)

1. Unzip the archive.
2. Open `chrome://extensions` (or `edge://extensions`), enable **Developer mode**.
3. Select **Load unpacked** and choose the extracted directory containing `manifest.json`.

## Test

Run `python tests/smoke_test.py` with Python's `playwright` package and a Chromium browser available. It tests initial gallery insertion, image filtering, filename links, size switching, no duplicate galleries after DOM changes, and GitHub-style in-page navigation. The test uses synthetic sample files and does not access GitHub.

## Limitations

- GitHub regularly changes its directory DOM; unusual layouts may require a selector update. A standalone test fixture is included.
- Only images listed in the rendered directory are displayed (not recursively nested assets).
- Some private repository image URLs or access-controlled assets may not resolve in all browser/session configurations; the original file link is kept accessible and an unavailable image is labeled.
- Lazy thumbnail loading still transfers the image bytes: GitHub does not supply separate thumbnails for arbitrary repository images.

Licensing: no independent license is assigned by this tool package; the repository owner can specify distribution terms.
