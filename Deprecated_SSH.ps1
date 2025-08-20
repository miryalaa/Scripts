# Define path to sshd_config
$sshConfig = "C:\ProgramData\ssh\sshd_config"

# List of weak/deprecated algorithms
$WeakCiphers   = "aes128-cbc","3des-cbc","blowfish-cbc","arcfour","arcfour128","arcfour256","cast128-cbc"
$WeakMACs      = "hmac-md5","hmac-md5-96","hmac-sha1-96"
$WeakKex       = "diffie-hellman-group1-sha1","diffie-hellman-group14-sha1","diffie-hellman-group-exchange-sha1"

if (Test-Path $sshConfig) {
    Write-Host "===== Checking sshd_config for deprecated settings ====="

    $configContent = Get-Content $sshConfig | Where-Object {$_ -notmatch '^#'}

    foreach ($line in $configContent) {
        if ($line -match "Ciphers") {
            $used = $line -replace "Ciphers\s*","" -split ","
            $deprecated = $used | Where-Object {$_ -in $WeakCiphers}
            if ($deprecated) {
                Write-Host "Weak Ciphers found: $($deprecated -join ', ')" -ForegroundColor Red
            }
        }
        if ($line -match "MACs") {
            $used = $line -replace "MACs\s*","" -split ","
            $deprecated = $used | Where-Object {$_ -in $WeakMACs}
            if ($deprecated) {
                Write-Host "Weak MACs found: $($deprecated -join ', ')" -ForegroundColor Red
            }
        }
        if ($line -match "KexAlgorithms") {
            $used = $line -replace "KexAlgorithms\s*","" -split ","
            $deprecated = $used | Where-Object {$_ -in $WeakKex}
            if ($deprecated) {
                Write-Host "Weak KexAlgorithms found: $($deprecated -join ', ')" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "sshd_config not found at $sshConfig. OpenSSH may not be installed." -ForegroundColor Yellow
}
