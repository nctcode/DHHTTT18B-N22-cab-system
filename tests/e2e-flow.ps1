# End-to-End Flow Test - PowerShell version
# Tests complete booking flow from registration to review

$BaseUrl = "http://localhost:3000/api"
$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   End-to-End Flow Test" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Test counters
$total = 0
$passed = 0

function Test-Step {
    param($name, $scriptBlock)
    $global:total++
    Write-Host "[$global:total] $name... " -NoNewline
    try {
        & $scriptBlock
        Write-Host "✅ PASS" -ForegroundColor Green
        $global:passed++
        return $true
    }
    catch {
        Write-Host "❌ FAIL" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

# Variables to store IDs
$accessToken = ""
$userId = ""
$bookingId = ""
$rideId = ""
$driverId = ""
$paymentId = ""

# Step 1: Register User
Test-Step "Register new user" {
    $body = @{
        username = "testuser_$(Get-Random)"
        password = "password123"
        fullName = "Nguyễn Văn Test"
        phone = "090$(Get-Random -Minimum 1000000 -Maximum 9999999)"
        email = "test@example.com"
        role = "PASSENGER"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method Post -Body $body -ContentType "application/json"
    $script:accessToken = $response.data.accessToken
    $script:userId = $response.data.user.id
    
    if (-not $accessToken) { throw "No access token received" }
}

# Step 2: Create Booking
Test-Step "Create booking" {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $body = @{
        pickup = @{
            lat = 10.762622
            lng = 106.660172
            address = "Quận 1, TP.HCM"
        }
        dropoff = @{
            lat = 10.777730
            lng = 106.695416
            address = "Quận 3, TP.HCM"
        }
        vehicleType = "CAR"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/bookings" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    $script:bookingId = $response.data.id
    
    if (-not $bookingId) { throw "No booking ID received" }
}

# Step 3: Calculate Price
Test-Step "Calculate ride price" {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $body = @{
        distanceKm = 5.5
        durationMin = 20
        vehicleType = "CAR"
        pickup = @{
            lat = 10.762622
            lng = 106.660172
        }
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/pricing/calculate" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    
    if (-not $response.finalPrice) { throw "No price calculated" }
}

# Step 4: Get Available Drivers
Test-Step "Get available drivers" {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $response = Invoke-RestMethod -Uri "$BaseUrl/drivers?status=ONLINE&vehicleType=CAR&take=1" -Method Get -Headers $headers
    
    if ($response.data.Count -gt 0) {
        $script:driverId = $response.data[0].id
    } else {
        # Create a test driver if none available
        Write-Host "`n  (Creating test driver)... " -NoNewline -ForegroundColor Yellow
        $driverBody = @{
            userId = $userId
            name = "Lê Văn Driver"
            phone = "091$(Get-Random -Minimum 1000000 -Maximum 9999999)"
            licenseNumber = "B2-12345678"
            vehicleType = "CAR"
            vehiclePlate = "51G-$(Get-Random -Minimum 10000 -Maximum 99999)"
        } | ConvertTo-Json
        
        $driverResponse = Invoke-RestMethod -Uri "$BaseUrl/drivers" -Method Post -Headers $headers -Body $driverBody -ContentType "application/json"
        $script:driverId = $driverResponse.data.id
    }
    
    if (-not $driverId) { throw "No driver available" }
}

# Step 5: Create Ride
Test-Step "Create ride from booking" {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $body = @{
        bookingId = $bookingId
        pickup = @{
            lat = 10.762622
            lng = 106.660172
            address = "Quận 1, TP.HCM"
        }
        dropoff = @{
            lat = 10.777730
            lng = 106.695416
            address = "Quận 3, TP.HCM"
        }
        vehicleType = "CAR"
        estimatedPrice = 50000
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/rides" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    $script:rideId = $response.data.id
    
    if (-not $rideId) { throw "No ride ID received" }
}

# Step 6: Assign Driver
Test-Step "Assign driver to ride" {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $body = @{ driverId = $driverId } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/rides/$rideId/assign" -Method Patch -Headers $headers -Body $body -ContentType "application/json"
    
    if ($response.data.status -ne "ASSIGNED") { throw "Ride not assigned" }
}

# Step 7: Start Ride
Test-Step "Start the ride" {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $response = Invoke-RestMethod -Uri "$BaseUrl/rides/$rideId/start" -Method Patch -Headers $headers
    
    if ($response.data.status -ne "IN_PROGRESS") { throw "Ride not started" }
}

# Step 8: Complete Ride
Test-Step "Complete the ride" {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $body = @{
        actualDistanceKm = 5.3
        actualDurationMin = 18
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/rides/$rideId/complete" -Method Patch -Headers $headers -Body $body -ContentType "application/json"
    
    if ($response.data.status -ne "COMPLETED") { throw "Ride not completed" }
}

# Step 9: Create Payment
Test-Step "Process payment" {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $body = @{
        rideId = $rideId
        amount = 55000
        method = "CASH"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/payments" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    $script:paymentId = $response.data.id
    
    if (-not $paymentId) { throw "No payment ID received" }
}

# Step 10: Confirm Payment
Test-Step "Confirm payment" {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $response = Invoke-RestMethod -Uri "$BaseUrl/payments/$paymentId/confirm" -Method Patch -Headers $headers
    
    if ($response.data.status -ne "COMPLETED") { throw "Payment not confirmed" }
}

# Step 11: Submit Review
Test-Step "Submit driver review" {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $body = @{
        rideId = $rideId
        driverId = $driverId
        rating = 5
        comment = "Excellent service!"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/reviews" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    
    if (-not $response.data.id) { throw "Review not created" }
}

# Step 12: Get Notifications
Test-Step "Check user notifications" {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $response = Invoke-RestMethod -Uri "$BaseUrl/notifications/user/$userId" -Method Get -Headers $headers
    
    # May be empty if notification service is async
}

# Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Test Results: $passed/$total passed" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if ($passed -eq $total) {
    Write-Host "All tests passed! ✅" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test Data Created:" -ForegroundColor Yellow
    Write-Host "  User ID: $userId"
    Write-Host "  Booking ID: $bookingId"
    Write-Host "  Ride ID: $rideId"
    Write-Host "  Driver ID: $driverId"
    Write-Host "  Payment ID: $paymentId"
    exit 0
} else {
    Write-Host "Some tests failed! ❌" -ForegroundColor Red
    exit 1
}
