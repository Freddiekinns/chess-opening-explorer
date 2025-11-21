@echo off
REM Lichess Analysis Pipeline Runner (Windows)
REM This script runs the Lichess chess opening popularity analysis pipeline

setlocal enabledelayedexpansion

REM Get the directory of this script
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
)

REM Check if Python is available
where python >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo Error: python not found. Please install Python 3.7+
    exit /b 1
)

REM Check if required packages are installed
echo Checking dependencies...
python -c "import requests, chess, zstandard, tqdm, dateutil" 2>nul
if !ERRORLEVEL! neq 0 (
    echo Error: Required Python packages not found.
    echo Please install dependencies: pip install -r requirements.txt
    exit /b 1
)

REM Create logs directory
if not exist "logs" mkdir logs

REM Set up log file with timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a%%b)
set "LOG_FILE=logs\pipeline_%mydate%_%mytime%.log"

echo ==========================================
echo Lichess Analysis Pipeline
echo ==========================================
echo Log file: %LOG_FILE%
echo.

REM Run the pipeline
REM Pass all arguments to the script
python run_pipeline.py %* 2>&1 | tee "%LOG_FILE%"

set EXIT_CODE=!ERRORLEVEL!

if !EXIT_CODE! equ 0 (
    echo.
    echo ==========================================
    echo Pipeline completed successfully!
    echo Log saved to: %LOG_FILE%
    echo ==========================================
) else (
    echo.
    echo ==========================================
    echo Pipeline failed with exit code: !EXIT_CODE!
    echo Check log file: %LOG_FILE%
    echo ==========================================
)

exit /b !EXIT_CODE!
