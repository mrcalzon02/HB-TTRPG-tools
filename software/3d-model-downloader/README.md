# 3D Capture v0.1.1 — Firefox 3D Model Downloader

This is the recovered **3D Capture** Firefox extension archive provided by the owner on October 27, 2026. The earlier software catalog name was *3D Model Downloader*; the actual `manifest.json` names the extension **3D Capture**.

## Package

- [Download 3D Capture v0.1.1 ZIP](3d-capture-v0.1.1.zip)
- SHA-256: `7de9fddb9bda065ea0bea542fce402361c98d7358319d5c8681022d2229edce7`
- Archive: 27,537 bytes, 16 entries
- Firefox manifest version 2; requires Firefox 140+
- Add-on ID: `3d-capture@local.tools`

The uploaded archive contains source files and Mozilla signature metadata (`META-INF`). Its SHA-256 documents the exact uploaded bytes. GitHub-hosted files are not an independent guarantee of Mozilla installation/signing status.

## Install temporarily in Firefox

1. Download and extract `3d-capture-v0.1.1.zip`.
2. Navigate to `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on** and select the extracted `manifest.json`.
4. Open the target 3D viewer and use the **3D Capture** toolbar icon.
5. Click **Start capture & reload viewer**, interact with the viewer, and use **Save all as ZIP** for recorded original assets or **Export recorded meshes** for the limited WebGL OBJ fallback.

The temporary installation expires when Firefox closes. To install persistently, obtain and verify a correctly signed XPI; do not disable Firefox signature enforcement.

## Features and boundaries

Records original model/texture responses (where observable), including glTF, GLB, OBJ, FBX, STL, PLY and DAE, and can reconstruct some WebGL 1/2 triangle geometry. It cannot dump arbitrary GPU memory, reconstruct unseen or protected data, decrypt files, or fully recover animations/materials/transforms from captured triangles. The add-on uses broad network/site permissions for capture and stores recorded responses locally until the user exports or clears them.

Use only with assets you own or have permission to save. Export manifests may contain private request URLs; review them before sharing. The extension itself does not include personal credentials, retrieved models or external libraries.

## Inspection

The ZIP archive CRCs, manifest JSON, and JavaScript syntax were checked on October 27, 2026. These are static checks, not an end-to-end runtime audit. The source README inside the ZIP contains additional operational limitations and its own historical test claims.

**Distribution note:** This formerly private-deployment catalog listing is now linked to the owner-provided archive, uploaded on the owner's explicit request.
