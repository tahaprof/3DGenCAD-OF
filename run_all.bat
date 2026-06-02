@echo off
echo ===================================================
echo Starting FRL Project (Backend and Frontend)
echo ===================================================

:: Start Backend in a new window
echo Starting Backend (Django)...
start "FRL Backend" cmd /k "cd backend && if not exist venv (echo Creating venv... && python -m venv venv && venv\Scripts\activate && echo Installing dependencies... && pip install -r requirements.txt) else (venv\Scripts\activate) && echo Running migrations... && python -X utf8 manage.py migrate && echo Starting server... && python -X utf8 manage.py runserver"


:: Start Frontend in a new window
echo Starting Frontend (Vite)...
start "FRL Frontend" cmd /k "cd frontend && if not exist node_modules (echo Installing node_modules... && npm install) && echo Starting dev server... && npm run dev"

echo ===================================================
echo Both servers are starting in separate windows.
echo You can close this window.
echo ===================================================
pause
