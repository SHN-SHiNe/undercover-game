@echo off
cd /d "%~dp0"
title SheishiWodi Launcher

echo ================================
echo   SheishiWodi Game Launcher
echo ================================
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] python not found in PATH
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm not found in PATH
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo [SETUP] Installing frontend dependencies...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
)

echo [1/2] Starting Flask backend (port 5000)...
start "Flask Backend" /D "%~dp0" cmd /k "python app.py"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Vite frontend (port 3000)...
start "Vite Frontend" /D "%~dp0frontend" cmd /k "call npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ================================
echo   All services started!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo ================================
echo.
pause
