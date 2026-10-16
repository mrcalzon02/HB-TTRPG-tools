#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
mkdir -p build
rm -rf build/classes build/test
mkdir -p build/classes build/test
javac --release 17 -encoding UTF-8 -d build/classes src/main/java/org/beckenburg/*.java
javac --release 17 -encoding UTF-8 -cp build/classes -d build/test src/test/java/org/beckenburg/*.java
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GameplaySmokeTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GhostDomainTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.MaterialAtlasTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.TeamCalloutTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.VanStagingTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GhostPracticeTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanProtocolTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanCaseTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanCaseIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanWorldTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanWorldIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanWorldRenderTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanLobbyTest
if [ -f src/test/java/org/beckenburg/SmokeTest.java ]; then java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.SmokeTest; fi
jar --create --file build/beckenburg-game.jar --main-class org.beckenburg.InvestigationGame -C build/classes org/beckenburg
printf '%s\n' 'Built build/beckenburg-game.jar'
if [ "${1:-}" = run ]; then java -jar build/beckenburg-game.jar; fi
