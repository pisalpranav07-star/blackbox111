@echo off
echo Starting WebSocket chat server...

REM Start WebSocket server (also serves HTML) in a new window
start cmd /k "node C:\Users\Pranav\Downloads\project\websocket-chat\server.js"

REM Wait a few seconds to let the server start
timeout /t 3

echo Opening chat in browser...
REM Open the default browser pointing to your local HTML served by Node.js
start http://10.94.211.101:8080/blackbox.html

echo All done! Your chat should be ready.
pause
