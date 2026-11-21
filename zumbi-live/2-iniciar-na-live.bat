@echo off
cd /d "%~dp0"
title Heroi contra Hordas - LIVE
call "%~dp0_preparar.bat" || exit /b
node servidor.js
pause
