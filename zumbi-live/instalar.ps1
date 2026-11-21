# Herói contra Hordas: baixa (ou atualiza) o jogo na Área de Trabalho, cria o atalho e liga tudo.
# Uso no PowerShell:
#   irm https://raw.githubusercontent.com/ozenir/GoS/claude/kind-bohr-lyn3jc/zumbi-live/instalar.ps1 | iex
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$desktop = [Environment]::GetFolderPath('Desktop')
$pasta   = Join-Path $desktop 'zumbi-live'
$zip     = Join-Path $env:TEMP 'zumbi-live.zip'
$tmp     = Join-Path $env:TEMP 'zumbi-live-extrair'

Write-Host ''
Write-Host ' Baixando o Heroi contra Hordas...' -ForegroundColor Green
Invoke-WebRequest 'https://github.com/ozenir/GoS/archive/refs/heads/claude/kind-bohr-lyn3jc.zip' -OutFile $zip -UseBasicParsing
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
Expand-Archive $zip -DestinationPath $tmp -Force

# Guarda a chave do Euler Stream, se já tiver colocado uma, para não perder ao atualizar.
$config = Join-Path $pasta 'config.json'
$chave = ''
if (Test-Path $config) {
  $m = [regex]::Match((Get-Content $config -Raw), '"chave_euler"\s*:\s*"([^"]*)"')
  if ($m.Success) { $chave = $m.Groups[1].Value }
}

# Copia por cima da pasta antiga (se existir), mantendo o que já foi instalado (node_modules).
robocopy (Join-Path $tmp 'GoS-claude-kind-bohr-lyn3jc\zumbi-live') $pasta /E /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw 'Nao consegui copiar os arquivos para a Area de Trabalho.' }
Remove-Item $zip, $tmp -Recurse -Force

if ($chave) {
  $texto = (Get-Content $config -Raw) -replace '"chave_euler"\s*:\s*""', ('"chave_euler": "' + $chave + '"')
  [IO.File]::WriteAllText($config, $texto)
}

# Atalho na Área de Trabalho para as próximas lives.
$atalho = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop 'Zumbi LIVE.lnk'))
$atalho.TargetPath = Join-Path $pasta 'ligar-tudo.bat'
$atalho.WorkingDirectory = $pasta
$atalho.Save()

Write-Host ' Pronto! Pasta: ' $pasta -ForegroundColor Green
Write-Host ' Nas proximas lives, so dar dois cliques em "Zumbi LIVE" na Area de Trabalho.' -ForegroundColor Green
Start-Process (Join-Path $pasta 'ligar-tudo.bat') -WorkingDirectory $pasta
