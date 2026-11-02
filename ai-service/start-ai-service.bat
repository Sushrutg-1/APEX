@echo off
cd /d "S:\Sushrut-Gondane\03-Projects\IoT\Project_1_APEX\APEX\ai-service"

echo Starting APEX AI Service...
if not defined PORT set "PORT=8000"
".venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port %PORT% --log-level debug

pause