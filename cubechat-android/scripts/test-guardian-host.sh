#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
classes="$(mktemp -d)"
trap 'rm -rf "$classes"' EXIT
javac -encoding UTF-8 --release 17 -d "$classes" \
  "$here/app/src/main/java/org/cubechat/android/CellObservation.java" \
  "$here/app/src/main/java/org/cubechat/android/CellObservationBook.java" \
  "$here/tests/CellObservationBookTest.java"
java -cp "$classes" org.cubechat.android.CellObservationBookTest
