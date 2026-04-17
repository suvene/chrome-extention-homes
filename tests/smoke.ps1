$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$contentPath = Join-Path $repoRoot 'content.js'
$cssPath = Join-Path $repoRoot 'content.css'
$docsPath = Join-Path $repoRoot 'docs'

Write-Host 'Checking JavaScript syntax...'
node --check $contentPath

Write-Host 'Checking that legacy hidden references are removed...'
$legacyMatches = Select-String -Path $contentPath, $cssPath, (Join-Path $docsPath '*') -Pattern '\bhidden\b|hc-hidden|isAutoHiddenStatus'
if ($legacyMatches) {
  $legacyMatches | ForEach-Object {
    Write-Error "Legacy hidden reference found: $($_.Path):$($_.LineNumber): $($_.Line.Trim())"
  }
  exit 1
}

Write-Host 'Checking that JSON import/export controls still exist...'
$requiredPatterns = @(
  'function buildExportPayload',
  'function parseImportPayload',
  'async function exportJson',
  'async function importJson',
  'id="hc-export"',
  'id="hc-import"'
)

$content = Get-Content $contentPath -Raw
foreach ($pattern in $requiredPatterns) {
  if ($content -notmatch [regex]::Escape($pattern)) {
    Write-Error "Required pattern missing from content.js: $pattern"
    exit 1
  }
}

Write-Host 'Smoke checks passed.'
