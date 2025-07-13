@echo off
echo Chrome をデバッグモードで起動しています...
echo ポート 9222 でリモートデバッグを有効にします
echo.
echo 注意: 既存のChromeウィンドウは一度閉じてください
echo 現在のユーザーデータ（ログイン情報、ブックマークなど）はそのまま使用されます
echo.
echo このウィンドウは開いたままにしてください
echo Chrome を閉じると自動的に終了します
echo.

REM 既存のChromeプロセスをチェック
tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I /N "chrome.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo.
    echo 既存のChromeプロセスが検出されました。
    echo 一度すべてのChromeウィンドウを閉じてからこのスクリプトを実行してください。
    echo.
    echo または、このまま続行する場合は何かキーを押してください...
    pause
)

REM Chrome の一般的なインストールパスをチェック
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
) else (
    echo Chrome が見つかりません。手動で以下のコマンドを実行してください:
    echo chrome.exe --remote-debugging-port=9222
    pause
)
