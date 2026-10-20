@echo off
setlocal
cd /d "%~dp0"
where javac >nul 2>nul || (echo Java 17+ JDK required & exit /b 1)
if exist build\classes rmdir /s /q build\classes
if exist build\test rmdir /s /q build\test
if not exist build\classes mkdir build\classes
if not exist build\test mkdir build\test
> build\sources-main.txt (
  for %%F in (src\main\java\org\beckenburg\*.java) do @echo "src/main/java/org/beckenburg/%%~nxF"
)
> build\sources-tests.txt (
  for %%F in (src\test\java\org\beckenburg\*.java) do @echo "src/test/java/org/beckenburg/%%~nxF"
)
javac --release 17 -encoding UTF-8 -d build\classes @build\sources-main.txt || exit /b 1
if not exist assets\runtime\directional-sprites.zip (echo ERROR: required in-game sprite assets missing & exit /b 1)
if not exist build\classes\org\beckenburg mkdir build\classes\org\beckenburg
copy /Y assets\runtime\directional-sprites.zip build\classes\org\beckenburg\directional-sprites.zip >nul || exit /b 1
rem Reassemble the nine verified sprite payload parts, preserving binary bytes.
for %%N in (00 01 02 03 04 05 06 07 08) do (
  if not exist "assets\runtime\ghost-sprite-parts\ghost-sprite-expansion-v3.zip.part%%N" (echo ERROR: missing ghost sprite part %%N & exit /b 1)
)
copy /b "assets\runtime\ghost-sprite-parts\ghost-sprite-expansion-v3.zip.part00"+"assets\runtime\ghost-sprite-parts\ghost-sprite-expansion-v3.zip.part01"+"assets\runtime\ghost-sprite-parts\ghost-sprite-expansion-v3.zip.part02"+"assets\runtime\ghost-sprite-parts\ghost-sprite-expansion-v3.zip.part03"+"assets\runtime\ghost-sprite-parts\ghost-sprite-expansion-v3.zip.part04"+"assets\runtime\ghost-sprite-parts\ghost-sprite-expansion-v3.zip.part05"+"assets\runtime\ghost-sprite-parts\ghost-sprite-expansion-v3.zip.part06"+"assets\runtime\ghost-sprite-parts\ghost-sprite-expansion-v3.zip.part07"+"assets\runtime\ghost-sprite-parts\ghost-sprite-expansion-v3.zip.part08" "build\classes\org\beckenburg\ghost-sprite-expansion-v3.zip" >nul || exit /b 1
if not exist assets\runtime\ui\psx-horror-ui-free-assets.zip (echo ERROR: PSX Horror UI archive missing & exit /b 1)
copy /Y assets\runtime\ui\psx-horror-ui-free-assets.zip build\classes\org\beckenburg\psx-horror-ui-free-assets.zip >nul || exit /b 1
if not exist build\classes\org\beckenburg\music mkdir build\classes\org\beckenburg\music
for %%T in (ambient-cold-unresolved-drone.zip ambient-sombra-profunda.zip castle-candlelit-shadows.zip hunt-final-surge.zip ritual-final-strike.zip.0 ritual-final-strike.zip.1 ritual-of-ash.zip.0 ritual-of-ash.zip.1) do (
  if not exist "assets\runtime\music\%%T" (echo ERROR: required music archive %%T missing & exit /b 1)
  copy /Y "assets\runtime\music\%%T" "build\classes\org\beckenburg\music\%%T" >nul || exit /b 1
)
rem Optional CC0 NOX Foley subset: only curated, converted WAVs; no source archive.
if exist assets\runtime\sfx (
  if not exist build\classes\org\beckenburg\sfx mkdir build\classes\org\beckenburg\sfx
  for %%S in (assets\runtime\sfx\*.wav) do (
    if exist "%%~fS" copy /Y "%%~fS" "build\classes\org\beckenburg\sfx\%%~nxS" >nul || exit /b 1
  )
)
if not exist build\classes\org\beckenburg\models mkdir build\classes\org\beckenburg\models
for %%M in (light_switch_1 ceiling_lamp_1_off door_1_loose shelf_mp_6 chair_mp_5 ceiling_lamp_1_on cross_mp_2 flashlight_mp_1 armchair_1 sofa_1 dinner_table_1 wardrobe_mp_1 display_cabinet_mp_2 tv_mp_1 tv_table_1_4 lamp_3_on lamp_3_off ceiling_lamp_4_on ceiling_lamp_4_off pc_keyboard_mp_1 vape_mp_1 dosimeter_1 dosimeter_2 walkie_talkie_2 handheld_tablet_1 monitoring_screen_mp_1 pc_mp_1 button_12 book_mp_1 open_book_mp_1 dosimeter_4 walkie_talkie_1 exploration_emf_detector exploration_flashlight exploration_flashlight_poquet exploration_photo_camera exploration_spirit_box exploration_thermal_camera exploration_thermometer exploration_voice_recorder ggbot_car08_van_shell ggbot_car01 ggbot_car05 ggbot_car07 kenney_road_asphalt_straight kenney_road_asphalt_side kenney_road_asphalt_damaged kenney_detail_light_single kenney_detail_dumpster_closed kenney_detail_bench kenney_detail_barrier_type_a blender_sound_recorder_1 blender_sound_recorder_2 blender_sound_recorder_3) do (
  if not exist assets\runtime\models\%%M.glb (echo ERROR: required licensed model %%M missing & exit /b 1)
  copy /Y assets\runtime\models\%%M.glb build\classes\org\beckenburg\models\%%M.glb >nul || exit /b 1
)
rem Include the 150 individually curated Blender equipment models and state forms.
rem PackagedSourceModelsTest checks that every one is approved, loaded and textured.
for %%M in (assets\\runtime\\models\\blender_*.glb) do (
  if not exist "%%M" (echo ERROR: required authored equipment model %%M missing & exit /b 1)
  copy /Y "%%M" "build\\classes\\org\\beckenburg\\models\\%%~nxM" >nul || exit /b 1
)
rem Author all 126 tiered PSX GLBs and embedded low-resolution texture atlases.
java -Djava.awt.headless=true -cp build\classes org.beckenburg.TierModelForge build\classes\org\beckenburg\models || exit /b 1
rem Extract only the curated CC0 castle GLBs with embedded original texture PNGs.
java -Djava.awt.headless=true -cp build\classes org.beckenburg.KenneyMedievalAssets assets\source\kenney_retro-medieval-kit.zip build\classes\org\beckenburg\models || exit /b 1
javac --release 17 -encoding UTF-8 -cp build\classes -d build\test @build\sources-tests.txt || exit /b 1
rem Both release and E2E verify the same freshly assembled jar payload.
jar --create --file build\beckenburg-game.jar --main-class org.beckenburg.InvestigationGame -C build\classes org\beckenburg || exit /b 1
if /I "%~1"=="e2e" goto e2e
rem Release mode never skips any tests in regression-tests.txt.
java -Djava.awt.headless=true -ea -cp build\classes org.beckenburg.BeckenburgRegressionSuite || exit /b 1
echo Built build\beckenburg-game.jar
if /I "%~1"=="run" java -jar build\beckenburg-game.jar
exit /b 0
:e2e
rem Separate smoke/acceptance track: does NOT publish and does NOT replace release tests.
if not exist build\e2e mkdir build\e2e
java -Djava.awt.headless=true -ea -cp build\beckenburg-game.jar;build\test org.beckenburg.VanModuleIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\beckenburg-game.jar;build\test org.beckenburg.VanStreetAndCabinProportionsTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\beckenburg-game.jar;build\test org.beckenburg.VanArrivalStreetTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\beckenburg-game.jar;build\test org.beckenburg.CastleHubMaterialAuditTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\beckenburg-game.jar;build\test org.beckenburg.CastleAndVanVisualAcceptanceTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\beckenburg-game.jar;build\test org.beckenburg.BeckenburgDiagnosticsTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\beckenburg-game.jar;build\test org.beckenburg.BeckenburgFullRoundE2ETest || exit /b 1
echo Verified packaged jar through independent TCP multiplayer end-to-end case
exit /b 0
