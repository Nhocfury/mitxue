@echo off
start "" msedge "%~dp0index.html"
if errorlevel 1 start "" "%~dp0index.html"
