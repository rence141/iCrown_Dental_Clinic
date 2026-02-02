# PowerShell script to download and install Node.js silently
Write-Host "Downloading Node.js LTS..." -ForegroundColor Green

# Node.js LTS download URL
$nodeUrl = "https://nodejs.org/dist/v18.17.0/node-v18.17.0-x64.msi"
$installerPath = "$env:TEMP\nodejs-installer.msi"

# Download Node.js installer
Write-Host "Downloading from: $nodeUrl"
Invoke-WebRequest -Uri $nodeUrl -OutFile $installerPath

Write-Host "Installing Node.js..." -ForegroundColor Green

# Install silently
Start-Process msiexec.exe -ArgumentList "/i $installerPath /quiet /norestart" -Wait

# Clean up
Remove-Item $installerPath

Write-Host "✅ Node.js installation completed!" -ForegroundColor Green
Write-Host "Please restart PowerShell and verify with:" -ForegroundColor Yellow
Write-Host "  node --version" -ForegroundColor Cyan
Write-Host "  npm --version" -ForegroundColor Cyan

# Add to PATH for current session
$env:PATH += ";C:\Program Files\nodejs"

# Verify installation
try {
    $nodeVersion = & node --version
    $npmVersion = & npm --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
    Write-Host "NPM version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "Please restart your terminal to use Node.js." -ForegroundColor Yellow
}
