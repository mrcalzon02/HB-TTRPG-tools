@echo off
setlocal
cd /d "%~dp0"
where javac >nul 2>nul || (echo Java 17+ JDK required & exit /b 1)
if not exist build\classes mkdir build\classes
> build\sources.txt (
  for %%F in (src\main\java\org\beckenburg\*.java) do @echo "%%~fF"
  for %%F in (src\test\java\org\beckenburg\*.java) do @echo "%%~fF"
)
javac --release 17 -encoding UTF-8 -d build\classes @build\sources.txt || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes org.beckenburg.GameplaySmokeTest || exit /b 1
if exist src\test\java\org\beckenburg\SmokeTest.java java -Djava.awt.headless=true -ea -cp build\classes org.beckenburg.SmokeTest || exit /b 1
jar --create --file build\beckenburg-game.jar --main-class org.beckenburg.InvestigationGame -C build\classes org\beckenburg || exit /b 1
echo Built build\beckenburg-game.jar
if /I "%~1"=="run" java -jar build\beckenburg-game.jar
