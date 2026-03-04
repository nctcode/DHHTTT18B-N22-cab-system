# Health Check Script - PowerShell version
# Tests all microservices health endpoints

$BaseUrl = "http://localhost"
$services = @(
    @{Name="API Gateway"; Port=3000},
    @{Name="Auth Service"; Port=3001},
    @{Name="User Service"; Port=3002},
    @{Name="Driver Service"; Port=3003},
    @{Name="Booking Service"; Port=3004},
    @{Name="Ride Service"; Port=3005},
    @{Name="Payment Service"; Port=3006},
    @{Name="Pricing Service"; Port=3007},
    @{Name="Notification Service"; Port=3008},
    @{Name="Review Service"; Port=3009}
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   CAB Booking System - Health Check" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$total = 0
$passed = 0

foreach ($service in $services) {
    $url = "${BaseUrl}:$($service.Port)/health"
    $total++
    
    Write-Host "Checking $($service.Name) (port $($service.Port))... " -NoNewline
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ OK" -ForegroundColor Green
        $passed++
    }
    catch {
        Write-Host "❌ FAILED" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Results: $passed/$total services healthy" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if ($passed -eq $total) {
    Write-Host "All services are running! ✅" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some services are down! ❌" -ForegroundColor Red
    exit 1
}
