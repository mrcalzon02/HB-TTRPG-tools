@echo off
setlocal
cd /d "%~dp0"
where javac >nul 2>nul || (echo Java 17+ JDK required & exit /b 1)
if not exist build\classes mkdir build\classes
javac --release 17 -encoding UTF-8 -d build\classes src\main\java\org\beckenburg\BeckenburgPrototype.java src\test\java\org\beckenburg\SmokeTest.java || exit /b 1
java -Djava.awt.headless=true -cp build\classes org.beckenburg.SmokeTest || exit /b 1
jar --create --file build\beckenburg-prototype.jar --main-class org.beckenburg.BeckenburgPrototype -C build\classes org\beckenburg || exit /b 1
echo Built build\beckenburg-prototype.jar
if /I "%~1"=="run" java -jar build\beckenburg-prototype.jar