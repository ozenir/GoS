@echo off
cd /d "%~dp0"
title Heroi contra Hordas - TESTE
call "%~dp0_preparar.bat" || exit /b
echo.
echo  Modo teste: chegam comentarios, votos e presentes de mentira. Abrindo o jogo no navegador...
start "" http://localhost:8081
node servidor.js --demo
pause
