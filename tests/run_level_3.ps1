Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   BAT DAU CHAY TEST LEVEL 3               " -ForegroundColor Cyan
Write-Host "   (Integration & E2E Tests)                 " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Kiem tra thu muc
if (!(Test-Path "package.json")) {
    Write-Host "Loi: Vui long chay script tu ben trong thu muc 'tests'." -ForegroundColor Red
    exit 1
}

# Cai dat dependency neu chua co
if (!(Test-Path "node_modules")) {
    Write-Host "Dang cai dat dependencies (npm install)..." -ForegroundColor Yellow
    npm install
}

# Kiem tra ket noi API Gateway
Write-Host ""
Write-Host "Dang kiem tra API Gateway (localhost:3000)..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  API Gateway: OK" -ForegroundColor Green
} catch {
    Write-Host "  API Gateway: KHONG KET NOI DUOC!" -ForegroundColor Red
    Write-Host "  -> Hay chay: docker-compose up -d" -ForegroundColor Yellow
    Write-Host "  -> Doi ~30 giay cho cac service khoi dong" -ForegroundColor Yellow
    $continue = Read-Host "  Van muon tiep tuc? (y/N)"
    if ($continue -ne "y") { exit 1 }
}

# Chay test
Write-Host ""
Write-Host "Dang thuc thi cac test cases (TC21-TC30)..." -ForegroundColor Yellow
$env:TEST_BASE_URL = "http://localhost:3000"
npx jest level_3_adaptive.test.js --verbose --forceExit --detectOpenHandles

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "   TAT CA LEVEL 3 TEST CASES DA PASS!      " -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "   CO LOI TRONG QUA TRINH TEST!            " -ForegroundColor Red
    Write-Host "   Vui long kiem tra log phia tren.        " -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
}
