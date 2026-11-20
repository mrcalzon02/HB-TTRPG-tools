#!/usr/bin/env bash
# Pure offline contact ordering/filtering checks. No Android, vault or radio.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
classes="$(mktemp -d)"
trap 'rm -rf "$classes"' EXIT
javac --release 17 -encoding UTF-8 -d "$classes" \
  "$here/app/src/main/java/org/cubechat/android/ConversationPickerModel.java" \
  "$here/tests/ConversationPickerModelTest.java"
java -cp "$classes" org.cubechat.android.ConversationPickerModelTest
