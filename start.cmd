@echo off
REM Double-click to start the CoopGig stack (closes this window when done).
cd /d "%~dp0"
start "" mintty -t "CoopGig start" --hold bash -lc "./start.sh %*; echo; echo [press any key to close]; read -n1"
