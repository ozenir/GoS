@echo off
cd /d "%~dp0"
title Heroi contra Hordas - ligando tudo
call "%~dp0_preparar.bat" || exit /b

echo.
echo  1/3  Ligando o programa que le os comentarios e presentes (janela preta "LIVE")...
start "Heroi contra Hordas - LIVE" cmd /k node servidor.js
timeout /t 3 /nobreak >nul

echo  2/3  Abrindo a janela do jogo...
call "3-abrir-janela-do-jogo.bat"

echo  3/3  Abrindo o TikTok LIVE Studio...
set "LS="
for /f "delims=" %%F in ('dir /s /b "%APPDATA%\Microsoft\Windows\Start Menu\Programs\*LIVE Studio*.lnk" "%ProgramData%\Microsoft\Windows\Start Menu\Programs\*LIVE Studio*.lnk" 2^>nul') do if not defined LS set "LS=%%F"
if not defined LS goto semstudio
start "" "%LS%"
goto pronto

:semstudio
echo       Nao achei o TikTok LIVE Studio instalado. Abra ele pelo menu Iniciar.

:pronto
echo.
echo  ============================================================
echo   Tudo ligado! Agora, no TikTok LIVE Studio:
echo.
echo   SO NA PRIMEIRA VEZ (ele guarda para as proximas):
echo     - deixe a tela em RETRATO (em pe)
echo     - adicione a fonte "Captura de janela" e escolha
echo       a janela "Heroi contra Hordas"; estique na tela toda
echo     - deixe o audio do sistema ligado (para a musica)
echo.
echo   TODA VEZ:  clique em "Entrar ao vivo".
echo   Em ate 1 minuto, a janela preta "LIVE" mostra:
echo     Ligado na live de @...
echo  ============================================================
echo.
pause
