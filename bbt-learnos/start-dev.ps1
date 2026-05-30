# BBT LearnOS — Start local dev environment
# Run this after Windows restart to bring up all services

Write-Host "Starting BBT LearnOS dev environment..." -ForegroundColor Cyan

# 1. Start Postgres + Redis in WSL2
Write-Host "`n[1/3] Starting database services in WSL2..." -ForegroundColor Yellow
wsl -e bash -c "sudo service postgresql start && sudo service redis-server start && echo 'Services started'"

Start-Sleep -Seconds 2

# 2. Start API in a new terminal window (port 4000)
Write-Host "[2/3] Starting API server (port 4000)..." -ForegroundColor Yellow
$apiPath = "$PSScriptRoot\apps\api"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiPath'; Write-Host 'API starting on http://localhost:4000/api' -ForegroundColor Green; pnpm dev"

Start-Sleep -Seconds 3

# 3. Start Web in a new terminal window (port 3000)
Write-Host "[3/3] Starting web app (port 3000)..." -ForegroundColor Yellow
$webPath = "$PSScriptRoot\apps\web"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$webPath'; Write-Host 'Web starting on http://localhost:3000' -ForegroundColor Green; pnpm dev"

Write-Host "`nAll services launching. Wait ~15s then open:" -ForegroundColor Cyan
Write-Host "  http://localhost:3000             (web app)" -ForegroundColor White
Write-Host "  http://localhost:4000/api         (API)" -ForegroundColor White
Write-Host "`nDemo accounts:" -ForegroundColor Cyan
Write-Host "  learner@bbt.edu.pk  / Password123!" -ForegroundColor White
Write-Host "  creator@bbt.edu.pk  / Password123!" -ForegroundColor White
Write-Host "  admin@bbt.edu.pk    / Password123!" -ForegroundColor White
