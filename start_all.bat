@echo off
echo Starting backend...
start cmd /k "cd /d backend && cnpm install && npm run start"

echo Starting frontend...
start cmd /k "cd /d frontend && cnpm install && npm run dev"

pause
