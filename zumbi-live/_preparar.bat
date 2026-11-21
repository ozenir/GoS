@echo off
where node >nul 2>nul
if errorlevel 1 if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Instalando o Node.js, so na primeira vez. Se o Windows pedir permissao, clique em Sim.
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
)
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  O Node.js nao esta instalado.
  echo  Baixe a versao LTS em https://nodejs.org , instale e abra este arquivo de novo.
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)
if not exist "%~dp0node_modules\tiktok-live-connector" (
  echo.
  echo  Primeira vez: instalando o que o programa precisa. Leva uns minutos...
  call npm install --omit=dev --no-audit --no-fund
  if errorlevel 1 (
    echo  Deu erro na instalacao. Confira sua internet e tente de novo.
    pause
    exit /b 1
  )
)
rem Se o programa antigo ainda estiver aberto (porta 8081), fecha ele.
rem Sem isso o novo nao consegue abrir e o antigo continua rodando no lugar.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8081" ^| findstr "LISTENING"') do (
  echo  Fechando o programa antigo que ainda estava aberto...
  taskkill /PID %%p /F >nul 2>&1
)
exit /b 0
