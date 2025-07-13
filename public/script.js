// DOM要素の取得
const form = document.getElementById('pdfForm');
const urlsInput = document.getElementById('urls');
const generateBtn = document.getElementById('generateBtn');
const manualLoginBtn = document.getElementById('manualLoginBtn');
const loadingSection = document.getElementById('loadingSection');
const loginSection = document.getElementById('loginSection');
const resultsSection = document.getElementById('resultsSection');
const resultsContainer = document.getElementById('results');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const csvFileInput = document.getElementById('csvFile');
const uploadCsvBtn = document.getElementById('uploadCsvBtn');
const startPdfBtn = document.getElementById('startPdfBtn');
const cancelLoginBtn = document.getElementById('cancelLoginBtn');
const loginUrlInfo = document.getElementById('loginUrlInfo');
const urlCountInfo = document.getElementById('urlCountInfo');
const loginSpinner = document.getElementById('loginSpinner');

// 生成されたファイルのリストを保持
let generatedFiles = [];
let currentSessionId = null;

// CSVファイル選択時の処理
csvFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        uploadCsvBtn.style.display = 'inline-block';
        // URLテキストエリアを無効化
        urlsInput.disabled = true;
        urlsInput.placeholder = 'CSVファイルが選択されています。URLは自動で抽出されます。';
    } else {
        uploadCsvBtn.style.display = 'none';
        // URLテキストエリアを有効化
        urlsInput.disabled = false;
        urlsInput.placeholder = '複数のURLを入力する場合は、カンマ（,）で区切ってください\n例：https://example.com, https://google.com, https://github.com';
    }
});

// CSVアップロードボタンクリック時の処理
uploadCsvBtn.addEventListener('click', async () => {
    const file = csvFileInput.files[0];
    if (!file) {
        showAlert('CSVファイルを選択してください', 'warning');
        return;
    }

    // ファイルタイプをチェック
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showAlert('CSVファイルを選択してください', 'warning');
        return;
    }

    // ファイルサイズをチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
        showAlert('ファイルサイズが大きすぎます（5MB以下にしてください）', 'warning');
        return;
    }

    uploadCsvBtn.disabled = true;
    uploadCsvBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> アップロード中...';

    try {
        const formData = new FormData();
        formData.append('csvFile', file);

        console.log('CSVファイルをアップロード中:', file.name);

        const response = await fetch('/upload-csv', {
            method: 'POST',
            body: formData
        });

        console.log('レスポンス受信:', response.status, response.statusText);
        console.log('レスポンスヘッダー:', [...response.headers.entries()]);

        // レスポンステキストを先に取得してデバッグ
        const responseText = await response.text();
        console.log('レスポンステキスト:', responseText.substring(0, 500));

        // レスポンスがJSONかどうかをチェック
        const contentType = response.headers.get('content-type');
        console.log('Content-Type:', contentType);
        
        if (!contentType || !contentType.includes('application/json')) {
            console.error('JSONではないレスポンス - 完全なレスポンス:', responseText);
            throw new Error('サーバーから予期しないレスポンスが返されました');
        }

        // JSONをパース
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON解析エラー:', parseError);
            console.error('解析対象テキスト:', responseText);
            throw new Error('レスポンスのJSON解析に失敗しました');
        }

        if (!response.ok) {
            throw new Error(data.error || 'CSVアップロードエラーが発生しました');
        }

        // 抽出されたURLをテキストエリアに設定
        urlsInput.value = data.urls.join(', ');
        urlsInput.disabled = false;
        
        showAlert(`CSVファイルから${data.count}個のURLを抽出しました`, 'success');
        
        // CSVファイル入力をリセット
        csvFileInput.value = '';
        uploadCsvBtn.style.display = 'none';

    } catch (error) {
        console.error('CSVアップロードエラー:', error);
        showAlert(`CSVアップロードエラー: ${error.message}`, 'danger');
        
        // エラー時は入力をリセット
        urlsInput.disabled = false;
    } finally {
        uploadCsvBtn.disabled = false;
        uploadCsvBtn.innerHTML = '<i class="fas fa-upload"></i> CSVをアップロード';
    }
});

// 一括ダウンロードボタンのイベント
downloadAllBtn.addEventListener('click', async () => {
    if (generatedFiles.length === 0) {
        showAlert('ダウンロード可能なファイルがありません', 'warning');
        return;
    }
    
    downloadAllBtn.disabled = true;
    downloadAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ZIP作成中...';
    
    try {
        const response = await fetch('/download-batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filenames: generatedFiles })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'ダウンロードエラーが発生しました');
        }
        
        // ZIPファイルをダウンロード
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `webpage2pdf_batch_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showAlert('一括ダウンロードが完了しました', 'success');
        
    } catch (error) {
        console.error('一括ダウンロードエラー:', error);
        showAlert(`一括ダウンロードエラー: ${error.message}`, 'danger');
    } finally {
        downloadAllBtn.disabled = false;
        downloadAllBtn.innerHTML = '<i class="fas fa-download"></i> 全てダウンロード (ZIP)';
    }
});

// フォーム送信イベント
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const urls = urlsInput.value.trim();
    
    if (!urls) {
        showAlert('URLを入力するか、CSVファイルをアップロードしてください', 'warning');
        return;
    }
    
    // UI状態を更新
    setLoadingState(true);
    hideResults();
    
    try {
        const response = await fetch('/generate-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ urls })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'サーバーエラーが発生しました');
        }
        
        // 結果を表示
        displayResults(data.results);
        
        // 成功したファイルがある場合、一括ダウンロードボタンを表示
        const successfulFiles = data.results.filter(result => result.success);
        if (successfulFiles.length > 1) {
            generatedFiles = successfulFiles.map(result => result.filename);
            downloadAllBtn.style.display = 'inline-block';
        } else {
            downloadAllBtn.style.display = 'none';
        }
        
    } catch (error) {
        console.error('エラー:', error);
        showAlert(`エラーが発生しました: ${error.message}`, 'danger');
    } finally {
        setLoadingState(false);
    }
});

// 手動ログインボタンクリック時の処理
manualLoginBtn.addEventListener('click', async () => {
    const urls = urlsInput.value.trim();
    
    if (!urls) {
        showAlert('URLを入力するか、CSVファイルをアップロードしてください', 'warning');
        return;
    }
    
    manualLoginBtn.disabled = true;
    manualLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ログインページを開いています...';
    
    try {
        const response = await fetch('/prepare-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ urls: urls })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '手動ログインの準備に失敗しました');
        }
        
        // セッション情報を保存
        currentSessionId = data.sessionId;
        
        // ログインセクションを表示
        loginSection.style.display = 'block';
        loginUrlInfo.textContent = `ログインURL: ${data.loginUrl}`;
        urlCountInfo.textContent = `処理予定URL数: ${data.totalUrls}個`;
        
        // フォームを非表示
        form.style.display = 'none';
        
        // PDF生成開始ボタンを5秒後に有効化
        setTimeout(() => {
            startPdfBtn.disabled = false;
            startPdfBtn.innerHTML = '<i class="fas fa-play-circle"></i> PDF生成開始';
            loginSpinner.style.display = 'none';
            showAlert('ログイン完了後、「PDF生成開始」ボタンをクリックしてください', 'info');
        }, 5000);
        
        loginSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        console.error('手動ログイン準備エラー:', error);
        showAlert(error.message, 'danger');
    } finally {
        manualLoginBtn.disabled = false;
        manualLoginBtn.innerHTML = '<i class="fas fa-user-check"></i> 手動ログインでPDF生成';
    }
});

// PDF生成開始ボタンクリック時の処理
startPdfBtn.addEventListener('click', async () => {
    if (!currentSessionId) {
        showAlert('セッションが無効です。再度手動ログインを実行してください。', 'warning');
        return;
    }
    
    startPdfBtn.disabled = true;
    startPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PDF生成中...';
    
    // ローディング表示
    loadingSection.style.display = 'block';
    loginSection.style.display = 'none';
    
    try {
        const response = await fetch('/start-pdf-generation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId: currentSessionId })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'PDF生成に失敗しました');
        }
        
        // 結果を表示
        displayResults(data.results);
        
        // 成功したファイルのリストを更新
        generatedFiles = data.results.filter(r => r.success).map(r => r.filename);
        
        if (generatedFiles.length > 1) {
            downloadAllBtn.style.display = 'inline-block';
        }
        
        showAlert(`PDF生成が完了しました。成功: ${data.successCount}/${data.totalCount}`, 'success');
        
    } catch (error) {
        console.error('PDF生成エラー:', error);
        showAlert(error.message, 'danger');
        
        // エラー時はログインセクションに戻る
        loginSection.style.display = 'block';
        startPdfBtn.disabled = false;
        startPdfBtn.innerHTML = '<i class="fas fa-play-circle"></i> PDF生成開始';
    } finally {
        loadingSection.style.display = 'none';
    }
});

// キャンセルボタンクリック時の処理
cancelLoginBtn.addEventListener('click', () => {
    loginSection.style.display = 'none';
    form.style.display = 'block';
    currentSessionId = null;
    
    // ボタンの状態をリセット
    startPdfBtn.disabled = true;
    startPdfBtn.innerHTML = '<i class="fas fa-play-circle"></i> PDF生成開始';
    loginSpinner.style.display = 'block';
    
    showAlert('手動ログインをキャンセルしました', 'info');
});

// ローディング状態の切り替え
function setLoadingState(isLoading) {
    if (isLoading) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';
        loadingSection.style.display = 'block';
    } else {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> PDF生成';
        loadingSection.style.display = 'none';
    }
}

// 結果の表示
function displayResults(results) {
    resultsContainer.innerHTML = '';
    
    results.forEach((result, index) => {
        const resultDiv = document.createElement('div');
        resultDiv.className = `result-item ${result.success ? 'result-success' : 'result-error'}`;
        resultDiv.classList.add('fade-in-up');
        resultDiv.style.animationDelay = `${index * 0.1}s`;
        
        if (result.success) {
            const browserInfo = result.usingExistingBrowser ? 
                `<span class="badge bg-success"><i class="fas fa-chrome"></i> 既存ブラウザ利用</span>` : 
                `<span class="badge bg-secondary"><i class="fas fa-robot"></i> ヘッドレス</span>`;
            
            const tabInfo = result.tabInfo ? 
                `<small class="text-info"><i class="fas fa-tab"></i> ${result.tabInfo}</small>` : '';
            
            const urlChanged = result.actualUrl && result.actualUrl !== result.url ? 
                `<small class="text-warning"><i class="fas fa-exclamation-triangle"></i> リダイレクト: ${escapeHtml(result.actualUrl)}</small>` : '';
            
            resultDiv.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="text-success mb-2">
                            <i class="fas fa-check-circle"></i> 生成成功 ${browserInfo}
                        </h6>
                        <p class="mb-1 text-muted small">
                            <i class="fas fa-link"></i> 元URL: ${escapeHtml(result.url)}
                        </p>
                        ${urlChanged ? `<p class="mb-1 small">${urlChanged}</p>` : ''}
                        ${result.pageTitle ? `<p class="mb-1 small text-info"><i class="fas fa-heading"></i> ${escapeHtml(result.pageTitle)}</p>` : ''}
                        ${tabInfo ? `<p class="mb-1">${tabInfo}</p>` : ''}
                        <p class="mb-0 small">
                            <i class="fas fa-file-pdf text-danger"></i> ${result.filename}
                        </p>
                    </div>
                    <div class="ms-3">
                        <a href="${result.downloadUrl}" 
                           class="btn btn-success btn-sm" 
                           download
                           target="_blank">
                            <i class="fas fa-download"></i> ダウンロード
                        </a>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div>
                    <h6 class="text-danger mb-2">
                        <i class="fas fa-exclamation-circle"></i> 生成失敗
                    </h6>
                    <p class="mb-2 text-muted small">
                        <i class="fas fa-link"></i> ${escapeHtml(result.url)}
                    </p>
                    <p class="mb-0 small text-danger">
                        <i class="fas fa-exclamation-triangle"></i> ${escapeHtml(result.error)}
                    </p>
                </div>
            `;
        }
        
        resultsContainer.appendChild(resultDiv);
    });
    
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 結果セクションを非表示
function hideResults() {
    resultsSection.style.display = 'none';
    downloadAllBtn.style.display = 'none';
    generatedFiles = [];
    
    // CSVファイル入力もリセット
    if (csvFileInput.files.length > 0) {
        csvFileInput.value = '';
        uploadCsvBtn.style.display = 'none';
        urlsInput.disabled = false;
        urlsInput.placeholder = '複数のURLを入力する場合は、カンマ（,）で区切ってください\n例：https://example.com, https://google.com, https://github.com';
    }
}

// アラート表示
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // フォームの前に挿入
    form.parentNode.insertBefore(alertDiv, form);
    
    // 3秒後に自動で削除
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 3000);
}

// HTMLエスケープ関数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// URLの妥当性チェック（リアルタイム）
urlsInput.addEventListener('input', (e) => {
    const urls = e.target.value.trim();
    
    if (urls) {
        const urlList = urls.split(',').map(url => url.trim()).filter(url => url);
        
        if (urlList.length > 50) {
            e.target.setCustomValidity('URLは最大50個まで入力できます');
        } else {
            e.target.setCustomValidity('');
        }
    } else {
        e.target.setCustomValidity('');
    }
});

// ページ読み込み時のアニメーション
document.addEventListener('DOMContentLoaded', () => {
    // フェードインアニメーションを追加
    const elements = document.querySelectorAll('.card, h1, .lead');
    elements.forEach((el, index) => {
        el.classList.add('fade-in-up');
        el.style.animationDelay = `${index * 0.2}s`;
    });
});
