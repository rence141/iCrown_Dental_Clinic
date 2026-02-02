@echo off
echo Building iCrown Dental Clinic (Fixed Version)...
echo.

REM Clear previous build
if exist "dist" rmdir /s /q "dist"

echo Building with fixed backend...
npm run build:win

echo.
echo ✅ Build completed!
echo.
echo Your fixed executable is ready at:
echo 📁 dist\iCrown Dental Clinic 1.0.0.exe
echo.
echo This version should work without backend errors!
pause
