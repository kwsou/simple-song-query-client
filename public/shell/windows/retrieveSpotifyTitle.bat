@echo OFF

REM gets all spotify processes, verbose log, filtered by process name, into csv format, no headers
set GET_ALL_SPOTIFY_PROCESSES=tasklist /v /fi "IMAGENAME eq spotify.exe" /fo csv /nh

REM filter through the output to only retrieve the 10th column (i.e. title)
REM only return the first entry found
for /f "tokens=10 delims=," %%F in ('%GET_ALL_SPOTIFY_PROCESSES%') do (
    @echo %%~F
    exit /b
)
