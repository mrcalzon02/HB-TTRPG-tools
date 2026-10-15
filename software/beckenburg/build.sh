#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
mkdir -p build/classes
javac --release 17 -encoding UTF-8 -d build/classes src/main/java/org/beckenburg/*.java src/test/java/org/beckenburg/*.java
java -Djava.awt.headless=true -ea -cp build/classes org.beckenburg.GameplaySmokeTest
if [ -f src/test/java/org/beckenburg/SmokeTest.java ]; then java -Djava.awt.headless=true -ea -cp build/classes org.beckenburg.SmokeTest; fi
jar --create --file build/beckenburg-game.jar --main-class org.beckenburg.InvestigationGame -C build/classes org/beckenburg
printf '%s\n' 'Built build/beckenburg-game.jar'
if [ "${1:-}" = run ]; then java -jar build/beckenburg-game.jar; fi
