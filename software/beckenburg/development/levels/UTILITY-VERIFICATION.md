# Repeatable environment utility checks

Production verification currently covers House, Farmhouse, then School. The other six site categories remain locked while their architecture is developed and inspected.

1. Author a switch socket for each indoor circuit at the supporting wall plane, approximately 1.2 m above its room floor. Keep it outside door/window openings and stair voids. Give the breaker its own service-room wall socket. Fixture sockets sit at the actual ceiling, with styles selected for room use.
2. Compile the current source and the two focused checks below. They require Java 17 or newer and do not open a game window or audio device. Quote Java system-property arguments in PowerShell.

```powershell
javac --release 17 -d build/level-utilities-check -sourcepath src/main/java src/main/java/org/beckenburg/InvestigationGame.java src/test/java/org/beckenburg/AuthoredUtilitiesTest.java src/test/java/org/beckenburg/SoloElevationTest.java
java '-Djava.awt.headless=true' '-Dbeckenburg.audio.mute=true' -cp build/level-utilities-check org.beckenburg.AuthoredUtilitiesTest
java '-Djava.awt.headless=true' '-Dbeckenburg.audio.mute=true' -cp build/level-utilities-check org.beckenburg.SoloElevationTest
```

3. Fix every reported operating-position defect in the authored source. The switch check searches standing positions on the correct deck, requires capsule clearance, and exercises the real aim and line-of-sight query with closed doors. Increasing interaction range is not a placement fix.
4. Review the actual game camera at matching poses with each room circuit on/off and the breaker on/off. The numerical checks validate circuit isolation and brightness output; they do not establish final rendered lighting quality or verify mesh attachment by themselves.
5. Walk each stair, use upstairs equipment, place deployed material on upper floors, and return to the actual van for extraction. Repeat after changing room volumes, stairs, furniture footprints or portals.

The utilities check covers 36 wall switches, solid wall backing outside door/window openings, three physically reachable breakers, ceiling socket heights, individual circuit isolation, breaker blackout, 43 door acoustic links, six stair links, operable-window attenuation, source elevation and deterministic bounded ambience. The solo check covers measurements, callout zones and salt placement in all 36 indoor rooms, upstairs ward/rite completion, rejection of extraction at another elevation, and the physical van console.

Acoustics derive from authored portals and material names. Closed doors and closed glazing attenuate sound; open stair apertures carry it between floors. Ordinary sound can reach the van, while ghost-hearing routes keep extraction occupants private. Architecture never sends ghost-event cues. Building ambience uses the existing packaged electrical recording and quiet original structural/pipe sounds; the separate weather system owns wind/rain outdoors.

Solo movement resolves support continuously and sets camera eye height from the resulting standing surface. Equipment, scans, wards, rites, callouts, camera rays, deployed materials, doors, windows and extraction use explicit elevation. The map overlay draws the authored floor currently occupied rather than an inferred room grid.
