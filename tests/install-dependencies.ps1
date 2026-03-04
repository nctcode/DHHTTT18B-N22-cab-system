# install-dependencies.ps1
# PowerShell script to install all new dependencies for security and resilience features

Write-Host "🚀 Installing dependencies for Scalability & Resilience features..." -ForegroundColor Cyan

Write-Host "`n================================" -ForegroundColor Blue
Write-Host "Installing Shared Resilience Module" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Set-Location backend\shared\resilience
npm install
Write-Host "✓ Shared resilience module installed`n" -ForegroundColor Green

Write-Host "================================" -ForegroundColor Blue
Write-Host "Installing API Gateway Dependencies" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Set-Location ..\..\api-gateway
npm install
Write-Host "✓ API Gateway dependencies installed`n" -ForegroundColor Green

Write-Host "================================" -ForegroundColor Blue
Write-Host "Installing Auth Service Dependencies" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Set-Location ..\auth-service
npm install
Write-Host "✓ Auth Service dependencies installed`n" -ForegroundColor Green

Write-Host "================================" -ForegroundColor Blue
Write-Host "Checking Other Services" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

$services = @("booking-service", "ride-service", "driver-service", "payment-service")

foreach ($service in $services) {
    if (Test-Path "..\$service") {
        Write-Host "Installing $service..." -ForegroundColor Yellow
        Set-Location "..\$service"
        npm install
        Write-Host "✓ $service installed" -ForegroundColor Green
    }
}

# Return to root
Set-Location ..\..\..

Write-Host "`n================================" -ForegroundColor Green
Write-Host "✅ All dependencies installed!" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Green

Write-Host "⚠️  IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Update JWT_SECRET in all .env files with secure values"
Write-Host "2. Generate service API keys for service-to-service auth"
Write-Host "3. Run: " -NoNewline
Write-Host "docker-compose build" -ForegroundColor Blue -NoNewline
Write-Host " to rebuild images"
Write-Host "4. Run: " -NoNewline
Write-Host "docker-compose up -d" -ForegroundColor Blue -NoNewline
Write-Host " to start services`n"

Write-Host "To generate secure secrets, run:" -ForegroundColor Blue
Write-Host "node -e `"console.log(require('crypto').randomBytes(64).toString('hex'))`"" -ForegroundColor Yellow
Write-Host ""
