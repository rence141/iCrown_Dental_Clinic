@echo off
echo Testing Node.js installation...
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js first using one of these:
    echo   - install-nodejs.bat (Chocolatey)
    echo   - install-nodejs-winget.bat (Winget)
    echo   - manual-install.bat (Manual download)
    echo.
    pause
    exit /b
)

echo ✅ Node.js is installed!
echo.
echo Node.js version:
node --version
echo.
echo NPM version:
npm --version
echo.
echo You can now run your app with:
echo   quick-start.bat
echo.
pause
