@echo off
cd /d "%~dp0"
title Cobrinha do Jardim - TESTE
call "%~dp0_preparar.bat" || exit /b
echo.
echo  Modo teste: chegam presentes de mentira. Abrindo o jogo no navegador...
start "" http://localhost:8080
node servidor.js --demo
pause
