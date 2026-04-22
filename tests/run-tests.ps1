# Run Level 1 + Level 2 Test Suite (PowerShell)
# Usage: .\run-tests.ps1

param(
    [string]$BaseUrl = "http://localhost:3000/api",
    [switch]$OpenReport
)

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  CAB SYSTEM - LEVEL 1 & 2 TEST SUITE (TC01-TC20)" -ForegroundColor Cyan
Write-Host "  Official 121 Test Cases - Grading Factor" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = $PSScriptRoot

# --- Check Newman installation ---
Write-Host "[1/4] Checking Newman..." -ForegroundColor Yellow
$newmanPath = Get-Command newman -ErrorAction SilentlyContinue
if (-not $newmanPath) {
    Write-Host "Newman not found. Installing globally..." -ForegroundColor Yellow
    npm install -g newman newman-reporter-htmlextra
}
$htmlExtraCheck = npm list -g newman-reporter-htmlextra --depth=0 2>$null
if (-not ($htmlExtraCheck -match "newman-reporter-htmlextra")) {
    npm install -g newman-reporter-htmlextra
}

# --- Update base URL in environment ---
Write-Host "[2/4] Configuring environment (baseUrl=$BaseUrl)..." -ForegroundColor Yellow
$envFile = Join-Path $ScriptDir "postman-environment.json"
$env = Get-Content $envFile | ConvertFrom-Json
foreach ($v in $env.values) {
    if ($v.key -eq "baseUrl") { $v.value = $BaseUrl }
}
$env | ConvertTo-Json -Depth 10 | Set-Content -Path $envFile -Encoding UTF8

# --- Create reports directory ---
$reportDir = Join-Path $ScriptDir "reports"
if (-not (Test-Path $reportDir)) { New-Item -ItemType Directory -Path $reportDir | Out-Null }
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$htmlReport = Join-Path $reportDir "report-L1L2-$timestamp.html"
$jsonReport = Join-Path $reportDir "results-L1L2-$timestamp.json"

# --- Run Newman ---
Write-Host "[3/4] Running tests..." -ForegroundColor Yellow
Write-Host ""

newman run `
    "$ScriptDir\postman-level1-level2.json" `
    --environment "$envFile" `
    --reporters cli,htmlextra,json `
    --reporter-htmlextra-export "$htmlReport" `
    --reporter-htmlextra-title "CAB System Level 1+2 Results" `
    --reporter-htmlextra-darkTheme `
    --reporter-json-export "$jsonReport" `
    --delay-request 300 `
    --timeout-request 15000 `
    --bail false `
    --color on

$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "[4/4] Reports generated:" -ForegroundColor Yellow
Write-Host "  HTML: $htmlReport" -ForegroundColor Green
Write-Host "  JSON: $jsonReport" -ForegroundColor Green

if ($OpenReport) {
    Start-Process $htmlReport
}

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  ALL TESTS PASSED ✅" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "========================================================" -ForegroundColor Red
    Write-Host "  SOME TESTS FAILED ❌  (exit code: $exitCode)" -ForegroundColor Red
    Write-Host "========================================================" -ForegroundColor Red
}

exit $exitCode
