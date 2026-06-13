@echo off
REM Force Python to use UTF-8 encoding (fixes Windows GBK emoji errors)
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8

echo Starting GPT Researcher server...
venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
