@echo off
echo Starting Node.js local server for Task Management App...
echo Access the app at: http://localhost:8000
echo Press Ctrl+C to stop the server

cd %~dp0
node start-server.js

pause
