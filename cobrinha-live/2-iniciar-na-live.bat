@echo off
cd /d "%~dp0"
title Cobrinha do Jardim - LIVE
call "%~dp0_preparar.bat" || exit /b
node servidor.js
pause
