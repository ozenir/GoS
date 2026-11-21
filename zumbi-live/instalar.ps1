# Herói contra Hordas: baixa (ou atualiza) o jogo, cria o atalho na Área de Trabalho e liga tudo.
# Uso no PowerShell:
#   irm https://raw.githubusercontent.com/ozenir/GoS/claude/kind-bohr-lyn3jc/zumbi-live/instalar.ps1 | iex
#
# Se o jogo já estiver em alguma pasta da Área de Trabalho (mesmo com outro nome), atualiza lá.
# Se não estiver em lugar nenhum, instala em Área de Trabalho\zumbi-live.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$desktop = [Environment]::GetFolderPath('Desktop')
$padrao  = Join-Path $desktop 'zumbi-live'
$zip     = Join-Path $env:TEMP 'zumbi-live.zip'
$tmp     = Join-Path $env:TEMP 'zumbi-live-extrair'

Write-Host ''
# Fecha o programa antigo se ainda estiver aberto (porta 8081). Sem isso o novo nao abre e o velho continua rodando.
try {
  Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction Stop | ForEach-Object {
    Write-Host ' Fechando o programa antigo que estava aberto...' -ForegroundColor Yellow
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }
} catch { }

# Procura o jogo ja instalado na Area de Trabalho (ate 3 pastas pra dentro), pelo package.json dele
$locais = @($desktop, (Join-Path $env:USERPROFILE 'Desktop'), (Join-Path $env:USERPROFILE 'OneDrive\Desktop')) | Where-Object { Test-Path $_ } | Select-Object -Unique
$pastas = @()
foreach ($l in $locais) {
  Get-ChildItem -LiteralPath $l -Filter 'package.json' -Recurse -Depth 3 -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\node_modules\\' } |
    ForEach-Object {
      if ((Get-Content -LiteralPath $_.FullName -Raw -ErrorAction SilentlyContinue) -match '"heroi-contra-hordas"') { $pastas += $_.DirectoryName }
    }
}
$pastas = @($pastas | Select-Object -Unique)
if ($pastas.Count -eq 0) { $pastas = @($padrao) }
# A pasta principal (a que vai ser ligada e ganha o atalho): a que nao e a padrao, se existir; senao a padrao
$principal = ($pastas | Where-Object { $_ -ne $padrao } | Select-Object -First 1)
if (-not $principal) { $principal = $pastas[0] }

Write-Host ' Baixando o Heroi contra Hordas...' -ForegroundColor Green
Invoke-WebRequest 'https://github.com/ozenir/GoS/archive/refs/heads/claude/kind-bohr-lyn3jc.zip' -OutFile $zip -UseBasicParsing
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
Expand-Archive $zip -DestinationPath $tmp -Force
$origem = Join-Path $tmp 'GoS-claude-kind-bohr-lyn3jc\zumbi-live'

foreach ($pasta in $pastas) {
  Write-Host (' Atualizando: ' + $pasta) -ForegroundColor Green
  # Guarda a chave do Euler Stream, se ja tiver colocado uma, para nao perder ao atualizar.
  $config = Join-Path $pasta 'config.json'
  $chave = ''
  if (Test-Path -LiteralPath $config) {
    $m = [regex]::Match((Get-Content -LiteralPath $config -Raw), '"chave_euler"\s*:\s*"([^"]*)"')
    if ($m.Success) { $chave = $m.Groups[1].Value }
  }
  # Copia por cima (mantendo o que ja foi instalado: node_modules)
  robocopy $origem $pasta /E /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw ('Nao consegui copiar os arquivos para ' + $pasta) }
  if ($chave) {
    $texto = (Get-Content -LiteralPath $config -Raw) -replace '"chave_euler"\s*:\s*""', ('"chave_euler": "' + $chave + '"')
    [IO.File]::WriteAllText($config, $texto)
  }
}
Remove-Item $zip, $tmp -Recurse -Force

# Atalho na Area de Trabalho para as proximas lives (aponta pra pasta principal).
$atalho = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop 'Zumbi LIVE.lnk'))
$atalho.TargetPath = Join-Path $principal 'ligar-tudo.bat'
$atalho.WorkingDirectory = $principal
$atalho.Save()

$versao = (Get-Content -LiteralPath (Join-Path $principal 'package.json') -Raw | ConvertFrom-Json).version
Write-Host (' Pronto! Versao ' + $versao + ' na pasta: ' + $principal) -ForegroundColor Green
Write-Host ' Nas proximas lives, so dar dois cliques em "Zumbi LIVE" na Area de Trabalho.' -ForegroundColor Green
Start-Process (Join-Path $principal 'ligar-tudo.bat') -WorkingDirectory $principal
