# PowerShell script to start Chrome with existing user data in debug mode

Write-Host "Chrome デバッグモード起動スクリプト" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "このスクリプトは既存のログイン情報を保持してChromeを起動します" -ForegroundColor Cyan
Write-Host ""

# 既存のChromeプロセスをチェック
$chromeProcesses = Get-Process -Name "chrome" -ErrorAction SilentlyContinue

if ($chromeProcesses) {
    Write-Host "既存のChromeプロセスが見つかりました:" -ForegroundColor Yellow
    Write-Host "プロセス数: $($chromeProcesses.Count)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️ デバッグモードで起動するには既存のChromeを終了する必要があります" -ForegroundColor Yellow
    Write-Host "   終了すると開いているタブは失われますが、ログイン情報は保持されます" -ForegroundColor Cyan
    
    $choice = Read-Host "既存のChromeを終了してデバッグモードで再起動しますか？ (y/n)"
    
    if ($choice -eq 'y' -or $choice -eq 'Y') {
        Write-Host "Chromeプロセスを終了しています..." -ForegroundColor Yellow
        try {
            Stop-Process -Name "chrome" -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            Write-Host "✅ Chromeプロセスを終了しました" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ 一部のChromeプロセスの終了に失敗しました" -ForegroundColor Red
        }
    }
    else {
        Write-Host "操作をキャンセルしました" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 手動でデバッグモードを起動する方法:" -ForegroundColor Cyan
        Write-Host "   1. 全てのChromeウィンドウを閉じる" -ForegroundColor White
        Write-Host "   2. 以下のコマンドを実行:" -ForegroundColor White
        Write-Host '   chrome.exe --remote-debugging-port=9222' -ForegroundColor Green
        Read-Host "何かキーを押して終了..."
        exit
    }
}

# Chrome の実行ファイルパスを検索
$chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chromePath = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromePath = $path
        break
    }
}

if (-not $chromePath) {
    Write-Host "Chrome が見つかりません！" -ForegroundColor Red
    Write-Host "手動で以下のコマンドを実行してください:" -ForegroundColor Yellow
    Write-Host "chrome.exe --remote-debugging-port=9222" -ForegroundColor Cyan
    Read-Host "何かキーを押して終了..."
    exit
}

Write-Host "✅ Chrome を起動しています..." -ForegroundColor Green
Write-Host "パス: $chromePath" -ForegroundColor Gray
Write-Host "デバッグポート: 9222" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 次の手順:" -ForegroundColor Cyan
Write-Host "   1. 開いたChromeでMercariにログイン" -ForegroundColor White
Write-Host "   2. ログイン完了後、WebPage2PDFでCSVアップロード" -ForegroundColor White
Write-Host "   3. PDFが正しいページで生成されることを確認" -ForegroundColor White
Write-Host ""
Write-Host "⚠️ 注意: このウィンドウは開いたままにしてください" -ForegroundColor Yellow
Write-Host "       Chrome を閉じるとこのスクリプトも終了します" -ForegroundColor Yellow
Write-Host ""

try {
    # 現在のユーザーデータディレクトリでChromeを起動
    $process = Start-Process -FilePath $chromePath -ArgumentList "--remote-debugging-port=9222" -PassThru
    
    Write-Host "✅ Chrome が正常に起動しました！" -ForegroundColor Green
    Write-Host "プロセスID: $($process.Id)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔗 WebPage2PDF サービスから既存のブラウザセッション（ログイン状態）が利用できます" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Chrome を閉じるか、Ctrl+C でこのスクリプトを終了してください" -ForegroundColor Yellow
    
    # Chromeプロセスが終了するまで待機
    $process.WaitForExit()
    Write-Host "Chrome が終了しました" -ForegroundColor Yellow
}
catch {
    Write-Host "Chrome の起動に失敗しました: $($_.Exception.Message)" -ForegroundColor Red
}

Read-Host "何かキーを押して終了..."
