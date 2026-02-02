@echo off
echo Building iCrown Dental Clinic (Simple Method)...
echo.

REM Clear previous build
if exist "dist" rmdir /s /q "dist"

REM Create portable executable (no signing)
echo Creating portable executable...
npx electron-builder --win portable --publish=never

echo.
echo Build completed!
echo.
echo Check the 'dist' folder for:
echo - iCrown Dental Clinic.exe (portable app)
echo.
echo You can create a shortcut to this .exe file manually.
pause
