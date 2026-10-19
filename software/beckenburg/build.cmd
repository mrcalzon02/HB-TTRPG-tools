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
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GraphicsOptionsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.PsxPipelineTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.PsxHorrorUiTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.SoundtrackAudioTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.SoundCoverageTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.HorrorAudioRoutingTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.HorrorAudioRoutingTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.CastleHubIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.BeckenburgUpdatesTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.HeldMeshViewTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GlbPropsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.EvidenceSignalsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.MissionWeatherTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.RecordedWeatherTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.HardEvidenceQuotaTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.AncientGhostVariantsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.AdditionalEvidenceTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.ContractRewardsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.EmfSilenceTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostWritingTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.EquipmentRegistryTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.EquipmentTiersTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.EquipmentStoreDescriptionsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.FieldEquipmentTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.InstrumentActivationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.TieredMediaAndPowerTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.TieredUvAndFirelightTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.ImportedEquipmentModelsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.PackagedSourceModelsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.EquipmentModelCatalogTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.FieldSoundRecorderTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSoundRecorderIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.RecorderModelsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.TierModelForgeTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.VanCargoDoorTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanDotsProjectorsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.OptionalEvidenceReadingsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostEvidenceMatrixTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanFieldEquipmentIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanMeasuredEvidenceTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.SoloEnvironmentalEvidenceTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostBehaviorTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostIdentityTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanRiteNetworkTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostPursuitTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostHearingTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostHearingIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostTakeoverIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanCaseDepartureTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanIncapacitationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanEvidenceJournalTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanCaseFileIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSpatialEvidenceTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSpatialEvidenceIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanIncapacitationHudTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGuestDepartureIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanResumeStoreTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanClientWelcomeTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanHostOwnerRecoveryTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSecureOwnerAdmissionTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanHostAuthorizationRegressionTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSessionResumeIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanOutboundQueueTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanNetworkLatencyTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanHostAccessIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanNetworkDiagnosticsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanRitualDefenseTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanRitualDefenseIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostHearingHudTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostAnimationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostAnimationIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSoundTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSoundIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanCaseFileHudTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSoundHudTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanAcousticsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostSearchTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostLegacyHearingIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostSpatialTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSpatialCombatTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanTelegraphedStrikeTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanTelegraphedStrikeIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanTelegraphedHudTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanApparitionTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostSpriteAtlasIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.DirectionalSpritesIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanApparitionRenderTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanApparitionIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.MouseLookTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanWorldControlsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.EquipmentSelectionTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.SiteSelectionTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.InvestigationSitesTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GrandSiteGeometryTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.ArchitecturalPlansTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.VictorianHouseArchitectureTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSiteSelectionIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.SoloEquipmentUseTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.CameraAimTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.EquipmentSightTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.BeckenburgInstallIdentityTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.BeckenburgProfileImportTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GameplaySmokeTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanFieldJournalIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.VanHidingTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.VanTelemetryTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.FieldSuppliesTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.CustomContractTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LobbyGhostAvatarTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanHunterNameplateTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanPrivateHunterNamesTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanChatTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanChatIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanVoiceCodecTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanVoiceRelayTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanVoiceHostIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanVoiceClientHandshakeTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostLobbySecrecyTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSixHunterVanTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostActiveBehaviorTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.FieldJournalTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.ManualEvidenceJournalTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.VanDiegeticCrtTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.ManualEvidenceHudTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostTraitsTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.HunterCountersTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostDomainTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostFrenzyTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.MaterialAtlasTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.TeamCalloutTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.VanStagingTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.VanNavigationVisualTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostPracticeTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanProtocolTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanClientDisconnectTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGracefulLeaveTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanCaseTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanCaseIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanWorldTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanWorldIntegrationTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanWorldRenderTest || set "TESTS_FAILED=1"
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanLobbyTest || set "TESTS_FAILED=1"
if exist src\test\java\org\beckenburg\SmokeTest.java java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.SmokeTest || set "TESTS_FAILED=1"
rem Execute every regression, but NEVER package when any test fails.
if defined TESTS_FAILED (echo ERROR: one or more Beckenburg regression tests failed & exit /b 1)
jar --create --file build\beckenburg-game.jar --main-class org.beckenburg.InvestigationGame -C build\classes org\beckenburg || exit /b 1
echo Built build\beckenburg-game.jar
if /I "%~1"=="run" java -jar build\beckenburg-game.jar
