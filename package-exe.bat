@echo off
echo Creating iCrown Dental Clinic executable...
echo.

REM Check if electron-builder is installed
npm list electron-builder >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing electron-builder...
    npm install electron-builder --save-dev
)

echo.
echo Building Windows executable...
npm run build:win

echo.
echo Done! Check the 'dist' folder for your .exe file.
pause
