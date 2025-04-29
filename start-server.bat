@echo off
echo Starting local server for Task Management App...
echo Access the app at: http://localhost:8000
echo Press Ctrl+C to stop the server

cd %~dp0
python -m http.server 8000

pause
