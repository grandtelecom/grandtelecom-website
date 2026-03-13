@echo off
setlocal enableextensions enabledelayedexpansion

REM Start Grand Telecom Node backend reliably on Windows
cd /d "%~dp0"

REM Check Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Please install from https://nodejs.org/ and try again.
  pause
  exit /b 1
)

REM Install dependencies if node_modules missing
if not exist node_modules (
  echo [INFO] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

REM Allow overriding port via argument, default 3001
set PORT=%1
if "%PORT%"=="" set PORT=3001

REM Kill existing process on the port if any
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :%PORT% ^| findstr LISTENING') do (
  echo [INFO] Killing process on port %PORT% (PID %%p)
  taskkill /PID %%p /F >nul 2>nul
)

set "PORT=%PORT%"

echo [INFO] Starting server on http://localhost:%PORT%
REM Run server and keep window open if it exits with error
node server.js
if errorlevel 1 (
  echo.
  echo [ERROR] Server exited with code %ERRORLEVEL%.
  echo If you saw 'EADDRINUSE', the port %PORT% is in use. Try: start_backend.cmd 3003
  echo If you saw 'Cannot find module', run 'npm install' in this folder.
  echo.
  pause
)

endlocal
