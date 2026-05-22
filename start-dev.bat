@echo off
REM Development startup script for Windows

echo 🚀 Starting PrepMeAI Development Environment
echo.

REM Check if backend venv exists
if not exist "backend\venv" (
    echo 📦 Creating Python virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    cd ..
)

REM Check if frontend node_modules exists
if not exist "frontend\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

REM Start backend
echo 🐍 Starting FastAPI backend on port 8000...
cd backend
start cmd /k "venv\Scripts\activate && uvicorn main:app --reload --port 8000"
cd ..

REM Wait a bit
timeout /t 2 /nobreak >nul

REM Start frontend
echo ⚛️  Starting Next.js frontend on port 3000...
cd frontend
start cmd /k "npm run dev"
cd ..

echo.
echo ✅ Development servers started!
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo Close the terminal windows to stop the servers
pause
