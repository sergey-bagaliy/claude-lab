@echo off
rem Starts the bot on Windows (double-click this file).
rem Keys are NOT stored here: they come from environment variables, see README.md.
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Folder .venv not found. See README.md, section 3.
    pause
    exit /b 1
)
".venv\Scripts\python.exe" main.py
pause
