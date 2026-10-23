#define AppVersion GetEnv("SOUND_MANAGER_VERSION")
#if AppVersion == ""
  #error SOUND_MANAGER_VERSION not set; build using prepare-release.py
#endif

[Setup]
AppId=Calzon.SimpleSoundManager
AppName=Simple Sound Manager
AppVersion={#AppVersion}
AppPublisher=Calzon
DefaultDirName={localappdata}\Programs\SimpleSoundManager
UsePreviousAppDir=no
DisableDirPage=yes
DefaultGroupName=Simple Sound Manager
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64
OutputDir=build\release-{#AppVersion}
OutputBaseFilename=SimpleSoundManager-{#AppVersion}-Setup
SetupIconFile=app.ico
UninstallDisplayIcon={app}\SimpleSoundManager.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no

[Tasks]
Name: desktopicon; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: "dist\launcher\SimpleSoundManagerLauncher.exe"; DestDir: "{app}"; DestName: "SimpleSoundManager.exe"; Flags: ignoreversion
Source: "dist\SimpleSoundManager\version.txt"; DestDir: "{app}"; DestName: "current_release.txt"; Flags: ignoreversion
Source: "dist\SimpleSoundManager\*"; DestDir: "{app}\releases\{#AppVersion}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Simple Sound Manager"; Filename: "{app}\SimpleSoundManager.exe"; WorkingDir: "{app}"; IconFilename: "{app}\releases\{#AppVersion}\app.ico"; AppUserModelID: "Calzon.SimpleSoundManager"
Name: "{autodesktop}\Simple Sound Manager"; Filename: "{app}\SimpleSoundManager.exe"; WorkingDir: "{app}"; IconFilename: "{app}\releases\{#AppVersion}\app.ico"; AppUserModelID: "Calzon.SimpleSoundManager"; Tasks: desktopicon

[Run]
Filename: "{app}\SimpleSoundManager.exe"; Description: "Launch Sound Manager"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\releases"
Type: files; Name: "{app}\current_release.txt"
