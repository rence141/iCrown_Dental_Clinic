@echo off
echo Creating iCrown Dental Clinic executable (Direct Method)...
echo.

REM Create dist folder
if not exist "dist" mkdir "dist"

REM Copy necessary files
echo Copying application files...
copy "main.js" "dist\" >nul
xcopy "frontend" "dist\frontend\" /E /I /Q >nul
copy "package.json" "dist\" >nul

REM Create a simple launcher script
echo Creating launcher...
echo @echo off > "dist\iCrown Dental Clinic.bat"
echo cd /d "%%~dp0" >> "dist\iCrown Dental Clinic.bat"
echo npx electron . >> "dist\iCrown Dental Clinic.bat"

echo.
echo Portable app created in 'dist' folder!
echo.
echo Files created:
echo - iCrown Dental Clinic.bat (launcher)
echo - frontend\ (app files)
echo - main.js (electron main)
echo - package.json (dependencies)
echo.
echo To create a shortcut:
echo 1. Right-click "iCrown Dental Clinic.bat"
echo 2. Send to ^> Desktop (create shortcut)
echo 3. Rename shortcut to "iCrown Dental Clinic"
pause
