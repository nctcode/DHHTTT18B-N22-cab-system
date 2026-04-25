Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   BAT DAU CHAY TEST LEVEL 4               " -ForegroundColor Cyan
Write-Host "   (Transaction & Data Consistency)         " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if (!(Test-Path "package.json")) {
    Write-Host "Loi: Vui long chay script tu ben trong thu muc 'tests'." -ForegroundColor Red
    exit 1
}
if (!(Test-Path "node_modules")) {
    Write-Host "Dang cai dat dependencies (npm install)..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "Dang kiem tra API Gateway (localhost:3000)..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  API Gateway: OK" -ForegroundColor Green
} catch {
    Write-Host "  API Gateway: KHONG KET NOI DUOC!" -ForegroundColor Red
    Write-Host "  -> Hay chay: docker-compose up -d" -ForegroundColor Yellow
    $continue = Read-Host "  Van muon tiep tuc? (y/N)"
    if ($continue -ne "y") { exit 1 }
}

Write-Host ""
Write-Host "Dang thuc thi cac test cases (TC31-TC40)..." -ForegroundColor Yellow
$env:TEST_BASE_URL = "http://localhost:3000"
npx jest level_4_adaptive.test.js --verbose --forceExit --detectOpenHandles

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "   TAT CA LEVEL 4 TEST CASES DA PASS!      " -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "   CO LOI TRONG QUA TRINH TEST!            " -ForegroundColor Red
    Write-Host "   Vui long kiem tra log phia tren.        " -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
}
