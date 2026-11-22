#!/usr/bin/env bash
# Host-only draft acknowledgement/retry rules. Does not open Android vault,
# send a message, access the network, or record any user draft contents.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
classes="$(mktemp -d)"
trap 'rm -rf "$classes"' EXIT

javac --release 17 -encoding UTF-8 -d "$classes" \
    "$here/app/src/main/java/org/cubechat/android/DraftSaveState.java" \
    "$here/app/src/main/java/org/cubechat/android/DraftStatusText.java" \
    "$here/tests/DraftSaveStateTest.java" \
    "$here/tests/DraftStatusTextTest.java" \
    "$here/tests/DraftInterleavedLifecycleTest.java"
java -cp "$classes" org.cubechat.android.DraftSaveStateTest
java -cp "$classes" org.cubechat.android.DraftStatusTextTest
java -cp "$classes" org.cubechat.android.DraftInterleavedLifecycleTest
