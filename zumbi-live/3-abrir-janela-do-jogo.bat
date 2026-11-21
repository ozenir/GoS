@echo off
cd /d "%~dp0"
set "NAV=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%NAV%" set "NAV=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%NAV%" set "NAV=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not exist "%NAV%" set "NAV=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%NAV%" set "NAV=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%NAV%" (
  echo Nao achei o Chrome nem o Edge.
  echo Abra este endereco no navegador: http://localhost:8081/#live
  pause
  exit /b
)
rem Janela so com o jogo, em pe (9:16), que nao congela quando fica atras de outra janela.
start "" "%NAV%" --app=http://localhost:8081/#live --window-size=540,990 --user-data-dir="%~dp0.janela-do-jogo" --no-first-run --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling --autoplay-policy=no-user-gesture-required
