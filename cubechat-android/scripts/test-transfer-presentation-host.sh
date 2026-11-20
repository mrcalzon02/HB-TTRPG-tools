#!/usr/bin/env bash
# Pure offline status/notification fixtures. No Android SDK or device required.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
classes="$(mktemp -d)"
trap 'rm -rf "$classes"' EXIT
javac -encoding UTF-8 --release 17 -d "$classes" \
  "$here/app/src/main/java/org/cubechat/android/TransferProgress.java" \
  "$here/app/src/main/java/org/cubechat/android/TransferEventText.java" \
  "$here/tests/TransferPresentationTest.java"
java -cp "$classes" org.cubechat.android.TransferPresentationTest
