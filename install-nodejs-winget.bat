@echo off
echo Installing Node.js using Winget...
echo.

REM Check if Winget is available
winget --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Winget not found. Please use the Chocolatey method or download manually.
    echo.
    echo Alternative: Download from https://nodejs.org/
    pause
    exit /b
)

echo Installing Node.js LTS...
winget install OpenJS.NodeJS.LTS

echo.
echo ✅ Node.js installation completed!
echo.
echo Please restart your terminal and verify with:
echo   node --version
echo   npm --version
echo.
pause
