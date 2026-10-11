@echo off
TITLE CampusAttend - School Local Area Network Server Launcher
COLOR 0A

echo =====================================================================
echo  CAMPUSATTEND: SCHOOL-NETWORK-ONLY ATTENDANCE SYSTEM
echo  Operating Mode: 100%% Offline LAN (No Internet Connection Required)
echo =====================================================================
echo.

cd /d "%~dp0..\.."

echo [1/3] Checking Python Virtual Environment...
if not exist "backend\venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found in backend\venv!
    echo Please run 'python -m venv backend\venv' and install requirements.
    pause
    exit /b 1
)

echo [2/3] Verifying database integrity...
backend\venv\Scripts\python.exe -c "import sqlite3; con = sqlite3.connect('backend/campusattend.db'); res = con.execute('PRAGMA integrity_check;').fetchone()[0]; print('Database Status:', res)"
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Database initialization check failed.
)

echo [3/3] Detecting Local LAN IP Address...
for /f "tokens=4" %%a in ('route print^|find " 0.0.0.0"') do set SERVER_IP=%%a
echo Server LAN IP Detected: %SERVER_IP%
echo.
echo =====================================================================
echo  SERVER IS READY! Instructors can connect from authorized school Wi-Fi:
echo  URL: http://%SERVER_IP%:5173  or  http://localhost:5173
echo =====================================================================
echo.
echo Press CTRL+C at any time to safely shut down the server.
echo.

npm run dev
