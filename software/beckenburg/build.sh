#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
mkdir -p build/classes
javac --release 17 -encoding UTF-8 -d build/classes src/main/java/org/beckenburg/BeckenburgPrototype.java src/test/java/org/beckenburg/SmokeTest.java
java -Djava.awt.headless=true -cp build/classes org.beckenburg.SmokeTest
jar --create --file build/beckenburg-prototype.jar --main-class org.beckenburg.BeckenburgPrototype -C build/classes org/beckenburg
printf '%s\n' 'Built build/beckenburg-prototype.jar'
if [ "${1:-}" = run ]; then java -jar build/beckenburg-prototype.jar; fi
