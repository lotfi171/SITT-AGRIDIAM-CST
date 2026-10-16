@echo off
rem Ouvre AGRIDIAM dans Chrome (ou Edge). Toujours lancer avec ce fichier, pour retrouver les memes donnees.
set "P=%~dp0index.html"
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%P%" & exit /b)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%P%" & exit /b)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "%P%" & exit /b)
start "" msedge "%P%"
