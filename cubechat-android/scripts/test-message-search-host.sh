#!/usr/bin/env bash
# Offline in-memory chat search only; no Android app, DB, keys or network.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
classes="$(mktemp -d)"
trap 'rm -rf "$classes"' EXIT
javac -encoding UTF-8 --release 17 -d "$classes" \
  "$here/app/src/main/java/org/cubechat/android/MessageSearch.java" \
  "$here/app/src/main/java/org/cubechat/android/MessageJump.java" \
  "$here/tests/MessageSearchTest.java" \
  "$here/tests/MessageJumpTest.java"
java -cp "$classes" org.cubechat.android.MessageSearchTest
java -cp "$classes" org.cubechat.android.MessageJumpTest
