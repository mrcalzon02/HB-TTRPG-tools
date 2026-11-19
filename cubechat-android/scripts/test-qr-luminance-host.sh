#!/usr/bin/env bash
# Offline QR image compositing test. No pairing keys, camera, calls or network.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
classes="$(mktemp -d)"
trap 'rm -rf "$classes"' EXIT

javac --release 17 -encoding UTF-8 -d "$classes" \
  "$here/app/src/main/java/org/cubechat/android/QrLuminanceOverlay.java" \
  "$here/tests/QrLuminanceOverlayTest.java"
java -cp "$classes" org.cubechat.android.QrLuminanceOverlayTest
