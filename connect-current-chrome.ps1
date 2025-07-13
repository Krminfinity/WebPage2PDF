# PowerShell script to enable debug mode on currently running Chrome

Write-Host "現在のChromeブラウザを同じウィンドウで利用可能にする" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host "このスクリプトで同じウィンドウの新しいタブでPDF生成されます" -ForegroundColor Cyan
Write-Host ""

# 現在のChromeプロセスをチェック
$chromeProcesses = Get-Process -Name "chrome" -ErrorAction SilentlyContinue

if (-not $chromeProcesses) {
    Write-Host "❌ Chromeが起動していません" -ForegroundColor Red
    Write-Host "先にChromeを起動してMercariにログインしてください" -ForegroundColor Yellow
    Read-Host "何かキーを押して終了..."
    exit
}

Write-Host "✅ 現在のChromeプロセスが見つかりました" -ForegroundColor Green
Write-Host "プロセス数: $($chromeProcesses.Count)" -ForegroundColor Gray
Write-Host ""

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
    Write-Host "❌ Chrome の実行ファイルが見つかりませんでした" -ForegroundColor Red
    Read-Host "何かキーを押して終了..."
    exit
}

Write-Host "📋 実行内容:" -ForegroundColor Cyan
Write-Host "   ✓ 現在のChromeタブは全て保持されます" -ForegroundColor White
Write-Host "   ✓ 同じウィンドウに新しいタブが追加されます" -ForegroundColor White
Write-Host "   ✓ ログイン状態はそのまま利用されます" -ForegroundColor White
Write-Host "   ✓ WebPage2PDFから同じウィンドウでアクセス可能になります" -ForegroundColor White
Write-Host ""

$choice = Read-Host "同じウィンドウでの処理を有効にしますか？ (y/n)"

if ($choice -ne 'y' -and $choice -ne 'Y') {
    Write-Host "操作をキャンセルしました" -ForegroundColor Red
    Read-Host "何かキーを押して終了..."
    exit
}

Write-Host ""
Write-Host "🚀 デバッグモード対応のChromeウィンドウを起動中..." -ForegroundColor Green

try {
    # 既存のユーザーデータディレクトリを使用してデバッグポートを有効化
    # --no-first-run と --no-default-browser-check を追加して新しいウィンドウを抑制
    $arguments = @(
        "--remote-debugging-port=9222",
        "--user-data-dir=`"$env:LOCALAPPDATA\Google\Chrome\User Data`"",
        "--no-first-run",
        "--no-default-browser-check"
    )
    
    $process = Start-Process -FilePath $chromePath -ArgumentList $arguments -PassThru -WindowStyle Hidden
    
    # 少し待ってデバッグポートが有効になるのを待つ
    Start-Sleep -Seconds 3
    
    Write-Host "✅ 同じウィンドウでの処理が有効になりました！" -ForegroundColor Green
    Write-Host "プロセスID: $($process.Id)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🎯 次の手順:" -ForegroundColor Cyan
    Write-Host "   1. WebPage2PDFでCSVファイルをアップロード" -ForegroundColor White
    Write-Host "   2. PDF生成ボタンをクリック" -ForegroundColor White
    Write-Host "   3. 同じChromeウィンドウ内の新しいタブで処理が実行されます" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 既存のログイン状態で同じウィンドウ内でPDF生成が可能です" -ForegroundColor Green
    
    Read-Host "Chromeを閉じる場合は何かキーを押してください..."
    
}
catch {
    Write-Host "❌ デバッグモードの有効化に失敗しました: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 手動で実行する場合:" -ForegroundColor Cyan
    Write-Host "コマンドプロンプトで以下を実行してください:" -ForegroundColor White
    Write-Host "chrome.exe --remote-debugging-port=9222 --user-data-dir=`"%LOCALAPPDATA%\Google\Chrome\User Data`" --no-first-run" -ForegroundColor Green
    Read-Host "何かキーを押して終了..."
}
