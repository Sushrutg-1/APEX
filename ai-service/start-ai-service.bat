@echo off
cd /d "S:\Sushrut-Gondane\03-Projects\IoT\Project_1_APEX\APEX\ai-service"

echo Starting APEX AI Service...
".venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000 --log-level debug

pause