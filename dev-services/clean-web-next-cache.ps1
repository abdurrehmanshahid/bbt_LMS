$ErrorActionPreference = 'Stop'

$webNextPath = Join-Path $PSScriptRoot '..\bbt-learnos\apps\web\.next'
$resolvedWebNextPath = [System.IO.Path]::GetFullPath($webNextPath)
$expectedRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\bbt-learnos\apps\web'))

if (-not $resolvedWebNextPath.StartsWith($expectedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to remove path outside web app: $resolvedWebNextPath"
}

if (Test-Path -LiteralPath $resolvedWebNextPath) {
  Remove-Item -LiteralPath $resolvedWebNextPath -Recurse -Force
  Write-Host "Removed stale Next.js cache: $resolvedWebNextPath" -ForegroundColor Yellow
} else {
  Write-Host "Next.js cache is already clean." -ForegroundColor Green
}
