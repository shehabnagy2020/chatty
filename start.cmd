@echo off
echo Starting Chatty - Backend and Frontend...
echo.

start "Chatty-Backend" cmd /k "cd /d %~dp0backend && npm run start:dev"
start "Chatty-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Backend running on http://localhost:3000
echo Frontend running on http://localhost:5173
echo.
echo Close the terminal windows to stop the servers.