param(
  [ValidateSet("lint", "test", "build", "e2e", "all")]
  [string]$Task = "all"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$nodeRoot = Join-Path $repoRoot ".tools\\node-v24.14.0-win-x64"
$nodeExe = Join-Path $nodeRoot "node.exe"
$nextBin = Join-Path $repoRoot "node_modules\\next\\dist\\bin\\next"
$vitestBin = Join-Path $repoRoot "node_modules\\vitest\\vitest.mjs"
$playwrightBin = Join-Path $repoRoot "node_modules\\playwright\\cli.js"

if (-not (Test-Path $nodeExe)) {
  throw "Node local nao encontrado em $nodeExe"
}

if (-not (Test-Path $nextBin)) {
  throw "Dependencias nao instaladas. Rode a instalacao local antes de usar este script."
}

Push-Location $repoRoot

try {
  if ($Task -eq "lint" -or $Task -eq "all") {
    & $nodeExe $nextBin lint
  }

  if ($Task -eq "test" -or $Task -eq "all") {
    & $nodeExe $vitestBin run
  }

  if ($Task -eq "build" -or $Task -eq "all") {
    & $nodeExe $nextBin build
  }

  if ($Task -eq "e2e" -or $Task -eq "all") {
    if (-not (Test-Path $playwrightBin)) {
      throw "Playwright nao instalado. Rode a instalacao local antes de usar este script."
    }

    & $nodeExe $playwrightBin test
  }
}
finally {
  Pop-Location
}
