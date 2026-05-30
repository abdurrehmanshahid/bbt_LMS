$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$postgresRoot = Join-Path $root 'postgresql'
$redisRoot = Join-Path $root 'redis'
$logsRoot = Join-Path $root 'logs'

New-Item -ItemType Directory -Force -Path $logsRoot | Out-Null

$postgresData = Join-Path $postgresRoot 'data'
$postgresCtl = Join-Path $postgresRoot 'bin\pg_ctl.exe'
$postgresLog = Join-Path $logsRoot 'postgres.log'
$postgresPort = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue

& $postgresCtl -D $postgresData status *> $null
if ($LASTEXITCODE -ne 0) {
  if ($postgresPort) {
    Write-Host 'PostgreSQL is already available on port 5432'
  } else {
    & $postgresCtl -D $postgresData -o '-p 5432 -h 127.0.0.1' -l $postgresLog start
    if ($LASTEXITCODE -ne 0) {
      throw "LMS PostgreSQL failed to start. Check $postgresLog"
    }
  }
} else {
  Write-Host 'LMS PostgreSQL already running on 127.0.0.1:5432'
}

$redisServer = Join-Path $redisRoot 'redis-server.exe'
$redisConfig = Join-Path $redisRoot 'redis-lms.conf'
$redisRunning = Get-NetTCPConnection -LocalPort 6379 -State Listen -ErrorAction SilentlyContinue
if (-not $redisRunning) {
  Start-Process -FilePath $redisServer -ArgumentList @($redisConfig) -WorkingDirectory $redisRoot -WindowStyle Hidden
  Start-Sleep -Seconds 1
  $redisRunning = Get-NetTCPConnection -LocalPort 6379 -State Listen -ErrorAction SilentlyContinue
  if (-not $redisRunning) {
    throw 'LMS Redis failed to start on 127.0.0.1:6379'
  }
} else {
  Write-Host 'LMS Redis already running on 127.0.0.1:6379'
}

Write-Host 'LMS PostgreSQL started on 127.0.0.1:5432'
Write-Host 'LMS Redis started on 127.0.0.1:6379'
