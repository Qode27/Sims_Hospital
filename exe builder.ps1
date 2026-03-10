if (Test-Path node_modules) { rmdir /s /q node_modules }
if (Test-Path backend\node_modules) { rmdir /s /q backend\node_modules }
if (Test-Path frontend\node_modules) { rmdir /s /q frontend\node_modules }
if (Test-Path desktop-electron\node_modules) { rmdir /s /q desktop-electron\node_modules }

npm.cmd install
npm.cmd run build:frontend
npm.cmd run build:backend
npm.cmd run build:win
