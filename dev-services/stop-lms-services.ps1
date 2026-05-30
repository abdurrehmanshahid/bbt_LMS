$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$postgresCtl = Join-Path $root 'postgresql\bin\pg_ctl.exe'
$postgresData = Join-Path $root 'postgresql\data'

& $postgresCtl -D $postgresData stop -m fast

$redisProcesses = Get-NetTCPConnection -LocalPort 6379 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $redisProcesses) {
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

Write-Host 'LMS PostgreSQL stopped'
Write-Host 'LMS Redis stopped'
