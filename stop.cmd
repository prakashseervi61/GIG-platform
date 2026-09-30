@echo off
REM Double-click to stop the CoopGig stack.
cd /d "%~dp0"
start "" mintty -t "CoopGig stop" --hold bash -lc "./stop.sh %*; echo; echo [press any key to close]; read -n1"
