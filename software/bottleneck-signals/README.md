# Bottleneck Signals — manual Firefox installation

Version: 0.4.1 (staged experimental test build; not yet Mozilla-approved)

Bottleneck Signals is an independent, passive Firefox extension for visible conversation-status alerts. Designed for ChatGPT, with best-effort experimental Claude detection. Not affiliated with, sponsored by, or endorsed by OpenAI or Anthropic.

## Temporary manual installation (Firefox)

1. Obtain the v0.4.1 staged ZIP from the project distribution; extract it to a folder. The root of the extracted package must contain `manifest.json`.
2. In Firefox, visit `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on**.
4. Select the extracted `manifest.json` file.
5. Reload any ChatGPT and Claude conversation tabs you already had open.
6. Open the Bottleneck Signals toolbar popup to see the tab dashboard, disable/enable orange flashing (enabled by default), or adjust the idle warning threshold.

**Temporary add-ons are removed when Firefox exits.** Load again after each restart. Ordinary permanent Firefox installations require a Mozilla-signed add-on. Do not disable or bypass signing security.

## Indicators
- Green G/C: responding.
- Orange G/C (flashing by default): finished and awaiting input.
- Red G/C: recognized blocking/error or connection interruption.
- Gray G/C: not reliably classified.
- Stall warning: suspected lack of visible progress, advisory only.

## Privacy and scope
Read-only monitoring of relevant visible controls and current response state. No automatic submissions, retries, stops, conversation scheduling, rate-limit workarounds, external telemetry, or collection of chat histories. Preferences are kept in Firefox extension storage. Claude support is experimental and Claude may replace its own favicon.

## Release status
v0.4.0 was submitted for Mozilla review. v0.4.1 is a staged follow-up addressing connection-interrupted detection, not yet signed or approved. This repository directory holds documentation; the ZIP should not be presented as hosted here until a binary upload has been verified.

## Troubleshooting
If the favicon stays gray: check that Firefox loaded the extension under `about:debugging`, reload that tab, and inspect the popup's detector diagnostics. For suspected stalls or errors, inspect the conversation manually; the add-on never intervenes.
