# BlueCat API - Login, Get Token, Reserve IP + DNS
param (
    [string]$BaseUrl = "https://your-bluecat-bam.example.com",
    [string]$Username,
    [string]$IpAddress = "192.168.10.55",
    [string]$Hostname = "server01",
    [string]$Domain = "example.com",
    [string]$MacAddress = "00:11:22:33:44:55",
    [int]$NetworkId = 123456   # ← Change this
)

# Ignore self-signed certs (uncomment if needed)
# [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }

function Invoke-BlueCatLogin {
    param($BaseUrl, $Username, $Password)

    $url = "$BaseUrl/api/v2/sessions"
    $body = @{
        username = $Username
        password = $Password
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
    
    $token = $response.apiToken
    if (-not $token) { $token = $response.token }

    $global:Headers = @{ Authorization = "Bearer $token" }
    Write-Host "✅ Login successful" -ForegroundColor Green
    return $token
}

# ====================== MAIN ======================
try {
    if (-not $Username) {
        $Username = Read-Host "Enter username"
    }
    $Password = Read-Host "Enter password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
    $PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

    $token = Invoke-BlueCatLogin -BaseUrl $BaseUrl -Username $Username -Password $PlainPassword

    # Optional: List configurations
    $configs = Invoke-RestMethod -Uri "$BaseUrl/api/v2/configurations" -Headers $global:Headers -Method Get
    Write-Host "Found $($configs.Count) configurations" -ForegroundColor Cyan

    # Reserve IP
    Write-Host "Reserving IP $IpAddress ..." -ForegroundColor Yellow
    $ipBody = @{
        address = $IpAddress
        name = $Hostname
        type = "IP4Address"
        properties = @{
            state = "DHCP_RESERVED"
            macAddress = $MacAddress
            comments = "Reserved via PowerShell API"
        }
    } | ConvertTo-Json

    $ipUrl = "$BaseUrl/api/v2/networks/$NetworkId/ipAddresses"
    try {
        Invoke-RestMethod -Uri $ipUrl -Headers $global:Headers -Method Post -Body $ipBody -ContentType "application/json" | Out-Null
        Write-Host "✅ IP reserved successfully" -ForegroundColor Green
    }
    catch {
        Write-Warning "IP assignment response: $($_.Exception.Message)"
    }

    # Create DNS Host Record
    Write-Host "Creating DNS record for $Hostname ..." -ForegroundColor Yellow
    $dnsBody = @{
        type = "HostRecord"
        name = $Hostname
        properties = @{
            absoluteName = "$Hostname.$Domain".TrimEnd('.')
            addresses = @($IpAddress)
            reverseRecord = $true
        }
    } | ConvertTo-Json

    $dnsUrl = "$BaseUrl/api/v2/resourceRecords"
    try {
        Invoke-RestMethod -Uri $dnsUrl -Headers $global:Headers -Method Post -Body $dnsBody -ContentType "application/json" | Out-Null
        Write-Host "✅ DNS record created successfully" -ForegroundColor Green
    }
    catch {
        Write-Warning "DNS creation failed: $($_.Exception.Message)"
    }

} catch {
    Write-Error "Error: $($_.Exception.Message)"
}
