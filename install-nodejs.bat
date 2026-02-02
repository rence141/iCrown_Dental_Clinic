@echo off
echo Installing Node.js using Chocolatey...
echo.

REM Check if Chocolatey is installed
choco --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Chocolatey not found. Installing Chocolatey first...
    echo.
    
    REM Install Chocolatey
    powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    
    echo.
    echo Chocolatey installed. Please restart this script after restarting your terminal.
    pause
    exit /b
)

echo Chocolatey found. Installing Node.js LTS...
echo.

REM Install Node.js LTS
choco install nodejs-lts -y

echo.
echo ✅ Node.js installation completed!
echo.
echo Please restart your terminal and verify with:
echo   node --version
echo   npm --version
echo.
pause
