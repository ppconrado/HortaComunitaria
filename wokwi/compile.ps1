$ErrorActionPreference = 'Stop'

$cliPath = Join-Path $PSScriptRoot 'arduino-cli.exe'
if (-not (Test-Path $cliPath)) {
  $globalCli = Get-Command arduino-cli -ErrorAction SilentlyContinue
  if ($globalCli) {
    $cliPath = $globalCli.Source
  } else {
    throw 'Arduino CLI não encontrado. Coloque arduino-cli.exe em wokwi ou adicione-o ao PATH.'
  }
}

Push-Location $PSScriptRoot
try {
  & $cliPath compile --fqbn esp32:esp32:esp32 wokwi.ino --output-dir build
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}