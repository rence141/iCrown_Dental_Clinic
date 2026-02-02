@echo off
echo Running iCrown Dental Clinic (Portable Version)...
echo.

REM Check if the unpacked folder exists
if exist "dist\win-unpacked" (
    echo Found unpacked version, launching...
    cd /d "dist\win-unpacked"
    "iCrown Dental Clinic.exe"
) else (
    echo Unpacked version not found.
    echo Please run: npm run build:win
    echo to create the unpacked version first.
    pause
)
