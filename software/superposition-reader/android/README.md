# SuperPosition Reader for Android

Native Android companion APK for SuperPosition Reader. The app speaks through
**Android's installed TextToSpeech engine**, not Windows SAPI, not Speech Central,
and not bundled copies of Google's proprietary voice data.

## Compatibility

- Android 8.0+ (API 26), designed with large native touch controls for phones.
- Discovers voices actually exposed by the selected installed TTS engine with
  TextToSpeech.getVoices(), and uses setVoice() to select an exact returned Voice.
- Labels the known British English family RJS, GBA, GBB, GBC, GBD, GBG using
  the user's observed names. No voice is falsely presented as installed.
- Local/on-device voices and network-dependent voices are distinguished. Voice
  packages which require downloading are identified as such.
- Android TTS range callbacks enable approximate word highlighting **only** if
  the engine provides timing; passage highlighting remains the fallback.
- Source EPUB/TXT/MD/HTML/DOCX are imported using Android's document picker;
  sources and reading progress are kept inside private app storage. No storage
  permissions or INTERNET permission are requested. Text-layer PDF extraction,
  M4B and Windows LuxTTS voice cloning are not yet ported.
- APK and Windows builds remain separate native targets under the same project.
  Imported EPUBs can be moved between platforms; installed Android voice
  models cannot be copied into the Windows application.

## Build

Android Gradle Plugin 8.7.3, Gradle 8.9, JDK 17, compile SDK 35.

    cd software/superposition-reader/android
    gradle testDebugUnitTest assembleDebug

GitHub Actions produces a sideloadable **debug preview APK** in the workflow
artifact, not a signed Play Store release. Android on-device voice availability,
audible playback, and any engine-specific timing are not proven by CI alone.

This is not a redistribution or open-source relicensing of Google TTS voices.
