@echo off
REM =========================================
REM PrepMeAI Development Startup Script
REM =========================================

echo Starting PrepMeAI Development Environment
echo.

REM =========================================
REM Backend Setup
REM =========================================

REM Create backend virtual environment if it doesn't exist
if not exist "backend\venv" (
    echo Creating Python virtual environment...

    cd backend

    python -m venv venv

    cd ..
)

REM Install backend dependencies using venv Python
echo Installing backend dependencies...

cd backend

venv\Scripts\python.exe -m pip install --upgrade pip
venv\Scripts\python.exe -m pip install -r requirements.txt

REM Start FastAPI backend
echo Starting FastAPI backend on port 8000...

start cmd /k "venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

cd ..

REM =========================================
REM Frontend Setup
REM =========================================

REM Install frontend dependencies if node_modules doesn't exist
if not exist "frontend\node_modules" (

    echo Installing frontend dependencies...

    cd frontend

    call npm install

    cd ..
)

REM Wait for backend to initialize
timeout /t 2 /nobreak >nul

REM Start Next.js frontend
echo Starting Next.js frontend on port 3000...

cd frontend

start cmd /k "npm run dev"

cd ..

REM =========================================
REM Success Message
REM =========================================

echo.
echo =========================================
echo Development servers started successfully!
echo =========================================
echo.
echo Frontend : http://localhost:3000
echo Backend  : http://localhost:8000
echo API Docs : http://localhost:8000/docs
echo.
echo Close the opened terminal windows to stop the servers
echo.

pause