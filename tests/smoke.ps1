$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$smokeScriptPath = Join-Path $repoRoot 'tests\smoke.js'

node $smokeScriptPath
