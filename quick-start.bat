@echo off
echo Starting iCrown Dental Clinic (Development Mode)...
echo.

cd /d "c:\xampp\htdocs\electron-app"

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo 1. Go to https://nodejs.org/
    echo 2. Download and install Node.js
    echo 3. Run this file again
    echo.
    pause
    exit /b
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

echo 🚀 Starting iCrown Dental Clinic...
echo.
npm start

pause
