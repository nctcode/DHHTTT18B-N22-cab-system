Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   BAT DAU CHAY TEST LEVEL 1 (API & FLOW) " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Kiem tra thu muc hien tai co phai la thu muc chua package.json khong
if (!(Test-Path "package.json")) {
    Write-Host "Loi: Vui long chay script tu ben trong thu muc 'tests'." -ForegroundColor Red
    exit 1
}

# Cai dat dependency neu chua co
if (!(Test-Path "node_modules")) {
    Write-Host "Dang cai dat dependencies (npm install)..." -ForegroundColor Yellow
    npm install
}

# Chay test bang npx jest
Write-Host ""
Write-Host "Dang thuc thi cac test cases (TC01-TC10)..." -ForegroundColor Yellow
$env:TEST_BASE_URL = "http://localhost:3000"
npx jest level_1_adaptive.test.js --verbose --forceExit --detectOpenHandles

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "   TAT CA TEST CASES DA PASS!              " -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "   CO LOI TRONG QUA TRINH TEST!            " -ForegroundColor Red
    Write-Host "   Vui long kiem tra log phia tren.        " -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
}
