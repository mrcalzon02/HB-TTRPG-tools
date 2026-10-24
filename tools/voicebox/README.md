# Voicebox — local voice production allocation

**Status:** Documented external tool; no Voicebox binaries, model weights, voice samples, service, or API integration are shipped by this repository. This folder is a reproducible entrypoint for a future **local-only** voice production workflow. The Foundry site remains plain static GitHub Pages; do not imply it can run a local GPU TTS service in a visitor's browser.

- **Upstream source and license:** https://github.com/jamiepine/voicebox and https://github.com/jamiepine/voicebox/blob/main/LICENSE
- **Official download:** https://voicebox.sh/ or https://github.com/jamiepine/voicebox/releases
- **Setup/troubleshooting:** https://github.com/jamiepine/voicebox#quick-start and https://voicebox.sh/linux-install
- **Use and consent:** https://github.com/jamiepine/voicebox/blob/main/RESPONSIBLE_USE.md
- **Local integration:** Voicebox advertises REST at `http://127.0.0.1:17493` and an MCP endpoint at `http://127.0.0.1:17493/mcp`, **only while the local app/backend is running**.

## Route A — Windows: install the upstream desktop release

From a **PowerShell** shell in your local checkout of `HB-TTRPG-tools`:

```powershell
# If you do not already have this repository locally:
git clone https://github.com/mrcalzon02/HB-TTRPG-tools.git
Set-Location .\HB-TTRPG-tools

# Download the latest stable published upstream Windows x64 MSI into your user profile.
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\voicebox\download-windows.ps1

# After inspecting the download, to also launch the official MSI installer:
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\voicebox\download-windows.ps1 -LaunchInstaller
```

The helper requests the official **GitHub latest stable release API** and selects the Windows x64 `.msi` asset, never a source archive or a similarly named signature/ZIP. It shows the version, download URL, local destination and computed SHA-256, and it **does not execute the installer unless `-LaunchInstaller` is given**. A computed hash alone is not publisher signature verification. You may instead open the upstream release page and download the MSI manually. Windows ARM64 and other variants should use the upstream compatibility guidance; this helper intentionally handles **Windows x64 only**.

The installer and model downloads can be large; internet access, adequate storage, and sufficient memory/CPU or GPU are needed. Once installed, launch **Voicebox** from Windows Start, download/select a supported model in the app, and create a voice profile from **your own recordings** (or a consenting speaker's recordings).

## Route B — source/developer shell: create a local environment

For development, Voicebox's upstream `just setup` provisions its **own** `backend/venv` (Python 3.12) and JS dependencies; do **not** create a second venv inside the Foundry website repository. Install the upstream prerequisites: Git, **Python 3.12**, Bun, Rust/Cargo, `just`, and the [Tauri native prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS (including appropriate Windows C++ build tools or macOS Xcode). See [upstream contributing instructions](https://github.com/jamiepine/voicebox/blob/main/CONTRIBUTING.md) before building.

**Windows PowerShell (convenience helper):**

```powershell
# From the HB-TTRPG-tools root; clones into your LOCALAPPDATA, never this Git repo.
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\voicebox\start-source.ps1

# Run source after setup (interactive developer servers):
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\voicebox\start-source.ps1 -Run
```

**Direct shell commands (Windows/macOS/Linux, after prerequisites are installed):**

```bash
# Set a scratch workspace OUTSIDE the HB-TTRPG-tools repository.
mkdir -p "$HOME/voicebox-work"
git clone https://github.com/jamiepine/voicebox.git "$HOME/voicebox-work/voicebox"
cd "$HOME/voicebox-work/voicebox"
just setup
just dev
```

On Windows, use the PowerShell helper above instead of the Unix `mkdir -p` example. On Linux, prebuilt desktop installers may not be available; follow upstream Linux build guidance. `just dev` starts upstream development processes and may keep the shell occupied. **Never** assume an upstream Git checkout or this allocation means the program has been installed, compiled, started, or tested.

## Local API checks (only after starting Voicebox)

```powershell
# Is a local Voicebox backend actually responding?
Invoke-RestMethod -Uri 'http://127.0.0.1:17493/profiles' -Method Get

# List local HTTP/MCP capabilities; these requests must not use a public endpoint.
Start-Process 'http://127.0.0.1:17493/docs'
```

After *you* make a voice profile, you can test generation using its **real** profile ID:

```powershell
$profile = '<paste-profile-id-from-the-profiles-response>'
$payload = @{ text = 'A local voice generation test.'; profile_id = $profile; language = 'en' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://127.0.0.1:17493/generate' -Method Post -ContentType 'application/json' -Body $payload
```

The REST and MCP server are an **optional future integration** for local authoring, narration, NPC dialogue, accessibility and Charles-style spoken assistance. There is currently no Foundry proxy, connection UI, automatic runtime discovery, voice-profile upload, or web-to-loopback bridge. A published GitHub Pages website does not acquire permission to call a user's localhost service.

## Security, privacy, and licensing

1. **Consent:** clone only your own voice or one with explicit permission. Synthetic speech must not be used for fraud, unauthorized impersonation, or misleading high-stakes messages. Disclose synthetic audio where required.
2. **Keep data local:** voice reference recordings, outputs, personal profiles, captures, model caches and Python environments stay outside the public repository and must not be committed. Do not host `127.0.0.1:17493` on `0.0.0.0` or forward its port publicly. Treat the service as trusted-local, not authenticated public infrastructure.
3. **Licenses:** the **Voicebox application source is MIT**, *not* CC0. Retain its license if distributing substantial portions of that software; review each independently licensed model, dependency, and any speech-source rights before commercial redistribution. The Foundry's own repository terms remain separate.
4. **No hidden installation:** scripts do not silently add system packages, modify execution policies globally, download model weights, record the microphone, or enable a service at login. The upstream application performs its own setup and model management.

## Integration acceptance gates (not yet completed)

- On a Windows x64 machine, download the official MSI, inspect source and checksum, launch/install it explicitly, and confirm the desktop application runs.
- Alternatively, verify all build prerequisites, `just setup`, and `just dev` in a local source checkout.
- Create an authorized voice profile, generate an audible speech sample, and confirm local files remain outside Git.
- Confirm the `/profiles`, `/generate`, and optional MCP behavior locally. Record tested engine, OS, hardware, exact upstream revision/release and model-license obligations.
- Only then design a separate opt-in Foundry adapter; preserve the static site's compatibility, consent boundaries, graceful offline behavior, and the "mirrored calls, not mirrored logic" rule.

Machine-readable allocation: [`capability.json`](capability.json). This is **not** a claim that `api/foundry-capabilities.json` has an active voice operation registered.

## NUTBUSTER owner voice batch

The owner explicitly authorized voice cloning from their own 82-second WAV, augmented by the 19 existing Original-announcer recordings. The [private self-hosted runner guide](NUTBUSTER-VOICE-PIPELINE.md), [batch program](nutbuster_batch.py) and manually triggered Actions workflow stage six preview recordings or all 74 authored Original lines. No private voice recordings are committed to the public repository. No voice model execution has been verified yet.
